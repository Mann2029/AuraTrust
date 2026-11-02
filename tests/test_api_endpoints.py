import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_endpoint(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "cpu_utilization_percent" in data
    assert "active_embeddings" in data

def test_prometheus_metrics(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    assert "attendance_verifications_total" in res.text

def test_security_headers_present(client):
    res = client.get("/api/v1/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "X-Request-ID" in res.headers

def test_authentication_workflow(client):
    # 1. Invalid credentials
    bad_res = client.post("/api/v1/auth/login", data={"username": "prof_nir", "password": "WrongPassword!"})
    assert bad_res.status_code == 401

    # 2. Valid credentials
    good_res = client.post("/api/v1/auth/login", data={"username": "prof_nir", "password": "Classroom2026!"})
    assert good_res.status_code == 200
    token = good_res.json()["access_token"]
    assert token is not None

    # 3. Access protected /me with Bearer token
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "prof_nir"

    # 4. Access protected endpoint without token -> 401
    client.cookies.clear()
    anon_res = client.get("/api/v1/auth/me")
    assert anon_res.status_code == 401

def test_role_based_access_control(client):
    # Log in as faculty
    login_res = client.post("/api/v1/auth/login", data={"username": "prof_nir", "password": "Classroom2026!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Faculty can access security summary
    sec_res = client.get("/api/v1/reports/security-summary", headers=headers)
    assert sec_res.status_code == 200
    assert "total_audit_events" in sec_res.json()

    # Anonymous user is denied access
    client.cookies.clear()
    anon_sec_res = client.get("/api/v1/reports/security-summary")
    assert anon_sec_res.status_code == 401

def test_session_mutations_require_faculty_authentication(client):
    activate_res = client.post("/api/v1/session/1/activate")
    assert activate_res.status_code == 401

    extend_res = client.post("/api/v1/session/1/extend?minutes=1")
    assert extend_res.status_code == 401

    start_res = client.post(
        "/api/v1/session/start",
        data={"session_id": "1"}
    )
    assert start_res.status_code == 401

def test_xai_explain_risk_endpoint(client):
    login_res = client.post("/api/v1/auth/login", data={"username": "prof_nir", "password": "Classroom2026!"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    res = client.post(
        "/api/v1/xai/explain-risk",
        json={
            "dynamic_risk_score": 38.5,
            "decision": "QUEUED_DUAL_VERIFY",
            "telemetry_breakdown": {
                "liveness_penalty": 15.0,
                "snn_confidence_penalty": 8.5,
                "isolation_forest_anomaly": 0.7,
                "xgboost_habit_decay_prob": 0.4
            }
        },
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "xai_explanation" in data
    assert "primary_risk_driver" in data
    assert data["primary_risk_driver"] == "Liveness"

def test_dynamic_sessions_lifecycle(client):
    # 1. Fetch current session endpoint
    cur_res = client.get("/api/v1/sessions/current?subject_id=1")
    assert cur_res.status_code == 200
    cur_data = cur_res.json()
    assert "has_active" in cur_data
    assert "session" in cur_data

    # 2. List all sessions - must show multi-day history
    list_res = client.get("/api/v1/sessions")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["count"] >= 1
    first_sess = list_data["sessions"][0]
    assert "start_date_formatted" in first_sess
    assert "status" in first_sess

    # 3. Create and start a brand new session for Section A
    login_res = client.post("/api/v1/auth/login", data={"username": "prof_nir", "password": "Classroom2026!"})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
    create_res = client.post(
        "/api/v1/sessions/create-and-start",
        data={"subject_id": 1, "room_number": "Hall B-301"},
        headers=headers
    )
    assert create_res.status_code == 200
    create_data = create_res.json()
    assert create_data["status"] == "ACTIVE"
    assert create_data["session_id"] > 0
    assert create_data["room_number"] == "Hall B-301"
