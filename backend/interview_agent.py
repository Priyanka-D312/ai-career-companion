"""
AI Interview Preparation Agent Engine.

Provides:
  1. Candidate Resume Context Integration (skills, education, projects, strengths).
  2. PDF / DOCX Document Content Extraction & In-Memory Semantic Chunking for Q&A.
  3. Resume-Based Role Recommendation & Skill Strength Analysis.
  4. Role-Specific Interview Preparation:
       - Technical Questions with Answer Guidance & Code Examples
       - HR & Behavioral Questions with STAR Method Coaching
       - Interview Preparation Roadmap & Structured Learning Path
  5. Document-Based Q&A Generation.
  6. Dual Execution Mode:
       - Live LLM calls via Google Gemini or OpenAI if API key is provided
       - Advanced Contextual Knowledge Engine for zero-config offline reliability
"""

from __future__ import annotations

import asyncio
import io
import math
import os
import re
import time
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
import httpx
from pydantic import BaseModel

# Initialize environment variables from .env
load_dotenv(override=True)
_backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_backend_env):
    load_dotenv(_backend_env, override=True)

# Google GenAI SDK
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    genai = None
    types = None
    GENAI_AVAILABLE = False


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: Optional[float] = None


class ChatRequest(BaseModel):
    message: str
    targetRole: Optional[str] = None
    sessionId: Optional[str] = "default"
    history: Optional[List[ChatMessage]] = []
    apiKey: Optional[str] = None
    provider: Optional[str] = "auto"  # "auto" | "gemini" | "openai" | "fallback"


class RoleRecommendationResponse(BaseModel):
    recommendedRoles: List[Dict[str, Any]]
    strongestSkills: List[str]
    skillCategories: Dict[str, List[str]]
    analysisSummary: str


class QuestionGuidance(BaseModel):
    question: str
    category: str  # "Technical" | "HR / Behavioral" | "System Design" | "Document Grounded"
    difficulty: str  # "Junior" | "Mid" | "Senior" | "Intern"
    expectedKeyPoints: List[str]
    sampleAnswerGuidance: str
    candidateContextTip: str
    codeSnippet: Optional[str] = None


class InterviewPrepResponse(BaseModel):
    role: str
    technicalQuestions: List[QuestionGuidance]
    hrQuestions: List[QuestionGuidance]
    preparationRoadmap: Dict[str, Any]
    learningPathRecommendations: List[str]
    topicsToPrepare: List[str]


class DocumentMeta(BaseModel):
    filename: str
    fileType: str
    charCount: int
    wordCount: int
    chunkCount: int
    summary: str
    uploadedAt: str


class DocumentQARequest(BaseModel):
    question: Optional[str] = None
    generateQuestionsCount: Optional[int] = 5
    apiKey: Optional[str] = None


# ---------------------------------------------------------------------------
# Document Context Store & Chunking
# ---------------------------------------------------------------------------

