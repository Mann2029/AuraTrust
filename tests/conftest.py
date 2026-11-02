"""Test-time import paths for the project's numbered module directories."""

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODULE_DIRECTORIES = (
    PROJECT_ROOT,
    "02_auth",
    "03_session_core",
    "04_vision_engine",
    "06_face_embedding",
    "07_anti_spoofing",
    "08_verification_engine",
    "09_anomaly_risk_engine",
    "10_dual_verification",
    "11_anomaly_detection",
    "12_xai_ollama",
    "14_websockets_realtime",
    "16_audit_reporting",
    "17_monitoring_metrics",
)

for directory in MODULE_DIRECTORIES:
    path = PROJECT_ROOT if isinstance(directory, Path) else PROJECT_ROOT / directory
    path_string = str(path)
    if path_string not in sys.path:
        sys.path.insert(0, path_string)
