from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
import io
import tempfile
import os
from xhtml2pdf import pisa
from dev.core.security import get_current_user
from dev.CloudStorage.aws import download_file_by_url

# 注册中文字体
try:
    # 使用系统中文字体
    font_path = "C:/Windows/Fonts/simsun.ttc"  # 宋体
except Exception as e:
    print(f"Error loading font: {str(e)}")

router = APIRouter(
    tags=["pdf"]
)

def convert_html_to_pdf(html_content):
    """将 HTML 内容转换为 PDF"""
    pdf_buffer = io.BytesIO()
    
    # 添加中文字体支持
    html_content = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @font-face {{
                font-family: SimSun;
                src: url("C:/Windows/Fonts/simsun.ttc");
            }}
            body {{
                font-family: SimSun, sans-serif;
                font-size: 12px;
                line-height: 1.5;
            }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """
    
    # 转换 HTML 到 PDF
    pisa_status = pisa.CreatePDF(
        html_content,
        dest=pdf_buffer,
        encoding='utf-8'
    )
    
    if pisa_status.err:
        raise HTTPException(status_code=500, detail="PDF generation failed")
        
    pdf_buffer.seek(0)
    return pdf_buffer

@router.get("/pdf/generate/")
async def generate_pdf_from_content(
    url: str,
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """从内容生成 PDF 文件并返回"""
    try:
        # 下载原始内容
        content, content_type = download_file_by_url(url)
        if content is None:
            raise HTTPException(status_code=404, detail="Content not found")

        # 如果是二进制内容，尝试解码
        if isinstance(content, bytes):
            try:
                content = content.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    content = content.decode('gbk')
                except UnicodeDecodeError:
                    # 如果解码失败，可能是二进制文件，直接返回原始内容
                    return FileResponse(
                        io.BytesIO(content),
                        filename=filename,
                        media_type=content_type
                    )

        # 将内容转换为 HTML
        html_content = f"<pre>{content}</pre>"  # 使用 pre 标签保持格式
        
        # 生成 PDF
        pdf_buffer = convert_html_to_pdf(html_content)
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(pdf_buffer.getvalue())
            tmp_file.flush()
            
            # 返回生成的 PDF 文件
            return FileResponse(
                tmp_file.name,
                filename=filename if filename.endswith('.pdf') else f"{filename}.pdf",
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
