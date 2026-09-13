export type NavId =
  | "profile"
  | "resumes"
  | "internships"
  | "skills"
  | "cover-letter"
  | "interview-prep"
  | "applications"

export type Profile = {
  fullName: string
  education: string
  technicalSkills: string
  bio: string
  phoneNumber: string
  email: string
}

export type Application = {
  id: string
  company: string
  role: string
  location: string
  status: "Applied" | "Interviewing" | "Offer" | "Rejected" | string
  appliedAt: string
}

export type InternshipMatch = {
  id: string
  company: string
  role: string
  location: string
  stipend: string
  matchScore: number
  skills: string[]
  description?: string
  reasoning?: string
  applyUrl?: string
}

export type RecommendedRole = {
  role: string
  matchScore: number
  matchingSkills: string[]
  description: string
  keyTopics: string[]
  whyRecommend: string
}

export type QuestionGuidance = {
  question: string
  category: string
  difficulty: string
  expectedKeyPoints: string[]
  sampleAnswerGuidance: string
  candidateContextTip: string
  codeSnippet?: string
}

export type InterviewPrepData = {
  role: string
  technicalQuestions: QuestionGuidance[]
  hrQuestions: QuestionGuidance[]
  preparationRoadmap: {
    title: string
    phases: { phase: string; tasks: string[] }[]
  }
  learningPathRecommendations: string[]
  topicsToPrepare: string[]
}

export type DocumentMeta = {
  filename: string
  fileType: string
  charCount: number
  wordCount: number
  chunkCount: number
  summary: string
  uploadedAt: string
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  suggestedActions?: string[]
}

export const initialProfile: Profile = {
  fullName: "Alex Chen",
  education: "B.S. Computer Science, University (2026)",
  technicalSkills: "Python, React, TypeScript, SQL, Node.js",
  bio: "Aspiring software engineer passionate about AI, web systems, and building high-impact products.",
  phoneNumber: "+1 (555) 234-5678",
  email: "alex.chen@example.com",
}

// Pool of internships the matcher can surface, ranked by fit.
export const internshipPool: InternshipMatch[] = [
  {
    id: "m1",
    company: "Nimbus AI",
    role: "Frontend Engineering Intern",
    location: "Remote",
    stipend: "$7,200 / mo",
    matchScore: 94,
    skills: ["React", "TypeScript", "Tailwind"],
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Frontend+Engineering+Intern+Nimbus+AI",
  },
  {
    id: "m2",
    company: "Datawave",
    role: "Machine Learning Intern",
    location: "San Francisco, CA",
    stipend: "$8,000 / mo",
    matchScore: 88,
    skills: ["Python", "SQL", "PyTorch"],
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Machine+Learning+Intern+Datawave",
  },
  {
    id: "m3",
    company: "Orbit Labs",
    role: "Full Stack Intern",
    location: "Austin, TX",
    stipend: "$6,500 / mo",
    matchScore: 82,
    skills: ["Node.js", "React", "PostgreSQL"],
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Full+Stack+Intern+Orbit+Labs",
  },
  {
    id: "m4",
    company: "Beacon Health",
    role: "Software Engineering Intern",
    location: "Remote",
    stipend: "$6,000 / mo",
    matchScore: 76,
    skills: ["TypeScript", "GraphQL", "AWS"],
    applyUrl: "https://www.linkedin.com/jobs/search/?keywords=Software+Engineering+Intern+Beacon+Health",
  },
]

export const navItems: { id: NavId; label: string; badge?: string }[] = [
  { id: "profile", label: "My Profile" },
  { id: "resumes", label: "Resumes" },
  { id: "internships", label: "Internships" },
  { id: "skills", label: "Skill Analysis" },
  { id: "interview-prep", label: "Interview Prep Agent", badge: "AI" },
  { id: "cover-letter", label: "Cover Letter" },
  { id: "applications", label: "Applications" },
]

