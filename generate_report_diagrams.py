import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

OUTPUT_DIR = "docs/report_assets"
os.makedirs(OUTPUT_DIR, exist_ok=True)

plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['font.family'] = 'sans-serif'

# ==============================================================================
# DIAGRAM 1: End-to-End Zero-Trust System Architecture (VERTICAL)
# ==============================================================================
def generate_system_architecture():
    fig, ax = plt.subplots(figsize=(9, 14), dpi=300)
    fig.patch.set_facecolor('#0B1120')
    ax.set_facecolor('#0B1120')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Top Header
    ax.text(50, 97.6, "AuraTrust Sentinel: End-to-End System Architecture", 
            ha='center', va='center', color='#38BDF8', fontsize=15, fontweight='bold')
    ax.text(50, 95.3, "Defense-in-Depth Pipeline: Edge Ingestion -> Multi-Stage AI Evaluation -> Ledger & Real-Time Sync",
            ha='center', va='center', color='#94A3B8', fontsize=8.8)

    # 6 Vertical Tiers: (x, y, w, h, title, bullets, border_color)
    vertical_tiers = [
        # Tier 1: Edge Client Ingestion Layer
        (6, 83.5, 88, 9.8,
         "TIER 1: EDGE CLIENT KIOSK & MULTIMODAL INGESTION LAYER",
         [
             "React 19 + Tailwind CSS Kiosk Viewport running on edge terminal with HTML5 MediaDevices.",
             "Continuous unmirrored 640x480 video frame capture loop triggering every 2.5 seconds.",
             "Three.js WebGL Holographic 3D Reticle with dynamic chromatic focus & alignment states.",
             "Web Audio API multi-frequency synthesizer playing distinct acoustic feedback chimes."
         ],
         "#38BDF8"),

        # Tier 2: Vision Preprocessing & Optical Anti-Spoofing
        (6, 69.5, 88, 10.0,
         "TIER 2: COMPUTER VISION GEOMETRY & OPTICAL ANTI-SPOOFING",
         [
             "CLAHE Low-Light Equalizer dynamically enhances luminance channel in dim classroom lighting.",
             "MediaPipe FaceMesh regresses 468 3D landmark points for sub-pixel facial boundary alignment.",
             "OpenCV solvePnP 3D Head Pose Solver calculates pitch, yaw, and roll (< +/-40 deg valid window).",
             "Dual-Band 2D-FFT Spatial Frequency Engine detects paper prints and digital screen replays in 4.2ms."
         ],
         "#10B981"),

        # Tier 3: Core Deep Biometrics: Custom Inception-ResNet-v1 (512-D)
        (6, 55.0, 88, 10.5,
         "TIER 3: CORE DEEP BIOMETRIC CNN (INCEPTION-RESNET-v1 512-D)",
         [
             "Native 23.5M parameter Keras CNN (447 layers, 90.79 MB checkpoint, 0 third-party wrappers).",
             "Hybrid Stem (160x160x3 -> 35x35x256) followed by multi-scale Inception-ResNet-A/B/C blocks.",
             "Residual scaling factors (lambda = 0.17, 0.10, 0.20) eliminate vanishing/exploding gradients.",
             "GlobalAveragePooling2D + Dense(512) projects embedding onto S^511 unit hypersphere (||v||_2 = 1.0)."
         ],
         "#F59E0B"),

        # Tier 4: SNN Metric Engine & Behavioral Machine Learning
        (6, 40.5, 88, 10.5,
         "TIER 4: SIAMESE SNN MATRIX & BEHAVIORAL MACHINE LEARNING",
         [
             "In-Memory Siamese SNN RAM Cosine Matrix (M * v^T) executes cohort lookups in under 6.0 ms.",
             "Cohort Disambiguation prioritizes active lecture section; 12% margin guard prevents cross-talk.",
             "Pure NumPy Tree Isolation Forest calculates biometric outlier scores with zero native C++ DLLs.",
             "Circadian Habit Decay Model penalizes arrival timestamps deviating from historical student habits."
         ],
         "#EC4899"),

        # Tier 5: Two-Phase Governance & Dual-Verification Queue
        (6, 26.0, 88, 10.5,
         "TIER 5: TWO-PHASE GOVERNANCE & DUAL-VERIFICATION QUEUE",
         [
             "Phase 1: Faculty Biometric 1:1 Camera Unlock required before lecture can accept check-ins.",
             "Dynamic 15-Minute Grace Window timer auto-rejects late arrivals with minute-level precision.",
             "Ephemeral attendance_staging buffer holds records for faculty review before permanent commit.",
             "Dual-Verification Ticket Queue (TX_<HEX12>) flags borderline scans for 1-click faculty review."
         ],
         "#A855F7"),

        # Tier 6: Enterprise Relational Persistence & Real-Time Sync
        (6, 8.5, 88, 13.5,
         "TIER 6: ENTERPRISE PERSISTENCE, DATA INTEGRITY & AUDIT HUB",
         [
             "Permanent MySQL 8.0 attendance_ledger with composite uniqueness (session_id, student_id).",
             "Biometric Vector Template Integrity Hashing (SHA-256 fingerprint verified on boot).",
             "Multi-Channel Full-Duplex WebSockets (session_{id}, sessions_global, telemetry_stream).",
             "Deterministic Causal Risk Attribution and high-frequency visual forensic inspection.",
             "RFC 4180 Standardized CSV export endpoints and append-only access_audit.jsonl audit trail."
         ],
         "#06B6D4"),
    ]

    for x, y, w, h, title, bullets, border in vertical_tiers:
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.8",
                                      linewidth=1.8, edgecolor=border, facecolor='#1E293B')
        ax.add_patch(rect)
        ax.text(x + 2.5, y + h - 2.4, title, ha='left', va='center', color=border, fontsize=9.2, fontweight='bold')
        bullet_text = "\n".join([f"  *  {b}" for b in bullets])
        ax.text(x + 2.5, y + h/2 - 1.0, bullet_text, ha='left', va='center', color='#E2E8F0', fontsize=7.3, linespacing=1.25)

    # Vertical Connecting Arrows between Tiers
    arrow_down = dict(arrowstyle="->,head_width=0.35,head_length=0.45", lw=2, color='#38BDF8')
    ax.annotate("", xy=(50, 79.5), xytext=(50, 83.5), arrowprops=arrow_down)
    ax.annotate("", xy=(50, 65.5), xytext=(50, 69.5), arrowprops=arrow_down)
    ax.annotate("", xy=(50, 51.0), xytext=(50, 55.0), arrowprops=arrow_down)
    ax.annotate("", xy=(50, 36.5), xytext=(50, 40.5), arrowprops=arrow_down)
    ax.annotate("", xy=(50, 22.0), xytext=(50, 26.0), arrowprops=arrow_down)

    # Bottom Footer Banner
    foot_rect = patches.FancyBboxPatch((6, 1.5), 88, 4.5, boxstyle="round,pad=0.5",
                                      linewidth=1.2, edgecolor='#8B5CF6', facecolor='#0F172A')
    ax.add_patch(foot_rect)
    ax.text(50, 4.0, "ZERO-TRUST INSTITUTIONAL SPECIFICATION  *  ISO/IEC 30107-3 BIOMETRIC STANDARD", 
            ha='center', va='center', color='#C084FC', fontsize=8.2, fontweight='bold')
    ax.text(50, 2.6, "100% Self-Contained Deployment  *  Zero Cloud API Lock-in  *  Sub-200ms Edge Latency  *  Offline Verification", 
            ha='center', va='center', color='#94A3B8', fontsize=6.8)

    plt.tight_layout()
    out_path = os.path.join(OUTPUT_DIR, "diagram_system_architecture.png")
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"Generated Vertical System Architecture Diagram: {out_path}")


