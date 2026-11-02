import os
import sys
import shutil
import requests

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

API_URL = "http://127.0.0.1:8000/api/v1"
IMAGE_DIR = "./photos"

FACULTY_NAME = "Nir Gandhi Sir"

STUDENT_MAPPING = {
    # 5 AIML A
    1: "Mann Chavda", 2: "Akshat Bansal", 3: "ani sharma", 
    4: "Aswini Jena", 5: "bhupesh Singh", 6: "Meet Dave", 7: "Dev Jain",
    # 5 AIML B 
    8: "Lavina Korani", 9: "Arpitia Rana", 10: "heman Darji", 
    11: "Kathan Shah", 12: "Rana Saud", 13: "Sana M", 14: "Bhavya Patel"
}

def find_image(base_name):
    if not os.path.exists(IMAGE_DIR):
        return None
    files_in_dir = os.listdir(IMAGE_DIR)
    # Exact match first
    for ext in [".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG", ""]:
        candidate = f"{base_name}{ext}"
        if os.path.exists(os.path.join(IMAGE_DIR, candidate)):
            return os.path.join(IMAGE_DIR, candidate)
    # Case-insensitive match
    base_lower = base_name.lower()
    for f in files_in_dir:
        name_part, _ = os.path.splitext(f)
        if name_part.lower() == base_lower:
            return os.path.join(IMAGE_DIR, f)
    return None

def get_auth_token():
    try:
        res = requests.post(f"{API_URL}/auth/login", data={"username": "prof_nir", "password": "Classroom2026!"})
        if res.status_code == 200:
            token = res.json().get("access_token")
            print("🔑 Authenticated successfully as Faculty (Prof. Nir)")
            return token
        else:
            print(f"❌ Login failed ({res.status_code}): {res.text}")
            return None
    except Exception as e:
        print(f"❌ Could not connect to API: {e}")
        return None

def main():
    print("==================================================")
    print("🚀 INGESTING FACULTY & 14 STUDENTS (INSIGHTFACE GPU)")
    print("==================================================")
    print("⚠️  Ensure photos in ./photos are FULL uncropped images!")
    print("==================================================\n")

    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    # 1. Register Faculty
    fac_img_path = find_image(FACULTY_NAME)
    if fac_img_path:
        dest_dir = "storage/registered_faces"
        os.makedirs(dest_dir, exist_ok=True)
        dest_path = os.path.join(dest_dir, "faculty_prof_aiml.jpg")
        shutil.copyfile(fac_img_path, dest_path)
        print(f"✅ Faculty Face Registered: {FACULTY_NAME} -> {dest_path}")
    else:
        print(f"⚠️ Faculty photo '{FACULTY_NAME}' not found in {IMAGE_DIR}")

    # 2. Ingest Students
    print("\n📸 Ingesting 14 Student Faces...")
    for s_id, name in STUDENT_MAPPING.items():
        img_path = find_image(name)
        if not img_path:
            print(f"⚠️ Image not found for: {name} (Student ID: {s_id})")
            continue

        with open(img_path, "rb") as f:
            file_bytes = f.read()

        res = requests.post(f"{API_URL}/face/register/{s_id}", headers=headers, files={"file": (os.path.basename(img_path), file_bytes, "image/jpeg")})
        if res.status_code == 401:
            token = get_auth_token()
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            res = requests.post(f"{API_URL}/face/register/{s_id}", headers=headers, files={"file": (os.path.basename(img_path), file_bytes, "image/jpeg")})

        if res.status_code == 200:
            data = res.json()
            print(f"✅ [{data.get('section')}] Student {s_id}: {name} ({data.get('registration_no')})")
        else:
            err_msg = res.json().get("detail", res.text) if res.headers.get("content-type") == "application/json" else res.text
            print(f"❌ Failed Student {s_id} ({name}): HTTP {res.status_code} - {err_msg}")

    # 3. Compute InsightFace Vectors
    print("\n🔄 Syncing InsightFace ArcFace GPU Vectors...")
    sync_res = requests.post(f"{API_URL}/embeddings/batch-sync", headers=headers)
    if sync_res.status_code == 401:
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        sync_res = requests.post(f"{API_URL}/embeddings/batch-sync", headers=headers)

    if sync_res.status_code == 200:
        print(f"Sync Result: {sync_res.json()}")
    else:
        print(f"Sync Failed ({sync_res.status_code}): {sync_res.text}")

    print("\n🎉 All Students and Faculty are synced and live in memory!")

if __name__ == "__main__":
    main()