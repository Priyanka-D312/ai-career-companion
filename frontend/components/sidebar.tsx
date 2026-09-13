"use client"

import {
  User,
  FileText,
  Briefcase,
  BarChart3,
  Mail,
  Send,
  LogOut,
  LogIn,
  Sparkles,
  Bot,
  HelpCircle,
  UserCheck,
} from "lucide-react"
import { navItems, type NavId, type Profile } from "@/lib/career-data"
import { cn } from "@/lib/utils"

const icons: Partial<Record<NavId, React.ComponentType<{ className?: string }>>> = {
  profile: User,
  resumes: FileText,
  internships: Briefcase,
  skills: BarChart3,
  "interview-prep": Bot,
  "cover-letter": Mail,
  applications: Send,
}

type SidebarProps = {
  active?: NavId | string
  activeTab?: NavId | string
  onSelect: (id: any) => void
  profile: Profile
  isLoggedIn?: boolean
  onOpenAuth?: (mode?: "login" | "register") => void
  onLogout?: () => void
}

export function Sidebar({
  active,
  activeTab,
  onSelect,
  profile,
  isLoggedIn = true,
  onOpenAuth,
  onLogout,
}: SidebarProps) {
  const currentActive = activeTab || active || "profile"
  const initials = (profile.fullName || "User")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U"

  const items = navItems.some((item) => item.id === "interview-prep")
    ? navItems
    : [
        ...navItems,
        { id: "interview-prep" as NavId, label: "Interview Prep Agent", badge: "AI" },
      ]

  return (
    <aside className="flex h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-sidebar-foreground">AI Career</p>
          <p className="text-xs text-muted-foreground">Companion</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
        {items.map((item) => {
          const Icon = icons[item.id] || (item.id === "interview-prep" ? Bot : HelpCircle)
          const isActive = currentActive === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? "page" : undefined}
              data-tab={item.id}
              className={cn(
                "group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-sidebar-foreground",
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-3">
        <div className="rounded-xl border border-sidebar-border bg-card p-3 shadow-xs">
          <div
            onClick={() => onSelect("profile")}
            className="flex items-center gap-3 cursor-pointer group"
            title="View or edit your profile"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary transition-colors group-hover:bg-primary/25">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground group-hover:text-primary transition-colors">
                {profile.fullName || "Candidate"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{profile.email || "No email set"}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenAuth?.("login")}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  title="Switch or re-authenticate account"
                >
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => onLogout?.()}
                  className="flex items-center justify-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                  title="Sign out of current account"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Exit</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth?.("login")}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
