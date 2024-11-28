from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import tempfile
import os
from dev.core.security import get_current_user
from dev.CloudStorage.aws import download_file_by_url

router = APIRouter(
    prefix="/api/pdf",
    tags=["pdf"]
)

@router.get("/generate/")
async def generate_pdf_from_content(
    url: str,
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """
    从内容生成PDF文件并返回
    """
    try:
        # 下载原始内容
        content, content_type = download_file_by_url(url)
        if content is None:
            raise HTTPException(status_code=404, detail="Content not found")

        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            # 创建PDF
            buffer = io.BytesIO()
            c = canvas.Canvas(buffer, pagesize=letter)
            
            # 写入内容
            text_object = c.beginText(40, 750)  # 起始位置
            text_object.setFont("Helvetica", 12)
            
            # 如果content是bytes，解码为字符串
            if isinstance(content, bytes):
                try:
                    content = content.decode('utf-8')
                except UnicodeDecodeError:
                    # 如果解码失败，可能是二进制文件，直接返回原始内容
                    return FileResponse(
                        io.BytesIO(content),
                        filename=filename,
                        media_type=content_type
                    )

            # 分行处理文本
            for line in content.split('\n'):
                text_object.textLine(line)
            
            c.drawText(text_object)
            c.save()
            
            # 获取PDF内容
            pdf_content = buffer.getvalue()
            
            # 写入临时文件
            tmp_file.write(pdf_content)
            tmp_file.flush()
            
            # 返回生成的PDF文件
            return FileResponse(
                tmp_file.name,
                filename=filename,
                media_type='application/pdf'
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
    finally:
        # 清理临时文件
        if 'tmp_file' in locals():
            try:
                os.unlink(tmp_file.name)
            except:
                pass
