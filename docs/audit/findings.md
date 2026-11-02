# AuraTrust Sentinel — Security & Architecture Audit Findings

## 1. Executive Summary

A comprehensive, zero-trust engineering audit of the codebase was conducted across backend architecture, machine learning pipelines, database integrity, real-time networking, and frontend presentation. The audit uncovered 9 critical and high-severity defects that degraded security posture, caused silent runtime exceptions, and allowed state duplication.

---

## 2. Detailed Findings Register

### Finding 1: Silent Runtime Failure in WebSocket Broadcast (`CRITICAL`)
- **Module**: `14_websockets_realtime/websocket_manager.py` & `main.py`
- **Defect**: `main.py` called `await ws_manager.broadcast_to_channel(channel, data)` across 8 mission-critical routes (session start, student verification, dual-verification resolution, student rejection, ledger commit). However, `broadcast_to_channel` was never implemented on `ConnectionManager`.
- **Impact**: All real-time event broadcasts failed with unhandled AttributeError exceptions, swallowed inside generic `except Exception` blocks, completely blinding connected faculty clients.

### Finding 2: Duplicate ML Model Initialization & VRAM Waste (`HIGH`)
- **Module**: `14_websockets_realtime/websocket_manager.py`
- **Defect**: The WebSocket manager independently initialized its own separate instances of `InsightFaceEngine()` and `SiameseMatcher()`, despite `main.py` already instantiating them.
- **Impact**: Doubled GPU VRAM allocation and process RAM from ~720 MB to ~1.45 GB, creating memory pressure and initialization race conditions.

### Finding 3: Protobuf ABI Descriptors Breakdown (`CRITICAL`)
- **Module**: Python Runtime Environment
- **Defect**: The environment had `protobuf 6.33.6` installed. TensorFlow 2.10.1 and MediaPipe compiled against Protobuf 3.x failed immediately on import with `TypeError: Descriptors cannot be created directly`.
- **Impact**: Prevented all facial landmark and vision inference modules from executing.

### Finding 4: Lack of Database Composite Unique Constraints (`HIGH`)
- **Module**: MySQL Schema / `database_core.py`
- **Defect**: `attendance_staging` and `attendance_ledger` lacked composite unique constraints on `(session_id, student_id)`.
- **Impact**: Rapid or duplicate check-in scans inserted multiple redundant attendance rows for the same student in the same lecture session.

### Finding 5: Client-Supplied Identity Spoofing in Sensitive Routes (`CRITICAL`)
- **Module**: `main.py` & `02_auth/auth_core.py`
- **Defect**: `/api/v1/dual-verification/resolve` and `/api/v1/sessions` accepted `faculty_id` directly from client request bodies without verifying that it matched the authenticated JWT token context.
- **Impact**: An attacker with a low-privilege account or valid token could masquerade as any faculty member and override decisions.

### Finding 6: Missing JWT Token Revocation Blacklist (`MEDIUM`)
- **Module**: `02_auth/auth_core.py`
- **Defect**: The `/api/v1/auth/logout` endpoint did not invalidate JWT tokens. Tokens remained valid until expiration (`exp`).
- **Impact**: Compromised or terminated session tokens could continue accessing protected endpoints until TTL expiry.

### Finding 7: Frontend Typo, Dead Files, and Unpinned CDNs (`MEDIUM`)
- **Module**: `Forntend/`
- **Defect**: Directory had a typo (`Forntend/`), `report.html` was an exact copy-paste duplicate of `student.html`, and pages relied on unpinned external CDNs (Tailwind CDN, FontAwesome CDN, Google Fonts) with zero SRI hashes.
- **Impact**: Supply-chain vulnerability and broken audit reporting interface.

### Finding 8: Dual-Verification Staging Logic Contradiction (`HIGH`)
- **Module**: `main.py`
- **Defect**: When a student had an anomaly score $\ge 30.0$, the system added the student to the `dual_manager` queue, but simultaneously wrote the student to `AttendanceStaging` as `AI_AUTO`.
- **Impact**: Defeated the purpose of the dual-verification queue: flagged students were counted in the staging buffer even before faculty approved them.

### Finding 9: Python Boolean Serialization Type Subclass Gotcha (`LOW`)
- **Module**: `main.py` (`safe_serialize`)
- **Defect**: `safe_serialize` checked `isinstance(obj, (np.integer, int))` before `isinstance(obj, np.bool_)`. In Python, `issubclass(bool, int) == True`, which converted `True` into `1` and `False` into `0`.
- **Impact**: API returned integer flags instead of booleans (e.g. `is_read_only: 1`), causing contract failures.
