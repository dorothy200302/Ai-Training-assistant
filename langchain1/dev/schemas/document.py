from pydantic import BaseModel
from typing import Dict

class DocumentCreate(BaseModel):
    # Add relevant fields here
    pass

class DocumentResponse(BaseModel):
    # Add relevant fields here
    pass

class UrlsMapDTO(BaseModel):
    urls_map: Dict[str, str]
    email: str 