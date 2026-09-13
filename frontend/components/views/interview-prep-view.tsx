"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Bot,
  User,
  Send,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  Trash2,
  Key,
  HelpCircle,
  Briefcase,
  Layers,
  Calendar,
  Copy,
  Check,
  ChevronDown,
  RefreshCw,
  FileUp,
  X,
  ExternalLink,
  Search,
} from "lucide-react"
import {
  type Profile,
  type ChatMessage,
  type RecommendedRole,
  type QuestionGuidance,
  type DocumentMeta,
} from "@/lib/career-data"
import {
  sendInterviewChatMessage,
  fetchRoleRecommendations,
  fetchRoleInterviewPrep,
  uploadDocumentForQA,
  fetchDocumentStatus,
  clearDocumentContext,
  generateDocumentQA,
} from "@/lib/api"
import { cn } from "@/lib/utils"

interface InterviewPrepViewProps {
  profile: Profile
  initialTargetRole?: string
  targetRole?: string
  selectedRole?: string
  role?: string
  onNavigateToResumes?: () => void
}

const COMMON_ROLES = [
  "Frontend Engineering Intern",
  "Full Stack Web Development Intern",
  "Backend Engineering Intern",
  "Machine Learning & Data Science Intern",
  "Generative AI & LLM Intern",
  "Cloud & DevOps Engineering Intern",
  "Data Engineer Intern",
  "Cybersecurity Analyst Intern",
  "Mobile App Development Intern",
  "Site Reliability Engineering (SRE) Intern",
  "AI Research Intern",
]

