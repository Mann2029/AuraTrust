import pytest
from datetime import timedelta
from fastapi import HTTPException

from auth_core import (
    get_password_hash, verify_password, create_access_token,
    decode_access_token, revoke_token, REVOKED_TOKENS
)

def test_password_hashing_and_verification():
    raw_pass = "SecureAuraPass2026!"
    hashed = get_password_hash(raw_pass)
    
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password("", hashed) is False
    assert verify_password(raw_pass, "malformed_hash") is False

def test_jwt_token_generation_and_decoding():
    payload = {"sub": "test_faculty", "role": "FACULTY", "user_id": 101}
    token = create_access_token(data=payload, expires_delta=timedelta(minutes=15))
    
    decoded = decode_access_token(token)
    assert decoded["sub"] == "test_faculty"
    assert decoded["role"] == "FACULTY"
    assert decoded["user_id"] == 101
    assert "exp" in decoded
    assert "jti" in decoded

def test_jwt_token_revocation():
    payload = {"sub": "revoked_user", "role": "STUDENT", "user_id": 999}
    token = create_access_token(data=payload)
    
    # Verify initial validity
    decoded = decode_access_token(token)
    assert decoded["sub"] == "revoked_user"
    
    # Revoke token
    revoke_token(token)
    assert token in REVOKED_TOKENS
    
    # Subsequent decode attempt must fail with 401
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(token)
    assert exc_info.value.status_code == 401
    assert "revoked" in exc_info.value.detail.lower()

def test_invalid_token_rejection():
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("completely.invalid.token_string")
    assert exc_info.value.status_code == 401
