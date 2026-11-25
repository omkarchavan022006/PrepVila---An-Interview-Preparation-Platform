# PrepVela — Backend API Integration Map

> **Document Version:** 1.0.0  
> **Target Framework:** React + Vite (Antigravity Frontend)  
> **Backend Engine:** Django 6.1.3 + Django REST Framework 3.18.3  
> **Database Architecture:** MongoDB Atlas (via PyMongo 4.20.1 & GridFS) + SQLite (Django metadata)  
> **AI Engine:** Google Gemini (`gemini-3.8-flash` via `google-genai` SDK 3.6.1)  
> **Audit Date:** November 2026  
> **Status:** Verified from Direct Source Code Inspection  

---

## 1. Executive Architectural Summary

The PrepVela backend is built using Django with Django REST Framework, utilizing MongoDB as the primary operational datastore and SQLite for core Django internal tables (`django_system.sqlite3`). 

### Key Architectural Characteristics
- **Pure MongoDB Persistence:** None of the 14 Django applications declare relational models in `models.py`. All business documents, user credentials, chat logs, interview transcripts, and AI reports are persisted directly to MongoDB collections using PyMongo.
- **Binary Storage via GridFS:** Resume documents (PDF/DOCX) and generated resume PDFs are stored in MongoDB GridFS (`fs.files` and `fs.chunks`).
- **Custom JWT Authentication:** Authentication does not use standard Django session cookies or simple-jwt database tables. Instead, a custom `MongoJWTAuthentication` class inspects the `Authorization: Bearer <token>` header, decodes HS256 JWT tokens, validates claims against MongoDB `users` collection, and enforces token revocation checks against `revoked_tokens`.
- **Direct Google GenAI Integration:** AI capabilities are implemented across 10 specialized `ai_service.py` modules using Google's modern `google-genai` SDK (`from google import genai`), interacting with models like `gemini-3.8-flash` with structured JSON mode and exponential backoff retry routines.
- **Static Code Analysis (No Dynamic Execution):** The coding interview and code debugger engines use AI-driven static syntax, logic, and complexity analysis. No remote execution sandbox (e.g. Judge0 or Docker subprocess) is integrated.

---

## 2. Authentication & Security Architecture

### 2.1 Protocol Specifications
| Attribute | Specification |
| :--- | :--- |
| **Type** | Custom Stateless Bearer JWT |
| **Token Algorithm** | HMAC-SHA256 (HS256) using `settings.SECRET_KEY` |
| **Token Payload** | `{"sub": "<str(user_object_id)>", "iat": <utc_now>, "exp": <utc_now + 1_day>}` |
| **Header Format** | `Authorization: Bearer <token>` |
| **Validity Period** | Exactly 24 Hours (1 Day) |
| **Token Refresh** | **None.** No refresh token endpoint exists. On expiration, user must re-login. |
| **Revocation Strategy** | Server-side token blacklisting in MongoDB collection `revoked_tokens`. |

### 2.2 Token Revocation & Logout Mechanism
When a user calls `POST /api/auth/logout/`:
1. The backend hashes the raw token with SHA-256: `hashlib.sha256(token.encode('utf-8')).hexdigest()`.
2. An entry is inserted into MongoDB `revoked_tokens`:
   ```json
   {
     "token_hash": "<sha256_hex_digest>",
     "expires_at": "<utc_datetime>",
     "revoked_at": "<utc_datetime>"
   }
   ```
3. On every protected request, `MongoJWTAuthentication` computes the SHA-256 hash of the incoming token and checks `revoked_tokens`. If matched, HTTP 401 Unauthorized is returned:
   ```json
   { "detail": "This token has been logged out. Please login again." }
   ```

---

## 3. Discovered Backend Endpoint Inventory

A total of **48 endpoints** were discovered and audited across the codebase.

---

### Domain 1: System & Health

#### 1.1 Root Service Banner
- **URL:** `GET /`
- **Auth:** None (Public)
- **Response (200 OK):**
  ```json
  {
    "project": "PrepVela",
    "status": "Backend Running",
    "message": "Welcome to PrepVela"
  }
  ```

#### 1.2 System Health Check
- **URL:** `GET /api/health/`
- **Auth:** None (Public)
- **Implementation:** Tests live connection to MongoDB Atlas by executing `client.admin.command("ping")`.
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "PrepVela API is running",
    "database": "MongoDB connected"
  }
  ```
- **Error Response (503 Service Unavailable):**
  ```json
  {
    "status": "error",
    "message": "MongoDB connection failed"
  }
  ```

---

### Domain 2: Authentication (`apps.accounts`)

#### 2.1 User Registration
- **URL:** `POST /api/auth/register/`
- **Auth:** None (Public)
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Field Constraints:**
  - `name`: String, required, non-empty.
  - `email`: String, required, lowercased, validated for unique index in MongoDB `users`.
  - `password`: String, required, minimum 8 characters. Hashed using Django's PBKDF2 `make_password`.
- **Response (201 Created):**
  ```json
  {
    "message": "Registration successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "673f8a9e2d14b9281a8b4567",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Name, email and password are required"}`
  - `400 Bad Request`: `{"error": "Password must contain at least 8 characters"}`
  - `409 Conflict`: `{"error": "Email is already registered"}`

#### 2.2 User Login
- **URL:** `POST /api/auth/login/`
- **Auth:** None (Public)
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "673f8a9e2d14b9281a8b4567",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Email and password are required"}`
  - `401 Unauthorized`: `{"error": "Invalid email or password"}`

