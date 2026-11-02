import os
import sys
import requests

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000/api/v1"
PHOTO_DIR = "./photos"

def find_file(name):
    for ext in [".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG", ""]:
        path = os.path.join(PHOTO_DIR, f"{name}{ext}")
        if os.path.exists(path) and os.path.isfile(path):
            return path
    return None

def parse_response(res):
    try:
        return res.json()
    except Exception:
        return {"raw_text": res.text, "status_code": res.status_code}

def run_simulation():
    print("==================================================")
    print("🏛️ ZERO-TRUST CLASSROOM SIMULATION (DYNAMIC SESSIONS)")
    print("==================================================")

    # Authenticate as faculty
    login_res = requests.post("http://127.0.0.1:8000/api/v1/auth/login", data={"username": "prof_nir", "password": "Classroom2026!"})
    token = None
    if login_res.status_code == 200:
        token = login_res.json().get("access_token")
        print(f"✅ Authenticated as Faculty (prof_nir)\n")
    else:
        print(f"⚠️ Faculty auth failed: {login_res.status_code}")
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    # 1. Start a fresh dynamic session for today
    print("[PHASE 1] Creating a fresh dynamic lecture session for Section A...")
    create_res = requests.post(f"{BASE_URL}/sessions/create-and-start", data={"subject_id": 1, "room_number": "Lab-AIML-A"}, headers=headers)
    create_data = parse_response(create_res)
    session_id = create_data.get("session_id")
    if not session_id:
        print("⚠️ Failed to create dynamic session, fetching current session...")
        cur = requests.get(f"{BASE_URL}/sessions/current?subject_id=1").json()
        session_id = cur.get("session", {}).get("session_id", 1)
    
    print(f"🎯 Daily Session Active: #{session_id} ({create_data.get('subject_code', 'AIML-501-A')}) | Room: {create_data.get('room_number', 'Lab-AIML-A')}")

    # Optional Faculty Biometric Unlock Verification
    fac_img = find_file("Nir Gandhi Sir(q)")
    if fac_img:
        with open(fac_img, "rb") as f:
            res = requests.post(f"{BASE_URL}/session/start", data={"session_id": session_id}, files={"file": f}, headers=headers)
        print(f"Faculty Biometric Confirmation: {res.status_code} -> {parse_response(res).get('status', 'OK')}")

    # 2. Section A Students Scan Faces
    section_a_students = [
        "Mann Chavda", "Akshat Bansal", "ani sharma", 
        "Aswini Jena", "bhupesh Singh", "Meet Dave", "Dev Jain"
    ]
    print(f"\n[PHASE 2] Section A Students checking into Session #{session_id}...")
    for name in section_a_students:
        img_path = find_file(name)
        if not img_path:
            print(f"⚠️ Photo missing for {name}")
            continue
        with open(img_path, "rb") as f:
            res = requests.post(f"{BASE_URL}/attendance/verify", data={"session_id": session_id}, files={"file": f})
            data = parse_response(res)
            if res.status_code == 200:
                print(f" ✅ {name} ({data.get('registration_no', 'N/A')}): {data.get('status')} | Risk Score: {data.get('risk_score')}")
            else:
                print(f" ❌ {name} Failed: {res.status_code} -> {data}")

    # 3. Security Boundary Test: Section B Student attempts to enter Section A Lecture
    print(f"\n[PHASE 3] Section B Student (Lavina Korani) attempts scan in Section A Session #{session_id}...")
    cross_img = find_file("Lavina Korani") or find_file("Bhavya Patel")
    if cross_img:
        with open(cross_img, "rb") as f:
            res = requests.post(f"{BASE_URL}/attendance/verify", data={"session_id": session_id}, files={"file": f})
        data = parse_response(res)
        print(f"Cross-Section Guard Result: {res.status_code} -> {data.get('detail', data)}")

    # 4. Inspect Live Faculty Staging Buffer
    print(f"\n[PHASE 4] Fetching Live Staging Buffer for Session #{session_id}...")
    staging_res = requests.get(f"{BASE_URL}/attendance/staging/{session_id}")
    staging_data = parse_response(staging_res)
    print(f"Staged Students in Buffer ({staging_data.get('staged_count', 0)}):")
    for rec in staging_data.get("records", []):
        print(f"   • {rec.get('registration_no')} | {rec.get('section', 'N/A')} | Method: {rec.get('verification_method')} | Risk: {rec.get('risk_score')}")

    # 5. Check Dual Verification Queue
    pending_res = requests.get(f"{BASE_URL}/dual-verification/pending?session_id={session_id}", headers=headers)
    pending_data = parse_response(pending_res)
    print(f"\nPending Dual-Verification Flags: {pending_data.get('pending_count', 0)}")

    # 6. Commit Attendance to Immutable Ledger
    print(f"\n[PHASE 5] Faculty commits attendance ledger for Session #{session_id}...")
    commit_res = requests.post(f"{BASE_URL}/attendance/commit/{session_id}", headers=headers)
    print(f"Ledger Commit Result: {parse_response(commit_res)}")

    # 7. Summary of All Sessions in System
    all_res = requests.get(f"{BASE_URL}/sessions")
    all_data = parse_response(all_res)
    print(f"\n[SUMMARY] Total Multi-Day Sessions in Database: {all_data.get('count', 0)}")
    for s in all_data.get("sessions", [])[:5]:
        print(f"   • Session #{s['session_id']} | {s['subject_code']} | {s['start_date_formatted']} | Status: {s['status']} | Ledger Records: {s['ledger_count']}")

if __name__ == "__main__":
    run_simulation()
