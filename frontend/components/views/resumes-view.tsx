"use client"

import { useState, useRef } from "react"
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, User, GraduationCap, Code2, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Profile } from "@/lib/career-data"
import { uploadResume } from "@/lib/api"

type ResumesViewProps = {
  profile: Profile
  onProfileUpdated: (updated: Profile) => void
}

export function ResumesView({ profile, onProfileUpdated }: ResumesViewProps) {
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = async (file: File) => {
    if (!file) return
    if (!file.name.match(/\.(pdf|docx|doc|txt)$/i)) {
      setError("Please upload a valid document format (.pdf, .docx, or .txt)")
      return
    }

    setUploadedFile(file)
    setLoading(true)
    setError(null)
    setParsedData(null)

    try {
      const updatedProfile = await uploadResume(file)
      setParsedData(updatedProfile)
      onProfileUpdated(updatedProfile)
    } catch (err: any) {
      console.error("Resume parsing error:", err)
      setError(err?.message || "Failed to process resume. Please try another file.")
    } finally {
      setLoading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Resume Upload & Parsing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your resume (PDF or DOCX). AI will extract your education, skills, and contact details to update your candidate profile in real time.
        </p>
      </header>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          dragActive
            ? "border-primary bg-primary/5 shadow-md scale-[1.01]"
            : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary mb-4">
          <Upload className="h-7 w-7" />
        </div>

        <p className="text-base font-semibold text-foreground">
          Click to upload or drag & drop your resume
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Supports PDF, DOCX, or TXT up to 10MB
        </p>

        {uploadedFile && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 text-xs text-secondary-foreground">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-medium">{uploadedFile.name}</span>
            <span className="text-muted-foreground">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="font-medium text-foreground">Analyzing Resume & Extracting Data...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Running text extraction and updating candidate profile database...
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Extracted Data Result */}
      {(parsedData || profile) && !loading && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Active Candidate Profile</h2>
            </div>
            {parsedData && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Parsed & Synced to Database
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-accent/40 p-4">
              <User className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Full Name</p>
                <p className="text-sm font-semibold text-foreground">{parsedData?.fullName || profile.fullName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-accent/40 p-4">
              <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Education</p>
                <p className="text-sm font-semibold text-foreground">{parsedData?.education || profile.education}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-accent/40 p-4">
              <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="text-sm font-semibold text-foreground">{parsedData?.email || profile.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-accent/40 p-4">
              <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Phone</p>
                <p className="text-sm font-semibold text-foreground">{parsedData?.phoneNumber || profile.phoneNumber}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-accent/40 p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Code2 className="h-4 w-4 text-primary" />
              <span>Extracted Technical Skills</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(parsedData?.technicalSkills || profile.technicalSkills)
                .split(",")
                .map((s, idx) => {
                  const skill = s.trim()
                  if (!skill) return null
                  return (
                    <span
                      key={`${skill}-${idx}`}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {skill}
                    </span>
                  )
                })}
            </div>
          </div>

          <div className="rounded-xl bg-accent/40 p-4 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Candidate Summary & Bio</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed pt-1">
              {parsedData?.bio || profile.bio}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Different Resume
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