#### 2.3 User Profile
- **URL:** `GET /api/auth/profile/`
- **Auth:** `IsAuthenticated` (Bearer Token)
- **Response (200 OK):**
  ```json
  {
    "id": "673f8a9e2d14b9281a8b4567",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: `{"detail": "Invalid or expired token"}` or `{"detail": "This token has been logged out. Please login again."}`

#### 2.4 User Logout
- **URL:** `POST /api/auth/logout/`
- **Auth:** `IsAuthenticated` (Bearer Token)
- **Implementation:** Stores SHA-256 hash of token in `revoked_tokens` until token expiry.
- **Response (200 OK):**
  ```json
  {
    "message": "Logout successful."
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: `{"error": "Authentication token not found."}`
  - `500 Internal Server Error`: `{"error": "Unable to logout. Please try again."}`

---

### Domain 3: Resume Management & Analysis (`apps.resumes`)

#### 3.1 Resume Upload
- **URL:** `POST /api/resumes/upload/`
- **Auth:** `IsAuthenticated`
- **Request Headers:** `Content-Type: multipart/form-data`
- **Request Body:** Form data with `file`: Binary file (`.pdf` or `.docx`, max 5 MB).
- **Backend Processing:**
  - Validates magic header (`%PDF-` for PDF, `PK` for DOCX).
  - Extracts text using `pypdf` or `python-docx`.
  - Streams file to MongoDB GridFS bucket.
  - Creates document in `resumes` collection with `analysis_status: "pending"`.
- **Response (201 Created):**
  ```json
  {
    "message": "Resume uploaded successfully.",
    "resume": {
      "id": "6740a1b2c3d4e5f6a7b8c9d0",
      "filename": "Jane_Doe_Resume.pdf",
      "content_type": "application/pdf",
      "analysis_status": "pending",
      "created_at": "2026-11-24T12:00:00.000000+00:00"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Please upload a resume using the file field."}`
  - `400 Bad Request`: `{"error": "Resume file must be smaller than 5 MB."}`
  - `400 Bad Request`: `{"error": "Only PDF and DOCX files are supported."}`
  - `400 Bad Request`: `{"error": "Password-protected PDFs are not supported."}`
  - `400 Bad Request`: `{"error": "No readable text found. Please upload a text-based PDF or DOCX."}`
  - `500 Internal Server Error`: `{"error": "Resume upload failed. Please try again."}`

#### 3.2 Resume List
- **URL:** `GET /api/resumes/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "resumes": [
      {
        "id": "6740a1b2c3d4e5f6a7b8c9d0",
        "filename": "Jane_Doe_Resume.pdf",
        "content_type": "application/pdf",
        "analysis_status": "completed",
        "resume_score": 85,
        "created_at": "2026-11-24T12:00:00.000000+00:00"
      }
    ]
  }
  ```

#### 3.3 Resume Detail
- **URL:** `GET /api/resumes/<resume_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "id": "6740a1b2c3d4e5f6a7b8c9d0",
    "filename": "Jane_Doe_Resume.pdf",
    "content_type": "application/pdf",
    "extracted_text": "Extracted text content from resume...",
    "analysis": {
      "resume_score": 85,
      "candidate_summary": "Experienced full-stack engineer...",
      "technical_skills": ["Python", "Django", "React", "MongoDB"],
      "soft_skills": ["Communication", "Leadership"],
      "experience_analysis": "Solid 3-year track record...",
      "strengths": ["Strong backend experience", "Clean coding practices"],
      "weaknesses": ["Limited cloud deployment metrics"],
      "missing_skills": ["Docker", "Kubernetes", "AWS"],
      "improvement_suggestions": ["Add measurable metrics to project achievements"],
      "recommended_job_roles": ["Full Stack Developer", "Backend Engineer"],
      "overall_feedback": "Highly competitive candidate profile."
    },
    "analysis_status": "completed",
    "created_at": "2026-11-24T12:00:00.000000+00:00",
    "analyzed_at": "2026-11-24T12:05:00.000000+00:00"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Invalid resume ID."}`
  - `404 Not Found`: `{"error": "Resume not found."}`

#### 3.4 Resume Delete
- **URL:** `DELETE /api/resumes/<resume_id>/delete/`
- **Auth:** `IsAuthenticated`
- **Implementation:** Deletes GridFS file stream and MongoDB `resumes` record.
- **Response (200 OK):**
  ```json
  {
    "message": "Resume deleted successfully."
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Invalid resume ID."}`
  - `404 Not Found`: `{"error": "Resume not found."}`
  - `500 Internal Server Error`: `{"error": "Unable to delete resume."}`

#### 3.5 AI Resume Analysis Trigger
- **URL:** `POST /api/resumes/<resume_id>/analyze/`
- **Auth:** `IsAuthenticated`
- **Implementation:** Calls Gemini (`gemini-3.8-flash`) with structured JSON schema. Truncates text to 30,000 characters.
- **Response (200 OK):**
  ```json
  {
    "message": "AI resume analysis completed successfully.",
    "resume_id": "6740a1b2c3d4e5f6a7b8c9d0",
    "analysis_status": "completed",
    "analyzed_at": "2026-11-24T12:05:00.000000+00:00",
    "analysis": {
      "resume_score": 85,
      "candidate_summary": "...",
      "technical_skills": ["Python", "Django", "React"],
      "soft_skills": ["Teamwork"],
      "experience_analysis": "...",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "missing_skills": ["..."],
      "improvement_suggestions": ["..."],
      "recommended_job_roles": ["..."],
      "overall_feedback": "..."
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Resume text is empty. Upload a readable resume."}`
  - `404 Not Found`: `{"error": "Resume not found."}`
  - `502 Bad Gateway`: `{"error": "AI resume analysis failed. Please check Gemini configuration and server logs."}`

---

### Domain 4: Job Roles & Search (`apps.jobs`)

#### 4.1 Job List & Search
- **URL:** `GET /api/jobs/`
- **Auth:** `IsAuthenticated`
- **Query Parameters:**
  - `search` (Optional string): Case-insensitive regex match against `title`.
  - `category` (Optional string): Exact filter.
  - `experience` (Optional string): Matches `experience_level`.
  - `difficulty` (Optional string): Matches `difficulty`.
  - `page` (Optional integer, default: 1, min: 1).
  - `limit` (Optional integer, default: 10, min: 1, max: 100).
- **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "6740b2c3d4e5f6a7b8c9d0e1",
        "title": "Senior Python Developer",
        "description": "Looking for an experienced Python developer...",
        "category": "Software Engineering",
        "experience_level": "Senior",
        "difficulty": "hard",
        "required_skills": ["Python", "Django", "FastAPI", "MongoDB"],
        "responsibilities": ["Design APIs", "Lead architecture"],
        "created_at": "2026-11-24T10:00:00.000000+00:00",
        "updated_at": "2026-11-24T10:00:00.000000+00:00"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10,
    "total_pages": 5
  }
  ```

#### 4.2 Create Job
- **URL:** `POST /api/jobs/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "title": "Full Stack Engineer",
    "description": "Develop modern AI interfaces and robust backends.",
    "category": "Web Development",
    "experience_level": "Mid-Level",
    "difficulty": "medium",
    "required_skills": ["React", "TypeScript", "Django", "Tailwind CSS"],
    "responsibilities": ["Build responsive UI", "Integrate AI REST endpoints"]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Job created successfully.",
    "job": {
      "id": "6740b2c3d4e5f6a7b8c9d0e1",
      "title": "Full Stack Engineer",
      "description": "...",
      "category": "Web Development",
      "experience_level": "Mid-Level",
      "difficulty": "medium",
      "required_skills": ["React", "TypeScript", "Django", "Tailwind CSS"],
      "responsibilities": ["Build responsive UI", "Integrate AI REST endpoints"],
      "created_at": "2026-11-24T12:00:00.000000+00:00",
      "updated_at": "2026-11-24T12:00:00.000000+00:00"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "Title, description and category are required."}`
  - `400 Bad Request`: `{"error": "required_skills and responsibilities must be lists."}`

#### 4.3 Job Detail
- **URL:** `GET /api/jobs/<job_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "job": {
      "id": "6740b2c3d4e5f6a7b8c9d0e1",
      "title": "Full Stack Engineer",
      "description": "...",
      "category": "Web Development",
      "experience_level": "Mid-Level",
      "difficulty": "medium",
      "required_skills": ["..."],
      "responsibilities": ["..."],
      "created_at": "2026-11-24T12:00:00.000000+00:00",
      "updated_at": "2026-11-24T12:00:00.000000+00:00"
    }
  }
  ```
- **Error Responses:**
  - `404 Not Found`: `{"error": "Job not found."}`

#### 4.4 Update Job
- **URL:** `PUT /api/jobs/<job_id>/`
- **Auth:** `IsAuthenticated`
- **Request Body:** Partial or full JSON with allowed fields: `title`, `description`, `category`, `experience_level`, `difficulty`, `required_skills`, `responsibilities`.
- **Response (200 OK):**
  ```json
  {
    "message": "Job updated successfully.",
    "job": {
      "id": "6740b2c3d4e5f6a7b8c9d0e1",
      "title": "Senior Full Stack Engineer",
      "..." : "..."
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "No valid fields provided."}`
  - `400 Bad Request`: `{"error": "required_skills must be a list."}`
  - `404 Not Found`: `{"error": "Job not found."}`

#### 4.5 Delete Job
- **URL:** `DELETE /api/jobs/<job_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "message": "Job deleted successfully."
  }
  ```
- **Error Responses:**
  - `404 Not Found`: `{"error": "Job not found."}`

---

### Domain 5: Skill Gap Analysis (`apps.skills`)

#### 5.1 Perform Skill Gap Analysis
- **URL:** `POST /api/skills/analyze/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "resume_id": "6740a1b2c3d4e5f6a7b8c9d0",
    "job_id": "6740b2c3d4e5f6a7b8c9d0e1"
  }
  ```
- **Preconditions:**
  - Resume must belong to authenticated user.
  - Resume `analysis_status` must equal `"completed"`.
  - Resume technical skills and job required skills must not be empty.
- **AI Processing:** Compares skills semantically using Gemini with exponential backoff (up to 3 retries) and fallback model support.
- **Response (201 Created):**
  ```json
  {
    "message": "AI skill gap analysis completed successfully.",
    "analysis_id": "6740c3d4e5f6a7b8c9d0e1f2",
    "job_title": "Full Stack Engineer",
    "analysis": {
      "skill_gap_score": 75,
      "matched_skills": ["React", "Django", "Tailwind CSS"],
      "missing_skills": ["TypeScript"],
      "additional_skills": ["MongoDB", "Docker"],
      "analysis": "The candidate matches 3 out of 4 core technical requirements...",
      "learning_roadmap": [
        {
          "week": 1,
          "topic": "TypeScript Fundamentals",
          "skills_to_learn": ["Interfaces", "Generics", "Type Assertions"],
          "tasks": ["Migrate a small React component to TypeScript"]
        }
      ],
      "recommendations": [
        "Focus on practical TypeScript projects before technical interview"
      ]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "resume_id and job_id are required."}`
  - `400 Bad Request`: `{"error": "Complete resume analysis first."}`
  - `404 Not Found`: `{"error": "Resume not found or access denied."}` or `{"error": "Job not found."}`
  - `502 Bad Gateway`: `{"error": "AI skill gap analysis failed.", "details": "..."}`
  - `503 Service Unavailable`: `{"error": "Gemini AI is temporarily unavailable.", "details": "...", "retry": true}`

---

### Domain 6: AI Interview Questions Generator (`apps.questions`)

#### 6.1 Generate Interview Questions
- **URL:** `POST /api/questions/generate/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "job_id": "6740b2c3d4e5f6a7b8c9d0e1",
    "resume_id": "6740a1b2c3d4e5f6a7b8c9d0",
    "question_type": "technical",
    "difficulty": "medium",
    "number_of_questions": 10
  }
  ```
- **Field Options & Defaults:**
  - `job_id`: Required String (ObjectId).
  - `resume_id`: Optional String (ObjectId). If provided, personalizes questions based on resume skills.
  - `question_type`: Optional, `"technical"` (default), `"hr"`, or `"mixed"`.
  - `difficulty`: Optional, `"easy"`, `"medium"` (default), or `"hard"`.
  - `number_of_questions`: Optional Integer between 1 and 20 (default: 10).
- **Response (201 Created):**
  ```json
  {
    "message": "Interview questions generated successfully.",
    "generation_id": "6740d4e5f6a7b8c9d0e1f2a3",
    "job_title": "Full Stack Engineer",
    "question_type": "technical",
    "difficulty": "medium",
    "questions": [
      {
        "question": "How does Django handle database migrations and concurrency?",
        "answer": "Django migrations are Python files that propagate model changes...",
        "explanation": "Evaluates candidate's understanding of ORM internals and deployment safety.",
        "topic": "Django ORM",
        "question_type": "technical",
        "difficulty": "medium"
      }
    ]
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: `{"error": "job_id is required."}`
  - `400 Bad Request`: `{"error": "number_of_questions must be between 1 and 20."}`
  - `404 Not Found`: `{"error": "Job not found."}`
  - `503 Service Unavailable`: `{"error": "Gemini AI is temporarily unavailable. Please try again later.", "retry": true}`

#### 6.2 Question Generation History
- **URL:** `GET /api/questions/history/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "count": 1,
    "history": [
      {
        "generation_id": "6740d4e5f6a7b8c9d0e1f2a3",
        "job_id": "6740b2c3d4e5f6a7b8c9d0e1",
        "job_title": "Full Stack Engineer",
        "question_type": "technical",
        "difficulty": "medium",
        "number_of_questions": 10,
        "questions": [...],
        "created_at": "2026-11-24T12:00:00.000000+00:00"
      }
    ]
  }
  ```

#### 6.3 Question Set Detail
- **URL:** `GET /api/questions/<generation_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "generation_id": "6740d4e5f6a7b8c9d0e1f2a3",
    "job_id": "6740b2c3d4e5f6a7b8c9d0e1",
    "job_title": "Full Stack Engineer",
    "question_type": "technical",
    "difficulty": "medium",
    "questions": [...],
    "created_at": "2026-11-24T12:00:00.000000+00:00"
  }
  ```

---

### Domain 7: Interactive Mock Interview Studio (`apps.interviews`)

#### 7.1 Start Mock Interview Session
- **URL:** `POST /api/interviews/start/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "job_id": "6740b2c3d4e5f6a7b8c9d0e1",
    "resume_id": "6740a1b2c3d4e5f6a7b8c9d0",
    "difficulty": "medium",
    "total_questions": 5
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Mock interview started successfully.",
    "interview_id": "6740e5f6a7b8c9d0e1f2a3b4",
    "job_title": "Full Stack Engineer",
    "difficulty": "medium",
    "current_question_number": 1,
    "total_questions": 5,
    "question": {
      "question": "Can you explain the Virtual DOM in React and how reconciliation works?",
      "topic": "React Core Architecture"
    }
  }
  ```

#### 7.2 Submit Answer & Receive AI Evaluation
- **URL:** `POST /api/interviews/<interview_id>/answer/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "answer": "The Virtual DOM is an in-memory representation of real DOM elements. Reconciliation is the diffing algorithm React uses to update only changed nodes."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Answer evaluated successfully.",
    "question_number": 1,
    "evaluation": {
      "score": 88,
      "rating": "Very Good",
      "strengths": ["Accurate definition of Virtual DOM", "Understands diffing purpose"],
      "improvements": ["Mention key prop heuristic in list reconciliation"],
      "feedback": "Strong concise answer covering the foundational mechanisms.",
      "ideal_answer": "The Virtual DOM is a lightweight JavaScript representation of the DOM..."
    }
  }
  ```

#### 7.3 Fetch Next Mock Interview Question
- **URL:** `POST /api/interviews/<interview_id>/next/`
- **Auth:** `IsAuthenticated`
- **Precondition:** The current question must be answered and evaluated first.
- **Response (200 OK):**
  ```json
  {
    "message": "Next question generated successfully.",
    "current_question_number": 2,
    "question": {
      "question": "How do you manage cross-origin requests securely in Django REST Framework?",
      "topic": "Django Security & CORS"
    }
  }
  ```

#### 7.4 Complete Mock Interview Session
- **URL:** `POST /api/interviews/<interview_id>/complete/`
- **Auth:** `IsAuthenticated`
- **Precondition:** All questions (e.g. 5 of 5) must be answered and evaluated.
- **Response (200 OK):**
  ```json
  {
    "message": "Mock interview completed successfully.",
    "interview_id": "6740e5f6a7b8c9d0e1f2a3b4",
    "job_title": "Full Stack Engineer",
    "total_questions": 5,
    "total_score": 84,
    "status": "completed",
    "question_scores": [88, 80, 85, 90, 77]
  }
  ```

#### 7.5 Mock Interview History
- **URL:** `GET /api/interviews/history/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "count": 1,
    "history": [
      {
        "interview_id": "6740e5f6a7b8c9d0e1f2a3b4",
        "job_title": "Full Stack Engineer",
        "difficulty": "medium",
        "total_questions": 5,
        "current_question_number": 5,
        "total_score": 84,
        "status": "completed",
        "created_at": "2026-11-24T12:00:00.000000+00:00",
        "completed_at": "2026-11-24T12:20:00.000000+00:00"
      }
    ]
  }
  ```

#### 7.6 Mock Interview Session Detail
- **URL:** `GET /api/interviews/<interview_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):** Returns full interview session with all questions, expected answers, candidate answers, and question-level evaluations.

---

### Domain 8: Targeted Follow-Up Questions (`apps.followup_questions`)

#### 8.1 Generate Follow-Up Questions
- **URL:** `POST /api/followup-questions/generate/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "interview_id": "6740e5f6a7b8c9d0e1f2a3b4",
    "question": "Can you explain the Virtual DOM in React and how reconciliation works?",
    "candidate_answer": "The Virtual DOM is an in-memory representation...",
    "job_title": "Full Stack Engineer",
    "difficulty": "medium",
    "number_of_followups": 3
  }
  ```
- **Validation Rules:**
  - `interview_id` must match a valid interview belonging to user.
  - `question` and `candidate_answer` must match the stored interview answer exactly.
  - `number_of_followups`: Integer 1 to 5 (default: 3).
- **Response (201 Created):**
  ```json
  {
    "message": "Follow-up questions generated successfully.",
    "followup_id": "6740f6a7b8c9d0e1f2a3b4c5",
    "interview_id": "6740e5f6a7b8c9d0e1f2a3b4",
    "result": {
      "analysis": "The candidate provided a solid high-level summary but omitted fiber architecture.",
      "strengths": ["Clear high-level understanding"],
      "improvements": ["Deepen understanding of fiber reconciliation and batching"],
      "follow_up_questions": [
        {
          "question": "How did the React Fiber architecture improve the older recursive reconciliation algorithm?",
          "reason": "Evaluates knowledge of modern React scheduling and concurrency.",
          "ideal_answer": "React Fiber introduced incremental rendering with breakable work units...",
          "explanation": "Fiber allows React to pause, resume, or abort rendering units based on priority.",
          "example": "High priority user input vs background data fetching."
        }
      ]
    }
  }
  ```

#### 8.2 Follow-Up Questions History
- **URL:** `GET /api/followup-questions/history/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):** Returns list of recent follow-up sets (limit 50).

