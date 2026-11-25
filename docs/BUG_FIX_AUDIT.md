# Bug Fix Root-Cause Audit

**Audit date:** 2026-11-25  
**Initial scope:** Read-only source inspection before fixes. No database writes or live AI requests were made during this audit.

## Runtime evidence and limitations

The supplied symptoms are UI error messages; they do not identify an HTTP status. At audit time no backend process was listening on port 8000. The backend environment file exists but its contents were not read. No authenticated test account or user-provided credentials were available. Therefore actual HTTP statuses, provider responses, MongoDB acknowledgement state, and existing account data cannot be claimed from the screenshots/messages. The issues below distinguish confirmed source behavior from runtime hypotheses and identify tests needed to confirm them.

The reported user-visible failures were:

| Reported symptom | Endpoint | Actual HTTP status / backend exception | Source finding and proposed verification |
|---|---|---|---|
| Feedback page says no unique saved report was found after generation | `POST /api/interview-feedback/generate/`, then `GET /api/interview-feedback/history/` and detail | Not available; no request trace/live backend was provided | The generate view writes to `interview_feedback`, returns `inserted.inserted_id` as `feedback_id`, and history reads the same collection filtered by the same authenticated `user_id`, serializing `_id` to a string. Frontend also stringifies IDs. Thus a collection/ID-type mismatch is not supported by current source. The frontend instead relies on a pre-request history snapshot plus a timestamp window and a later history read after an uncertain response; the exact reported message is produced when that reconciliation does not find exactly one matching *new* record. Verify with a controlled generate/history/detail test and inspect status/response without logging credentials. |
| Chatbot request times out | `POST /api/chatbot/message/` | Not available; no request trace/live backend was provided | Axios applies a 20-second timeout to every request. Chatbot generation is synchronous and only persists the new user/assistant message pair after Gemini returns; the AI service can make three attempts with 2s and 4s waits, and the SDK has no explicit timeout configured here. A frontend timeout may therefore occur while the backend is still generating. Frontend restores the draft, but permits another send, which could duplicate a request whose outcome is uncertain. Verify with provider timing, Django request duration, and history/detail checks. |
| Coding interview request times out | `POST /api/coding-interview/generate/` or `/submit/` | Not available; no request trace/live backend was provided | Same 20-second global timeout; question generation and evaluation each have up to three transient attempts with 2s/4s waits and no explicit SDK timeout. Persistence occurs after AI completes. Frontend history/timeout messaging must be evaluated against real request timing. Views also leave some database exceptions outside their AI exception handling, so a MongoDB write error may become an unhandled server error. Verify generation, save, submission, and detail in a mocked regression suite and then with an authenticated live account. |
| Code Debugger reports AI temporarily unavailable | `POST /api/code-debugger/analyze/` | Not available; no provider response/log trace supplied | The AI service maps errors to temporary failures by searching `str(error)` for status-like substrings. This is fragile: unrelated error text may match, SDK error types/Retry-After metadata are discarded, and no bounded retry is attempted in this service. The view maps temporary errors to 503, `ValueError` to 503, and other errors to 502. Verify with typed/mocked SDK 429, 503, invalid JSON, validation, and database failures. |
| Follow-up page has no saved analyses | `POST /api/followup-questions/generate/`, then history/detail | Not available; no request trace/live backend was provided | The view verifies interview ownership and that the exact question and candidate answer match a saved answer, calls Gemini, inserts into `followup_questions`, and returns the inserted ID. History and detail query that same collection by authenticated user and stringify ObjectIds. Source does not establish that a generation request succeeded or that the UI refreshed history after it; inspect the frontend success and refresh path and verify through mocked persistence/history/detail tests and an authenticated live request. |

## Confirmed source-level findings

