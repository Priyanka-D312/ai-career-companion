"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { AuthModal } from "@/components/auth-modal"
import { ProfileView } from "@/components/views/profile-view"
import { ApplicationsView } from "@/components/views/applications-view"
import { InternshipsView } from "@/components/views/internships-view"
import { ResumesView } from "@/components/views/resumes-view"
import { SkillsView } from "@/components/views/skills-view"
import { CoverLetterView } from "@/components/views/cover-letter-view"
import { InterviewPrepView } from "@/components/views/interview-prep-view"
import {
  initialProfile,
  type Application,
  type InternshipMatch,
  type NavId,
  type Profile,
} from "@/lib/career-data"
import {
  fetchProfile,
  fetchApplications,
  createApplication,
  updateProfile,
  updateApplicationStatus,
  deleteApplication,
  logoutUser,
} from "@/lib/api"

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<NavId | string>("internships")
  const [profile, setProfile] = useState<Profile>(initialProfile)
  const [applications, setApplications] = useState<Application[]>([])
  const [targetPrepRole, setTargetPrepRole] = useState<string>("Frontend Engineering Intern")
  const [, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login")

  useEffect(() => {
    async function loadData() {
      try {
        const cached = localStorage.getItem("career_user_profile")
        if (cached) {
          try {
            setProfile(JSON.parse(cached))
          } catch {}
        }

        const [profData, appsData] = await Promise.all([
          fetchProfile().catch(() => null),
          fetchApplications().catch(() => null),
        ])
        if (profData && profData.fullName) {
          setProfile(profData)
          localStorage.setItem("career_user_profile", JSON.stringify(profData))
        }
        if (appsData) setApplications(appsData)
      } catch (err) {
        console.error("Failed to fetch initial data from backend:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleAuthSuccess = (authenticatedProfile: Profile) => {
    setProfile(authenticatedProfile)
    setIsLoggedIn(true)
    localStorage.setItem("career_user_profile", JSON.stringify(authenticatedProfile))
    setShowAuthModal(false)
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch {}
    setIsLoggedIn(false)
    localStorage.removeItem("career_user_profile")
    setAuthModalMode("login")
    setShowAuthModal(true)
  }

  const handleSaveProfile = async (updated: Profile) => {
    setProfile(updated)
    localStorage.setItem("career_user_profile", JSON.stringify(updated))
    try {
      const saved = await updateProfile(updated)
      setProfile(saved)
    } catch (err) {
      console.error("Failed to save profile to backend:", err)
    }
  }

  const handleAddSkillToProfile = async (skill: string) => {
    const existing = profile.technicalSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (!existing.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      const updated = {
        ...profile,
        technicalSkills: [...existing, skill].join(", "),
      }
      await handleSaveProfile(updated)
    }
  }

  const addApplicationFromMatch = async (match: InternshipMatch) => {
    // 1. Direct LinkedIn Search opening redirection
    const targetUrl =
      match.applyUrl && match.applyUrl !== "#"
        ? match.applyUrl
        : `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
            `${match.role} ${match.company}`
          )}&location=India&f_TPR=r604800&f_E=1`

    window.open(targetUrl, "_blank", "noopener,noreferrer")

    // 2. Log application with complete payload to prevent HTTP 422
    try {
      const created = await createApplication({
        company: match.company,
        role: match.role,
        location: match.location,
        status: "Applied",
        applyUrl: targetUrl,
      })
      setApplications((prev) => [created, ...prev])
    } catch (err) {
      console.error("Failed to create application on backend:", err)
      setApplications((prev) => [
        {
          id: `${match.id}-${Date.now()}`,
          company: match.company,
          role: match.role,
          location: match.location,
          status: "Applied",
          appliedAt: "Just now",
          applyUrl: targetUrl,
        },
        ...prev,
      ])
    }
  }

  const handleAddCustomApplication = async (data: {
    company: string
    role: string
    location: string
    status: string
  }) => {
    try {
      const created = await createApplication({
        ...data,
        applyUrl: "#",
      })
      setApplications((prev) => [created, ...prev])
    } catch (err) {
      console.error("Failed to create custom application on backend:", err)
      setApplications((prev) => [
        {
          id: `custom-${Date.now()}`,
          company: data.company,
          role: data.role,
          location: data.location,
          status: data.status,
          appliedAt: "Just now",
          applyUrl: "#",
        },
        ...prev,
      ])
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status } : app))
    )
    try {
      await updateApplicationStatus(id, status)
    } catch (err) {
      console.error("Failed to update status on backend:", err)
    }
  }

  const handleDeleteApplication = async (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id))
    try {
      await deleteApplication(id)
    } catch (err) {
      console.error("Failed to delete application on backend:", err)
    }
  }

  const addSampleApplication = async () => {
    const samples = [
      { company: "Cloudscale Systems", role: "Backend Engineering Intern", location: "Remote" },
      { company: "Pixel Forge", role: "Frontend Engineering Intern", location: "Remote" },
      { company: "Datawave", role: "Machine Learning Intern", location: "San Francisco, CA" },
    ]
    const pick = samples[applications.length % samples.length]
    try {
      const created = await createApplication({ ...pick, applyUrl: "#" })
      setApplications((prev) => [created, ...prev])
    } catch (err) {
      console.error("Failed to add sample application to backend:", err)
      setApplications((prev) => [
        {
          id: `sample-${Date.now()}`,
          ...pick,
          status: "Applied",
          appliedAt: "Just now",
          applyUrl: "#",
        },
        ...prev,
      ])
    }
  }

  const handlePrepareInterview = (role: string) => {
    setTargetPrepRole(role)
    setActiveTab("interview-prep")
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar
        active={activeTab as NavId}
        activeTab={activeTab}
        onSelect={(tab) => setActiveTab(tab)}
        profile={profile}
        isLoggedIn={isLoggedIn}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode || "login")
          setShowAuthModal(true)
        }}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        {activeTab === "interview-prep" && (
          <InterviewPrepView
            key={targetPrepRole}
            profile={profile}
            initialTargetRole={targetPrepRole}
            selectedRole={targetPrepRole}
            targetRole={targetPrepRole}
            role={targetPrepRole}
            onNavigateToResumes={() => setActiveTab("resumes")}
          />
        )}
        {activeTab === "profile" && (
          <ProfileView profile={profile} onSave={handleSaveProfile} />
        )}
        {activeTab === "applications" && (
          <ApplicationsView
            applications={applications}
            onAddCustom={handleAddCustomApplication}
            onAddSample={addSampleApplication}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteApplication}
          />
        )}
        {activeTab === "internships" && (
          <InternshipsView
            profile={profile}
            onApply={addApplicationFromMatch}
            onPrepareInterview={handlePrepareInterview}
            setActiveTab={setActiveTab}
            setSelectedRole={setTargetPrepRole}
            setTargetPrepRole={setTargetPrepRole}
          />
        )}
        {activeTab === "resumes" && (
          <ResumesView profile={profile} onProfileUpdated={setProfile} />
        )}
        {activeTab === "skills" && (
          <SkillsView profile={profile} onAddSkill={handleAddSkillToProfile} />
        )}
        {activeTab === "cover-letter" && (
          <CoverLetterView profile={profile} />
        )}
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />
    </div>
  )
}

export default Dashboard