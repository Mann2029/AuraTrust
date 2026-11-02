# System Baseline Audit Report

**Date:** 2026-09-13  
**System:** AuraTrust Sentinel / Zero-Trust AI Attendance Monolith  
**Host Environment:** Windows 11, NVIDIA GeForce RTX 4050 Laptop GPU (6GB VRAM, Driver 616.92)  
**Database:** MySQL Server 8.0.x (Service: `MySQL80`, Port: 3306)  
**Runtime:** Python 3.9.13 (`C:\Users\MannC\Mann\Scripts\python.exe`)  
**Node Runtime:** Node.js v24.19.0, npm v11.17.0  

---

## 1. Runtime & Import Baseline

### 1.1 Python Virtual Environment
- Located existing project virtual environment at `C:\Users\MannC\Mann`.
- Configured packages include:
  - `tensorflow==2.10.1`
  - `keras==2.10.0`
  - `fastapi==0.103.2`
  - `uvicorn==0.23.2`
  - `sqlalchemy==2.0.23`
  - `pymysql==1.1.0`
  - `insightface==1.0.1`
  - `mediapipe==0.10.9`
  - `onnxruntime-gpu==1.19.2`
  - `opencv-python==4.10.0.84`
  - `numpy==1.23.5`

### 1.2 Import Failure
- **Error:** When executing `python -c "import main"`, application crashed immediately:
  ```text
  TypeError: Descriptors cannot be created directly.
  If this call came from a _pb2.py file, your generated code is out of date and must be regenerated with protoc >= 3.19.0.
  Workaround: Downgrade protobuf package to 3.20.x or lower.
  ```
- **Root Cause:** Environment had `protobuf 6.33.6` installed instead of `protobuf==3.19.6` / `protobuf<=3.20.3` specified in `requirements.txt`. Breaking changes in Protocol Buffers v5/v6 broke TensorFlow 2.10.1 and MediaPipe descriptor factory.
- **Resolution Needed:** Run `pip install protobuf==3.20.3` inside `C:\Users\MannC\Mann`.

---

## 2. Security & Authorization Baseline

### 2.1 Missing Authentication & Authorization
- **Endpoints Audited:** 23 endpoints.
- **Defect:** Only 1 endpoint (`/api/v1/auth/me`) enforces `Depends(get_current_user)`.
- All other 22 endpoints can be invoked anonymously:
  - `/api/v1/sessions` (Create session) - **Unauthenticated**
  - `/api/v1/session/start` (Unlock session) - **Unauthenticated**
  - `/api/v1/attendance/verify` (Mark attendance) - **Unauthenticated**
  - `/api/v1/attendance/staging/approve` - **Unauthenticated**
  - `/api/v1/attendance/staging/reject` - **Unauthenticated**
  - `/api/v1/attendance/commit/{session_id}` - **Unauthenticated**
  - `/api/v1/dual-verification/resolve` - **Unauthenticated**
  - `/api/v1/face/register/{student_id}` - **Unauthenticated**
  - `/api/v1/embeddings/batch-sync` - **Unauthenticated**
  - `/api/v1/reports/subject/{subject_id}/attendance` - **Unauthenticated**

### 2.2 IDOR / Parameter Substitution
- `/api/v1/dual-verification/resolve` accepts `faculty_id` directly in the request body without cross-checking the caller's authenticated identity. An unprivileged caller could impersonate any faculty ID.

### 2.3 CORS & Secrets Flaws
- In `main.py`:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
  Wildcard origins (`*`) with `allow_credentials=True` violate standard web security policies and are rejected by modern browsers with credentials mode `include`.
- In `02_auth/auth_core.py`:
  ```python
  SECRET_KEY = os.getenv("SECRET_KEY", "replace-with-a-secure-random-64-character-hex-key")
  ```
  Insecure well-known fallback secret key used when environment variable is absent.

---

## 3. Database Layer Baseline

### 3.1 Idempotency & Race Conditions
- In `database_core.py`:
  - `AttendanceStaging` table lacks unique constraint on `(session_id, student_id)`.
  - `AttendanceLedger` table lacks unique constraint on `(session_id, student_id)`.
- Concurrent check-in requests or rapid retries create duplicate rows in both tables because uniqueness relies solely on a pre-check `db.query(...).first()` in application memory.

### 3.2 Dual Verification Persistence
- `DualVerificationManager` maintains pending records strictly in an in-memory Python dictionary `self.queue: Dict[str, FlaggedRecord] = {}`.
- Upon process restart, all pending dual-verification approval records are permanently lost instead of being persisted to `faculty_verifications`.

---

## 4. WebSocket & Real-Time Baseline

### 4.1 Missing Manager Method
- `main.py` invokes `await ws_manager.broadcast_to_channel(channel=..., data=...)` in 8 distinct route handlers.
- `ConnectionManager` in `14_websockets_realtime/websocket_manager.py` only implements `connect`, `disconnect`, and `broadcast_scan_event`.
- Every REST broadcast fails with `AttributeError: 'ConnectionManager' object has no attribute 'broadcast_to_channel'`, which was silently swallowed by `try ... except Exception: pass`.

### 4.2 Unauthenticated WebSocket Endpoint
- `/ws/session/{session_id}` has an optional unverified `token: Optional[str] = None` query parameter and accepts anonymous connections from any origin.

---

## 5. Frontend & 3D Baseline

### 5.1 Structure & Inconsistencies
- Folder naming typo: `Forntend/` instead of `frontend/`.
- `Forntend/report.html` is an exact duplicate copy of `Forntend/student.html` (identical byte length 15,934 bytes), meaning the audit reporting UI was never actually implemented.
- The UI relies on external unpinned CDN scripts (`https://cdn.tailwindcss.com?plugins=forms`) and Google Fonts, violating strict CSP principles.
- Direct `localStorage` storage of access tokens without refresh rotation or HttpOnly cookie options.
- No real 3D models exist in the codebase (zero `.glb`/`.gltf` files); only 2D `.png` static graphics were embedded.

---

## 6. Baseline Verification Summary
| Subsystem | Baseline State | Required Target |
| :--- | :--- | :--- |
| **Python Imports** | Crashed (`protobuf 6.33.6` incompatibility) | Clean import with GPU acceleration |
| **API Authentication** | 1/23 endpoints authenticated | 100% RBAC with server-side identity derivation |
| **Database Idempotency**| In-memory check only; race conditions possible | DB composite unique constraints + atomic transactions |
| **WebSocket** | `broadcast_to_channel` missing; unauthenticated | Validated handshake, token scoping, functional broadcasts |
| **3D & Motion** | Static PNGs only | Real Three.js 3D model asset, accessible motion, adaptive quality |
| **Frontend Quality** | Duplicate files, unpinned CDNs, raw HTML | Modern Vite/React production bundle with full portal suite |
| **Testing** | Single partial diagnostic script | Comprehensive pytest suite covering auth, RBAC, biometrics, WS |
