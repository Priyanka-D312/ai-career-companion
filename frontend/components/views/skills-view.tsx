"use client"

import { useEffect, useState } from "react"
import { BarChart3, CheckCircle2, TrendingUp, AlertTriangle, Sparkles, Loader2, RefreshCw, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchSkillAnalysis } from "@/lib/api"
import type { Profile } from "@/lib/career-data"

type SkillsViewProps = {
  profile: Profile
  onAddSkill?: (skill: string) => void
}

export function SkillsView({ profile, onAddSkill }: SkillsViewProps) {
  const [analysis, setAnalysis] = useState<{
    candidateSkills: string[]
    topMarketSkills: { skill: string; demand: number }[]
    missingSkills: string[]
    matchPercentage: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingSkill, setAddingSkill] = useState<string | null>(null)

  const loadSkills = async () => {
    setLoading(true)
    try {
      const data = await fetchSkillAnalysis()
      setAnalysis(data)
    } catch (err) {
      console.error("Skill analysis fetch error:", err)
      // Provide fallback calculation from profile
      const profSkills = profile.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean)
      setAnalysis({
        candidateSkills: profSkills,
        topMarketSkills: [
          { skill: "Python", demand: 4 },
          { skill: "React", demand: 3 },
          { skill: "TypeScript", demand: 3 },
          { skill: "SQL", demand: 2 },
          { skill: "Docker", demand: 2 },
        ],
        missingSkills: ["Docker", "PyTorch", "Kubernetes", "AWS"].filter(
          (s) => !profSkills.some((p) => p.toLowerCase() === s.toLowerCase())
        ),
        matchPercentage: Math.min(95, Math.max(50, profSkills.length * 15)),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSkills()
  }, [profile])

  const handleAdd = (skill: string) => {
    if (!onAddSkill) return
    setAddingSkill(skill)
    onAddSkill(skill)
    setTimeout(() => {
      setAddingSkill(null)
    }, 1000)
  }

  const candidateSkills = profile.technicalSkills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Skill Analysis & Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare your technical skillset against target market demand to identify gaps and boost match rates.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSkills} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Analysis
        </Button>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="font-medium text-foreground">Analyzing market skills...</p>
        </div>
      ) : (
        <>
          {/* Match Score Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Market Competitiveness</span>
              </div>
              <h2 className="text-3xl font-bold text-foreground">
                {analysis?.matchPercentage ?? 85}% Alignment
              </h2>
              <p className="text-xs text-muted-foreground">
                Based on active internship roles in Nimbus AI, Datawave, Orbit Labs, and CloudScale.
              </p>
            </div>

            <div className="w-full sm:w-48 bg-secondary rounded-full h-3.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-1000"
                style={{ width: `${analysis?.matchPercentage ?? 85}%` }}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Active Candidate Skills */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold text-foreground">Your Verified Skills ({candidateSkills.length})</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {candidateSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Top Market Skills */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">High-Demand Industry Skills</h3>
              </div>
              <div className="space-y-2">
                {(analysis?.topMarketSkills || []).slice(0, 5).map((item) => (
                  <div key={item.skill} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{item.skill}</span>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-muted-foreground font-mono">
                      {item.demand} open roles
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Missing Skill Recommendations */}
          {analysis?.missingSkills && analysis.missingSkills.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h3 className="font-semibold">Recommended Skills to Add</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Adding these target skills to your profile can increase your candidate match score for high-paying roles. Click any skill to add it directly to your profile:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {analysis.missingSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleAdd(skill)}
                    className="group flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3 group-hover:scale-125 transition-transform" />
                    <span>{skill}</span>
                    {addingSkill === skill && <span className="text-[10px] opacity-75">(Added!)</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
