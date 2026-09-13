"""
Dynamic AI Career Companion - Backend Engine
Generates active, query-driven LinkedIn Search URLs dynamically per candidate profile.
"""

from __future__ import annotations
import os
import time
import urllib.parse
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(override=True)

app = FastAPI(title="Dynamic LinkedIn Career Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProfileModel(BaseModel):
    fullName: str
    education: str
    technicalSkills: str
    bio: str
    phoneNumber: str
    email: str

class ApplyRequest(BaseModel):
    company: str
    role: str
    location: str
    applyUrl: Optional[str] = "#"
    email: Optional[str] = None
    fullName: Optional[str] = None

class InternshipMatchModel(BaseModel):
    id: str
    company: str
    role: str
    location: str
    stipend: str
    matchScore: int
    skills: List[str]
    description: str
    reasoning: str
    applyUrl: str

db_profile: Dict[str, str] = {
    "fullName": "Priyanka D",
    "education": "B.E. Computer Science and Engineering",
    "technicalSkills": "Python, React, FastAPI, Machine Learning, SQL",
    "bio": "Software Engineering candidate",
    "phoneNumber": "+91 9876543210",
    "email": "priyankadhanasekaran2005@gmail.com",
}

db_applications: List[Dict[str, Any]] = []

@app.get("/v1/profile", response_model=ProfileModel)
def get_profile():
    return db_profile

@app.get("/v1/internships", response_model=List[InternshipMatchModel])
def get_dynamic_internships():
    # Candidate-ode technical skills dynamic-a split panron
    skills = [s.strip() for s in db_profile.get("technicalSkills", "Python").split(",") if s.strip()]
    
    matches = []
    for idx, skill in enumerate(skills[:5]):
        # Dynamic-a query encode panni live LinkedIn job search link construct panron
        query_text = f"{skill} Intern"
        encoded_query = urllib.parse.quote(query_text)
        
        # Real-time search URL pointing directly to LinkedIn active jobs tab
        linkedin_search_url = f"https://www.linkedin.com/jobs/search/?keywords={encoded_query}&location=India&f_TPR=r604800&f_E=1"
        
        matches.append({
            "id": f"dyn-job-{idx+1}",
            "company": f"{skill} Open Positions",
            "role": f"{skill} Engineering Intern",
            "location": "India (Remote / Hybrid)",
            "stipend": "Flexible / Standard",
            "matchScore": max(98 - (idx * 3), 75),
            "skills": [skill, "Software Engineering"],
            "description": f"Live active internship openings for {skill} updated on LinkedIn.",
            "reasoning": f"Dynamically matched with your skill: {skill}",
            "applyUrl": linkedin_search_url  # Pure dynamic URL
        })
    return matches

@app.post("/v1/applications/apply")
def apply_internship(req: ApplyRequest):
    new_app = {
        "id": f"app-{int(time.time() * 1000)}",
        "candidateName": req.fullName or db_profile.get("fullName", "Candidate"),
        "candidateEmail": req.email or db_profile.get("email", ""),
        "company": req.company,
        "role": req.role,
        "location": req.location,
        "status": "Applied",
        "appliedAt": "Just now",
        "applyUrl": req.applyUrl or "#"
    }
    db_applications.insert(0, new_app)
    return {"success": True, "application": new_app, "redirectUrl": req.applyUrl}

@app.get("/v1/applications")
def get_applications():
    return db_applications