#### 8.3 Follow-Up Question Detail
- **URL:** `GET /api/followup-questions/<followup_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):** Returns complete follow-up question set and analysis.

---

### Domain 9: Comprehensive Interview Feedback Report (`apps.interview_feedback`)

#### 9.1 Generate Comprehensive Feedback Report
- **URL:** `POST /api/interview-feedback/generate/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "interview_id": "6740e5f6a7b8c9d0e1f2a3b4"
  }
  ```
- **Preconditions:** Interview status must be `"completed"` and all questions must have evaluations.
- **Response (201 Created):**
  ```json
  {
    "message": "Interview feedback report generated successfully.",
    "feedback_id": "6741a7b8c9d0e1f2a3b4c5d6",
    "interview_id": "6740e5f6a7b8c9d0e1f2a3b4",
    "result": {
      "overall_summary": "Demonstrated strong knowledge of core web and backend frameworks...",
      "overall_rating": "Very Good",
      "overall_score": 84,
      "strengths": [
        "In-depth grasp of React component lifecycles and Virtual DOM",
        "Clear articulation of backend security principles"
      ],
      "weaknesses": [
        "Needs more exposure to distributed database sharding"
      ],
      "topic_wise_performance": [
        {
          "topic": "React Core Architecture",
          "score": 88,
          "rating": "Very Good",
          "feedback": "Clear explanation of Virtual DOM concepts."
        }
      ],
      "improvement_plan": [
        {
          "priority": "High",
          "area": "Distributed Systems",
          "action": "Study database replication and partitioning strategies."
        }
      ],
      "recommendations": [
        "Practice scenario-based architectural trade-off questions."
      ]
    }
  }
  ```

#### 9.2 Feedback Report History
- **URL:** `GET /api/interview-feedback/history/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "count": 1,
    "history": [
      {
        "feedback_id": "6741a7b8c9d0e1f2a3b4c5d6",
        "interview_id": "6740e5f6a7b8c9d0e1f2a3b4",
        "job_title": "Full Stack Engineer",
        "overall_score": 84,
        "overall_rating": "Very Good",
        "created_at": "2026-11-24T12:25:00.000000+00:00"
      }
    ]
  }
  ```

#### 9.3 Feedback Report Detail
- **URL:** `GET /api/interview-feedback/<feedback_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):** Returns detailed report with strengths, weaknesses, topic-wise ratings, and actionable improvement plan.

