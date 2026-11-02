import os
import enum
import urllib.parse
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, Text, Enum as SQLEnum, DateTime, ForeignKey, func, UniqueConstraint, Index
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

# =====================================================================
# 1. SETTINGS & CONFIGURATION
# =====================================================================
CONFIG_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CONFIG_DIR
ENV_PATH = PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

class AppSettings(BaseSettings):
    APP_NAME: str = os.getenv("APP_NAME", "Zero Trust Dual Verification Attendance System")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1")
    
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", 3306))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "MANN@2029")
    DB_NAME: str = os.getenv("DB_NAME", "zero_trust_attendance")

    @property
    def DATABASE_URL(self) -> str:
        encoded_password = urllib.parse.quote_plus(self.DB_PASSWORD)
        return f"mysql+pymysql://{self.DB_USER}:{encoded_password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = AppSettings()


# =====================================================================
# 2. ENUMS & CONSTANTS
# =====================================================================
class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    FACULTY = "FACULTY"
    ADMIN = "ADMIN"

class SessionStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    ACTIVE = "ACTIVE"
    CLOSING = "CLOSING"
    CLOSED = "CLOSED"

class VerificationResult(str, enum.Enum):
    MATCH = "MATCH"
    MISMATCH = "MISMATCH"
    INCONCLUSIVE = "INCONCLUSIVE"

class LivenessStatus(str, enum.Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    FLAGGED = "FLAGGED"

class FacultyDecision(str, enum.Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    FLAGGED = "FLAGGED"

class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    LATE = "LATE"
    ABSENT = "ABSENT"
    FLAGGED = "FLAGGED"

class ZeroTrustDecision(str, enum.Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    FLAG = "FLAG"


# =====================================================================
# 3. DATABASE ENGINE & SESSION
# =====================================================================
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# =====================================================================
# 4. ORM MODELS (All 13 Tables with Section & Enrollment Mappings)
# =====================================================================

# 1. users
class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    student_profile = relationship("Student", back_populates="user", uselist=False)
    faculty_profile = relationship("Faculty", back_populates="user", uselist=False)

# 2. students
class Student(Base):
    __tablename__ = "students"
    student_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    registration_no = Column(String(30), unique=True, nullable=False)
    department = Column(String(50), nullable=False)
    section = Column(String(20), default="5 AIML A", nullable=False)
    batch_year = Column(Integer, nullable=False)
    registered_face_path = Column(String(255), nullable=True)
    embedding_path = Column(String(255), nullable=True)
    embedding_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="student_profile")
    enrollments = relationship("StudentEnrollment", back_populates="student", cascade="all, delete-orphan")

# 3. faculty
class Faculty(Base):
    __tablename__ = "faculty"
    faculty_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_code = Column(String(30), unique=True, nullable=False)
    department = Column(String(50), nullable=False)
    registered_face_path = Column(String(255), nullable=True)
    embedding_path = Column(String(255), nullable=True)
    embedding_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="faculty_profile")
    sessions = relationship("ClassSession", back_populates="faculty")

# 4. subjects
class Subject(Base):
    __tablename__ = "subjects"
    subject_id = Column(Integer, primary_key=True, autoincrement=True)
    subject_code = Column(String(20), unique=True, nullable=False)
    subject_name = Column(String(100), nullable=False)
    department = Column(String(50), nullable=False)
    
    sessions = relationship("ClassSession", back_populates="subject")
    enrollments = relationship("StudentEnrollment", back_populates="subject", cascade="all, delete-orphan")

# 5. student_enrollments (Section/Subject Guard Table)
class StudentEnrollment(Base):
    __tablename__ = "student_enrollments"
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), primary_key=True)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id", ondelete="CASCADE"), primary_key=True)
    enrolled_at = Column(DateTime, server_default=func.now())

    student = relationship("Student", back_populates="enrollments")
    subject = relationship("Subject", back_populates="enrollments")

# 6. class_sessions
class ClassSession(Base):
    __tablename__ = "class_sessions"
    session_id = Column(Integer, primary_key=True, autoincrement=True)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=False)
    room_number = Column(String(20), nullable=False)
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.SCHEDULED, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    grace_period_minutes = Column(Integer, default=15)
    created_at = Column(DateTime, server_default=func.now())
    
    subject = relationship("Subject", back_populates="sessions")
    faculty = relationship("Faculty", back_populates="sessions")

# 7. face_verifications
class FaceVerification(Base):
    __tablename__ = "face_verifications"
    verification_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    session_id = Column(Integer, ForeignKey("class_sessions.session_id"), nullable=False)
    similarity_score = Column(Float, nullable=False)
    liveness_status = Column(SQLEnum(LivenessStatus), nullable=False)
    quality_score = Column(Float, nullable=False)
    verification_result = Column(SQLEnum(VerificationResult), nullable=False)
    model_version = Column(String(20), nullable=False)
    timestamp = Column(DateTime, server_default=func.now())

