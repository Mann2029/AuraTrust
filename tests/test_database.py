import pytest
from sqlalchemy.exc import IntegrityError
from database_core import (
    SessionLocal, User, Student, ClassSession, Subject,
    AttendanceStaging, AttendanceLedger, SessionStatus, UserRole
)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def test_database_connection(db):
    assert db is not None
    # Query at least one active subject
    subject = db.query(Subject).first()
    assert subject is not None

def test_attendance_staging_unique_constraint_idempotency(db):
    """Verifies that duplicate student scans in the same session raise IntegrityError at DB layer."""
    session = db.query(ClassSession).first()
    student = db.query(Student).first()
    assert session is not None
    assert student is not None

    # Clean up any existing staging row for this pair
    db.query(AttendanceStaging).filter(
        AttendanceStaging.session_id == session.session_id,
        AttendanceStaging.student_id == student.student_id
    ).delete()
    db.commit()

    # 1. First insert should succeed
    staging1 = AttendanceStaging(
        session_id=session.session_id,
        student_id=student.student_id,
        verification_method="AI_AUTO",
        risk_score=15.0
    )
    db.add(staging1)
    db.commit()

    # 2. Concurrent/duplicate insert for SAME session and student must fail
    staging2 = AttendanceStaging(
        session_id=session.session_id,
        student_id=student.student_id,
        verification_method="AI_AUTO",
        risk_score=18.0
    )
    db.add(staging2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # Clean up
    db.query(AttendanceStaging).filter(
        AttendanceStaging.session_id == session.session_id,
        AttendanceStaging.student_id == student.student_id
    ).delete()
    db.commit()

def test_attendance_ledger_unique_constraint_idempotency(db):
    """Verifies that final ledger forbids duplicate commits for the same session and student."""
    session = db.query(ClassSession).first()
    student = db.query(Student).first()

    # Clean up
    db.query(AttendanceLedger).filter(
        AttendanceLedger.session_id == session.session_id,
        AttendanceLedger.student_id == student.student_id
    ).delete()
    db.commit()

    # First commit
    ledger1 = AttendanceLedger(
        session_id=session.session_id,
        student_id=student.student_id,
        verification_method="AI_AUTO"
    )
    db.add(ledger1)
    db.commit()

    # Duplicate commit must fail
    ledger2 = AttendanceLedger(
        session_id=session.session_id,
        student_id=student.student_id,
        verification_method="FACULTY_OVERRIDE"
    )
    db.add(ledger2)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # Clean up
    db.query(AttendanceLedger).filter(
        AttendanceLedger.session_id == session.session_id,
        AttendanceLedger.student_id == student.student_id
    ).delete()
    db.commit()