---

### Domain 10: Performance Dashboard (`apps.dashboard`)

#### 10.1 Dashboard Overview Analytics
- **URL:** `GET /api/dashboard/overview/`
- **Auth:** `IsAuthenticated`
- **Implementation:** Queries `mock_interviews` for authenticated user, calculating aggregates and charts.
- **Response (200 OK):**
  ```json
  {
    "message": "Dashboard data retrieved successfully.",
    "statistics": {
      "total_interviews": 6,
      "completed_interviews": 5,
      "in_progress_interviews": 1,
      "average_score": 81.5,
      "highest_score": 92
    },
    "performance_chart": [
      {
        "date": "2026-11-20T10:00:00+00:00",
        "job_title": "Python Developer",
        "score": 75
      },
      {
        "date": "2026-11-24T12:20:00+00:00",
        "job_title": "Full Stack Engineer",
        "score": 84
      }
    ],
    "question_performance": [
      {
        "topic": "React Core Architecture",
        "average_score": 88.0,
        "attempts": 2
      },
      {
        "topic": "Django Security & CORS",
        "average_score": 80.0,
        "attempts": 1
      }
    ],
    "recent_history": [
      {
        "interview_id": "6740e5f6a7b8c9d0e1f2a3b4",
        "job_title": "Full Stack Engineer",
        "difficulty": "medium",
        "total_questions": 5,
        "total_score": 84,
        "status": "completed",
        "created_at": "2026-11-24T12:00:00+00:00",
        "completed_at": "2026-11-24T12:20:00+00:00"
      }
    ]
  }
  ```

