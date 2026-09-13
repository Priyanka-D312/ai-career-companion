"use client"

import { useState } from "react"
import { Sparkles, Copy, Check, FileText, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateCoverLetter } from "@/lib/api"
import type { Profile } from "@/lib/career-data"

type CoverLetterViewProps = {
  profile: Profile
}

const sampleRoles = [
  { company: "Nimbus AI", role: "Generative AI & LLM Intern" },
  { company: "Datawave", role: "Machine Learning Intern" },
  { company: "Orbit Labs", role: "Full Stack Web Development Intern" },
  { company: "CloudScale Systems", role: "Backend Engineering Intern" },
]

export function CoverLetterView({ profile }: CoverLetterViewProps) {
  const [company, setCompany] = useState("Nimbus AI")
  const [role, setRole] = useState("Generative AI & LLM Intern")
  const [jobDescription, setJobDescription] = useState("")
  const [letter, setLetter] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setLetter("")
    try {
      const res = await generateCoverLetter({ company, role, jobDescription })
      setLetter(res.coverLetter)
    } catch (err) {
      console.error("Cover letter generation error:", err)
      setLetter(
        `Dear Hiring Manager at ${company},\n\nI am writing to express my interest in the ${role} position. With my background in ${profile.education} and skills in ${profile.technicalSkills}, I am confident in my ability to add value to your team.\n\nSincerely,\n${profile.fullName}\n${profile.email}`
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!letter) return
    navigator.clipboard.writeText(letter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!letter) return
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Cover_Letter_${company.replace(/\s+/g, "_")}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">AI Cover Letter Generator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate custom, high-converting cover letters tailored to your profile and target internship roles.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Select Target Internship
          </label>
          <div className="flex flex-wrap gap-2">
            {sampleRoles.map((item) => (
              <button
                key={item.company}
                type="button"
                onClick={() => {
                  setCompany(item.company)
                  setRole(item.role)
                }}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                  company === item.company
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {item.company} ({item.role})
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleGenerate} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="company" className="text-xs font-medium text-foreground">
              Company Name
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Nimbus AI"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="role" className="text-xs font-medium text-foreground">
              Role / Position Title
            </label>
            <input
              id="role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. AI Engineering Intern"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label htmlFor="jobDescription" className="text-xs font-medium text-foreground">
              Job Description / Requirements (Optional)
            </label>
            <textarea
              id="jobDescription"
              rows={3}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste any specific requirements or job description notes here to tailor the letter..."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="sm:col-span-2 pt-2">
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Generating..." : "Generate Tailored Cover Letter"}
            </Button>
          </div>
        </form>
      </div>

      {letter && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Generated Cover Letter</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                <Download className="h-4 w-4" />
                Download (.txt)
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <textarea
            rows={12}
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            className="w-full resize-none rounded-xl border border-input bg-background p-4 text-sm text-foreground leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 font-sans"
          />
        </div>
      )}
    </div>
  )
}
