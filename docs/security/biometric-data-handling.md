# Biometric Data Handling & Privacy Architecture

**System:** AuraTrust Sentinel / Zero-Trust AI Attendance System  
**Document Version:** 1.0  
**Classification:** Restricted / Confidential  

---

## 1. What Biometric Information is Handled

The system processes three distinct classes of biometric data:

| Data Class | Description | Format | Sensitivity |
| :--- | :--- | :--- | :---: |
| **Reference Facial Images** | Static photograph enrolled during initial student/faculty onboarding. | JPEG / PNG (`.jpg`, `.png`) | High |
| **Live Ephemeral Frames** | Video frames captured via webcam during active lecture check-ins. | Base64-encoded stream in memory | High |
| **Biometric Feature Vectors** | 128-dimensional normalized floating-point embeddings output by the multimodal CustomCNN. | NumPy array (`.npy`), 128 floats | High |
| **Integrity Hashes** | SHA-256 cryptographic hash of the 512-D embedding vector bytes. | Hex-encoded string (64 chars) | Medium |
| **Facial Telemetry Metrics** | Derivative non-identifying measurements (PERCLOS, eye aspect ratio, FFT high-frequency ratio, head pose angles). | Floating point scalar metrics | Low |

---

## 2. Why Biometric Information is Stored & Processed

- **Identity Verification**: To confirm that the physical individual attending the lecture corresponds to the enrolled university registration number without relying on easily forgeable credentials or buddy-punching proxies.
- **Anti-Spoofing & Liveness Assurance**: To defend against presentation attacks including photo prints, smartphone screens, paper masks, and video replays.
- **Auditable Institutional Ledger**: To establish non-repudiable attendance ledgers for semester credit eligibility.

---

## 3. Storage Architecture & Directory Isolation

```text
storage/
├── faces/
│   └── registered/          # Canonical storage for enrolled face images (restricted permissions)
├── embeddings/              # 512-D ArcFace float32 vector files (vector_{registration_no}.npy)
└── audit_logs/              # Append-only access logs (METRICS ONLY, NO BIOMETRIC ARRAYS)
```

1. **Storage Isolation**: The `storage/` tree is strictly outside any web server document root. No direct static web server alias or public endpoint serves these files.
2. **Access Path**: Only internal application engine modules (`SmartVisionEngine`, `MultimodalCustomCNNEngine`, `SiameseMatcher`) read and write to this storage via verified server-side paths.
3. **Integrity Validation**: Whenever a template vector is loaded, its SHA-256 hash is computed and compared against the database `embedding_hash` column. If a hash mismatch occurs, the template is rejected as corrupted or tampered.

---

## 4. Access Control & Authorization

- **Students**: May only submit an image for their own student account (`student_id` matching their authenticated session). Students cannot download, browse, or list other students' facial images or vectors.
- **Faculty**: May initiate biometric session unlock and view live camera preview streams during class. Faculty cannot download raw vector files or bulk export enrolled photos.
- **Administrators**: Authorized to perform batch roster synchronization and vector re-indexing for database maintenance.
- **Edge Capture Nodes**: Transmit ephemeral video frames over authenticated WebSocket streams; frames are decoded strictly in server RAM and immediately discarded after pipeline processing.

---

## 5. Ephemeral Processing & File Cleanup

1. **Live Camera Frames**:
   - Frames decoded in memory (`cv2.imdecode`) are processed through SCRFD and ArcFace in VRAM.
   - Any temporary debug or verification images written to disk (e.g. `temp_match_*.jpg`) must use atomic context managers or `try...finally` cleanup blocks guaranteeing instantaneous deletion upon inference completion.
2. **Webcam Buffer**: Video streams are never recorded or written as continuous video files to disk.

---

## 6. Retention & Secure Deletion Workflow

1. **Active Enrollment Retention**: Biometric images and embeddings are retained exclusively for the duration of the student's active enrollment in the academic institution.
2. **Graduation / Withdrawal Deletion**:
   - When a student profile is deleted or marked inactive, a cascading lifecycle hook executes:
     - Removal of `storage/faces/registered/student_{registration_no}.jpg`
     - Removal of `storage/embeddings/vector_{registration_no}.npy`
     - Nullification of database columns `registered_face_path`, `embedding_path`, and `embedding_hash`.
     - Triggering `snn_matcher.reload_registry()` to purge the template from active RAM matrix.

---

## 7. Logging & Telemetry Redaction Rules

> [!CRITICAL]
> **Strict Non-Exposure Mandate**
> - **NEVER** write raw facial image bytes, base64 data URIs, or pixel buffers to application logs, console stdout, or JSONL files.
> - **NEVER** output raw 512-dimensional vector arrays in log messages or API error traces.
> - Telemetry logs are strictly confined to:
>   - Registration number (e.g. `2026-AIML-A01`)
>   - Timestamp and session ID
>   - Numeric risk score (0.00 - 100.00)
>   - Scalar liveness score (0.00 - 1.00)
>   - Match similarity percentage (0.0% - 100.0%)
>   - Qualitative decision (`AUTO_APPROVED`, `DUAL_VERIFY`, `SECURITY_BLOCK`)

---

## 8. Failure Behavior (Fail-Closed Architecture)

1. **Model Unavailable / GPU Out of Memory**: The system immediately defaults to `SECURITY_BLOCK` and alerts faculty. No attendance is auto-marked.
2. **Low-Quality / Ambiguous Biometric Match**: If similarity falls between 0.38 and 0.48, the record is flagged for faculty human-in-the-loop review (`FLAG_FOR_FACULTY_DUAL_VERIFICATION`). It is NEVER silently approved.
3. **Face Not Detected / Spoof Detected**: Returns clean client-safe error response without exposing internal threshold formulas or model weights.
