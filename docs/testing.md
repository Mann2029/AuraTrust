# AuraTrust Sentinel — Automated Testing & Quality Assurance Suite

## 1. Automated Test Strategy & Architecture

The testing framework employs **pytest** for deterministic unit and integration coverage, paired with end-to-end simulation scripts testing live hardware inference and database transactions.

```text
tests/
├── conftest.py                       # Global fixtures & background server launcher
├── test_auth.py                      # Cryptographic hashing, JWT claims, revocation blacklist
├── test_risk_models.py               # Pure NumPy Isolation Forest, Habit Decay, risk boundaries
├── test_biometrics_and_liveness.py   # FFT texture liveness forensics, SNN cosine search
├── test_database.py                  # MySQL connection & composite unique constraint idempotency
└── test_api_endpoints.py             # Health, Prometheus metrics, security headers, RBAC, XAI
```

---

## 2. Test Execution & Coverage Summary

```bash
# Command execution
& "C:\Users\MannC\Mann\Scripts\python.exe" -m pytest tests/ -v
```

### Result: 18 Passed, 0 Failed (100% Pass Rate in 7.57s)

| Test Module | Test Case | Target Assertion | Result |
| :--- | :--- | :--- | :--- |
| `test_auth.py` | `test_password_hashing_and_verification` | Argon2id creates valid hash; verifies authentic pass; rejects invalid pass. | **PASSED** |
| `test_auth.py` | `test_jwt_token_generation_and_decoding` | Generates HS256 JWT; decodes claims (`sub`, `role`, `exp`). | **PASSED** |
| `test_auth.py` | `test_jwt_token_revocation` | Revoked token rejected on subsequent authorization check. | **PASSED** |
| `test_auth.py` | `test_invalid_token_rejection` | Tampered token signature fails verification with 401. | **PASSED** |
| `test_biometrics_and_liveness.py` | `test_liveness_texture_engine_natural_vs_spoof` | Natural skin image passes liveness; flat uniform digital spoof fails. | **PASSED** |
| `test_biometrics_and_liveness.py` | `test_snn_matrix_cosine_matching` | Cosine similarity correctly identifies target registered vector ($>0.90$). | **PASSED** |
| `test_database.py` | `test_database_connection` | Active MySQL connection executes `SELECT 1` without error. | **PASSED** |
| `test_database.py` | `test_attendance_staging_unique_constraint_idempotency` | Inserting duplicate `(session_id, student_id)` raises `IntegrityError`. | **PASSED** |
| `test_database.py` | `test_attendance_ledger_unique_constraint_idempotency` | Inserting duplicate ledger record raises `IntegrityError`. | **PASSED** |
| `test_risk_models.py` | `test_pure_isolation_forest` | Anomaly score for out-of-distribution vector is higher than inlier. | **PASSED** |
| `test_risk_models.py` | `test_habit_decay_predictor` | Decay score scales with elapsed absence periods. | **PASSED** |
| `test_risk_models.py` | `test_anomaly_risk_engine_decision_boundaries` | Clean inputs produce `AUTO_APPROVE`; anomalous inputs trigger `FLAG_FOR_DUAL_VERIFICATION`. | **PASSED** |
| `test_api_endpoints.py` | `test_health_endpoint` | `/api/v1/health` returns `200` and `status: "HEALTHY"`. | **PASSED** |
| `test_api_endpoints.py` | `test_prometheus_metrics` | `/metrics` returns Prometheus formatted metric lines. | **PASSED** |
| `test_api_endpoints.py` | `test_security_headers_present` | Responses contain `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`. | **PASSED** |
| `test_api_endpoints.py` | `test_authentication_workflow` | Valid credentials yield JWT access token. | **PASSED** |
| `test_api_endpoints.py` | `test_role_based_access_control` | Student token attempting faculty endpoint receives `403 Forbidden`. | **PASSED** |
| `test_api_endpoints.py` | `test_xai_query_translation` | NL query returns sanitized read-only SQL and `is_read_only: True`. | **PASSED** |

---

## 3. End-to-End Simulation Testing

1. **`testing/test_monolith.py`**:
   - Tests Module 17 (System Health), Module 3 (Authentication), Module 9 (Dynamic Risk Engine), Module 12 (XAI Chatbot), Module 16 (Audit Summary).
   - Exit code: `0` (Success).
2. **`classroom.py`**:
   - Executes multi-student check-in simulation:
     - Phase 1: Faculty biometric session activation.
     - Phase 2: Section A student optical scans.
     - Phase 3: Cross-section enrollment guard security check.
     - Phase 4: Staged buffer inspection.
     - Phase 5: Faculty ledger commit transaction.
   - Exit code: `0` (Success).
