import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from sqlalchemy import text
from datetime import datetime, timedelta
from database_core import (
    SessionLocal, User, Student, Faculty, Subject, StudentEnrollment, 
    ClassSession, UserRole, SessionStatus, AttendanceLedger
)

db = SessionLocal()

ROSTER = [
    # 5 AIML A (Subject ID 1)
    (1, "Mann Chavda", "2026-AIML-A01", "5 AIML A", 1),
    (2, "Akshat Bansal", "2026-AIML-A02", "5 AIML A", 1),
    (3, "ani sharma", "2026-AIML-A03", "5 AIML A", 1),
    (4, "Aswini Jena", "2026-AIML-A04", "5 AIML A", 1),
    (5, "bhupesh Singh", "2026-AIML-A05", "5 AIML A", 1),
    (6, "Meet Dave", "2026-AIML-A06", "5 AIML A", 1),
    (7, "Dev Jain", "2026-AIML-A07", "5 AIML A", 1),
    
    # 5 AIML B (Subject ID 2)
    (8, "Lavina Korani", "2026-AIML-B01", "5 AIML B", 2),
    (9, "Arpitia Rana", "2026-AIML-B02", "5 AIML B", 2),
    (10, "heman Darji", "2026-AIML-B03", "5 AIML B", 2),
    (11, "Kathan Shah", "2026-AIML-B04", "5 AIML B", 2),
    (12, "Rana Saud", "2026-AIML-B05", "5 AIML B", 2),
    (13, "Sana M", "2026-AIML-B06", "5 AIML B", 2),
    (14, "Bhavya Patel", "2026-AIML-B07", "5 AIML B", 2),
]

