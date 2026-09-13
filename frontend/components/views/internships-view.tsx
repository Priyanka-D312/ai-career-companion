"use client"

import { useState } from "react"
import { MapPin, Wallet, Sparkles, Loader2, Briefcase, Info, Bot, CheckCircle2, Send, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { internshipPool, type InternshipMatch, type Profile } from "@/lib/career-data"
import { fetchInternshipMatches, applyForInternship } from "@/lib/api"

type InternshipsViewProps = {
  profile?: Profile
  onApply: (match: InternshipMatch) => void
  onPrepareInterview?: (role: string) => void
  setActiveTab?: (tab: any) => void
  setSelectedRole?: (role: string) => void
  setTargetPrepRole?: (role: string) => void
}

export function InternshipsView({
  profile,
  onApply,
  onPrepareInterview,
  setActiveTab,
  setSelectedRole,
  setTargetPrepRole,
}: InternshipsViewProps) {
  const [matches, setMatches] = useState<InternshipMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [appliedIds, setAppliedIds] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)
  
  // Modal State for Direct In-Portal Application
  const [selectedInternship, setSelectedInternship] = useState<InternshipMatch | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coverNote, setCoverNote] = useState("")

  const handleMatch = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const data = await fetchInternshipMatches(profile)
      setMatches(data)
    } catch (err) {
      console.warn("Backend match API offline or error, falling back to local pool:", err)
      setErrorMsg("Could not connect to live backend match server. Displaying local matches.")
      setMatches([...internshipPool].sort((a, b) => b.matchScore - a.matchScore))
    } finally {
      setLoading(false)
    }
  }

  // Open Portal Modal
  const openApplyModal = (match: InternshipMatch) => {
    setSelectedInternship(match)
    setCoverNote(`Hi ${match.company} Hiring Team,\n\nI am excited to submit my application for the ${match.role} role. My profile skills strongly align with your team's requirements.`)
  }

  // Submit Application within Platform & Dispatch Confirmation
  const handleSubmitApplication = async () => {
    if (!selectedInternship) return
    setIsSubmitting(true)

    // Ensure link redirects externally to LinkedIn instead of local 404 route
    const externalUrl =
      selectedInternship.applyUrl && selectedInternship.applyUrl !== "#" && selectedInternship.applyUrl.startsWith("http")
        ? selectedInternship.applyUrl
        : `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
            `${selectedInternship.role} ${selectedInternship.company}`
          )}&location=India`

    try {
      await applyForInternship({
        company: selectedInternship.company,
        role: selectedInternship.role,
        location: selectedInternship.location,
        email: profile?.email || "priyankadhanasekaran2005@gmail.com",
        fullName: profile?.fullName || "Priyanka D",
        coverNote: coverNote,
        applyUrl: externalUrl,
      })

      // Mark applied locally
      setAppliedIds((prev) => [...prev, selectedInternship.id])
      onApply({ ...selectedInternship, applyUrl: externalUrl })

      // Open external job link in new tab
      window.open(externalUrl, "_blank", "noopener,noreferrer")

      setNotificationMsg(
        `Success! Application for ${selectedInternship.role} at ${selectedInternship.company} submitted via Portal.`
      )
      setTimeout(() => setNotificationMsg(null), 6000)
    } catch (err) {
      console.warn("Application API notice:", err)
      onApply({ ...selectedInternship, applyUrl: externalUrl })
      window.open(externalUrl, "_blank", "noopener,noreferrer")
      setNotificationMsg(`Application registered locally for ${selectedInternship.role} at ${selectedInternship.company}.`)
      setTimeout(() => setNotificationMsg(null), 6000)
    } finally {
      setIsSubmitting(false)
      setSelectedInternship(null)
    }
  }

  const handlePrepareInterviewClick = (role: string) => {
    if (onPrepareInterview) onPrepareInterview(role)
    if (setActiveTab) setActiveTab("interview-prep")
    if (setSelectedRole) setSelectedRole(role)
    if (setTargetPrepRole) setTargetPrepRole(role)
  }

  return (
    <div className="mx-auto max-w-3xl relative">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Internships</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Let AI find internships that fit your skills and goals using RAG semantic matching.
          </p>
        </div>
        <Button onClick={handleMatch} disabled={loading} className="gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Matching..." : "Match Candidate"}
        </Button>
      </header>

      {notificationMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p>{notificationMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
          {errorMsg}
        </div>
      )}

      {matches.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
            <Briefcase className="h-7 w-7 text-accent-foreground" />
          </span>
          <p className="mt-4 text-base font-medium text-foreground">
            No matches yet
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Click &quot;Match Candidate&quot; to compute RAG internship matches based on your active profile.
          </p>
        </div>
      ) : loading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const applied = appliedIds.includes(match.id)
            return (
              <article
                key={match.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-foreground">{match.role}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">{match.company}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {match.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-center">
                    <span className="text-2xl font-bold text-primary">
                      {match.matchScore}%
                    </span>
                    <span className="text-xs text-muted-foreground">match score</span>
                  </div>
                </div>

                {match.reasoning && (
                  <div className="mt-3.5 flex items-start gap-2 rounded-xl bg-accent/50 p-3 text-xs text-accent-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="leading-relaxed">
                      <span className="font-medium text-foreground">AI Match Analysis: </span>
                      {match.reasoning}
                    </p>
                  </div>
                )}

                {match.description && (
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {match.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {match.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      {match.stipend}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => handlePrepareInterviewClick(match.role)}
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Prepare Interview
                    </Button>
                    <Button
                      size="sm"
                      variant={applied ? "secondary" : "default"}
                      disabled={applied}
                      className={applied ? "opacity-90 font-medium cursor-not-allowed" : "gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"}
                      onClick={() => openApplyModal(match)}
                    >
                      {applied ? "Applied ✅" : (
                        <>
                          <span>Apply Now</span>
                          <Send className="h-3.5 w-3.5 opacity-70" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Portal In-App Direct Application Modal */}
      {selectedInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 text-gray-900 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold">Apply for {selectedInternship.role}</h3>
                <p className="text-xs text-gray-500">{selectedInternship.company} • {selectedInternship.location}</p>
              </div>
              <button onClick={() => setSelectedInternship(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-gray-700 block mb-1">Candidate Profile</label>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-purple-950">{profile?.fullName || "Priyanka D"}</p>
                    <p className="text-purple-700">{profile?.email || "priyankadhanasekaran2005@gmail.com"}</p>
                  </div>
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 block mb-1">Cover Note / Application Details</label>
                <textarea
                  rows={4}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setSelectedInternship(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitApplication} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}