# 8. faculty_verifications (Dual Verification Review Queue)
class FacultyVerification(Base):
    __tablename__ = "faculty_verifications"
    faculty_verification_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    session_id = Column(Integer, ForeignKey("class_sessions.session_id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=False)
    decision = Column(SQLEnum(FacultyDecision), nullable=False)
    remarks = Column(Text, nullable=True)
    is_override = Column(Boolean, default=False)
    timestamp = Column(DateTime, server_default=func.now())

# 9. attendance_staging (Phase 1 Buffer)
class AttendanceStaging(Base):
    __tablename__ = "attendance_staging"
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_staging_session_student"),
        Index("idx_staging_session", "session_id"),
    )
    staging_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("class_sessions.session_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    verification_method = Column(String(50), default="AI_AUTO")
    risk_score = Column(Float, nullable=True)
    timestamp = Column(DateTime, server_default=func.now())

# 10. attendance_ledger (Phase 2 Immutable Records)
class AttendanceLedger(Base):
    __tablename__ = "attendance_ledger"
    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_ledger_session_student"),
        Index("idx_ledger_session_student", "session_id", "student_id"),
    )
    ledger_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("class_sessions.session_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    verification_method = Column(String(50), nullable=False)
    finalized_at = Column(DateTime, server_default=func.now())

# 11. attendance (High-Level Status Tracking)
class Attendance(Base):
    __tablename__ = "attendance"
    attendance_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    session_id = Column(Integer, ForeignKey("class_sessions.session_id"), nullable=False)
    final_status = Column(SQLEnum(AttendanceStatus), nullable=False)
    authorization_status = Column(String(50), nullable=False)
    faculty_verified = Column(Boolean, default=False)
    zero_trust_authorized = Column(Boolean, default=False)
    timestamp = Column(DateTime, server_default=func.now())

# 12. anomaly_events
class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"
    anomaly_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=True)
    session_id = Column(Integer, ForeignKey("class_sessions.session_id"), nullable=True)
    anomaly_type = Column(String(50), nullable=False)
    risk_score = Column(Float, nullable=False)
    severity = Column(String(20), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

# 13. audit_logs
class AuditLog(Base):
    __tablename__ = "audit_logs"
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(50), nullable=False)
    performed_by = Column(String(50), nullable=False)
    ip_address = Column(String(45), nullable=True)
    xai_explanation = Column(Text, nullable=True)
    timestamp = Column(DateTime, server_default=func.now())


# =========================================================
# 5. INITIALIZATION & IDEMPOTENT SEEDING LOGIC
# =========================================================
def initialize_and_seed_db():
    print("[SYSTEM] Syncing ORM models to MySQL database...")
    Base.metadata.create_all(bind=engine)
    print("[SUCCESS] All Database tables are verified and live!")

    db = SessionLocal()
    default_password_hash = "$2b$12$O3BJDfIrwrtYzRhkeGNyzeLlRFbG15f7fd.X7TgIcyNkbOvh87d1."  # Password: Classroom2026!

    try:
        print("[SYSTEM] Seeding Subjects (Institutional ERP & Cohort)...")
        # 1. Seed Subjects
        all_initial_subjects = [
            ("AIML-501-A", "Deep Learning - 5 AIML A", "AIML"),
            ("AIML-501-B", "Deep Learning - 5 AIML B", "AIML"),
            ("CS-501", "Object-Oriented Programming using Java", "CSE"),
            ("CS-502", "Introduction to Deep Learning", "AIML"),
            ("CS-503", "Computer Networks", "CSE"),
            ("CS-504", "Data Engineering", "AIML"),
            ("CS-505", "Theory of Computation", "CSE"),
            ("CS-506", "Logical Reasoning & Aptitude", "GEN")
        ]
        for s_code, s_name, s_dept in all_initial_subjects:
            s_rec = db.query(Subject).filter(Subject.subject_code == s_code).first()
            if not s_rec:
                db.add(Subject(subject_code=s_code, subject_name=s_name, department=s_dept))

        subj_a = db.query(Subject).filter(Subject.subject_code == "AIML-501-A").first()
        subj_b = db.query(Subject).filter(Subject.subject_code == "AIML-501-B").first()
        db.flush()

        # 2. Seed Faculty (Check by employee_code FIRST to avoid duplicate key errors)
        print("[SYSTEM] Seeding Faculty Member...")
        faculty = db.query(Faculty).filter(Faculty.employee_code == "EMP-AIML-01").first()
        if not faculty:
            fac_user = db.query(User).filter(User.username == "prof_nir").first()
            if not fac_user:
                fac_user = User(
                    username="prof_nir",
                    email="prof_nir@institution.edu",
                    password_hash=default_password_hash,
                    role=UserRole.FACULTY,
                    is_active=True
                )
                db.add(fac_user)
                db.flush()

            faculty = Faculty(
                user_id=fac_user.user_id,
                employee_code="EMP-AIML-01",
                department="AIML",
                registered_face_path="storage/registered_faces/faculty_prof_aiml.jpg"
            )
            db.add(faculty)
            db.flush()
        else:
            fac_user = db.query(User).filter(User.user_id == faculty.user_id).first()
            canonical_user = db.query(User).filter(User.username == "prof_nir").first()
            if fac_user and fac_user.username == "prof_aiml" and canonical_user is None:
                fac_user.username = "prof_nir"
                fac_user.email = "prof_nir@institution.edu"

        # 3. Seed Students (7 in 5 AIML A, 7 in 5 AIML B)
        print("[SYSTEM] Seeding 14 Students across Section A & B...")
        
        # Section A: 7 Students
        for i in range(1, 8):
            username = f"aiml_a_0{i}"
            reg_no = f"2026-AIML-A0{i}"
            
            student = db.query(Student).filter(Student.registration_no == reg_no).first()
            if not student:
                u = db.query(User).filter(User.username == username).first()
                if not u:
                    u = User(
                        username=username,
                        email=f"{username}@institution.edu",
                        password_hash=default_password_hash,
                        role=UserRole.STUDENT,
                        is_active=True
                    )
                    db.add(u)
                    db.flush()

                student = Student(
                    user_id=u.user_id,
                    registration_no=reg_no,
                    department="AIML",
                    section="5 AIML A",
                    batch_year=2026,
                    registered_face_path=f"storage/registered_faces/{i}.jpg"
                )
                db.add(student)
                db.flush()

            enrollment = db.query(StudentEnrollment).filter(
                StudentEnrollment.student_id == student.student_id,
                StudentEnrollment.subject_id == subj_a.subject_id
            ).first()
            if not enrollment:
                db.add(StudentEnrollment(student_id=student.student_id, subject_id=subj_a.subject_id))

        # Section B: 7 Students
        for i in range(1, 8):
            student_num = i + 7
            username = f"aiml_b_0{i}"
            reg_no = f"2026-AIML-B0{i}"
            
            student = db.query(Student).filter(Student.registration_no == reg_no).first()
            if not student:
                u = db.query(User).filter(User.username == username).first()
                if not u:
                    u = User(
                        username=username,
                        email=f"{username}@institution.edu",
                        password_hash=default_password_hash,
                        role=UserRole.STUDENT,
                        is_active=True
                    )
                    db.add(u)
                    db.flush()

                student = Student(
                    user_id=u.user_id,
                    registration_no=reg_no,
                    department="AIML",
                    section="5 AIML B",
                    batch_year=2026,
                    registered_face_path=f"storage/registered_faces/{student_num}.jpg"
                )
                db.add(student)
                db.flush()

            enrollment = db.query(StudentEnrollment).filter(
                StudentEnrollment.student_id == student.student_id,
                StudentEnrollment.subject_id == subj_b.subject_id
            ).first()
            if not enrollment:
                db.add(StudentEnrollment(student_id=student.student_id, subject_id=subj_b.subject_id))

        # 4. Seed Active Class Sessions
        now = datetime.now()
        session_a = db.query(ClassSession).filter(ClassSession.session_id == 1).first()
        if not session_a:
            session_a = ClassSession(
                session_id=1,
                subject_id=subj_a.subject_id,
                faculty_id=faculty.faculty_id,
                room_number="Lab-AIML-A",
                status=SessionStatus.SCHEDULED,
                start_time=now,
                end_time=now + timedelta(minutes=60),
                grace_period_minutes=15
            )
            db.add(session_a)

        session_b = db.query(ClassSession).filter(ClassSession.session_id == 2).first()
        if not session_b:
            session_b = ClassSession(
                session_id=2,
                subject_id=subj_b.subject_id,
                faculty_id=faculty.faculty_id,
                room_number="Lab-AIML-B",
                status=SessionStatus.SCHEDULED,
                start_time=now,
                end_time=now + timedelta(minutes=60),
                grace_period_minutes=15
            )
            db.add(session_b)

        db.commit()
        print("[SUCCESS] Seeding complete! All records verified without duplicate collisions.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    initialize_and_seed_db()