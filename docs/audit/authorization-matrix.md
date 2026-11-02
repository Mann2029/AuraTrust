# Endpoint Authorization & RBAC Matrix

**System:** AuraTrust Sentinel / Zero-Trust AI Attendance System  
**Audit Scope:** All REST API Endpoints & Real-Time WebSockets  
**Principle:** Zero-Trust — Identity derived strictly from validated server-side claims (JWT/Session). Client-supplied identity/role parameters are rejected.

---

## 1. Role Definitions

| Role | Symbol | Description |
| :--- | :---: | :--- |
| **ADMIN** | `ADM` | Platform administrator with full access to institutional configuration, audits, and user management. |
| **FACULTY** | `FAC` | Instructors authorized to schedule, activate, manage, review, and commit attendance sessions for their assigned subjects. |
| **STUDENT** | `STU` | Enrolled learners authorized to view their personal attendance status, register their biometric template, and check into lectures. |
| **CAMERA_EDGE** | `EDG` | Authenticated classroom edge capture hardware running headless video capture. |

---

## 2. Endpoint Access Control Matrix

| Endpoint | Method | Auth Required | Allowed Roles | Resource Ownership / ABAC Rule | Side Effects |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `/api/v1/auth/login` | `POST` | No | Public | Rate-limited login with brute-force defense | Issues signed JWT token |
| `/api/v1/auth/me` | `GET` | Yes | `ADM`, `FAC`, `STU` | Caller's own identity only | Returns current user profile |
| `/api/v1/health` | `GET` | No | Public | None (Sanitized system telemetry) | Read-only hardware & latency stats |
| `/metrics` | `GET` | No | Public / Scraper | Prometheus scrape format | Read-only metrics |
| `/api/v1/sessions` | `POST` | Yes | `FAC`, `ADM` | Faculty can only create sessions for assigned subjects | Inserts `class_sessions` record |
| `/api/v1/sessions/active` | `GET` | Yes | `FAC`, `ADM`, `STU` | Public active listings for campus scheduling | Read-only |
| `/api/v1/sessions/{session_id}` | `GET` | Yes | `FAC`, `ADM`, `STU` | Public view of session details | Read-only |
| `/api/v1/sessions/{session_id}/status` | `PATCH` | Yes | `FAC`, `ADM` | Faculty must own `session.faculty_id` | Mutates session lifecycle status |
| `/api/v1/session/start` | `POST` | Yes | `FAC`, `ADM` | Faculty biometric + ownership check on `session_id` | Activates session; opens 15m grace window; WS broadcast |
| `/api/v1/attendance/verify` | `POST` | Yes | `STU`, `FAC`, `EDG` | Validates student enrollment in `session.subject_id` | Evaluates anti-spoof + ArcFace; stages or queues record |
| `/api/v1/attendance/staging/{session_id}` | `GET` | Yes | `FAC`, `ADM` | Faculty must own the session or teach subject | Read-only view of buffer |
| `/api/v1/attendance/staging/approve` | `POST` | Yes | `FAC`, `ADM` | Faculty must own the session | Updates staging method to confirmed |
| `/api/v1/attendance/staging/reject` | `DELETE` | Yes | `FAC`, `ADM` | Faculty must own the session | Removes student from staging buffer; WS broadcast |
| `/api/v1/attendance/commit/{session_id}` | `POST` | Yes | `FAC`, `ADM` | Faculty must own the session | Atomic transaction: staging $\to$ permanent ledger; closes session |
| `/api/v1/dual-verification/flag` | `POST` | Yes | `FAC`, `ADM`, `EDG` | Enqueues ambiguous scan for human review | Inserts `faculty_verifications(PENDING)`; WS alert |
| `/api/v1/dual-verification/pending` | `GET` | Yes | `FAC`, `ADM` | Faculty only sees pending flags for their sessions | Read-only pending records |
| `/api/v1/dual-verification/resolve` | `POST` | Yes | `FAC`, `ADM` | **`faculty_id` derived from JWT**; must own session | Updates verification record; writes to staging if approved |
| `/api/v1/face/register/{student_id}` | `POST` | Yes | `STU`, `ADM` | **Student Self-Guard**: `caller.student_id == student_id` | Encrypts & saves image; updates `registered_face_path` |
| `/api/v1/embeddings/generate/{student_id}` | `POST` | Yes | `STU`, `FAC`, `ADM` | Student Self-Guard or authorized faculty/admin | Generates ArcFace vector; updates disk `.npy` & DB hash |
| `/api/v1/embeddings/batch-sync` | `POST` | Yes | `ADM`, `FAC` | Administrative roster synchronization | Scans disk photos, extracts vectors, reloads SNN matrix |
| `/api/v1/verification/reload-matrix` | `POST` | Yes | `ADM`, `FAC` | Administrative cache reload | Rebuilds RAM matrix from `.npy` files |
| `/api/v1/liveness/analyze-texture` | `POST` | Yes | `FAC`, `EDG`, `ADM` | None | Read-only FFT analysis |
| `/api/v1/verification/match` | `POST` | Yes | `FAC`, `EDG`, `ADM` | None | Read-only 1-to-N SNN cosine search |
| `/api/v1/risk/evaluate` | `POST` | Yes | `FAC`, `EDG`, `ADM` | None | Read-only risk scoring computation |
| `/api/v1/telemetry/log-event` | `POST` | Yes | `FAC`, `EDG`, `ADM` | Logs sanitized audit event | Appends to JSONL audit log |
| `/api/v1/telemetry/logs` | `GET` | Yes | `FAC`, `ADM` | Administrative audit review | Reads JSONL records (redacted tokens/biometrics) |
| `/api/v1/reports/subject/{subject_id}/attendance` | `GET` | Yes | `FAC`, `ADM` | Faculty must teach subject or be admin | Computes student percentages, defaulters, export data |
| `/api/v1/reports/security-summary` | `GET` | Yes | `FAC`, `ADM` | Institutional compliance oversight | Aggregates security blocks, spoof attempts, flags |
| `/api/v1/chatbot/chat` | `POST` | Yes | `STU`, `FAC`, `ADM` | Intent-scoped: Students only query own stats; Faculty manage sessions | Contextual AI assistant response |
| `/api/v1/xai/explain-risk` | `POST` | Yes | `FAC`, `ADM` | Administrative risk explanation | Generates human-readable risk factors |
| `/api/v1/xai/forensic-inspect` | `POST` | Yes | `FAC`, `ADM` | Border gradient & glare analysis | Returns spoof verdict and bezel detection metrics |
| `/api/v1/xai/query-copilot` | `POST` | Yes | `FAC`, `ADM` | Read-only SQL query generation | Sanitized read-only SQL generation |
| `/ws/session/{session_id}` | `WS` | Yes | `EDG`, `FAC`, `ADM` | Validates token on handshake; enforces session channel scoping | High-throughput bi-directional real-time events |

