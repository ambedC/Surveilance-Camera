from datetime import datetime
from enum import Enum
import os
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    create_engine,
    Enum as SAEnum,
)
from sqlalchemy.orm import declarative_base, sessionmaker
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")  # sha256 avoids bcrypt backend issues on Windows

Base = declarative_base()


class UserStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False)
    phone_number = Column(String(32), unique=True, nullable=False, index=True)
    password_hash = Column(String(512), nullable=False)
    status = Column(SAEnum(UserStatus), default=UserStatus.PENDING, nullable=False)
    is_admin = Column(Integer, default=0, nullable=False)  # 1 for admin, 0 for regular user
    created_at = Column(DateTime, default=datetime.utcnow)

    def verify_password(self, password: str) -> bool:
        return pwd_context.verify(password, self.password_hash)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone_number": self.phone_number,
            "status": self.status.value if isinstance(self.status, Enum) else str(self.status),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# Database setup: local SQLite file in backend/database/app.db
DB_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(DB_DIR, "app.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


# Initialize DB at import time (creates file if missing)
init_db()


def add_user(name, email, phone_number, password):
    """Add a new user to the SQLite database with a hashed password."""
    db = SessionLocal()
    try:
        password_hash = pwd_context.hash(password)
        user = User(
            name=name,
            email=email,
            phone_number=phone_number,
            password_hash=password_hash,
            status=UserStatus.PENDING,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def get_user_by_phone(phone_number):
    db = SessionLocal()
    try:
        return db.query(User).filter(User.phone_number == phone_number).first()
    finally:
        db.close()


def get_pending_users():
    db = SessionLocal()
    try:
        return db.query(User).filter(User.status == UserStatus.PENDING).all()
    finally:
        db.close()


def approve_user(phone_number):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.phone_number == phone_number).first()
        if user:
            user.status = UserStatus.APPROVED
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
        return None
    finally:
        db.close()


def reject_user(phone_number):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.phone_number == phone_number).first()
        if user:
            user.status = UserStatus.REJECTED
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
        return None
    finally:
        db.close()


def get_all_users():
    db = SessionLocal()
    try:
        return db.query(User).all()
    finally:
        db.close()
