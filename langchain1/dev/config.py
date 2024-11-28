import os
class Config:
       # Flask配置
       SECRET_KEY = os.getenv('SECRET_KEY')
       
       # 数据库配置
       SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
       
       # OpenAI配置
       OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
       OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4')
       
       # 文件上传配置
       UPLOAD_FOLDER = 'uploads'
       ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx', 'ppt', 'pptx'}
       