---

### Domain 11: AI Career Assistant Chatbot (`apps.chatbot`)

#### 11.1 Send Message to Career Chatbot
- **URL:** `POST /api/chatbot/message/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "message": "How should I answer 'Tell me about a time you resolved a difficult conflict'?",
    "conversation_id": "6741b8c9d0e1f2a3b4c5d6e7"
  }
  ```
- **Field Details:**
  - `message`: Required string (max 10,000 characters).
  - `conversation_id`: Optional string (ObjectId). If omitted, a new conversation is created with title derived from the first 80 characters of `message`.
- **Context Handling:** Backend automatically loads the last 12 messages of conversation history to maintain conversational context.
- **Response (200 OK):**
  ```json
  {
    "message": "AI response generated successfully.",
    "conversation_id": "6741b8c9d0e1f2a3b4c5d6e7",
    "user_message": {
      "role": "user",
      "content": "How should I answer...",
      "created_at": "2026-11-24T13:00:00.000000+00:00"
    },
    "assistant_message": {
      "role": "assistant",
      "content": "Use the STAR method (Situation, Task, Action, Result). Here is how you can structure it...",
      "created_at": "2026-11-24T13:00:03.000000+00:00"
    }
  }
  ```

#### 11.2 Chatbot Conversation History List
- **URL:** `GET /api/chatbot/history/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "count": 3,
    "history": [
      {
        "conversation_id": "6741b8c9d0e1f2a3b4c5d6e7",
        "title": "How should I answer 'Tell me about a time you resolved a difficult conflict'?",
        "messages": [/* last 2 preview messages */],
        "created_at": "2026-11-24T13:00:00+00:00",
        "updated_at": "2026-11-24T13:02:00+00:00"
      }
    ]
  }
  ```