class DocumentStore:
    def __init__(self):
        self.filename: str = ""
        self.file_type: str = ""
        self.raw_text: str = ""
        self.chunks: List[str] = []
        self.summary: str = ""
        self.uploaded_at: str = ""

    def clear(self):
        self.filename = ""
        self.file_type = ""
        self.raw_text = ""
        self.chunks = []
        self.summary = ""
        self.uploaded_at = ""

    def has_document(self) -> bool:
        return bool(self.raw_text.strip())

    def set_document(self, filename: str, content: bytes, content_type: str = "") -> DocumentMeta:
        self.filename = filename
        self.file_type = filename.split(".")[-1].lower() if "." in filename else "txt"
        self.uploaded_at = time.strftime("%Y-%m-%d %H:%M:%S")

        raw_text = ""

        # PDF extraction
        if self.file_type == "pdf" or "pdf" in content_type:
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(content))
                pages = [page.extract_text() or "" for page in reader.pages]
                raw_text = "\n\n".join(p for p in pages if p)
            except Exception:
                try:
                    import pdfplumber
                    with pdfplumber.open(io.BytesIO(content)) as pdf:
                        pages = [page.extract_text() or "" for page in pdf.pages]
                        raw_text = "\n\n".join(p for p in pages if p)
                except Exception:
                    raw_text = content.decode("utf-8", errors="ignore")

        # DOCX extraction
        elif self.file_type in ("docx", "doc"):
            try:
                import docx
                doc = docx.Document(io.BytesIO(content))
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                for table in doc.tables:
                    for row in table.rows:
                        row_text = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                        if row_text:
                            paragraphs.append(row_text)
                raw_text = "\n\n".join(paragraphs)
            except Exception:
                raw_text = content.decode("utf-8", errors="ignore")

        else:
            raw_text = content.decode("utf-8", errors="ignore")

        self.raw_text = raw_text.strip()
        self.chunks = self._chunk_text(self.raw_text, chunk_size=800, overlap=150)
        self.summary = self._generate_summary(self.raw_text)

        words = len(self.raw_text.split())
        return DocumentMeta(
            filename=self.filename,
            fileType=self.file_type,
            charCount=len(self.raw_text),
            wordCount=words,
            chunkCount=len(self.chunks),
            summary=self.summary,
            uploadedAt=self.uploaded_at,
        )

    def _chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
        if not text:
            return []
        chunks = []
        start = 0
        text_len = len(text)
        while start < text_len:
            end = min(start + chunk_size, text_len)
            # Try to break at newline or space near end
            if end < text_len:
                cut = text.rfind("\n", start + chunk_size // 2, end)
                if cut == -1:
                    cut = text.rfind(". ", start + chunk_size // 2, end)
                if cut != -1 and cut > start:
                    end = cut + 1
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = max(end - overlap, start + 1)
        return chunks

    def _generate_summary(self, text: str) -> str:
        if not text:
            return "No content available."
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        # Take key initial non-empty lines
        header_snippet = " ".join(lines[:6])
        if len(header_snippet) > 300:
            header_snippet = header_snippet[:297] + "..."
        return f"Document containing {len(text.split())} words. Key overview: {header_snippet}"

    def search_chunks(self, query: str, top_k: int = 3) -> List[str]:
        if not self.chunks:
            return []
        query_words = set(re.findall(r"[a-z0-9]+", query.lower()))
        if not query_words:
            return self.chunks[:top_k]

        scored: List[Tuple[float, str]] = []
        for chunk in self.chunks:
            chunk_words = set(re.findall(r"[a-z0-9]+", chunk.lower()))
            overlap = len(query_words & chunk_words)
            score = overlap / (len(query_words) or 1)
            scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [chunk for score, chunk in scored[:top_k]]


active_document = DocumentStore()


# ---------------------------------------------------------------------------
# Knowledge Base & Role Catalog
# ---------------------------------------------------------------------------

TECH_SKILL_TAXONOMY = {
    "Frontend": ["React", "TypeScript", "JavaScript", "Next.js", "Tailwind", "CSS", "HTML", "Vue", "Angular"],
    "Backend & APIs": ["Python", "FastAPI", "Node.js", "Flask", "Django", "REST", "GraphQL", "Go", "Java"],
    "Data Science & ML": ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Pandas", "NumPy", "SQL", "RAG", "LLMs"],
    "Cloud & DevOps": ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Terraform", "Azure", "GCP", "Redis", "PostgreSQL"],
}

ROLE_CATALOG = [
    {
        "role": "Frontend Engineering Intern",
        "keywords": ["react", "typescript", "javascript", "tailwind", "next.js", "css", "html"],
        "description": "Design and implement intuitive, responsive, and accessible user interfaces.",
        "keyTopics": ["React Hooks & Lifecycle", "Component Design & Reusability", "TypeScript Generics & Types", "State Management (Zustand/Redux)", "Web Performance & Core Web Vitals", "Accessibility (a11y) & Semantic HTML"],
    },
    {
        "role": "Machine Learning & Data Science Intern",
        "keywords": ["python", "pytorch", "pandas", "numpy", "scikit-learn", "sql", "tensorflow"],
        "description": "Build predictive models, execute feature engineering, and deploy ML inference pipelines.",
        "keyTopics": ["Supervised vs Unsupervised Algorithms", "Bias-Variance Tradeoff & Regularization", "Data Preprocessing & Feature Engineering", "SQL Aggregations & Window Functions", "Model Evaluation Metrics (AUC, F1, Precision/Recall)", "Deep Learning Fundamentals (CNN/RNN/Transformers)"],
    },
    {
        "role": "Generative AI & LLM Intern",
        "keywords": ["llms", "rag", "langchain", "pytorch", "python", "openai", "embeddings", "vector"],
        "description": "Develop Retrieval-Augmented Generation (RAG) systems, prompt orchestration, and vector search.",
        "keyTopics": ["RAG Architecture & Chunking Strategies", "Vector Embeddings & Cosine Similarity", "Prompt Engineering & Few-Shot Prompting", "Fine-Tuning vs RAG Tradeoffs", "Hallucination Mitigation & Grounding", "LangChain / LlamaIndex / Agent Tool Calling"],
    },
    {
        "role": "Backend Engineering Intern",
        "keywords": ["python", "fastapi", "docker", "postgresql", "redis", "node.js", "sql", "rest"],
        "description": "Develop scalable RESTful microservices, optimize database schemas, and manage server containers.",
        "keyTopics": ["REST API Architecture & HTTP Status Codes", "Relational Database Design & Indexing", "Asynchronous Python & Asyncio / Concurrency", "Caching Strategies with Redis", "Containerization with Docker", "Authentication & Security (JWT, OAuth2, Rate Limiting)"],
    },
    {
        "role": "Full Stack Web Development Intern",
        "keywords": ["react", "node.js", "typescript", "postgresql", "sql", "python", "fastapi"],
        "description": "End-to-end web engineering bridging dynamic client interfaces with performant backend services.",
        "keyTopics": ["Client-Server Communication & WebSockets", "Full Stack State Flow & Mutation Handling", "API Integration & Error Boundaries", "Database Schema Migrations & ORMs", "Full Stack Testing (Jest, Playwright, Pytest)", "Deployment Pipelines & Environment Configuration"],
    },
    {
        "role": "Cloud & DevOps Engineering Intern",
        "keywords": ["docker", "kubernetes", "aws", "ci/cd", "terraform", "linux"],
        "description": "Automate cloud infrastructure provisioning, container orchestration, and continuous integration pipelines.",
        "keyTopics": ["Docker Multi-Stage Builds & Optimization", "Kubernetes Pods, Services, and Deployments", "CI/CD Pipeline Design (GitHub Actions / GitLab CI)", "Infrastructure as Code with Terraform", "Cloud Networking & IAM Policies (AWS)", "Monitoring & Observability (Prometheus, Grafana)"],
    },
]


# ---------------------------------------------------------------------------
# Core Reasoning & Recommendation Functions
# ---------------------------------------------------------------------------

def extract_candidate_skills(profile: dict) -> List[str]:
    raw_skills = profile.get("technicalSkills", "")
    return [s.strip() for s in re.split(r"[,•|;]+", raw_skills) if s.strip()]


def categorize_skills(skills: List[str]) -> Dict[str, List[str]]:
    categorized: Dict[str, List[str]] = {cat: [] for cat in TECH_SKILL_TAXONOMY}
    categorized["Other / Tools"] = []

    skills_lower = {s.lower(): s for s in skills}
    matched = set()

    for cat, cat_skills in TECH_SKILL_TAXONOMY.items():
        for cs in cat_skills:
            if cs.lower() in skills_lower:
                categorized[cat].append(skills_lower[cs.lower()])
                matched.add(cs.lower())

    for s in skills:
        if s.lower() not in matched:
            categorized["Other / Tools"].append(s)

    return {k: v for k, v in categorized.items() if v}


def recommend_roles(profile: dict) -> RoleRecommendationResponse:
    skills = extract_candidate_skills(profile)
    skills_lower = {s.lower() for s in skills}
    categories = categorize_skills(skills)

    scored_roles = []
    for role_info in ROLE_CATALOG:
        matched = [k for k in role_info["keywords"] if k in skills_lower]
        match_score = int(round((len(matched) / max(len(role_info["keywords"]), 1)) * 100))
        # Add base score bonus if candidate mentions related education/bio
        bio_text = (profile.get("bio", "") + " " + profile.get("education", "")).lower()
        if any(w in bio_text for w in role_info["role"].lower().split()):
            match_score = min(99, match_score + 15)

        scored_roles.append({
            "role": role_info["role"],
            "matchScore": max(match_score, 45),
            "matchingSkills": [s for s in skills if s.lower() in role_info["keywords"]],
            "description": role_info["description"],
            "keyTopics": role_info["keyTopics"][:4],
            "whyRecommend": f"Your hands-on proficiency with {', '.join(matched[:3]) if matched else 'core computer science fundamentals'} provides a solid platform for {role_info['role']} responsibilities.",
        })

    scored_roles.sort(key=lambda x: x["matchScore"], reverse=True)

    summary = (
        f"Based on your resume profile ({profile.get('fullName', 'Candidate')}), "
        f"your top strengths center around {', '.join(skills[:4])}. "
        f"We identified {scored_roles[0]['role']} ({scored_roles[0]['matchScore']}% fit) "
        f"and {scored_roles[1]['role']} ({scored_roles[1]['matchScore']}% fit) as your strongest prospective paths."
    )

    return RoleRecommendationResponse(
        recommendedRoles=scored_roles,
        strongestSkills=skills[:6],
        skillCategories=categories,
        analysisSummary=summary,
    )


# ---------------------------------------------------------------------------
# Role-Specific Interview Questions & Preparation Engine
# ---------------------------------------------------------------------------

QUESTIONS_DATABASE = {
    "Frontend Engineering Intern": {
        "technical": [
            QuestionGuidance(
                question="Can you explain how React's Virtual DOM works and what triggers a component re-render?",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Virtual DOM is an in-memory lightweight representation of the actual DOM.",
                    "Reconciliation process compares current VDOM tree with previous tree using the Diffing algorithm.",
                    "Batch updates are applied to the real DOM to minimize expensive DOM reflows and repaints.",
                    "Re-renders are triggered by state changes (useState), prop updates, context updates, or parent re-renders.",
                ],
                sampleAnswerGuidance=(
                    "Start with the core concept: direct DOM manipulations are computationally expensive. "
                    "Explain that React keeps a lightweight virtual representation in memory. "
                    "Mention reconciliation and keys in lists to help React track elements across renders efficiently."
                ),
                candidateContextTip="Connect this to your React & TypeScript projects from your resume, emphasizing how you structured state to avoid redundant re-renders.",
                codeSnippet="""// Example demonstrating React memoization to prevent unnecessary re-renders:
import React, { useState, useMemo, useCallback } from 'react';

export const ExpensiveList = React.memo(({ items, onItemClick }) => {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => onItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});""",
            ),
            QuestionGuidance(
                question="What is the difference between useEffect, useMemo, and useCallback in React?",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    "useEffect handles side-effects (API fetching, subscriptions, DOM mutation) after render.",
                    "useMemo memoizes the computed value of an expensive calculation between renders.",
                    "useCallback memoizes a function definition instance across renders to prevent unnecessary child re-renders.",
                    "Dependency arrays control execution and cache invalidation.",
                ],
                sampleAnswerGuidance=(
                    "Highlight the primary purpose of each hook concisely. "
                    "Warn against premature optimization (e.g., using useMemo for trivial computations). "
                    "Explain how useCallback is commonly passed to memoized children to maintain reference equality."
                ),
                candidateContextTip="Mention how you use TypeScript typings when configuring callbacks and state variables.",
            ),
            QuestionGuidance(
                question="How do you handle asynchronous data fetching and error states in modern web applications?",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    "State triad: loading, error, and data states.",
                    "Cleanup of ongoing asynchronous requests using AbortController.",
                    "Graceful error boundaries to prevent complete UI crashes.",
                    "Optimistic UI updates vs pessimistic loading spinners.",
                ],
                sampleAnswerGuidance=(
                    "Describe your standard pattern using either custom hooks (useEffect + AbortController) "
                    "or modern libraries like React Query / SWR. Emphasize UX: user feedback during network latency."
                ),
                candidateContextTip="Share an example from your bio or past internship applications where you integrated REST APIs cleanly.",
            ),
        ],
        "hr": [
            QuestionGuidance(
                question="Tell me about a challenging bug or technical obstacle you encountered in a project, and how you resolved it.",
                category="HR / Behavioral",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Situation: Context of the project and what component or feature broke.",
                    "Task: Your exact responsibility and the severity of the bug.",
                    "Action: Systematic debugging steps (console logs, browser devtools, network tab, isolated reproduction).",
                    "Result: Successful fix, unit tests added, and lessons learned to prevent recurrence.",
                ],
                sampleAnswerGuidance=(
                    "Use the STAR method strictly. Avoid blaming external tools; focus on your proactive problem-solving, "
                    "persistence, and how you verified the fix."
                ),
                candidateContextTip="Ground your answer in your tech stack (e.g., debugging an asynchronous state race condition or CSS layout shift).",
            ),
            QuestionGuidance(
                question="Why are you interested in this engineering internship, and how does it fit into your career aspirations?",
                category="HR / Behavioral",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Genuine enthusiasm for modern engineering standards and company product domain.",
                    "Desire to collaborate with senior mentors and contribute clean, tested code.",
                    "Clear alignment between your academic studies and hands-on industry application.",
                ],
                sampleAnswerGuidance=(
                    "Speak enthusiastically about wanting to grow from building classroom/personal projects "
                    "to contributing to high-scale, production-grade applications."
                ),
                candidateContextTip="Mention your academic degree and your passion for accessible, user-centric software.",
            ),
        ],
        "roadmap": {
            "title": "2-Week Frontend Internship Preparation Roadmap",
            "phases": [
                {
                    "phase": "Days 1-3: Core JavaScript & TypeScript",
                    "tasks": [
                        "Review closures, event loop, microtasks vs macrotasks, and Promise chaining.",
                        "Master TypeScript generics, union types, and utility types (Partial, Pick, Omit).",
                        "Practice 5 DOM & array manipulation LeetCode questions.",
                    ],
                },
                {
                    "phase": "Days 4-7: React Architecture & State",
                    "tasks": [
                        "Deep dive into React 19 / 18 features (Hooks, Concurrent Mode, Suspense).",
                        "Build a mini project demonstrating state management and custom hooks.",
                        "Implement accessibility patterns: keyboard navigation and ARIA roles.",
                    ],
                },
                {
                    "phase": "Days 8-11: Performance, CSS & APIs",
                    "tasks": [
                        "Study Core Web Vitals (LCP, FID/INP, CLS) and optimization techniques.",
                        "Review Tailwind CSS utility strategies and responsive layout design.",
                        "Implement debouncing and throttling for search input auto-completion.",
                    ],
                },
                {
                    "phase": "Days 12-14: Mock Interviews & Behavioral Stories",
                    "tasks": [
                        "Structure 3 STAR stories highlighting teamwork, debugging, and project delivery.",
                        "Simulate a live component-building coding interview in 45 minutes.",
                        "Prepare questions for the interviewer regarding engineering culture.",
                    ],
                },
            ],
        },
    },
    "Machine Learning & Data Science Intern": {
        "technical": [
            QuestionGuidance(
                question="What is the bias-variance tradeoff, and how do you diagnose underfitting vs overfitting?",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Bias represents simplifying assumptions made by a model (leads to underfitting).",
                    "Variance represents excessive sensitivity to small fluctuations in training data (leads to overfitting).",
                    "Underfitting: High training error and high test error.",
                    "Overfitting: Low training error but high validation/test error.",
                    "Mitigations: Regularization (L1/L2), cross-validation, feature pruning, gathering more data.",
                ],
                sampleAnswerGuidance=(
                    "Define bias and variance intuitively. Explain how model complexity shifts the equilibrium. "
                    "Provide concrete remediation techniques like L2 ridge regularization or dropout."
                ),
                candidateContextTip="Reference your experience with Python, Scikit-Learn, or PyTorch models from your resume.",
            ),
            QuestionGuidance(
                question="How would you approach handling missing values and skewed features in a real-world tabular dataset?",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Check Missing Completely at Random (MCAR) vs Missing at Random (MAR).",
                    "Imputation strategies: median/mean for numerical, mode/constant for categorical, or KNN/Iterative imputer.",
                    "Transformations for skewness: Log transform, Box-Cox, or QuantileTransformer.",
                    "Preventing data leakage by fitting imputers ONLY on the training split.",
                ],
                sampleAnswerGuidance=(
                    "Emphasize preventing data leakage by fitting transformers strictly on train splits. "
                    "Discuss trade-offs of dropping rows vs imputing."
                ),
                candidateContextTip="Tie this to your SQL and Pandas skills.",
            ),
        ],
        "hr": [
            QuestionGuidance(
                question="How do you explain complex machine learning findings or metrics to a non-technical stakeholder?",
                category="HR / Behavioral",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Focus on business impact and outcomes rather than mathematical jargon.",
                    "Use visual aids, intuitive analogies, and precision/recall tradeoffs in plain language.",
                    "Actively solicit feedback and verify alignment with stakeholder expectations.",
                ],
                sampleAnswerGuidance=(
                    "Give an example where you translated technical terminology into actionable business decisions."
                ),
                candidateContextTip="Highlight your collaborative communication style and academic background.",
            )
        ],
        "roadmap": {
            "title": "2-Week ML & Data Science Preparation Roadmap",
            "phases": [
                {
                    "phase": "Days 1-4: Mathematics & Classical ML",
                    "tasks": [
                        "Review Linear Algebra, Multivariate Calculus, and Probability distributions.",
                        "Re-implement Linear Regression, Logistic Regression, and Random Forests with Scikit-Learn.",
                        "Practice SQL window functions and complex joins on LeetCode/StrataScratch.",
                    ],
                },
                {
                    "phase": "Days 5-8: Deep Learning & Frameworks",
                    "tasks": [
                        "Build and train a neural network using PyTorch with DataLoader and custom loss.",
                        "Understand backpropagation, Adam optimizer, and learning rate scheduling.",
                    ],
                },
                {
                    "phase": "Days 9-14: End-to-End Pipeline & Mock Interview",
                    "tasks": [
                        "Build an end-to-end inference script with FastAPI and Docker.",
                        "Prepare 3 STAR stories about model evaluation hurdles.",
                    ],
                },
            ],
        },
    },
    "Generative AI & LLM Intern": {
        "technical": [
            QuestionGuidance(
                question="Explain the core components of a Retrieval-Augmented Generation (RAG) architecture and how you evaluate retrieval quality.",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Indexing: Document parsing, chunking (semantic/recursive), and embedding creation.",
                    "Storage: Vector database (Pinecone, Chroma, FAISS, pgvector).",
                    "Retrieval: Cosine similarity or hybrid search (BM25 + dense vectors).",
                    "Generation: Context injection into prompt and LLM synthesis.",
                    "Evaluation: Context Relevance, Groundedness/Faithfulness, and Answer Relevance (e.g. RAGAS metrics).",
                ],
                sampleAnswerGuidance=(
                    "Walk through the workflow end-to-end from raw PDF ingestion to response synthesis. "
                    "Discuss real challenges like chunk size tradeoffs and hallucinations."
                ),
                candidateContextTip="Refer directly to the RAG matcher and document extraction features implemented in this project.",
            ),
            QuestionGuidance(
                question="What is the difference between Fine-Tuning, In-Context Learning (Prompting), and RAG?",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Prompting: Zero-shot or few-shot context within token window; no parameter updates.",
                    "RAG: Dynamically injects external up-to-date proprietary knowledge without training cost.",
                    "Fine-Tuning: Updates model weights for domain style, specific task syntax, or terminology.",
                    "Hybrid approach: Using RAG for factual knowledge and fine-tuning for domain specific reasoning format.",
                ],
                sampleAnswerGuidance=(
                    "Compare on cost, latency, update frequency, and hallucination control. "
                    "Emphasize that RAG is superior for frequently changing knowledge."
                ),
                candidateContextTip="Mention your experience building AI-driven products with Python.",
            ),
        ],
        "hr": [
            QuestionGuidance(
                question="How do you ensure ethical AI practices, safety guardrails, and data privacy in LLM applications?",
                category="HR / Behavioral",
                difficulty="Intern",
                expectedKeyPoints=[
                    "PII sanitization prior to embedding or sending to LLM providers.",
                    "Input validation, jailbreak detection, and output moderation.",
                    "Human-in-the-loop review for high-stakes decisions.",
                ],
                sampleAnswerGuidance=(
                    "Discuss confidentiality, prompt injection prevention, and responsible AI principles."
                ),
                candidateContextTip="Demonstrate maturity in engineering dependable systems.",
            )
        ],
        "roadmap": {
            "title": "2-Week Generative AI & LLM Preparation Roadmap",
            "phases": [
                {
                    "phase": "Days 1-4: Embeddings & Vector Search",
                    "tasks": [
                        "Master cosine similarity, Euclidean distance, and vector indexing.",
                        "Implement semantic chunking and test overlap sensitivities.",
                    ],
                },
                {
                    "phase": "Days 5-9: Prompt Orchestration & Agent Tool Calling",
                    "tasks": [
                        "Build multi-step agent pipelines with LangChain or native function calling.",
                        "Implement fallback strategies and structured JSON output parsing.",
                    ],
                },
                {
                    "phase": "Days 10-14: System Evaluation & Mock Interview",
                    "tasks": [
                        "Set up automated RAG evaluation for hallucination rates.",
                        "Review transformer attention mechanisms (Multi-Head Self-Attention).",
                    ],
                },
            ],
        },
    },
    "Backend Engineering Intern": {
        "technical": [
            QuestionGuidance(
                question="How do relational database indexes work under the hood, and when might an index hurt performance?",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    "B-Tree / B+Tree structure allows O(log N) lookup, insertion, and deletion.",
                    "Composite indexes require understanding the leftmost prefix rule.",
                    "Drawbacks: Increased disk storage and slower write operations (INSERT, UPDATE, DELETE).",
                ],
                sampleAnswerGuidance=(
                    "Describe how an index acts like a book index. Explain how scanning a B-Tree compares to a sequential table scan. "
                    "Mention EXPLAIN ANALYZE for query profiling."
                ),
                candidateContextTip="Connect to your PostgreSQL, SQL, and database design background.",
            ),
            QuestionGuidance(
                question="Explain the difference between synchronous, multi-threaded, and asynchronous (event loop) backend architectures.",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Synchronous: Single execution thread blocks on I/O operations.",
                    "Multi-threaded: Uses OS threads; handles concurrent requests but incurs context switching overhead and memory usage.",
                    "Asynchronous (FastAPI / Node.js): Single thread event loop non-blockingly awaits I/O operations.",
                ],
                sampleAnswerGuidance=(
                    "Clearly distinguish between CPU-bound tasks (which benefit from multiprocessing) and I/O-bound tasks "
                    "(which shine under async event loops)."
                ),
                candidateContextTip="Mention your hands-on experience with FastAPI and Node.js.",
            ),
        ],
        "hr": [
            QuestionGuidance(
                question="Tell me about a time you had to quickly learn a new technology or backend framework to complete an assignment.",
                category="HR / Behavioral",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Situation: Project timeline and the unfamiliar tool/technology required.",
                    "Task: Objective you needed to deliver.",
                    "Action: Reading official documentation, building proof-of-concept tests, asking targeted questions.",
                    "Result: Successful delivery on schedule and technical confidence gained.",
                ],
                sampleAnswerGuidance=(
                    "Emphasize rapid learning agility, reading documentation, and building a mini prototype."
                ),
                candidateContextTip="Relate this to learning FastAPI or modern containerization tooling.",
            )
        ],
        "roadmap": {
            "title": "2-Week Backend Engineering Preparation Roadmap",
            "phases": [
                {
                    "phase": "Days 1-4: API Design & Databases",
                    "tasks": [
                        "Master REST principles, idempotent operations, and HTTP status codes.",
                        "Practice SQL schema design, normalization, and foreign keys in PostgreSQL.",
                    ],
                },
                {
                    "phase": "Days 5-8: Asynchronous Runtimes & Caching",
                    "tasks": [
                        "Build asynchronous endpoints in FastAPI with Pydantic validation.",
                        "Implement Redis caching for high-read endpoints.",
                    ],
                },
                {
                    "phase": "Days 9-14: Docker Containers & Testing",
                    "tasks": [
                        "Containerize a Python backend with multi-stage Dockerfile.",
                        "Write comprehensive integration tests with pytest and httpx.",
                    ],
                },
            ],
        },
    },
}

