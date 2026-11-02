# AuraTrust Sentinel — Incident Response & Operational Runbooks

## 1. Incident Classification & Severity Levels

| Severity | Definition | Target SLA | Escalation Contact |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Complete verification outage; camera feed failing for all sessions; database inaccessible. | < 15 minutes | Lead DevOps Engineer & System Architect |
| **SEV-2 (High)** | Real-time WebSocket disconnects affecting live roster synchronization; GPU inference falling back to slow CPU during peak hours. | < 45 minutes | Backend / ML Infrastructure Engineer |
| **SEV-3 (Medium)** | Individual student face embedding reload failure; minor cosmetic UI defect. | < 4 hours | Frontend / QA Engineer |

---

## 2. Operational Runbooks for Common Failure Modes

### Runbook 1: GPU VRAM Saturation / ONNX Provider Error
- **Symptom**: Logs display `Specified provider 'CUDAExecutionProvider' is not in available provider names` or CUDA OOM.
- **Diagnostic**:
  ```bash
  nvidia-smi
  # Check GPU memory and process PIDs
  ```
- **Remediation**:
  1. Verify shared engine singletons are in use (`main.py` line 77).
  2. If another process occupies VRAM, restart the service to initialize CPU fallback cleanly:
     ```bash
     sudo systemctl restart auratrust-monolith
     ```
  3. Verify fallback operation via `/api/v1/health`.

---

### Runbook 2: WebSocket Broadcast Silently Swallowing Exceptions
- **Symptom**: Faculty dashboard does not reflect newly scanned student rows in real time.
- **Diagnostic**:
  1. Inspect network tab on client: verify `/ws/live?token=...` status is 101 Switching Protocols.
  2. Inspect server logs for `WS broadcast error`.
- **Remediation**:
  1. Verify client subscribed to target channel (e.g. `session_1`).
  2. Check `ws_manager.active_connections` count via Prometheus `/metrics`.
  3. Force client browser cache refresh (`Ctrl + F5`).

---

### Runbook 3: Database Duplicate Key Integrity Collision
- **Symptom**: Client check-in fails with HTTP 500 error mentioning `Duplicate entry for key 'uq_staging_session_student'`.
- **Diagnostic**:
  - Student scanned twice within milliseconds or concurrent requests fired.
- **Remediation**:
  - Verify database transaction rollback logic in `database_core.py` and `main.py`.
  - The endpoint is designed to catch `IntegrityError` and silently treat duplicate scans as idempotent acknowledgments.

---

## 3. Automated Alerting Thresholds

- **Pipeline Latency Alert**: Average verification latency $> 150\text{ ms}$ over 5 consecutive minutes triggers a SEV-2 alert.
- **RAM Threshold**: Monolith process resident memory $> 2.0\text{ GB}$ triggers alert and automated heap profile dump.
- **WebSocket Drop Rate**: Disconnection rate $> 10\%$ within a 60-second window triggers connection pool inspection.