#### 11.3 Chatbot Conversation Detail
- **URL:** `GET /api/chatbot/conversation/<conversation_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):** Returns complete message thread for the specified conversation.

#### 11.4 Delete Conversation
- **URL:** `DELETE /api/chatbot/conversation/<conversation_id>/delete/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "message": "Conversation deleted successfully."
  }
  ```

---

### Domain 12: AI Coding Interview (`apps.coding_interview`)

#### 12.1 Generate Coding Problem
- **URL:** `POST /api/coding-interview/generate/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "topic": "Dynamic Programming",
    "difficulty": "medium",
    "programming_language": "python"
  }
  ```
- **Supported Languages:** `python`, `javascript`, `java`, `cpp`, `c`, `csharp`, `go`, `php`.
- **Difficulties:** `easy`, `medium`, `hard`.
- **Response (201 Created):**
  ```json
  {
    "message": "Coding question generated successfully.",
    "question_id": "6741c9d0e1f2a3b4c5d6e7f8",
    "topic": "Dynamic Programming",
    "difficulty": "medium",
    "programming_language": "python",
    "question": {
      "title": "House Robber Problem",
      "description": "You are a professional robber planning to rob houses...",
      "input_format": "List of integers representing money in each house.",
      "output_format": "Integer representing maximum money robbable without triggering alarm.",
      "constraints": ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
      "examples": [
        {
          "input": "[1,2,3,1]",
          "output": "4",
          "explanation": "Rob house 1 (money = 1) and house 3 (money = 3). Total = 4."
        },
        {
          "input": "[2,7,9,3,1]",
          "output": "12",
          "explanation": "Rob house 1 (2), house 3 (9) and house 5 (1). Total = 12."
        }
      ],
      "starter_code": "def rob(nums: list[int]) -> int:\n    # Write your solution here\n    pass",
      "test_cases": [
        {"input": "[1,2,3,1]", "expected_output": "4"},
        {"input": "[2,7,9,3,1]", "expected_output": "12"},
        {"input": "[2,1,1,2]", "expected_output": "4"}
      ],
      "hints": ["Think about the subproblem for house i: rob it or skip it?"]
    }
  }
  ```

#### 12.2 Submit Code Solution for AI Evaluation
- **URL:** `POST /api/coding-interview/submit/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "question_id": "6741c9d0e1f2a3b4c5d6e7f8",
    "programming_language": "python",
    "submitted_code": "def rob(nums):\n    prev1, prev2 = 0, 0\n    for num in nums:\n        prev1, prev2 = max(prev2 + num, prev1), prev1\n    return prev1"
  }
  ```
- **Evaluation Mechanism:** Static AI analysis only. The backend does not run the code in a sandbox.
- **Response (201 Created):**
  ```json
  {
    "message": "Code evaluated successfully.",
    "submission_id": "6741d0e1f2a3b4c5d6e7f8a9",
    "question_id": "6741c9d0e1f2a3b4c5d6e7f8",
    "evaluation_type": "AI static analysis only; code was not executed.",
    "evaluation": {
      "score": 95,
      "correctness": "Optimal O(N) time and O(1) space implementation.",
      "logic": "Correct state transitions utilizing two sliding variables.",
      "time_complexity": "O(N)",
      "space_complexity": "O(1)",
      "code_quality": "Clean and Pythonic.",
      "bugs": [],
      "suggestions": ["Add type annotations for production readability."],
      "overall_feedback": "Exemplary solution matching top-tier interview expectations.",
      "verdict": "excellent"
    }
  }
  ```

#### 12.3 Coding Interview Submission History
- **URL:** `GET /api/coding-interview/history/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):** Returns list of coding submissions.