# Fallback template for any generic or custom role
DEFAULT_ROLE_PREP = {
    "technical": [
        QuestionGuidance(
            question="Can you walk through the architectural design of a full-stack application you built, highlighting your data flow and API contracts?",
            category="Technical",
            difficulty="Intern",
            expectedKeyPoints=[
                "Clear explanation of client layer, server layer, and persistent database layer.",
                "API contract design (REST / GraphQL) and serialization formats.",
                "State management and caching layers.",
                "Authentication, authorization, and error handling mechanisms.",
            ],
            sampleAnswerGuidance="Lead with a high-level diagram mental model, then zoom into your specific technical decisions.",
            candidateContextTip="Use your strongest resume project as the anchor for this answer.",
        ),
        QuestionGuidance(
            question="How do you write maintainable, testable code, and what is your approach to unit and integration testing?",
            category="Technical",
            difficulty="Intern",
            expectedKeyPoints=[
                "Separation of concerns and modular functions.",
                "Writing deterministic unit tests with mock external dependencies.",
                "Continuous integration checks on pull requests.",
            ],
            sampleAnswerGuidance="Emphasize test pyramids and writing readable, self-documenting code.",
            candidateContextTip="Mention how typing and linting maintain high code standards.",
        ),
    ],
    "hr": [
        QuestionGuidance(
            question="Tell me about yourself and why you chose a career in software engineering.",
            category="HR / Behavioral",
            difficulty="Intern",
            expectedKeyPoints=[
                "Concise 2-minute chronological narrative: academic start, spark of passion, key projects, and current aspirations.",
                "Highlights from your hands-on technical skills.",
                "Future forward enthusiasm for joining a collaborative engineering team.",
            ],
            sampleAnswerGuidance="Keep it structured: Past (education/origin), Present (current stack/projects), Future (why this internship).",
            candidateContextTip="Leverage your bio and education directly.",
        )
    ],
    "roadmap": {
        "title": "2-Week Software Engineering Preparation Roadmap",
        "phases": [
            {
                "phase": "Week 1: Fundamentals, Algorithms & Data Structures",
                "tasks": [
                    "Review Arrays, Hash Tables, Trees, and Graph traversals (BFS/DFS).",
                    "Practice 15 core LeetCode medium questions.",
                    "Review object-oriented and functional programming paradigms.",
                ],
            },
            {
                "phase": "Week 2: System Architecture, Projects & Mock Interviews",
                "tasks": [
                    "Prepare in-depth technical walkthroughs for your top 2 resume projects.",
                    "Draft 5 STAR behavioral stories.",
                    "Conduct 2 timed mock interview sessions with a peer or timer.",
                ],
            },
        ],
    },
}


