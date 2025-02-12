from typing import Dict
from fastapi import HTTPException, status
import logging
from dev.crud.crud_user import user_crud
from dev.database import SessionLocal

def verify_user_from_email(email: str) -> Dict:
    """Verify user exists and return user data"""
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email is missing"
        )

    # Get user information from database
    db = SessionLocal()
    try:
        user = user_crud.get_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        return {
            "user_id": user.user_id,
            "email": user.email,
            "is_active": True
        }
    finally:
        db.close() 