#### 12.4 Coding Submission Detail
- **URL:** `GET /api/coding-interview/submission/<submission_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):** Returns full submitted code, question id, and evaluation.

---

### Domain 13: AI Code Debugger (`apps.code_debugger`)

#### 13.1 Debug Code Snippet
- **URL:** `POST /api/code-debugger/analyze/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "code": "def calculate_average(nums):\n    total = 0\n    for i in range(len(nums)):\n        total += nums[i]\n    return total / len(nums)",
    "programming_language": "python",
    "error_message": "ZeroDivisionError: division by zero",
    "expected_behavior": "Return 0 when nums is empty"
  }
  ```
- **Supported Languages:** `python`, `javascript`, `typescript`, `java`, `cpp`, `c`, `csharp`, `go`, `php`.
- **Response (201 Created):**
  ```json
  {
    "message": "Code debugging completed successfully.",
    "debug_id": "6741e1f2a3b4c5d6e7f8a9b0",
    "programming_language": "python",
    "evaluation_type": "AI static code analysis only; submitted code was not executed.",
    "result": {
      "summary": "Division by zero occurs when the input list nums is empty.",
      "has_errors": true,
      "overall_severity": "medium",
      "root_cause": "The code does not validate whether len(nums) is zero before division.",
      "issues": [
        {
          "title": "Unhandled Empty Collection",
          "error_type": "Runtime",
          "severity": "medium",
          "line_number": 5,
          "explanation": "Attempting to divide total by len(nums) when len(nums) is 0 raises ZeroDivisionError.",
          "suggestion": "Add an early return check: if not nums: return 0"
        }
      ],
      "corrected_code": "def calculate_average(nums):\n    if not nums:\n        return 0\n    return sum(nums) / len(nums)",
      "corrections": [
        "Added guard clause for empty collection",
        "Replaced manual index iteration with idiomatic Python sum()"
      ],
      "optimization_suggestions": [
        "Use sum(nums) instead of an explicit loop for better performance and readability"
      ]
    }
  }
  ```

#### 13.2 Code Debugger History
- **URL:** `GET /api/code-debugger/history/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):** List of past debugging reports.

#### 13.3 Code Debugger Report Detail
- **URL:** `GET /api/code-debugger/<debug_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):** Complete debugging report, original code, and corrected code.

---

### Domain 14: AI Resume Builder & PDF Exporter (`apps.resume_builder`)

#### 14.1 Generate AI Polished Resume & PDF
- **URL:** `POST /api/resume-builder/generate/`
- **Auth:** `IsAuthenticated`
- **Request Body:**
  ```json
  {
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1-555-0199",
    "location": "San Francisco, CA",
    "professional_title": "Full Stack Engineer",
    "professional_summary": "Passionate software engineer building performant web apps...",
    "skills": ["React", "TypeScript", "Python", "Django", "MongoDB"],
    "education": [
      {
        "degree": "B.S. in Computer Science",
        "institution": "University of California, Berkeley",
        "year": "2024",
        "details": "GPA 3.8, Magna Cum Laude"
      }
    ],
    "experience": [
      {
        "job_title": "Software Developer Intern",
        "company": "Tech Corp",
        "duration": "June 2023 - August 2023",
        "responsibilities": [
          "Developed reusable React components",
          "Optimized backend queries in Django"
        ]
      }
    ],
    "projects": [
      {
        "name": "PrepVela",
        "description": "Real-time AI interview preparation system.",
        "technologies": ["React", "Django", "Gemini API"]
      }
    ],
    "certifications": ["AWS Certified Solutions Architect"],
    "achievements": ["1st Place Hackathon Winner 2024"]
  }
  ```
- **Processing Flow:**
  1. AI Polish: Sends input to Gemini (`gemini-3.8-flash`) to rewrite summaries, format bullets, and refine language concisely.
  2. PDF Generation: ReportLab constructs a publication-ready single or multi-page A4 PDF using structured styles (`#28204A` primary, `#8055E8` accents, `#DED6F5` dividers).
  3. Storage: Streams generated PDF binary directly into MongoDB GridFS.
- **Response (201 Created):**
  ```json
  {
    "message": "Professional resume PDF generated successfully.",
    "resume": {
      "id": "6741f2a3b4c5d6e7f8a9b0c1",
      "filename": "Jane_Doe_Resume.pdf",
      "content_type": "application/pdf",
      "created_at": "2026-11-24T14:00:00.000000+00:00",
      "download_url": "/api/resume-builder/download/6741f2a3b4c5d6e7f8a9b0c1/"
    }
  }
  ```