def get_interview_prep(role: str, profile: dict) -> InterviewPrepResponse:
    # Find matching role database
    role_key = None
    for r in QUESTIONS_DATABASE:
        if r.lower() in role.lower() or role.lower() in r.lower():
            role_key = r
            break

    if role_key:
        data = QUESTIONS_DATABASE[role_key]
        tech_qs = data.get("technical", DEFAULT_ROLE_PREP["technical"])
        hr_qs = data.get("hr", DEFAULT_ROLE_PREP["hr"])
        roadmap_data = data.get("roadmap", DEFAULT_ROLE_PREP["roadmap"])
    else:
        # Dynamically generate technical questions and roadmap for custom role
        candidate_skills = extract_candidate_skills(profile)
        top_skill = candidate_skills[0] if candidate_skills else "Core Engineering"
        tech_qs = [
            QuestionGuidance(
                question=f"What core architectural principles and technical trade-offs are most vital when designing systems as a {role}?",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    f"Understanding domain constraints, data flows, and design patterns relevant to {role}.",
                    f"Application of core technologies like {top_skill} and scalable pipelines.",
                    "Latency, throughput, error recovery, and security boundary considerations.",
                ],
                sampleAnswerGuidance=f"Structure your response logically: define the core system requirements for {role}, identify bottlenecks, and detail proactive solutions.",
                candidateContextTip=f"Connect your explanation to your practical experience with {', '.join(candidate_skills[:3]) if candidate_skills else 'software engineering'}.",
            ),
            QuestionGuidance(
                question=f"Describe a complex technical challenge you solved involving {top_skill} and how you measured its performance impact.",
                category="Technical",
                difficulty="Intern",
                expectedKeyPoints=[
                    "Clear problem formulation and root cause analysis.",
                    "Algorithmic or structural improvements made.",
                    "Measurable verification (latency reduction, memory efficiency, test coverage).",
                ],
                sampleAnswerGuidance="Highlight specific metrics and trade-offs rather than generic code changes.",
                candidateContextTip="Focus on an academic or personal project from your resume.",
            ),
        ]
        hr_qs = DEFAULT_ROLE_PREP["hr"]
        roadmap_data = {
            "title": f"2-Week Intensive Preparation Roadmap for {role}",
            "phases": [
                {
                    "phase": f"Week 1: Core Domain Fundamentals & Technical Mastery for {role}",
                    "tasks": [
                        f"Review core fundamentals and standards required for {role}.",
                        f"Practice hands-on problem solving with {top_skill} and data structures.",
                        "Review architectural paradigms, API contracts, and edge cases.",
                    ],
                },
                {
                    "phase": "Week 2: System Architecture, Projects & Mock Interviews",
                    "tasks": [
                        f"Prepare deep technical walkthroughs demonstrating relevant capabilities for {role}.",
                        "Structure 5 STAR behavioral responses highlighting problem-solving under constraints.",
                        "Conduct mock technical interview sessions focusing on concise, structured communication.",
                    ],
                },
            ],
        }

    skills_str = profile.get("technicalSkills", "your core skills")
    name = profile.get("fullName", "Candidate")
    candidate_skills = extract_candidate_skills(profile)

    topics = [
        f"Deep dive into {candidate_skills[0]} fundamentals and advanced patterns" if candidate_skills else "Core programming fundamentals",
        f"Key domain design patterns and operational standards for {role}",
        "Data structures: HashMaps, Two-Pointer, Breadth/Depth First Search",
        "System design for junior engineers: Client-server, APIs, Caching, and DB indexing",
        "Behavioral STAR stories: Overcoming obstacles, conflict resolution, technical pride",
    ]

    learning_paths = [
        f"Master technical interview questions tailored to {role}.",
        f"Highlight your direct expertise with {skills_str} during technical rounds.",
        "Refine your project storytelling using the Situation-Task-Action-Result format.",
        "Practice coding solutions cleanly with time and space complexity explanations.",
    ]

    return InterviewPrepResponse(
        role=role,
        technicalQuestions=tech_qs,
        hrQuestions=hr_qs,
        preparationRoadmap=roadmap_data,
        learningPathRecommendations=learning_paths,
        topicsToPrepare=topics,
    )


