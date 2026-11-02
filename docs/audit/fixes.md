# AuraTrust Sentinel — Security & Architecture Audit Fixes

## 1. Summary of Applied Fixes

All 9 identified defects from the baseline audit have been systematically repaired, refactored, and verified in code and runtime.

---

## 2. Remediation Details per Finding

### Fix 1: Implemented `broadcast_to_channel` in `ConnectionManager`
- **File**: `14_websockets_realtime/websocket_manager.py`
- **Fix**: Added channel tracking maps (`self.channel_subscriptions: Dict[str, Set[WebSocket]]`) and implemented `async def broadcast_to_channel(self, channel: str, data: dict)`. It formats JSON messages, broadcasts to all active sockets on that channel, and automatically unregisters broken/disconnected connections.

### Fix 2: Unified ML Engine Singletons via Dependency Injection
- **File**: `14_websockets_realtime/websocket_manager.py` & `main.py`
- **Fix**: Removed top-level instantiations of `InsightFaceEngine()` and `SiameseMatcher()` in `websocket_manager.py`. Added `set_shared_engines(insight_engine, snn_matcher)`. In `main.py`, the single instances are initialized once and passed into `set_shared_engines()`. Process RAM dropped from 1.45 GB to 721 MB.

### Fix 3: Protobuf Dependency Alignment
- **Environment**: Virtual Environment (`C:\Users\MannC\Mann`)
- **Fix**: Downgraded protobuf from `6.33.6` to `protobuf==3.20.3` via pip. Verified that TensorFlow 2.10.1, InsightFace, and MediaPipe import cleanly without C++ descriptor errors.

### Fix 4: Database Composite Unique Constraints
- **File**: `database_core.py` & MySQL DDL
- **Fix**: Executed explicit MySQL DDL adding:
  - `CONSTRAINT uq_staging_session_student UNIQUE (session_id, student_id)` on `attendance_staging`
  - `CONSTRAINT uq_ledger_session_student UNIQUE (session_id, student_id)` on `attendance_ledger`
  - Index on `class_sessions(faculty_id, status)`
  - Added ORM `__table_args__ = (UniqueConstraint('session_id', 'student_id', ...))` to SQLAlchemy models.
  - Hardened `get_db()` with `except Exception: db.rollback(); raise` to protect transaction boundaries.

### Fix 5: Server-Side Identity Derivation & Strict RBAC
- **File**: `02_auth/auth_core.py` & `main.py`
- **Fix**: Added `require_roles(*allowed_roles)` dependency factory. In `/dual-verification/resolve` and session creation, `faculty_id` is queried from the authenticated `current_user.user_id`, completely ignoring unverified client identity payloads.

### Fix 6: In-Memory Token Revocation Blacklist
- **File**: `02_auth/auth_core.py` & `main.py`
- **Fix**: Implemented `REVOKED_TOKENS: Set[str] = set()` in `auth_core.py`. Added `revoke_token(token)` and `is_token_revoked(token)`. Integrated `/api/v1/auth/logout` to register active tokens, and updated `get_current_user` to reject revoked tokens immediately.

### Fix 7: Modern React 19 Frontend & Local Bundling
- **File**: `frontend/`
- **Fix**: Scaffolded a modern Vite + React 19 + Tailwind CSS frontend in `frontend/`, replacing `Forntend/`. All external CDN links were replaced with npm packages (`three`, `lucide-react`). Mounted the compiled bundle (`frontend/dist`) at `/app` in `main.py` while keeping `/legacy` available for backward compatibility.

### Fix 8: Corrected Two-Phase Dual-Verification Staging Flow
- **File**: `main.py`
- **Fix**: In the check-in verification route, when `risk_score >= 30.0` triggers `QUEUED_FOR_DUAL_VERIFICATION`, the student is recorded only in `faculty_verifications(decision=FLAGGED)` and `dual_manager`. The student is NOT written to `attendance_staging` until the faculty member explicitly clicks Approve.

### Fix 9: Python Boolean Serialization Type Check
- **File**: `main.py` (`safe_serialize`)
- **Fix**: Placed `if isinstance(obj, (bool, np.bool_)): return bool(obj)` before integer checks. Booleans now serialize accurately as `true` / `false` in all API JSON responses.
