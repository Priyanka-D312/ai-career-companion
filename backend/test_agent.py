import io
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_endpoints():
    # 1. Health check
    h = client.get("/health")
    assert h.status_code == 200, f"Health check failed: {h.text}"
    print("[PASS] /health is 200 OK")

    # 2. Role Recommendations
    rec = client.get("/v1/interview-agent/recommend-roles")
    assert rec.status_code == 200, f"Recommend roles failed: {rec.text}"
    data = rec.json()
    assert len(data["recommendedRoles"]) > 0, "No recommended roles returned"
    print(f"[PASS] /v1/interview-agent/recommend-roles returned {len(data['recommendedRoles'])} roles. Top: {data['recommendedRoles'][0]['role']}")

    # 3. Role Prep Questions
    prep = client.get("/v1/interview-agent/prep-questions?role=Frontend%20Engineering%20Intern")
    assert prep.status_code == 200, f"Prep questions failed: {prep.text}"
    prep_data = prep.json()
    assert len(prep_data["technicalQuestions"]) > 0, "No technical questions returned"
    assert len(prep_data["hrQuestions"]) > 0, "No HR questions returned"
    assert "phases" in prep_data["preparationRoadmap"], "Roadmap missing phases"
    print(f"[PASS] /v1/interview-agent/prep-questions returned {len(prep_data['technicalQuestions'])} tech questions and {len(prep_data['hrQuestions'])} HR questions")

    # 4. Roadmap endpoint
    roadmap = client.get("/v1/interview-agent/roadmap?role=Backend%20Engineering%20Intern")
    assert roadmap.status_code == 200, f"Roadmap failed: {roadmap.text}"
    print(f"[PASS] /v1/interview-agent/roadmap returned: {roadmap.json().get('title')}")

    # 5. Document Upload and Q&A
    sample_doc_content = (
        "Operating Systems and Networking Core Concepts.\n\n"
        "Section 1: Process Concurrency and Synchronization.\n"
        "Processes share CPU time using preemptive context switching. Race conditions occur when multiple "
        "threads read and write shared data without synchronization. Mutexes, semaphores, and spinlocks "
        "are standard mechanisms used to enforce mutual exclusion.\n\n"
        "Section 2: Networking Protocols and HTTP/2.\n"
        "TCP provides reliable, ordered stream delivery using a 3-way handshake and congestion control. "
        "HTTP/2 introduces multiplexing over a single TCP connection, header compression via HPACK, "
        "and server push capabilities to dramatically reduce round-trip latency.\n"
    )
    doc_file = io.BytesIO(sample_doc_content.encode("utf-8"))
    upload_res = client.post(
        "/v1/interview-agent/upload-document",
        files={"file": ("interview_study_guide.txt", doc_file, "text/plain")}
    )
    assert upload_res.status_code == 200, f"Document upload failed: {upload_res.text}"
    doc_meta = upload_res.json()["metadata"]
    print(f"[PASS] Uploaded document '{doc_meta['filename']}' ({doc_meta['wordCount']} words, {doc_meta['chunkCount']} chunks)")

    # 6. Document Status
    status_res = client.get("/v1/interview-agent/document-status")
    assert status_res.status_code == 200 and status_res.json()["hasDocument"] is True
    print("[PASS] Document status is active")

    # 7. Document Q&A Generation
    doc_qa_res = client.post("/v1/interview-agent/document-qa", json={"generateQuestionsCount": 3})
    assert doc_qa_res.status_code == 200, f"Document QA failed: {doc_qa_res.text}"
    assert len(doc_qa_res.json()["questions"]) > 0
    print(f"[PASS] Generated {len(doc_qa_res.json()['questions'])} document-grounded questions")

    # 8. Conversational Chatbot Queries (Live LLM & Contextual Responses)
    # 8a. Role recommendation query
    c1 = client.post("/v1/interview-agent/chat", json={"message": "Which role can I apply for?"})
    assert c1.status_code == 200 and len(c1.json()["reply"]) > 20
    print(f"[PASS] Chat handled 'Which role can I apply for?' (response length: {len(c1.json()['reply'])} chars)")

    # 8b. Strongest skills query
    c2 = client.post("/v1/interview-agent/chat", json={"message": "What are my strongest technical skills?"})
    assert c2.status_code == 200 and len(c2.json()["reply"]) > 20
    print(f"[PASS] Chat handled 'What are my strongest technical skills?' (response length: {len(c2.json()['reply'])} chars)")

    # 8c. Technical questions query
    c3 = client.post("/v1/interview-agent/chat", json={"message": "Give me technical questions for Frontend Engineering Intern"})
    assert c3.status_code == 200 and len(c3.json()["reply"]) > 20
    print(f"[PASS] Chat handled technical questions request (response length: {len(c3.json()['reply'])} chars)")

    # 8d. HR questions query
    c4 = client.post("/v1/interview-agent/chat", json={"message": "What HR and behavioral questions should I prepare?"})
    assert c4.status_code == 200 and len(c4.json()["reply"]) > 20
    print(f"[PASS] Chat handled HR & behavioral questions (response length: {len(c4.json()['reply'])} chars)")

    # 8e. Document-grounded query
    c5 = client.post("/v1/interview-agent/chat", json={"message": "What does the document say about HTTP/2 and TCP?"})
    assert c5.status_code == 200 and len(c5.json()['reply']) > 20
    print(f"[PASS] Chat handled document-grounded query (response length: {len(c5.json()['reply'])} chars)")

    # 9. Custom Target Role dynamic prep
    custom_role = "Cybersecurity Analyst Intern"
    prep_custom = client.get(f"/v1/interview-agent/prep-questions?role={custom_role.replace(' ', '%20')}")
    assert prep_custom.status_code == 200
    pdata = prep_custom.json()
    assert len(pdata["technicalQuestions"]) > 0
    assert custom_role in pdata["preparationRoadmap"]["title"]
    print(f"[PASS] Custom role prep generated for '{custom_role}' with roadmap: {pdata['preparationRoadmap']['title']}")

    # 10. Application Apply with Confirmation Email Notification (Task 2)
    apply_res = client.post(
        "/v1/applications/apply",
        json={
            "company": "Nimbus AI",
            "role": "Generative AI & LLM Intern",
            "location": "Remote",
            "email": "alex.chen@example.com",
            "fullName": "Alex Chen",
            "applyUrl": "https://www.linkedin.com/jobs/search/?keywords=Generative+AI+LLM+Intern+Nimbus",
        }
    )
    assert apply_res.status_code == 200, f"Apply endpoint failed: {apply_res.text}"
    apply_data = apply_res.json()
    assert apply_data["success"] is True
    assert apply_data["application"]["status"] == "Applied"
    assert "emailConfirmation" in apply_data
    assert apply_data["emailConfirmation"]["recipient"] == "alex.chen@example.com"
    print(f"[PASS] /v1/applications/apply recorded application and generated confirmation email to: {apply_data['emailConfirmation']['recipient']}")

    # 11. User Registration and Authentication Flow (Task 3)
    test_email = f"user_{int(time.time())}@example.com"
    reg_res = client.post(
        "/v1/auth/register",
        json={
            "email": test_email,
            "password": "securepassword123",
            "fullName": "Sarah Connor",
            "education": "M.S. Robotics, Tech Institute (2025)",
            "technicalSkills": "C++, Python, ROS, PyTorch",
            "bio": "Robotics and AI engineer focused on autonomy.",
        }
    )
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    reg_user = reg_res.json()
    assert reg_user["fullName"] == "Sarah Connor"
    assert reg_user["email"] == test_email
    print(f"[PASS] /v1/auth/register registered new user: {reg_user['fullName']} ({reg_user['email']})")

    # 12. User Login
    login_res = client.post(
        "/v1/auth/login",
        json={
            "email": test_email,
            "password": "securepassword123",
        }
    )
    assert login_res.status_code == 200
    assert login_res.json()["email"] == test_email
    print(f"[PASS] /v1/auth/login verified credentials for {test_email}")

    # 13. Profile Persistence
    prof_res = client.get("/v1/profile")
    assert prof_res.status_code == 200
    assert prof_res.json()["fullName"] == "Sarah Connor"
    print(f"[PASS] /v1/profile returned active logged-in user profile: {prof_res.json()['fullName']}")

    print("\nALL 13 BACKEND & AGENT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    import time
    test_endpoints()
