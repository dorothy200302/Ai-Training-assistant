import os
from werkzeug.utils import secure_filename
from typing import Set, Optional
from ..config import Config

class FileHandler:
    def __init__(self):
        self.allowed_extensions = Config.ALLOWED_EXTENSIONS
        self.upload_folder = Config.UPLOAD_FOLDER
        
    def save_upload(self, file, subfolder: Optional[str] = None) -> str:
        """保存上传的文件"""
        if not self.validate_file(file):
            raise ValueError("Invalid file type")
            
        filename = secure_filename(file.filename)
        
        # 确定保存路径
        save_path = self.upload_folder
        if subfolder:
            save_path = os.path.join(save_path, subfolder)
            
        if not os.path.exists(save_path):
            os.makedirs(save_path)
            
        file_path = os.path.join(save_path, filename)
        file.save(file_path)
        
        return file_path
    
    def validate_file(self, file) -> bool:
        """验证文件类型"""
        return '.' in file.filename and \
               file.filename.rsplit('.', 1)[1].lower() in self.allowed_extensions
    
    def get_file_extension(self, filename: str) -> str:
        """获取文件扩展名"""
        return filename.rsplit('.', 1)[1].lower() if '.' in filename else '' 