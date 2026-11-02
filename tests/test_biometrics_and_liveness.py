import pytest
import numpy as np
import cv2

from minifasnet_engine import LivenessTextureEngine
from siamese_matcher import SiameseMatcher

def test_liveness_texture_engine_natural_vs_spoof():
    engine = LivenessTextureEngine()
    
    # Generate synthetic natural smooth face crop
    smooth_face = np.ones((160, 160, 3), dtype=np.uint8) * 180
    # Add subtle Gaussian noise resembling natural skin texture
    noise = np.random.normal(0, 3, (160, 160, 3)).astype(np.int16)
    smooth_face = np.clip(smooth_face.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    result_natural = engine.evaluate_liveness(smooth_face)
    assert result_natural["is_live"] is True
    assert result_natural["glare_ratio"] < 0.15
    
    # Generate synthetic high-frequency moire / dot grid (spoof screen)
    grid_spoof = np.zeros((160, 160, 3), dtype=np.uint8)
    grid_spoof[::2, ::2] = 255  # High-frequency Nyquist grid pattern
    
    result_spoof = engine.evaluate_liveness(grid_spoof)
    assert result_spoof["is_live"] is False or result_spoof["texture_hf_ratio"] > 0.90
    assert "SPOOF" in result_spoof["reason"]

def test_snn_matrix_cosine_matching(tmp_path):
    # Create mock template embeddings in temporary directory
    v1 = np.random.randn(512).astype(np.float32)
    v1 = v1 / np.linalg.norm(v1)
    
    v2 = np.random.randn(512).astype(np.float32)
    v2 = v2 / np.linalg.norm(v2)
    
    np.save(str(tmp_path / "vector_STUDENT_001.npy"), v1)
    np.save(str(tmp_path / "vector_STUDENT_002.npy"), v2)
    
    matcher = SiameseMatcher(embeddings_dir=str(tmp_path))
    assert len(matcher.registry_keys) == 2
    assert matcher.registry_matrix.shape == (2, 512)
    
    # Realistic facial variance vector with small perturbation
    noisy_v1 = v1 + np.random.normal(0, 0.005, 512).astype(np.float32)
    noisy_v1 = noisy_v1 / np.linalg.norm(noisy_v1)
    
    match_res = matcher.verify_identity(noisy_v1, threshold=0.40)
    assert match_res["match_found"] is True
    assert match_res["registration_no"] == "STUDENT_001"
    assert match_res["similarity"] > 0.85
    
    # Orthogonal / random vector should fail threshold
    random_query = np.random.randn(512).astype(np.float32)
    random_query = random_query / np.linalg.norm(random_query)
    
    fail_res = matcher.verify_identity(random_query, threshold=0.70)
    assert fail_res["match_found"] is False
