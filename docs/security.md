# AuraTrust Sentinel — Security Architecture & STRIDE Threat Model

## 1. STRIDE Threat Model & Defense Implementations

| Threat Category | Potential Attack Vector | AuraTrust Hardened Defense |
| :--- | :--- | :--- |
| **Spoofing (Identity)** | Adversary presents photo, tablet screen, or deepfake printout to camera. | Multi-stage anti-spoofing: 2D FFT frequency ratio analysis, laplacian micro-texture variance, and PnP 3D head pose estimation. Replays lack natural high-frequency optical dispersion. |
| **Tampering (Data)** | Attacker alters HTTP request body to claim another student's attendance. | Zero-Trust Verification: Client request body contains zero identity claims. The server extracts facial geometry, computes the 512-D ArcFace vector, and identifies the student server-side. |
| **Repudiation** | Student denies attending or faculty denies approving a flagged student. | Append-only structured audit logs (`access_audit.jsonl`) with cryptographic SHA-256 integrity hashes and server-derived faculty IDs recorded in `faculty_verifications`. |
| **Information Disclosure** | Leakage of sensitive student biometric templates or JWT secrets. | Embeddings stored as non-reversible mathematical vectors (`.npy`) rather than raw face images; logs strictly filter sensitive arrays; JWT secrets generated via cryptographically secure OS entropy (`secrets.token_urlsafe(64)`). |
| **Denial of Service** | Flooding verification endpoint with multi-gigabyte files or rapid requests. | In-memory payload size guards (5 MB maximum per frame); rate-limiting on authentication endpoints (5 failed attempts per IP window); async non-blocking I/O. |
| **Elevation of Privilege** | Student token used to access faculty `/commit` or `/sessions/status` endpoints. | Strict server-side RBAC dependencies (`require_roles(UserRole.FACULTY, UserRole.ADMIN)`) enforcing role checks on every sensitive endpoint. |

---

## 2. Authentication & Session Security

### 2.1 Cryptographic Password Hashing
- Algorithm: **Argon2id** (via `passlib.context.CryptContext(schemes=["argon2", "bcrypt"])`).
- Salting: Per-password unique cryptographic salt dynamically generated.

### 2.2 Token Lifecycle & Revocation
- Token Standard: **PyJWT HS256** with mandatory expiration (`exp`), subject (`sub`), role (`role`), and issued-at (`iat`) claims.
- Delivery Mechanisms:
  - `Authorization: Bearer <token>` header for mobile and kiosk programmatic clients.
  - `HttpOnly`, `SameSite=Lax`, `Secure` cookies for web portal sessions.
- In-Memory Revocation Blacklist:
  - On `/api/v1/auth/logout`, the active JWT signature is committed to `REVOKED_TOKENS`.
  - Every authenticated request checks token presence against the blacklist.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Endpoint | Method | Required Roles | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/login` | `POST` | Public | Credential verification & JWT issuance |
| `/api/v1/auth/logout` | `POST` | Authenticated | Token revocation |
| `/api/v1/sessions/active` | `GET` | Authenticated | View currently active lecture sessions |
| `/api/v1/sessions/{id}/status` | `PATCH` | `FACULTY`, `ADMIN` | Transition session status |
| `/api/v1/session/start` | `POST` | Public (Biometric) | Faculty face unlock verification |
| `/api/v1/attendance/verify` | `POST` | Public / Kiosk | Student optical face verification |
| `/api/v1/attendance/staging/{id}` | `GET` | Authenticated | View staged buffer records |
| `/api/v1/attendance/staging/approve`| `POST` | `FACULTY`, `ADMIN` | Explicit faculty approval of staged student |
| `/api/v1/attendance/staging/reject` | `DELETE`| `FACULTY`, `ADMIN` | Remove bunking student from buffer |
| `/api/v1/attendance/commit/{id}` | `POST` | `FACULTY`, `ADMIN` | Commit buffer to permanent ledger |
| `/api/v1/dual-verification/pending`| `GET` | `FACULTY`, `ADMIN` | View anomalous check-in flags |
| `/api/v1/dual-verification/resolve`| `POST` | `FACULTY`, `ADMIN` | Human-in-the-loop override approval/rejection |
| `/api/v1/reports/security-summary` | `GET` | `FACULTY`, `ADMIN` | View security anomaly telemetry |
| `/api/v1/xai/query-copilot` | `POST` | `FACULTY`, `ADMIN` | Natural language read-only SQL generation |

---

## 4. HTTP Security Headers

Every HTTP response produced by the FastAPI monolith enforces defensive headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

---

## 5. Biometric Privacy Guarantees

1. **Non-Reversible Embeddings**: Facial images are converted into 512-dimensional floating-point vectors and discarded from RAM immediately. Reconstruction of facial features from a unit-length embedding is computationally infeasible.
2. **Ephemeral File Handling**: Multipart uploaded frames are written to temporary memory buffers or deleted within `finally:` cleanup blocks.
3. **Log Sanitization**: Passwords, authorization tokens, raw float vectors, and student PII are masked or excluded from audit trails.
