from enum import Enum
from pydantic import BaseModel
from typing import Optional, List

class PermissionLevel(Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"

class Permission(BaseModel):
    user_id: int
    document_id: str
    permission_level: PermissionLevel
    granted_by: Optional[int] = None
    expires_at: Optional[str] = None 