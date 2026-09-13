"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Profile } from "@/lib/career-data"

type ProfileViewProps = {
  profile: Profile
  onSave: (profile: Profile) => void
}

const fields: {
  key: keyof Profile
  label: string
  type?: string
  textarea?: boolean
  placeholder: string
}[] = [
  { key: "fullName", label: "Full Name", placeholder: "Your full name" },
  { key: "email", label: "Email Address", type: "email", placeholder: "you@example.com" },
  { key: "education", label: "Education", placeholder: "Degree, school, graduation year" },
  {
    key: "technicalSkills",
    label: "Technical Skills",
    placeholder: "e.g. React, Python, SQL, TypeScript",
  },
  { key: "phoneNumber", label: "Phone Number", type: "tel", placeholder: "+1 (555) 000-0000" },
  { key: "bio", label: "Bio / Professional Summary", textarea: true, placeholder: "Tell us about your interests, technical projects, and career goals" },
]

export function ProfileView({ profile, onSave }: ProfileViewProps) {
  const [form, setForm] = useState<Profile>(profile)
  const [saved, setSaved] = useState(false)

  // Sync internal form state if prop changes (e.g., initial fetch from API)
  const [lastProp, setLastProp] = useState(profile)
  if (profile !== lastProp) {
    setLastProp(profile)
    setForm(profile)
  }

  const update = (key: keyof Profile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
    setSaved(true)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your details up to date to get better internship matches.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-5">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label
                htmlFor={field.key}
                className="text-sm font-medium text-foreground"
              >
                {field.label}
              </label>
              {field.textarea ? (
                <textarea
                  id={field.key}
                  rows={4}
                  value={form[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground leading-relaxed outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              ) : (
                <input
                  id={field.key}
                  type={field.type ?? "text"}
                  value={form[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit">Save Changes</Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Check className="h-4 w-4" />
              Profile saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
