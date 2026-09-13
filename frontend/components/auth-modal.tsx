"use client"

import React, { useState } from "react"
import {
  X,
  Lock,
  Mail,
  User,
  GraduationCap,
  Code2,
  Sparkles,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Profile } from "@/lib/career-data"
import { loginUser, registerUser } from "@/lib/api"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (profile: Profile) => void
  initialMode?: "login" | "register"
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "login",
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Register form state
  const [regFullName, setRegFullName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regEducation, setRegEducation] = useState("B.S. Computer Science")
  const [regSkills, setRegSkills] = useState("React, TypeScript, Python, SQL")

  if (!isOpen) return null

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!loginEmail || !loginPassword) {
      setError("Please fill in both email and password.")
      return
    }

    setLoading(true)
    try {
      const user = await loginUser({
        email: loginEmail,
        password: loginPassword,
      })
      onSuccess(user)
      onClose()
    } catch (err: any) {
      setError(err?.message || "Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!regEmail || !regPassword || !regFullName) {
      setError("Please fill in your name, email, and password.")
      return
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)
    try {
      const user = await registerUser({
        email: regEmail,
        password: regPassword,
        fullName: regFullName,
        education: regEducation,
        technicalSkills: regSkills,
      })
      onSuccess(user)
      onClose()
    } catch (err: any) {
      setError(err?.message || "Registration failed. An account with this email may already exist.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {mode === "login" ? "Welcome Back" : "Create Your Profile"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === "login"
                ? "Sign in to access your customized career dashboard"
                : "Register to get personalized internship matches & interview prep"}
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="mb-6 flex rounded-xl border border-border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login")
              setError(null)
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "login"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register")
              setError(null)
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "register"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-tight">{error}</p>
          </div>
        )}

        {mode === "login" ? (
          /* Sign In Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 pr-10 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2 gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing In..." : "Sign In to Companion"}
            </Button>
          </form>
        ) : (
          /* Registration Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Full Name
              </label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="alex.chen@example.com"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2 pr-10 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                Education / University
              </label>
              <input
                type="text"
                value={regEducation}
                onChange={(e) => setRegEducation(e.target.value)}
                placeholder="Degree, university, graduation year"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
                Primary Technical Skills
              </label>
              <input
                type="text"
                value={regSkills}
                onChange={(e) => setRegSkills(e.target.value)}
                placeholder="e.g. React, TypeScript, Python, SQL"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-3 gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating Account..." : "Create Account & Start"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