---

## 3. Data-Flow Map

```text
[Webcam Edge Capture / Client]
          │
          │ (1) Base64 Frame over WebSocket / TLS with Token
          ▼
[FastAPI Token & Scope Validation]
          │
          ├── (2) Validated Session? ──► NO ──► Drop Connection (4401)
          │
          ▼ YES
[Biometric Pipeline (Isolated)]
  - Liveness FFT Texture Analysis
  - PnP Pose Geometry
  - InsightFace ArcFace 512-D Embedding
  - SNN RAM Matrix Dot-Product
          │
          ▼
[Pure NumPy Risk Engine]
  - Isolation Forest + Habit Decay
          │
          ├── Score < 30 ──────► [Atomic DB Staging Buffer] ──► WS Broadcast (AUTO_APPROVED)
          ├── 30 <= Score < 70 ─► [faculty_verifications (PENDING)] ──► WS Alert (DUAL_VERIFY)
          └── Score >= 70 ─────► [anomaly_events] ──► WS Alert (SECURITY_BLOCK)
                                           │
                                           ▼
                                [Append-Only JSONL Audit Log]
                                (Sanitized: NO raw biometrics, NO tokens)
```

---

## 4. Trust Boundaries

1. **Browser / Edge Node $\leftrightarrow$ FastAPI Server**:
   - Zero trust in client claims.
   - All role checks derive strictly from server-validated JWT payload.
   - All file uploads inspected with OpenCV / Pillow byte-level decode before processing.
2. **FastAPI $\leftrightarrow$ MySQL Database**:
   - Parameterized queries via SQLAlchemy ORM (100% SQL injection immune).
   - Database-level composite unique constraints guarantee idempotency regardless of concurrent application workers.
3. **Application $\leftrightarrow$ Biometric Storage**:
   - Raw face frames never written to public directories.
   - Vectors stored as `.npy` in private `storage/embeddings/` protected from HTTP direct access.
   - SHA-256 hashes stored in DB to detect file tampering.
