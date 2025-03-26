from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, text, TIMESTAMP
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from sqlalchemy import Enum, MetaData
from sqlalchemy.sql import func
from .base import Base

# Create new MetaData instance
metadata = MetaData()

class Users(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False)
    password = Column(String(255), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    company_id = Column(Integer)
    department = Column(String(50))
    privilege = Column(Integer, default=0)
    energy = Column(Integer, default=5)

class Documents(Base):
    __tablename__ = "documents"
    
    document_id = Column(Integer, primary_key=True, autoincrement=True)
    upload_time = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    status = Column(String(50), nullable=False, default='pending')
    url = Column(String(500))
    upload_file_name = Column(String(255))
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete='SET NULL'), nullable=True)
    user_email = Column(String(100))

    class Config:
        from_attributes = True

    # Add relationship to TrainingDocuments
    training_documents = relationship("TrainingDocuments", back_populates="document", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="document", cascade="all, delete-orphan")
    file_indices = relationship("FileIndex", back_populates="document", cascade="all, delete-orphan")

class Departments(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    # Add relationship to employees
    employees = relationship("Employees", back_populates="department")

class Roles(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    # Add relationship to employees
    employees = relationship("Employees", back_populates="role")

class Employees(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    leader_id = Column(Integer, ForeignKey("employees.id", ondelete='SET NULL'), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete='RESTRICT'), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete='RESTRICT'), nullable=False)
    status = Column(String(20), default="active")
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))
    
    # Update relationships
    permissions = relationship("Permissions", back_populates="employee", cascade="all, delete-orphan")
    department = relationship("Departments", back_populates="employees")
    role = relationship("Roles", back_populates="employees")
    subordinates = relationship("Employees",
                              backref="leader",
                              remote_side=[id],
                              foreign_keys=[leader_id])

class AccessLevel(enum.Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"

class Role(enum.Enum):
    ADMIN = "admin"
    USER = "user"
    MANAGER = "manager"

class Permissions(Base):
    __tablename__ = "permissions"
    
    permission_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("employees.id", ondelete='CASCADE'))
    role = Column(String(20))
    resource = Column(String(100))
    access_level = Column(String(20))
    
    # Add reverse relationship
    employee = relationship("Employees", back_populates="permissions")

class TrainingDocuments(Base):
    __tablename__ = "trainingdocuments"
    
    training_document_id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete='CASCADE'))
    training_topic = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))

    # Add relationship to Documents
    document = relationship("Documents", back_populates="training_documents")

class Feedback(Base):
    __tablename__ = "feedback"
    
    feedback_id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete='CASCADE'))
    feedback_text = Column(Text)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))

    # Add relationship to Documents
    document = relationship("Documents", back_populates="feedback")

class FileIndex(Base):
    __tablename__ = "file_index"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete='CASCADE'))
    file_path = Column(String(500))
    file_name = Column(String(255))
    file_type = Column(String(50))
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))

    # Add relationship to Documents
    document = relationship("Documents", back_populates="file_indices")

    USER = "user"
    MANAGER = "manager"

class PermissionLevel(enum.Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"

class DocumentAccess(Base):
    __tablename__ = "document_access"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(50), ForeignKey("documents.document_id", ondelete='CASCADE'))
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete='CASCADE'))
    permission_level = Column(Enum(PermissionLevel))
    granted_by = Column(Integer, ForeignKey("users.user_id"))
    granted_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    expires_at = Column(DateTime, nullable=True)
    
    # Add relationships
    document = relationship("Documents", foreign_keys=[document_id])
    user = relationship("Users", foreign_keys=[user_id])
    grantor = relationship("Users", foreign_keys=[granted_by])

class LearningProgress(Base):
    __tablename__ = "learning_progress"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete='CASCADE'))
    document_id = Column(String(50), ForeignKey("documents.document_id", ondelete='CASCADE'))
    current_section = Column(String(255))
    progress_percentage = Column(Integer, default=0)
    last_accessed = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    completed = Column(Integer, default=0)  # 0=未完成，1=已完成
    completion_date = Column(DateTime, nullable=True)
    quiz_scores = Column(Text)  # 存储JSON格式的测验分数
    
    # Add relationships
    user = relationship("Users", foreign_keys=[user_id])
    document = relationship("Documents", foreign_keys=[document_id])

class AccessLog(Base):
    __tablename__ = "access_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete='SET NULL'), nullable=True)
    document_id = Column(String(50), ForeignKey("documents.document_id", ondelete='CASCADE'))
    action = Column(String(50))  # 例如：view, edit, download
    access_time = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    
    # Add relationships
    user = relationship("Users", foreign_keys=[user_id])
    document = relationship("Documents", foreign_keys=[document_id])