# ---------------------------------------------------------------------------
# Document-Based Q&A Generator
# ---------------------------------------------------------------------------

def generate_document_qa(doc_store: DocumentStore, count: int = 5) -> List[Dict[str, str]]:
    if not doc_store.has_document():
        return [
            {
                "question": "No document uploaded yet. How do I start?",
                "answer": "Upload any PDF or DOCX file (such as a study guide, syllabus, lecture notes, or project report) using the Document Upload button above. The agent will extract the content and generate personalized questions and answers.",
            }
        ]

    chunks = doc_store.chunks
    qa_list: List[Dict[str, str]] = []

    # Extract salient headings or sentences from chunks
    for idx, chunk in enumerate(chunks[:count]):
        lines = [l.strip() for l in chunk.splitlines() if len(l.strip()) > 15]
        first_line = lines[0] if lines else chunk[:80]
        # Clean heading
        heading = re.sub(r"^[#\*\-\d\.\s]+", "", first_line)
        if len(heading) > 70:
            heading = heading[:67] + "..."

        question = f"What does the document state regarding '{heading}'?"
        snippet = chunk.replace("\n", " ").strip()
        if len(snippet) > 350:
            snippet = snippet[:347] + "..."

        answer = (
            f"According to {doc_store.filename} (Section {idx + 1}):\n\n"
            f"> \"{snippet}\"\n\n"
            f"**Key takeaway for interview/study**: Be prepared to explain this concept clearly and relate it to practical implementation examples."
        )

        qa_list.append({"question": question, "answer": answer})

    # If few chunks, add synthesized summary question
    if len(qa_list) < count:
        qa_list.append({
            "question": f"Can you summarize the core objectives and themes of '{doc_store.filename}'?",
            "answer": f"**Document Summary for {doc_store.filename}**:\n\n{doc_store.summary}\n\nTotal volume: {len(doc_store.raw_text.split())} words across {len(doc_store.chunks)} indexed sections.",
        })

    return qa_list


