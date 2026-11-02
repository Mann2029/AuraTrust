import pytest
import numpy as np
from ml_risk_models import PureNumPyIsolationForest, PureNumPyHabitPredictor, AnomalyRiskEngine

def test_pure_isolation_forest():
    forest = PureNumPyIsolationForest(n_trees=30, max_samples=64)
    
    # Train on synthetic normal cluster around [2.0, 0.95, 0.90, 5.0]
    np.random.seed(42)
    normal_data = np.random.normal(loc=[2.0, 0.95, 0.90, 5.0], scale=[0.3, 0.05, 0.05, 1.0], size=(100, 4))
    forest.fit(normal_data)
    
    # Normal point score should be moderate to low
    normal_score = forest.compute_anomaly_score(np.array([2.0, 0.95, 0.90, 5.0]))
    # Extreme outlier (rapid velocity, low liveness, low match, huge arrival delta)
    outlier_score = forest.compute_anomaly_score(np.array([15.0, 0.10, 0.20, 60.0]))
    
    assert 0.0 <= normal_score <= 1.0
    assert 0.0 <= outlier_score <= 1.0
    assert outlier_score > normal_score, f"Outlier score {outlier_score} should exceed normal score {normal_score}"

def test_habit_decay_predictor():
    predictor = PureNumPyHabitPredictor()
    
    # On-time student with 0 past absences and high attention
    good_habit_prob = predictor.predict_decay_probability(np.array([0.0, 0.0, 100.0, 1.0]))
    # Late student with 5 past absences and drowsy attention
    bad_habit_prob = predictor.predict_decay_probability(np.array([25.0, 5.0, 30.0, 5.0]))
    
    assert 0.0 <= good_habit_prob <= 1.0
    assert 0.0 <= bad_habit_prob <= 1.0
    assert bad_habit_prob > good_habit_prob

def test_anomaly_risk_engine_decision_boundaries():
    engine = AnomalyRiskEngine()
    
    # 1. Ideal check-in -> Should AUTO_APPROVE
    ideal_eval = engine.evaluate_dynamic_risk(
        liveness_score=0.98,
        snn_confidence=0.95,
        velocity_sec=2.2,
        arrival_offset_min=1.0,
        past_absences=0,
        fatigue_score=95.0,
        day_of_week=1
    )
    assert ideal_eval["decision"] == "AUTO_APPROVE"
    assert ideal_eval["dynamic_risk_score"] < 30.0
    
    # 2. Ambiguous check-in -> Should FLAG_FOR_FACULTY_DUAL_VERIFICATION
    ambiguous_eval = engine.evaluate_dynamic_risk(
        liveness_score=0.70,
        snn_confidence=0.65,
        velocity_sec=4.0,
        arrival_offset_min=10.0,
        past_absences=2,
        fatigue_score=60.0,
        day_of_week=3
    )
    assert ambiguous_eval["decision"] == "FLAG_FOR_FACULTY_DUAL_VERIFICATION"
    assert 30.0 <= ambiguous_eval["dynamic_risk_score"] < 70.0
    
    # 3. High-risk attack -> Should SECURITY_BLOCK
    attack_eval = engine.evaluate_dynamic_risk(
        liveness_score=0.10,
        snn_confidence=0.20,
        velocity_sec=0.1,
        arrival_offset_min=45.0,
        past_absences=5,
        fatigue_score=20.0,
        day_of_week=4
    )
    assert attack_eval["decision"] == "SECURITY_BLOCK"
    assert attack_eval["dynamic_risk_score"] >= 70.0
