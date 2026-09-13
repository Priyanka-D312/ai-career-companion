import type { Profile, Application, InternshipMatch } from "./career-data"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`API error (${response.status}): ${errorText || response.statusText}`)
  }

  return response.json()
}

// ---------------------------------------------------------------------------
// Authentication & Profile Endpoints
// ---------------------------------------------------------------------------

export async function fetchProfile(): Promise<Profile> {
  return request<Profile>("/v1/profile")
}

export async function updateProfile(profile: Profile): Promise<Profile> {
  return request<Profile>("/v1/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  })
}

export async function registerUser(data: {
  email: string
  password: string
  fullName: string
  education?: string
  technicalSkills?: string
  phoneNumber?: string
  bio?: string
}): Promise<Profile & { id: string; token?: string }> {
  return request("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function loginUser(data: {
  email: string
  password: string
}): Promise<Profile & { id: string; token?: string }> {
  return request("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function fetchCurrentUser(): Promise<Profile & { id: string; token?: string }> {
  return request("/v1/auth/me")
}

export async function logoutUser(): Promise<{ message: string }> {
  return request("/v1/auth/logout", {
    method: "POST",
  })
}

// ---------------------------------------------------------------------------
// Dynamic Internship Matching Endpoints
// ---------------------------------------------------------------------------

export async function fetchInternshipMatches(query?: string): Promise<InternshipMatch[]> {
  const endpoint = query ? `/v1/internships?query=${encodeURIComponent(query)}` : "/v1/internships"
  return request<InternshipMatch[]>(endpoint)
}

// ---------------------------------------------------------------------------
// Applications Management Endpoints
// ---------------------------------------------------------------------------

export async function fetchApplications(): Promise<Application[]> {
  return request<Application[]>("/v1/applications")
}

export async function createApplication(data: {
  company: string
  role: string
  location: string
  status?: string
  applyUrl?: string
}): Promise<Application> {
  return request<Application>("/v1/applications/apply", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function applyForInternship(data: {
  company: string
  role: string
  location: string
  email?: string
  fullName?: string
  applyUrl?: string
}): Promise<{
  success: boolean
  application: Application
  emailConfirmation?: {
    recipient: string
    subject: string
    timestamp: string
    status: string
  }
}> {
  return request("/v1/applications/apply", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateApplicationStatus(id: string, status: string): Promise<Application> {
  return request<Application>(`/v1/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export async function deleteApplication(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/v1/applications/${id}`, {
    method: "DELETE",
  })
}

// ---------------------------------------------------------------------------
// Resume & Cover Letter Services
// ---------------------------------------------------------------------------

export async function uploadResume(file: File): Promise<Profile> {
  const formData = new FormData()
  formData.append("file", file)

  const url = `${API_BASE}/v1/upload-resume`
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`Resume upload failed (${response.status}): ${errorText || response.statusText}`)
  }

  return response.json()
}

export async function generateCoverLetter(data: {
  role: string
  company: string
  jobDescription?: string
}): Promise<{ coverLetter: string }> {
  return request<{ coverLetter: string }>("/v1/cover-letter/generate", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function fetchSkillAnalysis(): Promise<{
  candidateSkills: string[]
  topMarketSkills: { skill: string; demand: number }[]
  missingSkills: string[]
  matchPercentage: number
}> {
  return request("/v1/skills/analysis")
}

// ---------------------------------------------------------------------------
// AI Interview Preparation Agent API Client
// ---------------------------------------------------------------------------

export async function sendInterviewChatMessage(data: {
  message: string
  targetRole?: string
  history?: { role: string; content: string }[]
  apiKey?: string
}): Promise<{ reply: string; hasDocument: boolean; documentName?: string }> {
  return request("/v1/interview-agent/chat", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function fetchRoleRecommendations(): Promise<{
  recommendedRoles: Array<{
    role: string
    matchScore: number
    matchingSkills: string[]
    description: string
    keyTopics: string[]
    whyRecommend: string
  }>
  strongestSkills: string[]
  skillCategories: Record<string, string[]>
  analysisSummary: string
}> {
  return request("/v1/interview-agent/recommend-roles")
}

export async function fetchRoleInterviewPrep(role: string): Promise<{
  role: string
  technicalQuestions: Array<{
    question: string
    category: string
    difficulty: string
    expectedKeyPoints: string[]
    sampleAnswerGuidance: string
    candidateContextTip: string
    codeSnippet?: string
  }>
  hrQuestions: Array<{
    question: string
    category: string
    difficulty: string
    expectedKeyPoints: string[]
    sampleAnswerGuidance: string
    candidateContextTip: string
  }>
  preparationRoadmap: {
    title: string
    phases: Array<{ phase: string; tasks: string[] }>
  }
  learningPathRecommendations: string[]
  topicsToPrepare: string[]
}> {
  return request(`/v1/interview-agent/prep-questions?role=${encodeURIComponent(role)}`)
}

export async function fetchRoleRoadmap(role: string): Promise<{
  title: string
  phases: Array<{ phase: string; tasks: string[] }>
}> {
  return request(`/v1/interview-agent/roadmap?role=${encodeURIComponent(role)}`)
}

export async function uploadDocumentForQA(file: File): Promise<{
  metadata: {
    filename: string
    fileType: string
    charCount: number
    wordCount: number
    chunkCount: number
    summary: string
    uploadedAt: string
  }
  sampleQA: Array<{ question: string; answer: string }>
}> {
  const formData = new FormData()
  formData.append("file", file)

  const url = `${API_BASE}/v1/interview-agent/upload-document`
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`Document upload failed (${response.status}): ${errorText || response.statusText}`)
  }

  return response.json()
}

export async function fetchDocumentStatus(): Promise<{
  hasDocument: boolean
  filename?: string
  fileType?: string
  wordCount?: number
  chunkCount?: number
  uploadedAt?: string
  summary?: string
}> {
  return request("/v1/interview-agent/document-status")
}

export async function clearDocumentContext(): Promise<{ message: string; hasDocument: boolean }> {
  return request("/v1/interview-agent/document", {
    method: "DELETE",
  })
}

export async function generateDocumentQA(data?: {
  question?: string
  generateQuestionsCount?: number
}): Promise<{
  question?: string
  answer?: string
  questions?: Array<{ question: string; answer: string }>
}> {
  return request("/v1/interview-agent/document-qa", {
    method: "POST",
    body: JSON.stringify(data || {}),
  })
}