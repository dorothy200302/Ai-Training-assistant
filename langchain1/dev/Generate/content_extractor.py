from typing import Dict, List, Optional, Union, BinaryIO
from .file_processor import get_file_processor
import os
import mimetypes
import magic

class ContentExtractor:
    """内容提取器，用于处理和提取各种文件中的内容"""
    
    def __init__(self):
        self.mime = magic.Magic(mime=True)
    
    async def process_file(self, file_path: str) -> Dict:
        """处理文件并提取内容"""
        try:
            # 获取文件类型
            file_type = self._get_file_type(file_path)
            
            # 获取对应的处理器
            processor = get_file_processor(file_type)
            
            # 读取文件内容
            with open(file_path, 'rb') as f:
                file_content = f
                
                # 提取内容
                tables = await processor.extract_tables(file_content)
                f.seek(0)
                charts = await processor.extract_charts(file_content)
                f.seek(0)
                images = await processor.extract_images(file_content)
            
            return {
                "file_type": file_type,
                "tables": tables,
                "charts": charts,
                "images": images
            }
            
        except Exception as e:
            raise Exception(f"File processing error: {str(e)}")
    
    def _get_file_type(self, file_path: str) -> str:
        """获取文件类型"""
        try:
            # 首先通过文件扩展名判断
            ext = os.path.splitext(file_path)[1].lower()
            if ext:
                ext = ext[1:]  # 移除点号
                if ext in ['pdf', 'docx', 'pptx', 'xlsx']:
                    return ext
            
            # 如果没有扩展名或不在支持列表中，尝试通过MIME类型判断
            mime_type = self.mime.from_file(file_path)
            
            # MIME类型到文件类型的映射
            mime_map = {
                'application/pdf': 'pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
            }
            
            file_type = mime_map.get(mime_type)
            if not file_type:
                raise ValueError(f"Unsupported file type: {mime_type}")
            
            return file_type
            
        except Exception as e:
            raise Exception(f"File type detection error: {str(e)}")
    
    async def batch_process_files(self, file_paths: List[str]) -> Dict[str, Dict]:
        """批量处理文件"""
        try:
            results = {}
            for file_path in file_paths:
                results[file_path] = await self.process_file(file_path)
            return results
            
        except Exception as e:
            raise Exception(f"Batch processing error: {str(e)}")
    
    async def extract_content_by_type(self, file_path: str, content_type: str) -> List[Dict]:
        """根据内容类型提取特定内容"""
        try:
            if content_type not in ['tables', 'charts', 'images']:
                raise ValueError(f"Unsupported content type: {content_type}")
            
            # 获取文件类型
            file_type = self._get_file_type(file_path)
            
            # 获取对应的处理器
            processor = get_file_processor(file_type)
            
            # 读取文件内容并提取指定类型的内容
            with open(file_path, 'rb') as f:
                if content_type == 'tables':
                    return await processor.extract_tables(f)
                elif content_type == 'charts':
                    return await processor.extract_charts(f)
                else:  # images
                    return await processor.extract_images(f)
            
        except Exception as e:
            raise Exception(f"Content extraction error: {str(e)}")
    
    def get_supported_file_types(self) -> List[str]:
        """获取支持的文件类型列表"""
        return ['pdf', 'docx', 'pptx', 'xlsx']
    
    def validate_file_type(self, file_path: str) -> bool:
        """验证文件类型是否支持"""
        try:
            file_type = self._get_file_type(file_path)
            return file_type in self.get_supported_file_types()
        except:
            return False 