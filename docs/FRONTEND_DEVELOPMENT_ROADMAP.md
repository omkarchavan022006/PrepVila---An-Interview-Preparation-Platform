# PrepVela — Frontend Development Roadmap

> **Document Version:** 1.0.0  
> **Architecture:** React 18+ / Vite / Tailwind CSS / React Router v6 / Axios / Framer Motion / Lucide React / Recharts  
> **Backend Integration:** Django REST Framework + MongoDB Atlas + Google Gemini  
> **Scope:** 15-Phase End-to-End Implementation Lifecycle  

---

## Roadmap Overview & Phase Matrix

| Phase | Title | Primary Focus | Backend Dependencies |
| :---: | :--- | :--- | :--- |
| **01** | **Project Audit & Backend Discovery** | Complete codebase analysis, API discovery, integration mapping | Read-only Backend Inspection |
| **02** | **Frontend Tooling & Core Architecture** | Vite + React setup, Tailwind config, Axios client, directory layout | System Health Check (`GET /api/health/`) |
| **03** | **Design System & Base UI Library** | Atomic components, typography, dark/light themes, animations | None (Pure UI) |
| **04** | **Authentication & Session Management** | JWT interceptors, login, register, profile, token persistence | Accounts API (`/api/auth/*`) |
| **05** | **App Shell, Navigation & Layouts** | Responsive sidebar, topbar, mobile drawer, error boundaries | Profile API (`GET /api/auth/profile/`) |
| **06** | **Interactive Analytics Dashboard** | KPI metric cards, performance charts, topic score radars | Dashboard API (`GET /api/dashboard/overview/`) |
| **07** | **Resume Management & AI Analysis** | Multipart drag-drop upload, PDF viewer, AI score analysis | Resumes API (`/api/resumes/*`) |
| **08** | **Job Market & Role Management** | Searchable job catalog, filters, pagination, role CRUD modals | Jobs API (`/api/jobs/*`) |
| **09** | **AI Skill Gap Analysis & Roadmap** | Resume vs Job matching, visual career roadmap timeline | Skills API (`POST /api/skills/analyze/`) |
| **10** | **AI Question Generator & Question Bank** | Question builder, flashcards, model answers, history drawer | Questions API (`/api/questions/*`) |
| **11** | **Interactive AI Mock Interview Studio** | Real-time question answering, turn progression, instant scoring | Interviews API (`/api/interviews/*`) |
| **12** | **Post-Interview Feedback & Follow-Ups** | Holistic feedback report, action plan, targeted follow-ups | Feedback & Followups APIs (`/api/interview-feedback/*`, `/api/followup-questions/*`) |
| **13** | **AI Coding Interview Simulator** | Multi-language code editor, problem view, AI static evaluation | Coding Interview API (`/api/coding-interview/*`) |
| **14** | **AI Code Debugging Assistant** | Code editor with error inputs, root cause analysis, code diffs | Code Debugger API (`/api/code-debugger/*`) |
| **15** | **AI Resume Builder & PDF Exporter** | Multi-step resume wizard, AI enhancement, A4 PDF download | Resume Builder API (`/api/resume-builder/*`) |

---

## Detailed Phase Specifications

### Phase 1: Complete Project Audit & Backend API Discovery
- **Objective:** Fully understand existing backend architecture, data models, endpoints, authentication contracts, AI prompt patterns, and security constraints before modifying or writing code.
- **Deliverables:**
  - Complete project inventory.
  - `docs/FRONTEND_API_INTEGRATION_MAP.md` detailing all 48 endpoints.
  - `docs/FRONTEND_DEVELOPMENT_ROADMAP.md` covering all 15 implementation phases.
  - Technical risk assessment.
- **Backend Dependencies:** None (Read-only source inspection).
- **Testing Requirements:** Verify all route configs, serializers, views, and environment variable references.
- **Completion Criteria:** User approval of Phase 1 audit report and documentation.

---

### Phase 2: Frontend Environment & Base Architecture Setup
- **Objective:** Initialize a blazing-fast React + Vite project in `frontend/`, configure Tailwind CSS with custom branding colors, setup directory hierarchy, install dependencies, and configure Axios client with environment variables.
- **Required Packages:**
  - `react`, `react-dom`, `react-router-dom`
  - `tailwindcss`, `postcss`, `autoprefixer`
  - `axios`
  - `framer-motion`
  - `lucide-react`
  - `recharts`