def clean_and_seed():
    print("🧹 Wiping legacy test records & resetting primary keys...")
    
    # Disable foreign keys temporarily to cleanly reset all tables
    db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
    db.execute(text("TRUNCATE TABLE student_enrollments;"))
    db.execute(text("TRUNCATE TABLE attendance_staging;"))
    db.execute(text("TRUNCATE TABLE attendance_ledger;"))
    db.execute(text("TRUNCATE TABLE attendance;"))
    db.execute(text("TRUNCATE TABLE face_verifications;"))
    db.execute(text("TRUNCATE TABLE faculty_verifications;"))
    db.execute(text("TRUNCATE TABLE anomaly_events;"))
    db.execute(text("TRUNCATE TABLE class_sessions;"))
    db.execute(text("TRUNCATE TABLE students;"))
    db.execute(text("TRUNCATE TABLE faculty;"))
    db.execute(text("TRUNCATE TABLE subjects;"))
    db.execute(text("TRUNCATE TABLE users;"))
    db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
    db.commit()

    default_pw = "$2b$12$O3BJDfIrwrtYzRhkeGNyzeLlRFbG15f7fd.X7TgIcyNkbOvh87d1."  # Classroom2026!

    # 1. Seed Subjects (1 = Section A, 2 = Section B)
    print("📚 Creating Subjects for Section A & B...")
    subj_a = Subject(subject_id=1, subject_code="AIML-501-A", subject_name="Deep Learning - 5 AIML A", department="AIML")
    subj_b = Subject(subject_id=2, subject_code="AIML-501-B", subject_name="Deep Learning - 5 AIML B", department="AIML")
    db.add_all([subj_a, subj_b])
    db.flush()

    # 2. Seed Faculty (Nir Gandhi Sir)
    print("👨‍🏫 Creating Faculty Profile (Nir Gandhi Sir)...")
    fac_user = User(
        user_id=1,
        username="prof_nir",
        email="nir.gandhi@institution.edu",
        password_hash=default_pw,
        role=UserRole.FACULTY,
        is_active=True
    )
    db.add(fac_user)
    db.flush()

    fac_profile = Faculty(
        faculty_id=1,
        user_id=fac_user.user_id,
        employee_code="EMP-AIML-01",
        department="AIML",
        registered_face_path="storage/registered_faces/faculty_prof_aiml.jpg"
    )
    db.add(fac_profile)
    db.flush()

    # 3. Seed Students 1 to 14
    print("🎓 Seeding 14 Students (7 in Section A, 7 in Section B)...")
    user_id_counter = 2
    for s_id, name, reg_no, section, sub_id in ROSTER:
        user_obj = User(
            user_id=user_id_counter,
            username=f"user_{reg_no.lower().replace('-', '_')}",
            email=f"{reg_no.lower().replace('-', '_')}@institution.edu",
            password_hash=default_pw,
            role=UserRole.STUDENT,
            is_active=True
        )
        db.add(user_obj)
        db.flush()

        student_obj = Student(
            student_id=s_id,
            user_id=user_obj.user_id,
            registration_no=reg_no,
            department="AIML",
            section=section,
            batch_year=2026
        )
        db.add(student_obj)
        db.flush()

        # Enroll all students in Subject 1 (Deep Learning - 5 AIML A)
        enrollment_a = StudentEnrollment(student_id=s_id, subject_id=1)
        db.add(enrollment_a)

        # If Section B, also enroll in Subject 2 (Deep Learning - 5 AIML B)
        if sub_id == 2:
            enrollment_b = StudentEnrollment(student_id=s_id, subject_id=2)
            db.add(enrollment_b)

        user_id_counter += 1

    # 4. Seed Multi-Day Academic History & Today's Live Sessions
    now = datetime.now()
    print("📅 Seeding Multi-Day Lecture History into Attendance Ledger...")

    # Day 1: 7 days ago - Section A Lecture (Completed)
    day1_time = now - timedelta(days=7, hours=2)
    session_1 = ClassSession(
        session_id=1,
        subject_id=1,
        faculty_id=1,
        room_number="Lab-AIML-A",
        status=SessionStatus.CLOSED,
        start_time=day1_time,
        end_time=day1_time + timedelta(minutes=60),
        grace_period_minutes=15
    )
    db.add(session_1)
    db.flush()
    for s_id in range(1, 8):
        db.add(AttendanceLedger(
            session_id=1,
            student_id=s_id,
            verification_method="AI_AUTO",
            finalized_at=day1_time + timedelta(minutes=10)
        ))

    # Day 2: 5 days ago - Section A Lecture (Completed)
    day2_time = now - timedelta(days=5, hours=2)
    session_2 = ClassSession(
        session_id=2,
        subject_id=1,
        faculty_id=1,
        room_number="Lab-AIML-A",
        status=SessionStatus.CLOSED,
        start_time=day2_time,
        end_time=day2_time + timedelta(minutes=60),
        grace_period_minutes=15
    )
    db.add(session_2)
    db.flush()
    for s_id in range(1, 8):
        db.add(AttendanceLedger(
            session_id=2,
            student_id=s_id,
            verification_method="AI_AUTO",
            finalized_at=day2_time + timedelta(minutes=8)
        ))

    # Day 3: 2 days ago - Section A Lecture (Completed, Student 7 absent)
    day3_time = now - timedelta(days=2, hours=2)
    session_3 = ClassSession(
        session_id=3,
        subject_id=1,
        faculty_id=1,
        room_number="Lab-AIML-A",
        status=SessionStatus.CLOSED,
        start_time=day3_time,
        end_time=day3_time + timedelta(minutes=60),
        grace_period_minutes=15
    )
    db.add(session_3)
    db.flush()
    for s_id in range(1, 7): # Dev Jain was absent
        db.add(AttendanceLedger(
            session_id=3,
            student_id=s_id,
            verification_method="AI_AUTO",
            finalized_at=day3_time + timedelta(minutes=12)
        ))

    # Day 3: Section B Lecture (Completed)
    day3_b_time = now - timedelta(days=2, hours=-2)
    session_4 = ClassSession(
        session_id=4,
        subject_id=2,
        faculty_id=1,
        room_number="Lab-AIML-B",
        status=SessionStatus.CLOSED,
        start_time=day3_b_time,
        end_time=day3_b_time + timedelta(minutes=60),
        grace_period_minutes=15
    )
    db.add(session_4)
    db.flush()
    for s_id in range(8, 15):
        db.add(AttendanceLedger(
            session_id=4,
            student_id=s_id,
            verification_method="AI_AUTO",
            finalized_at=day3_b_time + timedelta(minutes=14)
        ))

    # Day 4: TODAY's Live Lecture - Section A (Active for scanning)
    session_5 = ClassSession(
        session_id=5,
        subject_id=1,
        faculty_id=1,
        room_number="Lab-AIML-A",
        status=SessionStatus.ACTIVE,
        start_time=now,
        end_time=now + timedelta(minutes=60),
        grace_period_minutes=30
    )

    # Day 4: TODAY's Live Lecture - Section B (Active for scanning)
    session_6 = ClassSession(
        session_id=6,
        subject_id=2,
        faculty_id=1,
        room_number="Lab-AIML-B",
        status=SessionStatus.ACTIVE,
        start_time=now,
        end_time=now + timedelta(minutes=60),
        grace_period_minutes=30
    )
    db.add_all([session_5, session_6])

    db.commit()
    print("✅ Database cleanly reset and populated with real-time multi-day academic history!")
    print("   - Faculty: Nir Gandhi Sir (ID: 1, Code: EMP-AIML-01)")
    print("   - Section A: Students 1 to 7 (Subject ID 1 - AIML-501-A)")
    print("   - Section B: Students 8 to 14 (Subject ID 2 - AIML-501-B)")
    print("   - Historical Sessions: #1, #2, #3 (Sec A) and #4 (Sec B) closed with permanent ledger records.")
    print("   - Today's Live Active Session: #5 (Sec A - Lab-AIML-A) ready for live camera scanning.")
    print("   - Today's Scheduled Session: #6 (Sec B - Lab-AIML-B) scheduled.")
    db.close()

if __name__ == "__main__":
    clean_and_seed()