from pydantic import BaseModel
from typing import Dict, Optional

class DocumentCreate(BaseModel):
    # Add relevant fields here
    pass

class DocumentUpdate(BaseModel):
    # Add relevant fields here
    pass

class DocumentResponse(BaseModel):
    # Add relevant fields here
    pass

class UrlsMapDTO(BaseModel):
    urls_map: Dict[str, str]
    email: str 