def answer_document_query(doc_store: DocumentStore, query: str) -> str:
    if not doc_store.has_document():
        return "No document has been uploaded yet. Please upload a PDF or DOCX document first to ask questions about its content."

    relevant_chunks = doc_store.search_chunks(query, top_k=3)
    if not relevant_chunks:
        return f"I analyzed {doc_store.filename}, but could not find sections directly matching your query. Here is an overview of the document:\n\n{doc_store.summary}"

    combined_context = "\n\n---\n\n".join(relevant_chunks)
    return (
        f"### Findings from `{doc_store.filename}`:\n\n"
        f"Based on the extracted text in `{doc_store.filename}`, here are the most relevant sections answering your question:\n\n"
        f"> {relevant_chunks[0][:400]}...\n\n"
        f"**Key Insights & Guidance:**\n"
        f"- The document emphasizes foundational understanding of the outlined topics.\n"
        f"- When discussing this in an interview, refer directly to these documented principles.\n"
        f"\n*Relevant context extracted from {len(relevant_chunks)} section(s) in `{doc_store.filename}`.*"
    )


# ---------------------------------------------------------------------------
# Conversational Agent Brain (Contextual Fallback + Live LLM)
# ---------------------------------------------------------------------------

_gemini_clients: Dict[str, Any] = {}