#### 14.2 Download Resume PDF
- **URL:** `GET /api/resume-builder/download/<resume_id>/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  - **Headers:** `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Jane_Doe_Resume.pdf"`, `X-Content-Type-Options: nosniff`.
  - **Body:** Raw binary PDF stream.

#### 14.3 Resume Builder History
- **URL:** `GET /api/resume-builder/history/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):** Returns generated resume history (id, filename, created_at, download_url).

#### 14.4 Delete Generated Resume
- **URL:** `DELETE /api/resume-builder/<resume_id>/delete/`
- **Auth:** `IsAuthenticated`
- **Response (200 OK):**
  ```json
  {
    "message": "Generated resume deleted successfully."
  }
  ```

---

## 4. Feature Readiness Classification

| Feature Module | Backend Status | Readiness Classification | Notes & Technical Requirements |
| :--- | :--- | :--- | :--- |
| **User Registration** | Implemented | **READY** | Validates email uniqueness in MongoDB `users`. |
| **User Login** | Implemented | **READY** | Returns 24h JWT token and user profile object. |
| **User Profile (View)** | Implemented | **READY** | Returns `id`, `name`, `email`. |
| **User Profile (Edit)** | Not Implemented | **MISSING** | No endpoint exists to change name, email, or password. |
| **User Logout** | Implemented | **READY** | Blacklists token hash in MongoDB `revoked_tokens`. |
| **Password Reset** | Not Implemented | **MISSING** | No forgot password or reset token flow implemented. |
| **Token Refresh** | Not Implemented | **MISSING** | Single 24h token. User re-authenticates when expired. |
| **Dashboard Overview** | Implemented | **READY** | Aggregates user metrics, score charts, topic breakdowns. |
| **Resume Upload** | Implemented | **READY** | Multipart form with GridFS storage and text extraction. |
| **Resume List & Detail** | Implemented | **READY** | Full metadata and extracted text retrieval. |
| **Resume Deletion** | Implemented | **READY** | Deletes GridFS stream and metadata document. |
| **AI Resume Analysis** | Implemented | **READY** | Gemini 3.8 Flash structured evaluation and scoring. |
| **Job Market (List/Search)**| Implemented | **READY** | Query filters: `search`, `category`, `experience`, `difficulty`, `page`, `limit`. |
| **Job Role Management** | Implemented | **READY** | Full CRUD (POST, PUT, DELETE) implemented. |
| **Skill Gap Analysis** | Implemented | **READY** | Compares analyzed resume with job; generates roadmap. |
| **Skill Gap History** | Partial | **PARTIAL** | Saved to MongoDB `skill_gap_analyses`, but no GET list endpoint exists. |
| **AI Question Generator**| Implemented | **READY** | Generates 1-20 technical, HR, or mixed questions. |
| **Question History & Set**| Implemented | **READY** | Full history and detail endpoints available. |
| **Mock Interview Studio** | Implemented | **READY** | Dynamic multi-turn interview workflow with instant scoring. |
| **Interview History** | Implemented | **READY** | Lists past sessions and scores. |
| **Interview Detail** | Implemented | **READY** | Question-by-question review with feedback. |
| **Targeted Follow-Ups** | Implemented | **READY** | Contextual follow-up question generator on answers. |
| **Interview Feedback Report**| Implemented | **READY** | Post-interview holistic report and action plan. |
| **AI Career Chatbot** | Implemented | **READY** | Multi-turn contextual assistant with thread history. |
| **Coding Problem Gen** | Implemented | **READY** | Generates problem, test cases, and starter code (8 languages). |
| **Coding AI Evaluator** | Implemented | **READY** | Static analysis (complexity, logic, bugs, score). |
| **Live Code Execution** | Not Implemented | **MISSING** | Explicitly static analysis only; no sandboxed runtime. |
| **AI Code Debugger** | Implemented | **READY** | Static root cause analysis, severity rating, and code fix. |
| **AI Resume Builder** | Implemented | **READY** | AI refinement of resume sections. |
| **PDF Generation & Export**| Implemented | **READY** | ReportLab styled A4 PDF stream download via GridFS. |
| **Account Settings** | Not Implemented | **MISSING** | Profile settings, password update, account deletion missing. |

---

## 5. Technical Risks & Frontend Mitigations

1. **AI Latency & Timeouts:**  
   Calls to Gemini (especially Resume Analysis, Code Evaluation, and Feedback Generation) can take 5–15 seconds.
   * *Mitigation:* The React frontend must implement dedicated loading skeletons, progress pulses, disabled submit triggers, and optimistic UI updates.
2. **503 / 502 Temporary Gemini Errors:**  
   The backend catches Gemini rate limits and quota spikes, returning HTTP 503 with `"retry": true`.
   * *Mitigation:* Axios response interceptors must implement an automatic retry mechanism with exponential backoff for 503 responses.
3. **No Dynamic Code Execution:**  
   Users might expect an active runner (executing `print('hello')`).
   * *Mitigation:* The frontend must clearly label the code interview and debugger features as **"AI Static Code Analysis & Verification"** with clear disclaimer badges.
4. **Binary PDF Download Handling:**  
   Downloading resume PDFs requires reading `responseType: "blob"` via Axios and creating an ephemeral `URL.createObjectURL(blob)` for triggering native browser downloads.
5. **Requirements.txt Dependency Mismatch:**  
   `reportlab` and `python-docx` are installed in the existing virtual environment (`venv`) but are absent from `requirements.txt`.
   * *Note:* No backend files can be modified in Phase 1; documented here for technical awareness.