# ==============================================================================
# DIAGRAM 2: Custom Inception-ResNet-v1 (512-D) Deep Learning Neural Architecture
# ==============================================================================
def generate_model_architecture():
    fig, ax = plt.subplots(figsize=(15, 8.5), dpi=300)
    fig.patch.set_facecolor('#0B1120')
    ax.set_facecolor('#0B1120')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 96, "Custom Inception-ResNet-v1 (512-D) Biometric Feature Extractor", 
            ha='center', va='center', color='#F59E0B', fontsize=18, fontweight='bold')
    ax.text(50, 92, "23,497,424 Total Parameters  |  VGGFace2 Pre-trained Weights  |  512-D Unit Hypersphere Representation",
            ha='center', va='center', color='#94A3B8', fontsize=11)

    blocks = [
        # (x, y, w, h, name, dims, details, color)
        (2, 46, 11, 38, "INPUT IMAGE", "160x160x3", "• RGB Aligned Face\n• Mean/Std Standard.\n• [-1, 1] Normalization", "#38BDF8"),
        (15, 46, 12, 38, "STEM MODULE", "35x35x256", "• 3x3 Conv (s=2, p=0)\n• 3x3 Conv (s=1, p=0)\n• 3x3 Conv padded\n• 3x3 MaxPool (s=2)\n• 1x1 Conv + 3x3 Conv", "#0EA5E9"),
        (29, 46, 13, 38, "INCEPTION-A\n(5x Block35)", "35x35x256", "• 3 Multi-Branch Paths\n• Residual Scale: 0.17\n• Linear Conv 1x1\n• Skip Connection\n• ReLU Activation", "#10B981"),
        (44, 46, 12, 38, "REDUCTION-A\n(Mixed_6a)", "17x17x896", "• Grid Downsampling\n• 3x3 MaxPool (s=2)\n• 3x3 Strided Conv\n• Multi-Scale Concat\n• 896 Feature Maps", "#F59E0B"),
        (58, 46, 13, 38, "INCEPTION-B\n(10x Block17)", "17x17x896", "• 1x7 & 7x1 Asymmetric\n• Residual Scale: 0.10\n• Deep Semantics\n• Identity Addition\n• High Discriminability", "#F97316"),
        (73, 46, 12, 38, "REDUCTION-B\n(Mixed_7a)", "8x8x1792", "• Downsample 17->8\n• 3x3 MaxPool (s=2)\n• 1x1 + 3x3 Strided\n• 1792 Feature Maps\n• Channel Expansion", "#EC4899"),
        (87, 46, 11, 38, "INCEPTION-C\n(5x Block8)", "8x8x1792", "• 1x3 & 3x1 Asymmetric\n• Residual Scale: 0.20\n• 1x Linear Block (s=1)\n• Global Context\n• Final Feature Grid", "#8B5CF6"),
    ]

    for x, y, w, h, name, dims, details, color in blocks:
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=1.0",
                                      linewidth=2, edgecolor=color, facecolor='#1E293B')
        ax.add_patch(rect)
        ax.text(x + w/2, y + h - 5, name, ha='center', va='center', color=color, fontsize=10, fontweight='bold')
        
        # Dimensions tag
        dim_box = patches.FancyBboxPatch((x + 1, y + h - 11), w - 2, 4.5, boxstyle="round,pad=0.3",
                                        facecolor=color, edgecolor='none')
        ax.add_patch(dim_box)
        ax.text(x + w/2, y + h - 8.7, dims, ha='center', va='center', color='#0F172A', fontsize=9, fontweight='bold')
        
        ax.text(x + 1.5, y + h/2 - 6, details, ha='left', va='center', color='#E2E8F0', fontsize=8, linespacing=1.35)

    # Connections between top blocks
    for i in range(len(blocks) - 1):
        x_curr = blocks[i][0] + blocks[i][2]
        x_next = blocks[i+1][0]
        y_mid = 65
        ax.annotate("", xy=(x_next, y_mid), xytext=(x_curr, y_mid),
                    arrowprops=dict(arrowstyle="->,head_width=0.3,head_length=0.5", lw=2, color='#94A3B8'))

    # Head projection block at bottom
    head_rect = patches.FancyBboxPatch((15, 8), 70, 28, boxstyle="round,pad=1.2",
                                      linewidth=2, edgecolor='#10B981', facecolor='#0F172A')
    ax.add_patch(head_rect)
    ax.text(50, 32, "BOTTLENECK PROJECTION & L2 HYPERSPHERE EMBEDDING HEAD", 
            ha='center', va='center', color='#10B981', fontsize=12, fontweight='bold')

    head_sub = [
        (18, 12, 14, 15, "Global Avg Pool", "8x8x1792 -> 1792-D", "#38BDF8"),
        (35, 12, 13, 15, "Dropout (p=0.2)", "Prevents Co-adapt.", "#94A3B8"),
        (51, 12, 15, 15, "Dense Linear (512)", "W/o Bias + BatchNorm", "#F59E0B"),
        (69, 12, 14, 15, "L2 Normalizer", "||v||_2 = 1.0 (Unit S^511)", "#10B981"),
    ]
    for x, y, w, h, name, desc, color in head_sub:
        r = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.6",
                                  linewidth=1.5, edgecolor=color, facecolor='#1E293B')
        ax.add_patch(r)
        ax.text(x + w/2, y + h - 4, name, ha='center', va='center', color=color, fontsize=9.5, fontweight='bold')
        ax.text(x + w/2, y + 4, desc, ha='center', va='center', color='#CBD5E1', fontsize=8)

    # Connect from Block 8 down to Head
    ax.annotate("", xy=(85, 22), xytext=(92, 46),
                arrowprops=dict(arrowstyle="->", lw=2.5, color='#8B5CF6', connectionstyle="arc3,rad=0.3"))

    plt.tight_layout()
    out_path = os.path.join(OUTPUT_DIR, "diagram_model_specification.png")
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"Generated: {out_path}")


