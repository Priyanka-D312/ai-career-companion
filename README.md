# 🚀 AI Career Companion & Internship Matching System

An AI-powered web platform designed to analyze candidate profiles and match them with real-time internship opportunities using **RAG (Retrieval-Augmented Generation)** principles. The platform also provides interactive tools for interview preparation, resume optimization, and career management.

---

## ✨ Features

- **🎯 AI Internship Matching:** Uses candidate skill sets, experience, and domain preferences to compute dynamic match scores and generate AI analysis.
- **📩 Direct Application Portal:** Seamlessly submit applications inside the app or redirect dynamically to live LinkedIn job listings.
- **🤖 AI Interview Preparation:** Personalized Q&A practice sessions, role-tailored technical questions, and real-time response feedback.
- **📝 Resume & Cover Letter Generator:** AI-assisted resume builder and custom cover letter writer tailored to target job descriptions.
- **📊 Application Tracker:** Track submitted application statuses (`Applied`, `Interviewing`, `Offered`, `Rejected`) in real time.
- **🛠️ Skill Gap Analysis:** Highlights missing technical skills required for target job roles and offers actionable recommendations.

---

## 📂 Project Structure & Key Source Files (`/src`)

The core application logic is located within the `src/` (or Next.js App Router) structure:

```text
├── app/
│   ├── page.tsx                 # Main entry point rendering the primary Dashboard
│   ├── layout.tsx               # Root layout, fonts, and global metadata
│   └── globals.css              # Tailored Tailwind CSS styles and UI themes
│
├── components/
│   ├── dashboard.tsx            # Main state manager controlling tab navigation & API state
│   ├── sidebar.tsx              # Dynamic navigation sidebar with profile status
│   ├── auth-modal.tsx           # User authentication & registration modal
│   │
│   └── views/                   # Feature Views / Key Pages
│       ├── internships-view.tsx # RAG matching list, match scores, and application portal modal
│       ├── applications-view.tsx# Applications dashboard & status tracker
│       ├── interview-prep-view.tsx# Interactive AI interview prep simulator
│       ├── profile-view.tsx     # Candidate profile management & technical skills config
│       ├── resumes-view.tsx     # Smart resume generator & tailoring tool
│       ├── skills-view.tsx      # Skill gap analysis & target recommendations
│       └── cover-letter-view.tsx# AI-driven cover letter generator
│
└── lib/
    ├── api.ts                   # Backend API integrations & fetch wrappers
    └── career-data.ts           # Type definitions, mock pools, & fallback data models

    🛠️ Tech Stack
Frontend: Next.js 14+ (React 18), TypeScript, Tailwind CSS

UI Components: Lucide React Icons, Shadcn UI / Custom Components

State & Storage: React Hooks (useState, useEffect), LocalStorage Fallbacks

Backend / Integration: REST API / Python FastAPI / RAG Architecture

🚀 Getting Started
Prerequisites
Ensure you have the following installed on your machine:

Node.js: v18.x or higher

npm or pnpm / yarn

Installation
Clone the repository:

Bash
git clone [https://github.com/Priyanka-D312/ai-career-companion](https://github.com/Priyanka-D312/ai-career-companion)
cd your-repository-name
Install dependencies:

Bash
npm install
Run the development server:

Bash
npm run dev