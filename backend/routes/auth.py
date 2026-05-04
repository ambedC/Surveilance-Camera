from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
import re
from ..database.models import (
    add_user, 
    get_user_by_phone, 
    approve_user, 
    reject_user,
    get_pending_users,
    get_all_users,
    UserStatus
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Request/Response Models
class RegisterRequest(BaseModel):
    name: str
    email: str
    phone_number: str
    password: str
    confirm_password: str

class LoginRequest(BaseModel):
    phone_number: str
    password: str

class ApproveUserRequest(BaseModel):
    phone_number: str

# Utility functions
# (no OTP generation required for password-based flow)

def validate_phone_number(phone_number: str):
    """Validate phone number: must be exactly 10 digits.
    Accepts with or without leading +91.
    Returns normalized phone number string (+91XXXXXXXXXX) if valid, otherwise None.
    """
    # strip spaces/hyphens
    p = re.sub(r"[\s-]", "", phone_number)
    # remove leading country code if present
    if p.startswith("+91"):
        p = p[3:]
    # only digits allowed now
    if not p.isdigit():
        return None
    # must be exactly 10 digits
    if len(p) != 10 or not re.fullmatch(r"\d{10}", p):
        return None
    return "+91" + p

def validate_email(email: str):
    """Basic email validation"""
    email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(email_pattern, email))


# Routes




@router.post("/register")
async def register(request: RegisterRequest):
    """Register a new user with password"""
    name = request.name.strip()
    email = request.email.strip()
    phone_number_raw = request.phone_number.strip()
    password = request.password
    confirm = request.confirm_password
    
    # Validate inputs
    if not name or len(name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name must be at least 2 characters"
        )
    
    if not validate_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    normalized = validate_phone_number(phone_number_raw)
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Indian phone number"
        )
    
    if not password or password != confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords must match and cannot be empty"
        )
    
    # Check if user already exists
    existing_user = get_user_by_phone(normalized)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this phone number already exists"
        )
    
    # Create user
    user = add_user(name, email, normalized, password)
    
    return {
        "message": "Registration successful. Your account is pending admin approval.",
        "user": user.to_dict()
    }

@router.post("/login")
async def login(request: LoginRequest):
    """Login using phone number and password"""
    phone_number_raw = request.phone_number.strip()
    password = request.password
    normalized = validate_phone_number(phone_number_raw)
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number format. Only Indian numbers allowed."
        )
    
    user = get_user_by_phone(normalized)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Please register first."
        )
    if user.status != UserStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account is {user.status}. Please contact the administrator."
        )
    
    # verify password
    if not user.verify_password(password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    return {
        "message": "Login successful",
        "phone_number": normalized
    }

# Admin Routes

@router.get("/admin/pending-users")
async def get_pending_users_list():
    """Get all pending user registrations (Admin only)"""
    pending = get_pending_users()
    return {
        "pending_users": [user.to_dict() for user in pending],
        "total": len(pending)
    }

@router.get("/admin/all-users")
async def get_all_users_list():
    """Get all users (Admin only)"""
    all_users = get_all_users()
    return {
        "users": [user.to_dict() for user in all_users],
        "total": len(all_users)
    }

@router.post("/admin/approve-user")
async def approve_user_endpoint(request: ApproveUserRequest):
    """Approve a pending user (Admin only)"""
    phone_number_raw = request.phone_number.strip()
    normalized = validate_phone_number(phone_number_raw)
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number"
        )

    user = approve_user(normalized)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "message": "User approved successfully",
        "user": user.to_dict()
    }

@router.post("/admin/reject-user")
async def reject_user_endpoint(request: ApproveUserRequest):
    """Reject a pending user (Admin only)"""
    phone_number_raw = request.phone_number.strip()
    normalized = validate_phone_number(phone_number_raw)
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number"
        )

    user = reject_user(normalized)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "message": "User rejected successfully",
        "user": user.to_dict()
    }