# ==============================================================================
# DIAGRAM 3: Two-Phase Operational Verification & Human-in-the-Loop State Machine (VERTICAL)
# ==============================================================================
def generate_workflow_lifecycle():
    fig, ax = plt.subplots(figsize=(9, 14), dpi=300)
    fig.patch.set_facecolor('#0B1120')
    ax.set_facecolor('#0B1120')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Top Header
    ax.text(50, 97.5, "AuraTrust Sentinel: Two-Phase Zero-Trust Operational Workflow", 
            ha='center', va='center', color='#38BDF8', fontsize=15, fontweight='bold')
    ax.text(50, 95.2, "Vertical Execution Lifecycle: From Faculty Optical Unlock to Cryptographic Ledger Commit",
            ha='center', va='center', color='#94A3B8', fontsize=9)

    # Stages list: (x, y, w, h, title, subtitle_bullets, border_color)
    vertical_stages = [
        # Stage 1: Phase 1 Faculty Biometric Unlock
        (6, 83.5, 88, 9.5, 
         "STAGE 1: PHASE 1 -- FACULTY BIOMETRIC SESSION UNLOCK",
         [
             "Lecture session in SCHEDULED state; Kiosk enters Phase 1 Optical Camera Unlock mode.",
             "Prof. Nir Gandhi presents face to optical camera (zero manual click bypass permitted).",
             "SNN 1:1 Siamese Match verifies identity (similarity >= 0.58) -> Session transitions to ACTIVE.",
             "Automated 15-minute dynamic attendance grace window starts; 'session_started' broadcast via WSS."
         ],
         "#38BDF8"),

        # Stage 2: Phase 2 Continuous Edge Kiosk Optical Ingestion
        (6, 69.5, 88, 10.0,
         "STAGE 2: PHASE 2 -- CONTINUOUS EDGE KIOSK OPTICAL INGESTION",
         [
             "Student steps in front of camera; raw 640x480 unmirrored frame ingested every 2.5 seconds.",
             "CLAHE Low-Light Equalization on luminance channel activates if classroom lux falls below threshold.",
             "MediaPipe FaceMesh regresses 468 3D landmarks; solvePnP solves 3D head pose (yaw/pitch/roll < 40 deg).",
             "EAR (eye blink velocity) and MAR (mouth yawn telemetry) compute rolling biological alertness index."
         ],
         "#10B981"),

        # Stage 3: Dual-Band 2D-FFT Spatial Texture Anti-Spoofing
        (6, 56.0, 88, 9.5,
         "STAGE 3: 2D-FFT SPATIAL FREQUENCY ANTI-SPOOFING FORENSICS",
         [
             "2D Fast Fourier Transform evaluates radial high-frequency power spectrum across facial bounding crop.",
             "Real human skin produces natural diffuse reflectance, continuous subsurface scattering, and smooth gradients.",
             "High-frequency energy cutoff ratios detect flat paper printouts, curved masks, and digital display replays.",
             "Spoof detected? Frame immediately dropped; forensic attack telemetry logged to access_audit.jsonl."
         ],
         "#F43F5E"),

        # Stage 4: Cohort-Aware Inception-ResNet-v1 & SNN Matcher
        (6, 41.5, 88, 10.5,
         "STAGE 4: CUSTOM INCEPTION-RESNET-v1 & COHORT-AWARE SNN MATCHER",
         [
             "Dual-Vector Pipeline: Combines direct full-frame Haar crop (10% padding + TTA) with aligned Mesh crop.",
             "Custom Inception-ResNet-v1 (23.5M parameters, 447 layers) extracts 512-D unit vector (||v||_2 = 1.0).",
             "Siamese SNN in-memory cosine RAM matrix search prioritizes enrolled session cohort (Section 5 AIML A).",
             "Top-1 vs Top-2 Margin Guard (sim >= 78%, margin >= 12%) auto-routes Section B cross-scans accurately."
         ],
         "#F59E0B"),

        # Stage 5: Dynamic Behavioral Risk & Anomaly Gating
        (6, 27.0, 88, 10.5,
         "STAGE 5: MULTI-VARIABLE BEHAVIORAL RISK & ANOMALY GATING",
         [
             "Pure NumPy Isolation Forest evaluates biometric distance anomalies and rapid attempt burst velocity.",
             "Circadian Habit Decay Model penalizes arrival timestamps deviating from historical arrival habits.",
             "Rolling 5-minute attempt counter throttles brute-force presentation attack flooding.",
             "Multi-Tier Boundary Gate:  <35% Risk -> AUTO-APPROVE  |  35-70% Risk -> REVIEW  |  >70% -> REJECT."
         ],
         "#EC4899"),
    ]

    for x, y, w, h, title, bullets, border in vertical_stages:
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.8",
                                      linewidth=1.8, edgecolor=border, facecolor='#1E293B')
        ax.add_patch(rect)
        ax.text(x + 2.5, y + h - 2.4, title, ha='left', va='center', color=border, fontsize=9.2, fontweight='bold')
        bullet_text = "\n".join([f"  *  {b}" for b in bullets])
        ax.text(x + 2.5, y + h/2 - 1.0, bullet_text, ha='left', va='center', color='#E2E8F0', fontsize=7.4, linespacing=1.25)

    # Vertical Connecting Arrows between Stages
    arrow_down = dict(arrowstyle="->,head_width=0.35,head_length=0.45", lw=2, color='#94A3B8')
    ax.annotate("", xy=(50, 79.5), xytext=(50, 83.5), arrowprops=arrow_down)
    ax.annotate("", xy=(50, 65.5), xytext=(50, 69.5), arrowprops=arrow_down)
    ax.annotate("", xy=(50, 52.0), xytext=(50, 56.0), arrowprops=arrow_down)
    ax.annotate("", xy=(50, 37.5), xytext=(50, 41.5), arrowprops=arrow_down)

    # Branching arrows from Stage 5 down to 3 Outcomes
    ax.annotate("", xy=(20, 20.5), xytext=(30, 27.0), arrowprops=dict(arrowstyle="->,head_width=0.3", lw=1.8, color='#10B981'))
    ax.annotate("", xy=(50, 20.5), xytext=(50, 27.0), arrowprops=dict(arrowstyle="->,head_width=0.3", lw=1.8, color='#F59E0B'))
    ax.annotate("", xy=(80, 20.5), xytext=(70, 27.0), arrowprops=dict(arrowstyle="->,head_width=0.3", lw=1.8, color='#EF4444'))

    # Three Decision Outcome Cards
    outcomes = [
        (6, 6.5, 27.5, 13.5, "OUTCOME A: AUTO-APPROVE", 
         "• Risk < 35% & Sim >= 65%\n• Injected into staging buffer\n• Auto-committed to permanent\n  attendance_ledger\n• HUD reticle flashes GREEN\n• Web Audio chime plays\n• Instant WebSocket update", 
         "#10B981"),
        (36.2, 6.5, 27.5, 13.5, "OUTCOME B: DUAL-VERIFY", 
         "• Risk 35-70% or Sim 58-65%\n• TX_<HEX12> ticket generated\n• Staged in review quarantine\n• Faculty Console alert\n• 1-Click Approve / Reject\n• Zero proxy bypass allowed", 
         "#F59E0B"),
        (66.5, 6.5, 27.5, 13.5, "OUTCOME C: REJECT / BUNK", 
         "• Face unverified or Spoof\n• Risk > 70% or grace expired\n• Acoustic denial tone\n• Faculty Real-Time Override:\n  Cancel bunking dynamically\n• Tamper-proof audit logging", 
         "#EF4444"),
    ]

    for x, y, w, h, title, desc, border in outcomes:
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.8",
                                      linewidth=1.8, edgecolor=border, facecolor='#1E293B')
        ax.add_patch(rect)
        ax.text(x + w/2, y + h - 2.5, title, ha='center', va='center', color=border, fontsize=8.8, fontweight='bold')
        ax.text(x + 1.8, y + h/2 - 1.2, desc, ha='left', va='center', color='#E2E8F0', fontsize=7.2, linespacing=1.25)

    # Bottom Footer Banner
    foot_rect = patches.FancyBboxPatch((6, 1.2), 88, 3.8, boxstyle="round,pad=0.5",
                                      linewidth=1.2, edgecolor='#8B5CF6', facecolor='#0F172A')
    ax.add_patch(foot_rect)
    ax.text(50, 3.1, "ENTERPRISE DATA PERSISTENCE & GOVERNANCE LAYER", ha='center', va='center', color='#C084FC', fontsize=8.2, fontweight='bold')
    ax.text(50, 1.9, "MySQL 8.0 Relational Ledger  *  SHA-256 Biometric Vector Hashing  *  WSS Event Bus  *  RFC 4180 Audit Compliance", 
            ha='center', va='center', color='#94A3B8', fontsize=6.8)

    plt.tight_layout()
    out_path = os.path.join(OUTPUT_DIR, "diagram_workflow_lifecycle.png")
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"Generated Vertical Workflow Diagram: {out_path}")


