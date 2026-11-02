# Current CNN and Face Recognition Audit

## Scope and evidence

This audit records the recognition implementation before introducing a project-owned
CustomCNN. It is based on repository source inspection and the files present in the
development workspace on 2025-02-14. No training or benchmark result is inferred from
the enrollment registry.

## Historical baseline path (replaced)

1. `main.py` creates one `InsightFaceEngine(model_pack="buffalo_l", ctx_id=0)`.
2. `06_face_embedding/insight_engine.py` constructs InsightFace `FaceAnalysis` with
   `CUDAExecutionProvider` followed by `CPUExecutionProvider`.
3. InsightFace detects faces, selects the largest face, and returns a normalized
   embedding from `primary_face.embedding`.
4. `08_verification_engine/siamese_matcher.py` loads `.npy` vectors from
   `storage/embeddings`, normalizes them again, and performs a vectorized dot product.
5. `main.py` uses a `0.38` threshold for the HTTP match endpoint and the WebSocket
   workflow uses the matcher thresholds defined in
   `14_websockets_realtime/websocket_manager.py`.
6. Attendance is staged first. High-risk or low-margin matches are routed to
   `FacultyVerification`; only the faculty-controlled commit path writes the ledger.

This historical embedding producer was a pretrained InsightFace pipeline. It has now
been replaced in the backend by the project-owned multimodal CustomCNN. The matcher
remains a cosine-search component and is not itself a Siamese neural network.

## Model artifact inspection

The local InsightFace cache contains:

| Artifact | Present | Size |
|---|---:|---:|
| `buffalo_l/det_10g.onnx` | yes | 16,923,827 bytes |
| `buffalo_l/w600k_r50.onnx` | yes | 174,383,860 bytes |
| `buffalo_l/2d106det.onnx` | yes | present |
| `buffalo_l/genderage.onnx` | yes | present |

The repository and runtime comments refer to “iResNet-100”, while the recognition
checkpoint is named `w600k_r50.onnx`. The checkpoint name is evidence of an R50
recognition model; the comment must not be treated as proof of an iResNet-100
architecture. Runtime ONNX inspection found input `input.1` shaped
`[None, 3, 112, 112]`, output `683` shaped `[1, 512]`, and no custom metadata.
This confirms a 512-dimensional output contract but does not prove the complete
backbone name beyond the artifact name.

The historical pretrained artifacts are no longer loaded by the backend.

## Data availability

The workspace currently contains:

- 14 registered face images under `storage/faces/registered`.
- 18 miscellaneous images under `photos/`.
- 15 saved embeddings under `storage/embeddings` (14 student vectors and one faculty
  vector).
- No repository training split, labels file, augmentation manifest, or independent
  validation/test protocol.
- No CustomCNN checkpoint or threshold calibration artifact.

This is sufficient to exercise loading and enrollment plumbing, but it is not enough
to claim a generalizable supervised face-recognition benchmark. Accuracy, precision,
recall, F1, FAR, FRR, EER, ROC-AUC, TAR@FAR, latency, and memory results remain
`not available` until a reproducible labeled evaluation set is supplied and actually
run.

## Downloaded research benchmark

For pipeline validation, the public Labeled Faces in the Wild (LFW) dataset was
downloaded through `sklearn.datasets.fetch_lfw_people` into `data/lfw`. The selected
configuration contains 3,023 images across 62 identities (`min_faces_per_person=20`)
and is stored locally as 64x64 RGB tensors. It is explicitly separated from the
project enrollment registry and is not suitable for attendance decisions.

Three CustomCNN trials were trained with early stopping, with a maximum of 25
epochs. The best trial reached the 25-epoch cap in the final run:

| Trial | Epochs | Parameters | Classification accuracy | Verification ROC-AUC | EER | TAR@FAR=0.01 |
|---|---:|---:|---:|---:|---:|---:|
| `trial_01_small` | 4 | 30,736 | 0.1752 | 0.5805 | 0.4494 | 0.0258 |
| `trial_02_medium` | 4 | 68,376 | 0.1752 | 0.5780 | 0.4530 | 0.0442 |
| `trial_03_deep` | 25 | 125,648 | 0.2876 | 0.7671 | 0.3048 | 0.1492 |

The detailed machine-readable metrics and generated plots are under
`results/custom_cnn/`. The best checkpoint is recorded under
`models/custom_cnn/`, but its metadata intentionally sets `production_ready` to
`false`: LFW is a research benchmark and no project-specific consented calibration
set has been provided.

## Integration points that must remain stable

- Detection and alignment remain separate from recognition.
- Enrollment writes an embedding plus an integrity hash and reloads the registry.
- Verification returns identity, similarity, confidence, and an explicit failure reason.
- WebSocket attendance continues to support faculty gating, deduplication, staging,
  failed/unknown scans, and faculty review.
- The CustomCNN H5 weights remain the single backend recognition checkpoint.

## Migration decision

The safe sequence is:

1. Keep the CustomCNN H5 checkpoint and its architecture contract together.
2. Use the multimodal model's image and auxiliary feature inputs.
3. Add an evaluation harness that reports `not_available` when the required data is
   absent rather than fabricating metrics.
4. Add a production loader that rejects incompatible or missing checkpoints.
5. Do not switch the default production engine until a validated CustomCNN checkpoint
   and threshold artifact exist.
