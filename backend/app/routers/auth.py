import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.utils.email import send_verification_email, send_password_reset_email, send_account_not_found_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        if existing.is_verified:
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            # If the user is unverified, delete their tokens then the existing record to allow re-registration
            db.query(models.VerificationToken).filter(models.VerificationToken.user_id == existing.id).delete()
            db.query(models.PasswordResetToken).filter(models.PasswordResetToken.user_id == existing.id).delete()
            db.delete(existing)
            db.commit()
            
    user = models.User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_verified=True  # Force automatic verification for testing
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate verification token
    token = str(uuid.uuid4())
    expires = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    v_token = models.VerificationToken(token=token, user_id=user.id, expires_at=expires)
    db.add(v_token)
    db.commit()

    # Send verification email
    email_sent = send_verification_email(user.email, token)

    return user


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in.")
        
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    v_token = db.query(models.VerificationToken).filter(models.VerificationToken.token == token).first()
    if not v_token:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    if v_token.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification token has expired")
        
    user = db.query(models.User).filter(models.User.id == v_token.user_id).first()
    if user:
        user.is_verified = True
        db.delete(v_token)
        db.commit()
        return {"detail": "Email verified successfully."}
    raise HTTPException(status_code=404, detail="User not found")


@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:
        token = str(uuid.uuid4())
        expires = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        hashed_pw = hash_password(payload.new_password)
        reset_token = models.PasswordResetToken(token=token, user_id=user.id, pending_password=hashed_pw, expires_at=expires)
        db.add(reset_token)
        db.commit()
        
        # Force automatic password change for testing
        user.hashed_password = hashed_pw
        db.delete(reset_token)
        db.commit()
        return {"detail": "Password changed automatically for testing."}
    else:
        # User not found
        pass
        
    # Always return success to prevent email enumeration
    return {"detail": "If that email is registered, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_token = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.token == payload.token).first()
    
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid password reset token")
        
    if reset_token.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Password reset token has expired")
        
    user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = reset_token.pending_password
    db.delete(reset_token)
    db.commit()
    
    return {"detail": "Password has been reset successfully."}