- **Axios Configuration:**
  - Base URL from `VITE_API_URL` (default `http://localhost:8000`).
  - Request interceptor attaching `Authorization: Bearer <token>`.
  - Response interceptor handling 401 token expiration and 503 retry triggers.
- **Testing Requirements:** Successful build (`npm run build`) and verification of health check call (`GET /api/health/`).
- **Completion Criteria:** Clean Vite development server running on port 5173 with verified API connection.

---

### Phase 3: Core Design System, Themes & UI Component Library
- **Objective:** Construct a unified, responsive design system supporting Dark and Light themes, utilizing modern Glassmorphism, subtle gradients, and consistent typography matching the platform branding (`#28204A` deep purple, `#8055E8` primary accent, `#4F46E5` indigo).
- **Core Components:**
  - `Button` (Primary, Secondary, Outline, Danger, Ghost, with loading spinners).
  - `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`.
  - `Card`, `Badge` (Success, Warning, Danger, Info, Difficulty).
  - `Modal`, `Drawer`, `Tabs`, `Accordion`.
  - `Skeleton` loaders and Pulsing AI placeholders.
  - `Toast` notification system for error and success alerts.
- **Testing Requirements:** Visual component inspection across desktop, tablet, and mobile viewport breakpoints.
- **Completion Criteria:** Reusable component library exported and demonstrated in a dedicated UI preview sandbox.

---

### Phase 4: Authentication & User Session Management
- **Objective:** Build robust user authentication flow with JWT persistence in localStorage, automatic session initialization, and protected route guards.
- **Required Pages:**
  - `/login` (Login with email & password, remember me, validation error display).
  - `/register` (User registration with name, email, password strength meter).
- **Architecture & State:**
  - `AuthContext` providing `user`, `token`, `login()`, `register()`, `logout()`, `isAuthenticated`, `isLoading`.
  - `ProtectedRoute` wrapper redirecting unauthenticated users to `/login`.
  - `PublicRoute` wrapper redirecting authenticated users to `/dashboard`.
- **Backend Dependencies:**
  - `POST /api/auth/register/`
  - `POST /api/auth/login/`
  - `GET /api/auth/profile/`
  - `POST /api/auth/logout/`
- **Testing Requirements:** Verify login success, invalid password rejection, duplicate email handling, token revocation on logout, and page refresh persistence.
- **Completion Criteria:** User can register, log in, navigate protected routes, and log out securely.

---

### Phase 5: Application Shell, Navigation & Layouts
- **Objective:** Implement the primary application shell providing seamless navigation between all 10 platform modules.
- **Components & Layouts:**
  - `DashboardLayout`: Persistent collapsible sidebar, header with breadcrumbs, user avatar dropdown, and theme toggle.
  - `AuthLayout`: Centered, animated card layout for onboarding and authentication.
  - `MobileNavbar`: Accessible slide-out hamburger drawer for mobile devices.
  - `ErrorBoundary`: Graceful error boundary catching UI exceptions with a retry button.
- **Navigation Links:**
  - Dashboard, Resume Analyzer, Job Market, Skill Gap, Question Generator, Mock Interviews, Coding Studio, Code Debugger, Resume Builder, AI Chatbot.
- **Testing Requirements:** Responsiveness check on 320px, 768px, 1024px, and 1440px displays.
- **Completion Criteria:** Consistent app navigation with active link indicators, smooth transitions, and user profile display.

---

### Phase 6: Interactive Analytics Dashboard
- **Objective:** Build the platform's command center presenting actionable KPIs, score progression charts, topic mastery radars, and quick action launchpads.
- **Required Pages:**
  - `/dashboard`
- **Visual Features:**
  - Quick Stat Cards: Total Interviews, Completed Sessions, Average Score %, Highest Score %.
  - Score Progression Line Chart (Recharts) plotting historical interview scores over time.
  - Topic Performance Bar/Radar Chart highlighting strengths and areas for improvement.
  - Recent Interview History Table with status pills and direct link to interview details.
  - Quick Action Buttons: "Start Mock Interview", "Upload Resume", "Launch Code Studio".
- **Backend Dependencies:**
  - `GET /api/dashboard/overview/`