# ==============================================================================
# DIAGRAM 4: Relational Database Schema & Security Governance
# ==============================================================================
def generate_database_schema():
    fig, ax = plt.subplots(figsize=(14, 8), dpi=300)
    fig.patch.set_facecolor('#0B1120')
    ax.set_facecolor('#0B1120')
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    ax.text(50, 96, "AuraTrust Sentinel: Enterprise Relational Database Schema (MySQL 8.0)", 
            ha='center', va='center', color='#06B6D4', fontsize=18, fontweight='bold')
    ax.text(50, 92, "SQLAlchemy ORM  |  Foreign Key Constraints  |  SHA-256 Vector Cryptographic Integrity",
            ha='center', va='center', color='#94A3B8', fontsize=11)

    tables = [
        # Users
        (5, 55, 19, 32, "users", 
         "PK user_id: INT\n   username: VARCHAR(50)\n   email: VARCHAR(100)\n   password_hash: VARCHAR\n   role: ENUM(FACULTY, ...)\n   is_active: BOOLEAN\n   created_at: DATETIME", 
         "#38BDF8"),

        # Students
        (28, 55, 21, 32, "students", 
         "PK student_id: INT\nFK user_id -> users\n   registration_no: VARCHAR(30)\n   department: VARCHAR(50)\n   section: VARCHAR(20)\n   registered_face_path: STR\n   embedding_hash: SHA256", 
         "#10B981"),

        # Faculty
        (53, 55, 20, 32, "faculty", 
         "PK faculty_id: INT\nFK user_id -> users\n   employee_code: VARCHAR\n   department: VARCHAR\n   designation: VARCHAR\n   registered_face_path: STR\n   embedding_hash: SHA256", 
         "#F59E0B"),

        # Class Sessions
        (77, 55, 19, 32, "class_sessions", 
         "PK session_id: INT\nFK subject_id -> subjects\nFK faculty_id -> faculty\n   room_number: VARCHAR\n   status: ENUM(SCHEDULED..)\n   start_time: DATETIME\n   grace_period_min: INT", 
         "#EC4899"),

        # Student Enrollments
        (5, 10, 20, 34, "student_enrollments", 
         "PK enrollment_id: INT\nFK student_id -> students\nFK subject_id -> subjects\n   semester: INT\n   academic_year: VARCHAR\n   enrolled_at: DATETIME\nUQ (student_id, subject_id)", 
         "#A855F7"),

        # Subjects
        (29, 10, 20, 34, "subjects", 
         "PK subject_id: INT\n   subject_code: VARCHAR\n   subject_name: VARCHAR\n   department: VARCHAR\n   section: VARCHAR\n   total_credits: INT\n   is_active: BOOLEAN", 
         "#06B6D4"),

        # Attendance Staging
        (53, 10, 21, 34, "attendance_staging", 
         "PK staging_id: INT\nFK session_id -> sessions\nFK student_id -> students\n   verification_method: STR\n   risk_score: FLOAT\n   snn_confidence: FLOAT\n   status: ENUM(PENDING..)", 
         "#F97316"),

        # Attendance Ledger
        (77, 10, 19, 34, "attendance_ledger", 
         "PK ledger_id: INT\nFK session_id -> sessions\nFK student_id -> students\n   marked_by: INT\n   ledger_hash: SHA256\n   timestamp: DATETIME\nUQ (session_id, student_id)", 
         "#10B981"),
    ]

    for x, y, w, h, name, fields, border in tables:
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=1.0",
                                      linewidth=2, edgecolor=border, facecolor='#1E293B')
        ax.add_patch(rect)
        ax.text(x + w/2, y + h - 4, f"TABLE: {name}", ha='center', va='center', color=border, fontsize=9.5, fontweight='bold')
        ax.text(x + 1.5, y + h/2 - 2, fields, ha='left', va='center', color='#CBD5E1', fontsize=8, fontfamily='monospace', linespacing=1.35)

    # Relationship arrows
    ax.annotate("", xy=(28, 71), xytext=(24, 71), arrowprops=dict(arrowstyle="->", lw=1.8, color='#38BDF8'))
    ax.annotate("", xy=(53, 71), xytext=(24, 75), arrowprops=dict(arrowstyle="->", lw=1.8, color='#38BDF8', connectionstyle="arc3,rad=0.15"))
    ax.annotate("", xy=(77, 71), xytext=(73, 71), arrowprops=dict(arrowstyle="->", lw=1.8, color='#F59E0B'))
    ax.annotate("", xy=(15, 44), xytext=(35, 55), arrowprops=dict(arrowstyle="->", lw=1.8, color='#10B981'))
    ax.annotate("", xy=(53, 27), xytext=(49, 27), arrowprops=dict(arrowstyle="->", lw=1.8, color='#06B6D4'))
    ax.annotate("", xy=(77, 27), xytext=(74, 27), arrowprops=dict(arrowstyle="->", lw=1.8, color='#F97316'))

    plt.tight_layout()
    out_path = os.path.join(OUTPUT_DIR, "diagram_database_schema.png")
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    generate_system_architecture()
    generate_model_architecture()
    generate_workflow_lifecycle()
    generate_database_schema()
    print("All 4 High-Resolution Technical Diagrams generated successfully!")