export function InterviewPrepView({
  profile,
  initialTargetRole,
  targetRole: propTargetRole,
  selectedRole,
  role: propRole,
  onNavigateToResumes,
}: InterviewPrepViewProps) {
  const currentRole =
    selectedRole || propTargetRole || propRole || initialTargetRole || "Frontend Engineering Intern"
  const [targetRole, setTargetRole] = useState(currentRole)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)

  useEffect(() => {
    const updated = selectedRole || propTargetRole || propRole || initialTargetRole
    if (updated) {
      setTargetRole(updated)
    }
  }, [selectedRole, propTargetRole, propRole, initialTargetRole])
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello **${profile.fullName || "there"}**! 👋 I am your **AI Interview Preparation Coach**.\n\nI have loaded your parsed resume data:\n- **Education**: ${profile.education}\n- **Technical Skills**: ${profile.technicalSkills}\n\nAsk me anything like:\n- *"Which role can I apply for?"*\n- *"What are my strongest technical skills?"*\n- *"Generate technical questions for ${initialTargetRole || "Frontend Engineering Intern"}"*\n- *"Give me HR questions with STAR method guidance"*\n- *"Build a 2-week preparation roadmap"*\n\nYou can also upload a **PDF or DOCX** study guide or job description using the upload zone above to ask questions about it!`,
      timestamp: "Just now",
      suggestedActions: [
        "Which role can I apply for?",
        "What are my strongest technical skills?",
        `Generate Technical Questions for ${initialTargetRole || "Frontend Engineering Intern"}`,
        "Give me HR questions with STAR method",
        "Build a 2-week preparation roadmap",
      ],
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Document context state
  const [activeDoc, setActiveDoc] = useState<DocumentMeta | null>(null)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const [docUploadError, setDocUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // API Key modal
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null)

  // Role recommendations modal / quick view
  const [showRolesModal, setShowRolesModal] = useState(false)
  const [recommendedRoles, setRecommendedRoles] = useState<RecommendedRole[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if an existing document is in context
    fetchDocumentStatus()
      .then((status) => {
        if (status.hasDocument && status.filename) {
          setActiveDoc({
            filename: status.filename,
            fileType: status.fileType || "doc",
            charCount: 0,
            wordCount: status.wordCount || 0,
            chunkCount: status.chunkCount || 0,
            summary: status.summary || "",
            uploadedAt: status.uploadedAt || "",
          })
        }
      })
      .catch(() => {})

    const key = localStorage.getItem("ai_prep_api_key")
    if (key) {
      setApiKey(key)
      setSavedApiKey(key)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim()
    if (!query || isTyping) return

    setInputMessage("")
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await sendInterviewChatMessage({
        message: query,
        targetRole,
        history: historyPayload,
        apiKey: savedApiKey || undefined,
      })

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Sorry, I encountered an error connecting to the agent engine: ${err?.message || "Please check that your backend is running."}`,
        timestamp: "Just now",
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingDoc(true)
    setDocUploadError(null)

    try {
      const res = await uploadDocumentForQA(file)
      setActiveDoc(res.metadata)

      const docNotice: ChatMessage = {
        id: `doc-${Date.now()}`,
        role: "assistant",
        content: `📄 **Document Uploaded & Indexed Successfully!**\n\n**File**: \`${res.metadata.filename}\` (${res.metadata.wordCount} words, ${res.metadata.chunkCount} indexed chunks)\n\n**Summary**: ${res.metadata.summary}\n\nYou can now ask questions about this document or click the buttons below:`,
        timestamp: "Just now",
        suggestedActions: [
          `Summarize ${res.metadata.filename}`,
          "Generate 4 study questions from this document",
          "What are the key technical concepts in this document?",
        ],
      }
      setMessages((prev) => [...prev, docNotice])
    } catch (err: any) {
      setDocUploadError(err?.message || "Failed to upload and parse document.")
    } finally {
      setIsUploadingDoc(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleClearDoc = async () => {
    try {
      await clearDocumentContext()
      setActiveDoc(null)
      const notice: ChatMessage = {
        id: `cleardoc-${Date.now()}`,
        role: "system",
        content: "Document context has been cleared.",
        timestamp: "Just now",
      }
      setMessages((prev) => [...prev, notice])
    } catch (err) {
      console.error(err)
    }
  }

  const handleFetchRoleRecommendations = async () => {
    setLoadingRoles(true)
    setShowRolesModal(true)
    try {
      const res = await fetchRoleRecommendations()
      setRecommendedRoles(res.recommendedRoles)
    } catch (err) {
      console.error("Failed to load role recommendations:", err)
    } finally {
      setLoadingRoles(false)
    }
  }

  const handleSelectRoleFromRec = (roleName: string) => {
    setTargetRole(roleName)
    setShowRolesModal(false)
    handleSendMessage(`I selected the **${roleName}** role. Please prepare me for this role with technical questions and an interview roadmap.`)
  }

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("ai_prep_api_key", apiKey.trim())
      setSavedApiKey(apiKey.trim())
    } else {
      localStorage.removeItem("ai_prep_api_key")
      setSavedApiKey(null)
    }
    setShowApiKeyModal(false)
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Quick formatted render of markdown-like text
  const renderFormattedContent = (content: string) => {
    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {content.split("\n\n").map((block, idx) => {
          if (block.startsWith("```")) {
            const lines = block.split("\n")
            const lang = lines[0].replace("```", "") || "code"
            const code = lines.slice(1, -1).join("\n")
            return (
              <div key={idx} className="my-3 overflow-hidden rounded-lg border border-border bg-muted/60">
                <div className="flex items-center justify-between border-b border-border bg-muted/90 px-3 py-1.5 text-xs text-muted-foreground">
                  <span className="font-mono uppercase">{lang}</span>
                  <button
                    onClick={() => handleCopy(code, `code-${idx}`)}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    {copiedId === `code-${idx}` ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedId === `code-${idx}` ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto p-3 font-mono text-xs">
                  <code>{code}</code>
                </pre>
              </div>
            )
          }

          if (block.startsWith("### ")) {
            return (
              <h3 key={idx} className="pt-2 text-base font-semibold text-foreground">
                {block.replace("### ", "")}
              </h3>
            )
          }
          if (block.startsWith("## ")) {
            return (
              <h2 key={idx} className="pt-3 text-lg font-bold text-foreground">
                {block.replace("## ", "")}
              </h2>
            )
          }

          if (block.startsWith("> ")) {
            return (
              <blockquote key={idx} className="border-l-4 border-primary/50 bg-primary/5 py-1 pl-3 text-muted-foreground italic rounded-r">
                {block.replace(/^> /gm, "")}
              </blockquote>
            )
          }

          if (block.startsWith("- ") || block.startsWith("* ")) {
            return (
              <ul key={idx} className="list-inside list-disc space-y-1 pl-2">
                {block.split("\n").map((li, lIdx) => (
                  <li key={lIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(li.replace(/^[\-\*]\s+/, "")) }} />
                ))}
              </ul>
            )
          }

          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(block) }} />
          )
        })}
      </div>
    )
  }

  const formatInlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code class='rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-primary'>$1</code>")
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-4">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">AI Interview Preparation Agent</h1>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Resume Context Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Candidate: <span className="font-semibold text-foreground">{profile.fullName}</span> • {profile.education.split(",")[0]}
            </p>
          </div>
        </div>

        {/* Searchable & Editable Target Role Combobox */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground whitespace-nowrap font-medium">Target Role:</span>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => {
                  setTargetRole(e.target.value)
                  setRoleDropdownOpen(true)
                }}
                onFocus={() => setRoleDropdownOpen(true)}
                placeholder="Type any target role..."
                className="w-44 sm:w-56 bg-transparent font-semibold text-foreground outline-none placeholder:text-muted-foreground/60 text-xs"
              />
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                title="Toggle suggested roles"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${roleDropdownOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {roleDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setRoleDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 z-30 w-72 max-h-56 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Select or Type Custom Role
                  </div>
                  {COMMON_ROLES.filter((r) =>
                    !targetRole || r.toLowerCase().includes(targetRole.toLowerCase())
                  ).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setTargetRole(r)
                        setRoleDropdownOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                        targetRole.toLowerCase() === r.toLowerCase()
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-popover-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{r}</span>
                      {targetRole.toLowerCase() === r.toLowerCase() && (
                        <Check className="h-3 w-3 shrink-0" />
                      )}
                    </button>
                  ))}
                  {targetRole && !COMMON_ROLES.some((r) => r.toLowerCase() === targetRole.toLowerCase()) && (
                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setRoleDropdownOpen(false)}
                        className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs text-primary font-semibold hover:bg-primary/10 transition-colors"
                      >
                        <Sparkles className="h-3 w-3" />
                        Custom Role: &quot;{targetRole}&quot;
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleFetchRoleRecommendations}
            className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Role Fit
          </button>

          <button
            onClick={() => setShowApiKeyModal(true)}
            title="Configure Gemini or OpenAI API Key"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Key className="h-3.5 w-3.5" />
            <span>{savedApiKey ? "API Key Set" : "LLM Settings"}</span>
          </button>

          <button
            onClick={() => {
              setMessages([
                {
                  id: "welcome-reset",
                  role: "assistant",
                  content: `Conversation reset. Ready to prepare you for **${targetRole}** or evaluate your resume!`,
                  timestamp: "Just now",
                },
              ])
            }}
            title="Reset Chat"
            className="flex items-center gap-1 rounded-lg border border-border bg-background p-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Document Upload & Context Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card/60 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <FileUp className="h-4 w-4 text-primary" />
          <div className="text-xs">
            <span className="font-semibold text-foreground">Document-Based Q&A Context:</span>{" "}
            {activeDoc ? (
              <span className="text-muted-foreground">
                Loaded <span className="font-medium text-foreground">"{activeDoc.filename}"</span> ({activeDoc.wordCount} words)
              </span>
            ) : (
              <span className="text-muted-foreground">
                Upload a study guide, course syllabus, or job description (PDF or DOCX) to ground Q&A.
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          {activeDoc ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSendMessage(`Generate 4 interview questions and answers based on the uploaded document ${activeDoc.filename}.`)}
                className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Generate Doc Q&A
              </button>
              <button
                onClick={handleClearDoc}
                title="Remove Document"
                className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingDoc}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {isUploadingDoc ? "Extracting..." : "Upload PDF / DOCX"}
            </button>
          )}
        </div>
      </div>

      {docUploadError && (
        <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive flex items-center justify-between">
          <span>{docUploadError}</span>
          <button onClick={() => setDocUploadError(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Main Chat Container */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === "user"
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-3xl",
                  isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold shadow-xs",
                    isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground border border-border"
                  )}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
                </div>

                <div className="flex flex-col gap-1.5 max-w-[85%]">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 shadow-xs",
                      isUser
                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                        : "bg-muted/40 border border-border rounded-tl-xs text-foreground"
                    )}
                  >
                    {isUser ? (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    ) : (
                      renderFormattedContent(msg.content)
                    )}
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-2 px-1 text-[11px] text-muted-foreground",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="hover:text-foreground flex items-center gap-1"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                      </button>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestedActions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleSendMessage(action)}
                          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors text-left"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {isTyping && (
            <div className="flex gap-3 max-w-3xl mr-auto">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-2xl rounded-tl-xs border border-border bg-muted/40 px-4 py-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-muted-foreground ml-1.5">AI Agent is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="border-t border-border bg-muted/20 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
            Quick Prompts:
          </span>
          <button
            onClick={() => handleSendMessage("Which role can I apply for based on my resume?")}
            className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            🎯 Role Recommendations
          </button>
          <button
            onClick={() => handleSendMessage("What are my strongest technical skills and where do I shine?")}
            className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            💪 Strongest Skills
          </button>
          <button
            onClick={() => handleSendMessage(`Generate technical interview questions with answer guidance for ${targetRole}`)}
            className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            💻 Technical Questions
          </button>
          <button
            onClick={() => handleSendMessage(`Provide HR and behavioral interview questions using the STAR method for ${targetRole}`)}
            className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            🤝 HR STAR Questions
          </button>
          <button
            onClick={() => handleSendMessage(`Create a comprehensive 2-week interview preparation roadmap for ${targetRole}`)}
            className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            🗺️ Prep Roadmap
          </button>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Ask anything about roles, questions, answer guidance, or uploaded document...`}
              disabled={isTyping}
              className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Role Recommendations Modal */}
      {showRolesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="font-bold text-foreground text-base">Resume-Based Role Recommendations</h3>
                <p className="text-xs text-muted-foreground">
                  Matched against {profile.fullName}'s verified skills: {profile.technicalSkills}
                </p>
              </div>
              <button onClick={() => setShowRolesModal(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingRoles ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Analyzing skills, education, and market demand...
                </div>
              ) : (
                recommendedRoles.map((roleItem, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <h4 className="font-semibold text-foreground text-sm">{roleItem.role}</h4>
                      </div>
                      <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {roleItem.matchScore}% Match
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">{roleItem.description}</p>
                    <p className="text-xs font-medium text-foreground bg-muted/40 p-2 rounded-lg">
                      💡 {roleItem.whyRecommend}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
                      <div className="flex flex-wrap gap-1">
                        {roleItem.matchingSkills.map((sk) => (
                          <span key={sk} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {sk}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => handleSelectRoleFromRec(roleItem.role)}
                        className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Prepare for this Role →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground text-base">LLM Provider Settings</h3>
              </div>
              <button onClick={() => setShowApiKeyModal(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground space-y-1 border border-primary/20">
              <p className="font-semibold text-foreground">💡 Zero-Config Knowledge Engine Active</p>
              <p>
                The agent is pre-loaded with an offline AI preparation & document Q&A engine that works automatically without an external key.
              </p>
              <p>
                Optionally enter a <strong>Google Gemini API Key</strong> (or OpenAI Key) below to enable live cloud LLM responses.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Gemini or OpenAI API Key (Optional)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... or sk-..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setApiKey("")
                  localStorage.removeItem("ai_prep_api_key")
                  setSavedApiKey(null)
                  setShowApiKeyModal(false)
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                Clear Key
              </button>
              <button
                onClick={handleSaveApiKey}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