- **Testing Requirements:** Test with zero historical interviews (empty state), few interviews, and 10+ completed interviews.
- **Completion Criteria:** Live dashboard displaying real user analytics with smooth chart rendering.

---

### Phase 7: Resume Management & AI Analysis Engine
- **Objective:** Enable candidates to upload resumes (PDF/DOCX), store them in GridFS, trigger comprehensive Gemini 3.8 Flash evaluation, and inspect detailed analysis scorecards.
- **Required Pages:**
  - `/resumes` (Resume list, upload modal, deletion confirmation).
  - `/resumes/:id` (Extracted text viewer, AI scorecard, strengths/weaknesses, missing skills, career role recommendations).
- **Key Features:**
  - Drag-and-drop file uploader with client-side file size (<5 MB) and extension validation (.pdf, .docx).
  - Circular Score Gauge (0–100%) with color-coded rating (Red <60, Yellow 60–79, Green 80+).
  - Structured badges for Technical Skills, Soft Skills, and Missing Skills.
  - AI Improvement suggestions checklist.
- **Backend Dependencies:**
  - `POST /api/resumes/upload/`
  - `GET /api/resumes/`
  - `GET /api/resumes/:id/`
  - `DELETE /api/resumes/:id/delete/`
  - `POST /api/resumes/:id/analyze/`
- **Testing Requirements:** Upload sample PDF, sample DOCX, verify AI analysis trigger, test handling of large files and empty text resumes.
- **Completion Criteria:** Candidate can upload resume, view extracted text, trigger AI analysis, and see complete evaluation scorecard.

---

### Phase 8: Job Market & Role Management System
- **Objective:** Build an interactive job explorer allowing users to search, filter, and inspect job descriptions, and administrators/candidates to create custom job profiles.
- **Required Pages:**
  - `/jobs` (Catalog with search bar, category pills, experience filters, pagination controls).
  - `/jobs/:id` (Detailed job specification, required skills, responsibilities, "Practice for this Role" trigger).
- **Key Features:**
  - Debounced real-time title search (`search` param).
  - Filter chips: Category, Experience Level (Junior, Mid, Senior), Difficulty (Easy, Medium, Hard).
  - Job creation & edit modal with dynamic skill tag inputs.
- **Backend Dependencies:**
  - `GET /api/jobs/`
  - `POST /api/jobs/`
  - `GET /api/jobs/:id/`
  - `PUT /api/jobs/:id/`
  - `DELETE /api/jobs/:id/`
- **Testing Requirements:** Verify pagination bounds, search filtering, tag addition/removal in creation modal.
- **Completion Criteria:** Fully functional searchable job catalog with complete CRUD operations.

---

### Phase 9: AI Skill Gap Analysis & Career Roadmapping
- **Objective:** Compare candidate skills extracted from resumes with target job requirements, calculating match percentage and generating a multi-week actionable learning roadmap.
- **Required Pages:**
  - `/skills/gap-analysis` (Selection step: choose resume + choose job).
  - `/skills/gap-analysis/result` (Skill comparison Venn/matrix, match score, visual weekly roadmap timeline).
- **Key Features:**
  - Side-by-side comparison: Matched Skills (Green badges), Missing Skills (Red badges), Additional Skills (Purple badges).
  - Interactive multi-week timeline showing recommended topics, skills to learn, and concrete practical tasks.
  - Direct CTA button: "Generate targeted interview questions for this gap".
- **Backend Dependencies:**
  - `GET /api/resumes/` (To select completed resume).
  - `GET /api/jobs/` (To select target job).
  - `POST /api/skills/analyze/`
- **Testing Requirements:** Validate blocking if resume is not analyzed yet; test AI timeout recovery with retry pill.
- **Completion Criteria:** Candidate can select an analyzed resume and job, run analysis, and explore visual roadmap.

---

### Phase 10: AI Interview Question Generation & Question Bank
- **Objective:** Generate customized technical, HR, or mixed interview questions tailored to specific jobs and candidate resumes, with sample answers and interviewer evaluation rationale.
- **Required Pages:**
  - `/questions/generate` (Configurator: Job selector, Resume selector, Question type, Difficulty, Count 1–20).
  - `/questions/history` (Browse past generated question sets).
  - `/questions/:id` (Interactive flashcard and accordion question bank view).