1. **Timeout granularity is absent.** `frontend/src/api/axios.js` sets one 20-second timeout for ordinary reads, AI operations, uploads, and downloads. The five affected AI request clients do not override it.
2. **AI SDK transport timeouts are not explicitly set.** Current Gemini services call `client.models.generate_content(...)` with SDK defaults. Chatbot, question generation, coding generation, coding evaluation, and skills generation use local retry loops (generally three attempts and fixed 2s/4s waits). These loops retry by searching exception text, not by provider status/type, do not use jitter/Retry-After, and can extend request duration. Other services have no retry loop.
3. **The chatbot retry loop does not persist until AI success.** It persists only after AI generation completes. After an Axios timeout the backend may still finish and persist, while the browser has lost the response and has no reliable new-conversation ID. The UI restores the draft but currently permits resubmission.
4. **Coding endpoints persist after AI generation and do not consistently guard DB operations.** The question and submission inserts are not checked for acknowledgement and the generation view does not wrap the insert in its safe API error handling. History/detail use user-scoped filters and stringify MongoDB IDs.
5. **Feedback generate/history use consistent database, owner, and ID conventions.** The source does not support a MongoDB ObjectId serialization mismatch as the root cause. The frontend reconciliation is brittle under uncertain timing and can fail if the response is lost, a baseline/history page boundary intervenes, or multiple matching reports are present. Backend generation has no duplicate guard, so a repeated POST can insert another report.
6. **Follow-up persistence and history contracts align in source.** The UI sends interview ID, saved question text, answer, difficulty, and number of follow-ups. Backend rejects mismatched/unsaved answers and inserts only after successful AI generation. Source inspection alone cannot establish why the reported history was empty.
7. **Debugger errors are classified by string markers.** The service does not retry; its view returns sanitized messages but treats any exception containing selected marker text as temporary. Invalid generated JSON is surfaced as a `ValueError` and currently returned as 503 even though it is an invalid provider response rather than a provider outage.
8. **AI behavior is not consistent across apps.** Resume analysis and resume builder lack transient-provider classification; feedback, follow-up, and debugger use marker matching but no retry; chatbot, coding, questions, skills, and interviews implement differing retry loops. The resume view catches general failures as 502, which explains how a Gemini 503 can be surfaced as 502, but does not establish that the current provider is returning 503.
9. **Existing regression test coverage is uneven.** The feedback, chatbot, coding interview, and debugger `tests.py` files are placeholders. Follow-up has substantial mocked serializer/persistence/history/detail coverage. No test results are inferred from that inspection.

## Contracts checked against source

- Feedback: request `{interview_id}`; response has `feedback_id`, `interview_id`, `result`; history returns `{count, history}` entries with string `feedback_id`/`interview_id`; detail is owner-scoped.
- Chatbot: request `{message, conversation_id?}`; response has `conversation_id`, `user_message`, `assistant_message`; history returns `{count, history}`; detail and delete are owner-scoped.
- Coding generation: request `topic`, `difficulty`, `programming_language`; response includes string `question_id` and `question`. Submission request includes `question_id`, `submitted_code`, `programming_language`; response includes string `submission_id`, `question_id`, and AI `evaluation`. The backend does not execute submitted code.
- Debugger: request is validated by `CodeDebugRequestSerializer`; response includes string `debug_id`, `programming_language`, `evaluation_type`, and `result`; history/detail are owner-scoped.
- Follow-up: request includes `interview_id`, exact saved `question`, `candidate_answer`, `difficulty`, and `number_of_followups`; response includes string `followup_id`, `interview_id`, and `result`; history/detail are owner-scoped.

## AI and database safety audit

- Model and API key values are loaded from environment at runtime. Environment file contents and secret values were not printed or copied. The configured model value must be preserved; model availability cannot be proven without a live provider request.
- No collection clear/drop calls or schema migration is proposed. No test may connect to the real configured MongoDB database; DB calls must be mocked for regression tests.
- Existing ownership filters are present in the affected history/detail lookups and chatbot conversation access. Coding question/submission queries are user-scoped. No auth bypass is proposed.
- No fake AI response or fake database record will be used in application behavior. SDK response mocks are permitted only in automated tests.

## Planned fix verification

1. Add tests around affected API views using mocked Gemini and MongoDB operations. Assert exact response IDs are the inserted IDs, saved document ownership/foreign IDs are correct, and history/detail serialize the same records.
2. Add typed provider error classification tests for 429/503, invalid output, authentication/configuration failures, and non-provider/database exceptions. Verify bounded retry and no database write on failed AI generation.
3. Give slow AI operations a separate bounded frontend timeout and configure a bounded server-side Gemini timeout; retain shorter ordinary API timeouts. Do not retry a non-idempotent HTTP request automatically.
4. Make ambiguous frontend write timeouts remain visibly pending/uncertain and provide a history reconciliation action; never silently resubmit.
5. Run Django tests and frontend build/lint. Live authenticated API and browser validation remain separate and require an available local API, provider, and safe test account.