def get_genai_client(api_key: str):
    if api_key not in _gemini_clients:
        _gemini_clients[api_key] = genai.Client(api_key=api_key)
    return _gemini_clients[api_key]


async def call_gemini_api(api_key: str, prompt: str, system_instruction: str) -> Optional[str]:
    """
    Call Google Gemini API using google-genai with gemini-2.5-flash.
    Includes robust fallback to other flash models for resilience.
    """
    if not api_key:
        return None

    # 1. Primary: Use google-genai SDK
    if GENAI_AVAILABLE and genai:
        def _sync_call() -> Optional[str]:
            try:
                client = get_genai_client(api_key)
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.4,
                    max_output_tokens=2048,
                )
                # Models to query, prioritizing fast flash models
                models_to_try = [
                    "gemini-2.5-flash",
                    "gemini-3.6-flash",
                    "gemini-flash-latest",
                    "gemini-1.5-flash",
                    "gemini-2.5-flash-lite",
                ]
                for model_name in models_to_try:
                    try:
                        response = client.models.generate_content(
                            model=model_name,
                            contents=prompt,
                            config=config,
                        )
                        if response and response.text:
                            return response.text
                    except Exception as model_err:
                        print(f"Gemini model {model_name} attempt error: {model_err}")
                        continue
            except Exception as e:
                print(f"google-genai client error: {e}")
            return None

        result = await asyncio.to_thread(_sync_call)
        if result:
            return result

    # 2. Secondary: HTTP direct endpoint fallback
    # Only use model IDs confirmed available via ModelService.ListModels
    for model_name in ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"]:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = {
                "system_instruction": {"parts": [{"text": system_instruction}]},
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": 2048,
                },
            }
            async with httpx.AsyncClient(timeout=30.0) as client_http:
                resp = await client_http.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"Gemini HTTP fallback error ({model_name}): {e}")

    return None


async def call_openai_api(api_key: str, messages: List[dict]) -> Optional[str]:
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.4,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"OpenAI API error: {e}")
    return None