- **Key Features:**
  - Flipcard mode: View question on front, flip to reveal model answer, topic badge, and evaluation rationale on back.
  - Filter by topic and difficulty level.
  - "Practice this question in Mock Interview" shortcut.
- **Backend Dependencies:**
  - `POST /api/questions/generate/`
  - `GET /api/questions/history/`
  - `GET /api/questions/:id/`
- **Testing Requirements:** Test generation with 5, 10, and 20 questions; test technical vs HR vs mixed outputs.
- **Completion Criteria:** Question sets can be generated, saved, reviewed, and practiced.

---

### Phase 11: Interactive AI Mock Interview Studio
- **Objective:** Create the platform's signature real-time mock interview environment where candidates answer dynamic AI questions and receive immediate turn-by-turn evaluations.
- **Required Pages:**
  - `/interviews/setup` (Configure job, resume, difficulty, question count 3–10).
  - `/interviews/:id/room` (Live interview session with question display, answer text area, timer, instant feedback panel).
  - `/interviews/:id/summary` (Session completion screen with score breakdown and question review).
  - `/interviews/history` (Historical interview list).
- **Workflow State Machine:**
  1. `SETUP`: Select job, resume, difficulty. Call `POST /api/interviews/start/`.
  2. `QUESTION_ACTIVE`: Display current question number and topic. User enters answer.
  3. `EVALUATING`: Submitting answer (`POST .../answer/`). Spinner showing "AI Evaluator is analyzing your response...".
  4. `QUESTION_FEEDBACK`: Show score (0–100), rating, strengths, improvements, and ideal answer. Enable "Next Question" button.
  5. `NEXT_QUESTION`: Call `POST .../next/`. Repeat steps 2–4 until last question.
  6. `COMPLETE`: Call `POST .../complete/`. Redirect to session summary.
- **Backend Dependencies:**
  - `POST /api/interviews/start/`
  - `POST /api/interviews/:id/answer/`
  - `POST /api/interviews/:id/next/`
  - `POST /api/interviews/:id/complete/`
  - `GET /api/interviews/history/`
  - `GET /api/interviews/:id/`
- **Testing Requirements:** Full walkthrough from Question 1 to completion; ensure state prevents advancing without answering.
- **Completion Criteria:** End-to-end multi-question interactive mock interview simulation with instant feedback.

---

