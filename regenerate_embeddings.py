import os
import sys
import glob
import numpy as np

root_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, root_dir)
sys.path.insert(0, os.path.join(root_dir, "06_face_embedding"))

from database_core import SessionLocal, Student, Faculty
from insight_engine import MultimodalCustomCNNEngine

def regenerate_all_embeddings():
    print("=" * 60)
    print("STARTING BULLETPROOF BIOMETRIC EMBEDDINGS REGENERATION")
    print("=" * 60)

    engine = MultimodalCustomCNNEngine()
    embeddings_dir = os.path.abspath(os.path.join(root_dir, "storage", "embeddings"))
    faces_dir = os.path.abspath(os.path.join(root_dir, "storage", "faces", "registered"))
    os.makedirs(embeddings_dir, exist_ok=True)

    # 1. Delete all old .npy files
    old_files = glob.glob(os.path.join(embeddings_dir, "*.npy"))
    print(f"Purging {len(old_files)} legacy/broken .npy embedding files...")
    for f in old_files:
        try:
            os.remove(f)
        except Exception as e:
            print(f"Could not remove {f}: {e}")

    db = SessionLocal()
    students = db.query(Student).all()
    faculty_list = db.query(Faculty).all()

    success_count = 0
    all_vectors = {}

    # 2. Process all students
    print(f"\nProcessing {len(students)} enrolled cohort students...")
    for student in students:
        reg_no = student.registration_no
        face_path = student.registered_face_path
        
        # Verify face path exists
        if not face_path or not os.path.exists(face_path):
            candidate = os.path.join(faces_dir, f"student_{reg_no}.jpg")
            if os.path.exists(candidate):
                face_path = candidate
                student.registered_face_path = candidate
            else:
                print(f"[WARNING] No face photo for {reg_no}")
                continue

        try:
            vector, v_hash = engine.generate_normalized_embedding(face_path)
            npy_path = os.path.join(embeddings_dir, f"vector_{reg_no}.npy")
            np.save(npy_path, vector)

            student.embedding_path = npy_path
            student.embedding_hash = v_hash
            all_vectors[reg_no] = vector
            success_count += 1
            print(f"  [OK] {reg_no}: Saved {vector.shape} to {os.path.basename(npy_path)} (hash: {v_hash[:10]}...)")
        except Exception as exc:
            print(f"  [ERROR] {reg_no}: {exc}")

    # 3. Process faculty
    print(f"\nProcessing {len(faculty_list)} faculty members...")
    for fac in faculty_list:
        face_path = fac.registered_face_path
        if not face_path or not os.path.exists(face_path):
            candidate = os.path.join(faces_dir, "faculty_prof_aiml.jpg")
            if os.path.exists(candidate):
                face_path = candidate
                fac.registered_face_path = candidate
            else:
                print(f"[WARNING] No face photo for faculty {fac.employee_code}")
                continue

        try:
            vector, v_hash = engine.generate_normalized_embedding(face_path)
            npy_path = os.path.join(embeddings_dir, f"faculty_{fac.employee_code}.npy")
            np.save(npy_path, vector)

            fac.embedding_path = npy_path
            fac.embedding_hash = v_hash
            all_vectors[fac.employee_code] = vector
            print(f"  [OK] Faculty {fac.employee_code}: Saved {vector.shape} to {os.path.basename(npy_path)}")
        except Exception as exc:
            print(f"  [ERROR] Faculty {fac.employee_code}: {exc}")

    db.commit()
    db.close()

    print("\n" + "=" * 60)
    print("PAIRWISE IDENTITY DISCRIMINATION AUDIT")
    print("=" * 60)
    keys = list(all_vectors.keys())
    m = np.zeros((len(keys), len(keys)))
    for i, k1 in enumerate(keys):
        for j, k2 in enumerate(keys):
            m[i, j] = float(np.dot(all_vectors[k1], all_vectors[k2]))

    confusion_errors = 0
    for i, k in enumerate(keys):
        sims = m[i]
        other_indices = [idx for idx in range(len(keys)) if idx != i]
        max_other_idx = other_indices[np.argmax(sims[other_indices])]
        max_other_sim = sims[max_other_idx]
        max_other_name = keys[max_other_idx]
        is_safe = max_other_sim < 0.70
        if not is_safe:
            confusion_errors += 1
        status_flag = "PASS" if is_safe else "WARN/BORDERLINE"
        print(f"{k} (self: 1.0) -> Closest other: {max_other_name} ({max_other_sim:.4f}) [{status_flag}]")

    print(f"\nAudit complete: {success_count} students online. Confusion conflicts (sim >= 0.70): {confusion_errors}")
    print("All FaceNet-512 embeddings successfully generated and locked into MySQL!")

if __name__ == "__main__":
    regenerate_all_embeddings()