async def process_chat_message(
    request: ChatRequest,
    profile: dict,
    doc_store: DocumentStore,
) -> str:
    """
    Fully LLM-driven chat handler.

    Every user message is dispatched directly to the Gemini API (with OpenAI as
    a secondary fallback).  There are no static keyword matchers or hardcoded
    template responses -- the model answers naturally and accurately.
    """
    user_msg = request.message.strip()
    target_role = request.targetRole or "Software Engineering Intern"
    skills = extract_candidate_skills(profile)
    name = profile.get("fullName", "Candidate")

    # ------------------------------------------------------------------
    # Resolve API keys
    # ------------------------------------------------------------------
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if request.apiKey and not request.apiKey.startswith("sk-"):
        gemini_key = request.apiKey.strip()

    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if request.apiKey and request.apiKey.startswith("sk-"):
        openai_key = request.apiKey.strip()

    # ------------------------------------------------------------------
    # No API key -- return a clear error instead of fake responses
    # ------------------------------------------------------------------
    if not gemini_key and not openai_key:
        preview = user_msg[:120] + ("..." if len(user_msg) > 120 else "")
        return (
            "**API key required.**\n\n"
            "This assistant uses a live AI model to answer your questions accurately. "
            "Please add your **Gemini API key** (or OpenAI API key) in the settings panel "
            f"and retry your question.\n\n*(Your question was: \"{preview}\")*"
        )

    # ------------------------------------------------------------------
    # Build system prompt
    # ------------------------------------------------------------------
    doc_context = ""
    if doc_store.has_document():
        top_chunks = doc_store.search_chunks(user_msg, top_k=3)
        if top_chunks:
            doc_context = (
                f"\n\n## Uploaded Document: `{doc_store.filename}`\n"
                "Relevant extracted sections (ground your answer in these when applicable):\n\n"
                + "\n\n---\n\n".join(top_chunks)
            )

    skills_str = ", ".join(skills) if skills else "general software engineering"
    education = profile.get("education", "")
    bio = profile.get("bio", "")

    candidate_ctx = (
        f"- Name: {name}\n"
        f"- Target role: {target_role}\n"
        f"- Technical skills: {skills_str}\n"
    )
    if education:
        candidate_ctx += f"- Education: {education}\n"
    if bio:
        candidate_ctx += f"- Bio: {bio}\n"

    system_prompt = (
        "You are an expert technical interviewer and AI assistant. "
        "Provide direct, highly accurate, clean, and concise technical answers "
        "to the candidate's specific question. "
        "Do NOT include setup meta-text, preamble, or generic boilerplate advice.\n\n"
        "## Output formatting rules\n"
        "- Answer immediately and directly -- no restating the question, no 'Great question!' intros.\n"
        "- For concept/definition questions: 2-3 sentence definition, then plain markdown bullets for key points.\n"
        "- For coding questions: a clean, minimal code snippet in a fenced code block with the correct language tag.\n"
        "- Complexity notation: plain text only -- O(1), O(n), O(n log n). No LaTeX dollar signs.\n"
        "- Use **bold** for key terms, `inline code` for identifiers. No HTML. Avoid unnecessary headers.\n\n"
        "## Candidate background (context only -- do NOT repeat verbatim in answers)\n"
        + candidate_ctx
        + doc_context
    )

    # Keep the last 6 turns for multi-turn context without ballooning the prompt
    recent_history = (request.history or [])[-6:]

    # ------------------------------------------------------------------
    # 1. Primary: Gemini SDK (multi-turn, gemini-2.5-flash first)
    # ------------------------------------------------------------------
    if gemini_key and GENAI_AVAILABLE and genai:
        def _gemini_sdk_call() -> Optional[str]:
            try:
                client = get_genai_client(gemini_key)
                contents = []
                for h in recent_history:
                    contents.append(
                        types.Content(
                            role="user" if h.role == "user" else "model",
                            parts=[types.Part(text=h.content)],
                        )
                    )
                contents.append(
                    types.Content(role="user", parts=[types.Part(text=user_msg)])
                )
                cfg = types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.35,
                    max_output_tokens=2048,
                )
                for model_name in ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-flash-lite"]:
                    try:
                        resp = client.models.generate_content(
                            model=model_name, contents=contents, config=cfg
                        )
                        if resp and resp.text:
                            return resp.text
                    except Exception as err:
                        print(f"[Gemini SDK] {model_name}: {err}")
            except Exception as err:
                print(f"[Gemini SDK] client init error: {err}")
            return None

        result = await asyncio.to_thread(_gemini_sdk_call)
        if result:
            return result

    # ------------------------------------------------------------------
    # 2. Gemini HTTP fallback (when SDK unavailable or all models fail)
    # ------------------------------------------------------------------
    if gemini_key:
        # Only use model IDs confirmed available via ModelService.ListModels
        for model_name in ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"]:
            try:
                url = (
                    f"https://generativelanguage.googleapis.com/v1beta/models/"
                    f"{model_name}:generateContent?key={gemini_key}"
                )
                http_contents = []
                for h in recent_history:
                    http_contents.append({
                        "role": "user" if h.role == "user" else "model",
                        "parts": [{"text": h.content}],
                    })
                http_contents.append({"role": "user", "parts": [{"text": user_msg}]})

                payload = {
                    "system_instruction": {"parts": [{"text": system_prompt}]},
                    "contents": http_contents,
                    "generationConfig": {"temperature": 0.35, "maxOutputTokens": 2048},
                }
                async with httpx.AsyncClient(timeout=30.0) as hc:
                    resp = await hc.post(url, json=payload)
                    if resp.status_code == 200:
                        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                        if text:
                            return text
                    else:
                        print(f"[Gemini HTTP] {model_name} {resp.status_code}: {resp.text[:200]}")
            except Exception as err:
                print(f"[Gemini HTTP] {model_name}: {err}")

    # ------------------------------------------------------------------
    # 3. OpenAI fallback
    # ------------------------------------------------------------------
    if openai_key:
        messages: List[dict] = [{"role": "system", "content": system_prompt}]
        for h in recent_history:
            messages.append({
                "role": "user" if h.role == "user" else "assistant",
                "content": h.content,
            })
        messages.append({"role": "user", "content": user_msg})
        result = await call_openai_api(openai_key, messages)
        if result:
            return result

    # ------------------------------------------------------------------
    # 4. All APIs failed -- return a clear error
    # ------------------------------------------------------------------
    preview = user_msg[:120] + ("..." if len(user_msg) > 120 else "")
    return (
        "**AI model unavailable.**\n\n"
        "The request could not be completed -- the AI API returned an error or timed out. "
        f"Please verify your API key is valid and try again.\n\n*(Failed query: \"{preview}\")*"
    )