### Phase 12: Comprehensive Post-Interview Evaluation & Follow-Up Studio
- **Objective:** Provide in-depth holistic post-interview feedback reports and targeted follow-up probing questions to simulate senior-level technical interviews.
- **Required Pages:**
  - `/interviews/:id/feedback` (Comprehensive performance report: overall rating, strengths/weaknesses, topic-wise breakdown, priority action plan).
  - `/interviews/:id/followups` (Generate and review targeted follow-up questions challenging candidate's specific answers).
  - `/feedback/history` & `/followups/history` (Historical archives).
- **Key Features:**
  - Priority Action Plan Matrix: High / Medium / Low priority recommendations with concrete actions.
  - Probing Follow-Up Cards: Displays original answer, why the interviewer asks the follow-up, ideal answer, and code/architecture examples.
- **Backend Dependencies:**
  - `POST /api/interview-feedback/generate/`
  - `GET /api/interview-feedback/history/`
  - `GET /api/interview-feedback/:id/`
  - `POST /api/followup-questions/generate/`
  - `GET /api/followup-questions/history/`
  - `GET /api/followup-questions/:id/`
- **Testing Requirements:** Verify generation after completing a mock interview; test validation rules for matching answers.
- **Completion Criteria:** Candidates can generate comprehensive post-interview feedback and drill into targeted follow-ups.

---

### Phase 13: Live AI Coding Interview Studio & Static Evaluator
- **Objective:** Build an integrated coding interview environment featuring problem descriptions, test cases, a code editor, and instant AI static complexity/quality evaluation.
- **Required Pages:**
  - `/coding-interview/setup` (Select topic, difficulty, and language: Python, JavaScript, Java, C++, Go, etc.).
  - `/coding-interview/:id` (Split-pane layout: Problem description & examples on left, Code editor & submission on right).
  - `/coding-interview/history` (Historical code submissions).
  - `/coding-interview/submission/:id` (Submission evaluation detail).
- **Key Features:**
  - Dual-pane responsive layout.
  - Language selector with starter code preservation.
  - Disclaimer banner: "AI Static Analysis & Code Quality Verification (Static Analysis Mode)".
  - Evaluation modal displaying: Score (0–100), Verdict badge, Time & Space Complexity, Code Quality, Bugs list, and Suggestions.
- **Backend Dependencies:**
  - `POST /api/coding-interview/generate/`
  - `POST /api/coding-interview/submit/`
  - `GET /api/coding-interview/history/`
  - `GET /api/coding-interview/submission/:id/`
- **Testing Requirements:** Generate problems in Python and JavaScript; submit valid and buggy code; verify complexity parsing.
- **Completion Criteria:** Functional coding interview studio with responsive editor and detailed AI static analysis.

---

### Phase 14: AI Code Debugging Assistant & Smart Editor
- **Objective:** Create a dedicated debugging workshop where candidates paste buggy code, optional error stack traces, and expected behavior to receive root cause analysis, severity ratings, and corrected code.
- **Required Pages:**
  - `/code-debugger` (Input view: language selector, code area, error message input, expected behavior input).
  - `/code-debugger/:id` (Report view: summary card, severity badge, root cause breakdown, side-by-side or unified code diff, copy corrected code).
  - `/code-debugger/history` (Past debugging reports list).
- **Key Features:**
  - Severity indicator: Low (Blue), Medium (Yellow), High (Orange), Critical (Red).
  - Issue list displaying line numbers, error types (Syntax, Logic, Runtime, Security), and fix suggestions.
  - One-click "Copy Corrected Code" button with clipboard feedback.
- **Backend Dependencies:**
  - `POST /api/code-debugger/analyze/`
  - `GET /api/code-debugger/history/`
  - `GET /api/code-debugger/:id/`
- **Testing Requirements:** Test with ZeroDivisionError, syntax errors, and logic bugs across Python and JavaScript.
- **Completion Criteria:** Candidate can submit code and error logs, receive diagnostic report, and copy corrected code.

---

### Phase 15: AI Resume Builder & Professional PDF Exporter
- **Objective:** Construct a multi-step resume builder wizard that polishes candidate details with AI, compiles them into a publication-quality A4 PDF via ReportLab, and allows direct binary downloads.
- **Required Pages:**
  - `/resume-builder` (Multi-step form wizard: Personal Info -> Summary -> Skills -> Experience -> Education -> Projects -> Achievements).
  - `/resume-builder/preview` (AI polish preview with side-by-side before/after review).
  - `/resume-builder/history` (List of generated resumes with direct download buttons).
- **Key Features:**
  - Stepper navigation with auto-save to local draft state.
  - AI enhancement trigger calling Gemini to improve bullet points and professional tone.
  - Native binary PDF streaming download (`responseType: "blob"` -> `createObjectURL`).
  - Direct deletion of generated resumes from history.
- **Backend Dependencies:**
  - `POST /api/resume-builder/generate/`
  - `GET /api/resume-builder/download/:id/`
  - `GET /api/resume-builder/history/`
  - `DELETE /api/resume-builder/:id/delete/`
- **Testing Requirements:** Complete wizard form, generate PDF, trigger browser download, inspect downloaded PDF formatting.
- **Completion Criteria:** Full wizard lifecycle generating valid downloadable A4 PDF resume.

---

## Testing & Quality Assurance Plan

### Automated & Manual Verification Protocol
1. **API Integration Testing:** Every phase must verify active communication with Django backend endpoints using actual payloads.
2. **Error Boundary Stress Tests:** Simulate 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Server Error, and 503 Gemini Timeout responses to verify toast alerts and retry buttons.
3. **Responsive Breakpoint Audits:** Verify all pages render cleanly across mobile (375px), tablet (768px), and desktop (1280px+).
4. **Theme Consistency Audits:** Verify text contrast ratios and color palette fidelity in both Dark and Light modes.
5. **No Backend Mutation Rule:** Maintain zero changes to Django backend files during frontend execution.

---

## Definition of Done (DoD) per Phase
- [x] All required routes, views, and components implemented.
- [x] Verified connection to corresponding backend endpoints.
- [x] Loading states, skeletons, and error alerts integrated.
- [x] Responsive layout verified on mobile, tablet, and desktop.
- [x] Code passes linting and builds cleanly (`npm run build`).
- [x] User approval granted before advancing to the subsequent phase.
