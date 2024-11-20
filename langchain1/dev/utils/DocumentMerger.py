import os
from docx import Document
from langchain.document_loaders import UnstructuredWordDocumentLoader
from langchain.document_loaders import UnstructuredPowerPointLoader
from langchain.document_loaders import UnstructuredHTMLLoader
from langchain.document_loaders import PyPDFLoader
from langchain.document_loaders import TextLoader


class DocumentMerger:
    """文档合并类"""
    def __init__(self):
        self.supported_formats = ['docx', 'pdf','html','pptx']
    
    def merge_documents(self, file_paths, output_path):
        """合并多个文档"""
        all_documents = []
        print(file_paths)
        # 处理每个文件路径
        for file_path in file_paths:
            # 根据文件类型选择加载器
            if file_path.endswith('.pdf'):
                loader = PyPDFLoader(file_path)
            elif file_path.endswith('.html'):
                loader = UnstructuredHTMLLoader(file_path)
            elif file_path.endswith('.docx') or file_path.endswith('.doc'):
                loader = UnstructuredWordDocumentLoader(file_path)
            elif file_path.endswith('.pptx') or file_path.endswith('.ppt'):
                loader = UnstructuredPowerPointLoader(file_path)
            else:
                loader = TextLoader(file_path)
            
            # 加载文档
            documents = loader.load()
            all_documents.extend(documents)

        return all_documents
