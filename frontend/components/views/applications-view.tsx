"use client"

import { useState } from "react"
import { Inbox, MapPin, Plus, Filter, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Application } from "@/lib/career-data"

type ApplicationsViewProps = {
  applications: Application[]
  onAddCustom?: (data: { company: string; role: string; location: string; status: string }) => void
  onAddSample?: () => void
  onUpdateStatus?: (id: string, status: string) => void
  onDelete?: (id: string) => void
}

const statusStyles: Record<string, string> = {
  Applied: "bg-secondary text-secondary-foreground border-secondary",
  Interviewing: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  Offer: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
}

const availableStatuses = ["Applied", "Interviewing", "Offer", "Rejected"]

export function ApplicationsView({
  applications,
  onAddCustom,
  onAddSample,
  onUpdateStatus,
  onDelete,
}: ApplicationsViewProps) {
  const [filter, setFilter] = useState<string>("All")
  const [showAddForm, setShowAddForm] = useState(false)
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [location, setLocation] = useState("Remote")
  const [status, setStatus] = useState("Applied")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!company.trim() || !role.trim()) return
    if (onAddCustom) {
      onAddCustom({
        company: company.trim(),
        role: role.trim(),
        location: location.trim() || "Remote",
        status,
      })
    }
    setCompany("")
    setRole("")
    setLocation("Remote")
    setStatus("Applied")
    setShowAddForm(false)
  }

  const filtered = filter === "All"
    ? applications
    : applications.filter((a) => a.status.toLowerCase() === filter.toLowerCase())

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Applications Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track every internship application in real time with dynamic status updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onAddSample && (
            <Button variant="outline" size="sm" onClick={onAddSample}>
              + Quick Sample
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-1.5">
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? "Cancel" : "Add Application"}
          </Button>
        </div>
      </header>

      {/* Add Custom Application Card */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-semibold text-foreground">Track New Internship Application</h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="app-company" className="text-xs font-medium text-foreground">
                Company Name *
              </label>
              <input
                id="app-company"
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. OpenAI, Microsoft"
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="app-role" className="text-xs font-medium text-foreground">
                Role / Title *
              </label>
              <input
                id="app-role"
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Software Engineer Intern"
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="app-loc" className="text-xs font-medium text-foreground">
                Location
              </label>
              <input
                id="app-loc"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, San Francisco, CA"
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="app-status" className="text-xs font-medium text-foreground">
                Current Status
              </label>
              <select
                id="app-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-ring"
              >
                {availableStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Application
            </Button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground mr-1">
          <Filter className="h-3.5 w-3.5" /> Filter:
        </span>
        {["All", "Applied", "Interviewing", "Offer", "Rejected"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilter(st)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filter === st
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {st} ({st === "All" ? applications.length : applications.filter((a) => a.status.toLowerCase() === st.toLowerCase()).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Inbox className="h-7 w-7 text-muted-foreground" />
          </span>
          <p className="mt-4 text-base font-medium text-foreground">
            {applications.length === 0 ? "No active applications yet" : `No applications with status "${filter}"`}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Once you apply to an internship or add one above, it will show up here so you can track its status.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((app) => (
            <article
              key={app.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-border/80 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">{app.role}</h2>
                  <p className="text-sm text-muted-foreground">{app.company}</p>
                </div>
                {onUpdateStatus ? (
                  <div className="relative inline-block">
                    <select
                      value={app.status}
                      onChange={(e) => onUpdateStatus(app.id, e.target.value)}
                      className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium outline-none transition-colors ${
                        statusStyles[app.status] || "bg-secondary text-secondary-foreground border-transparent"
                      }`}
                    >
                      {availableStatuses.map((s) => (
                        <option key={s} value={s} className="bg-card text-foreground">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                      statusStyles[app.status] || "bg-secondary text-secondary-foreground border-transparent"
                    }`}
                  >
                    {app.status}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/40">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {app.location}
                </span>
                <div className="flex items-center gap-3">
                  <span>{app.appliedAt}</span>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(app.id)}
                      title="Delete Application"
                      className="text-muted-foreground/60 hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
