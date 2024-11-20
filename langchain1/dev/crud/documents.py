from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from dev.core.security import get_current_user
from dev.crud.database import get_db
from dev.utils.file_handler import FileHandler
from dev.crud import DocumentCRUD
from dev.schemas import UrlsMapDTO
from typing import List
import logging
from fastapi import HTTPException


router = APIRouter()
file_handler = FileHandler()
logger = logging.getLogger(__name__)

@router.post("/save-urls-map")
async def save_urls_map(
    dto: UrlsMapDTO,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        documents = []
        for filename, url in dto.urls_map.items():
            doc = DocumentCRUD.create_document(
                db=db,
                upload_file_name=filename,
                url=url,
                user_email=dto.email
            )
            documents.append(doc)
        return {"success": True, "documents": documents}
    except Exception as e:
        logger.error(f"Error saving urls map: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = await file_handler.save_multiple_files(files, current_user["email"])
    
    # 保存到数据库
    for result in results:
        DocumentCRUD.create_document(
            db=db,
            upload_file_name=result["original_name"],
            url=result["url"],
            user_email=current_user["email"]
        )
    
    return results