## Post-fix verification addendum (2026-11-25)

This addendum records what was confirmed after the fixes. The original table above is a point-in-time, pre-fix source audit; its proposed fixes are not the current state.

### Observed statuses and root-cause confidence

| Symptom or check | Evidence after fixes | Conclusion |
|---|---|---|
| Feedback history reconciliation | Mocked generation/history/detail tests pass. Source showed the server inserts into and reads from the same collection with the same owner filter and stringifies the same MongoDB ID. | No real authenticated request was available to reproduce the reported UI message. Frontend matching no longer depends on a timestamp window; an uncertain outcome remains blocked until history identifies one new matching report. The backend returns an existing report for a sequential duplicate request. |
| Chatbot timeout | Source confirmed synchronous Gemini generation previously had no explicit transport timeout, while Axios used 20 seconds and the service had multiple fixed-delay attempts. Chatbot persistence/history/detail and provider-failure regression tests pass. | Timeout mismatch and ambiguous POST retries were confirmed source risks. AI calls now have explicit bounded timeouts/retries, and the UI preserves the draft and asks the user to check saved history before retrying an uncertain write. No live Gemini/account request was made. |
| Coding interview timeout/persistence | Source confirmed synchronous generation/evaluation and missing insert acknowledgement checks. Generation/submission/history/detail/provider-failure tests pass. | Timeout and persistence acknowledgement gaps were corrected. The existing API still has no history endpoint for a generated but unsubmitted question, so that ambiguous case cannot be reconciled automatically. No code execution is claimed. |
| Code debugger provider error | Typed-provider and invalid-output regression tests pass. | String-based provider classification was replaced. A transient provider error maps to a safe 503; malformed AI output maps to 502. No live provider request was made. |
| Follow-up history | Existing plus updated mocked tests pass for generation, persistence, history/detail, validation, and provider failure. | Source contracts align. The original empty-history symptom was not reproduced without a real account/database. The UI refreshes history after success and blocks uncertain duplicate submissions pending reconciliation. |
| Health endpoint and safe errors | Before the safe error changes, a local HTTP health request produced a technical 500 page when MongoDB connection setup failed. After the changes, Django `APIClient` dispatched `GET /api/health/` and returned `503 application/json`, `status=error`, `message=MongoDB connection failed`. | The health view now catches the database setup exception and responds safely. The actual MongoDB connection is unavailable in this environment (`ConfigurationError`); no database writes were made. The post-fix check used Django's in-process API client, not a browser or authenticated live server. |

The mock interview request was also compared with the backend view: it sends `job_id`, selected `difficulty` (`easy`, `medium`, or `hard`), integer `total_questions` (1–20), and `resume_id` only when selected. No contract change was made.

### Automated checks

- Django `check`: passed; `compileall`: passed.
- Targeted backend suites: 47 tests passed across config (8), feedback (3), chatbot (4), coding interview (3), debugger (3), follow-up questions (23), and resume builder (3). The app suites were invoked separately because their shared `tests` module names conflict when passed together as labels.
- Plain `manage.py test` discovers and runs the 8 config tests in this repository; the app-specific suites must be invoked by their labels as listed in `BUG_FIX_REPORT.md`.
- Frontend `npm run build`: passed. Frontend `npm run lint`: passed.
- Tests use mocked AI/storage where needed. No real MongoDB records were created, changed, or deleted, and no Gemini request was sent.

### Remaining evidence gaps

No safe authenticated test account was supplied. The database health request confirms MongoDB is not reachable from this environment. As a result, feedback/chatbot/coding/debugger/follow-up histories and writes, real Gemini latency/provider handling, login/logout, and other authenticated modules were not end-to-end tested. Browser/responsive checks also remain unverified because the local browser could not reach the development server in this environment. These limits are reflected in `BUG_FIX_REPORT.md`; the unit tests do not establish live integration success.
