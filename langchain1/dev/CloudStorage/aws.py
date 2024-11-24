import requests
import json
from urllib.parse import urlparse, parse_qs
import os
from dev.models import *
from dev.config.database import SessionLocal
from dev.crud import document_crud
from typing import Tuple

def get_file_type(file_key):
    image_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp')
    audio_extensions = ('.mp3', '.wav', '.ogg', '.m4a', '.aac')
    video_extensions = ('.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv')
    file_extensions = ('.doc', '.docx', '.pdf', '.xls', '.xlsx', '.txt')
    
    if file_key.split('.')[-1] in image_extensions:
        return "image"
    elif file_key.split('.')[-1] in audio_extensions:
        return "audio"
    elif file_key.split('.')[-1] in video_extensions:
        return "video"
    else:
        return "file"

def get_presigned_url(file_key):
    url = 'https://data.dev.agione.ai/api/v1/object/common/presign?'
    headers = {
        'api-key': 'mc-n_KDyqNaDLJs6NOeoO-Y42rjtN_sJbV1kn7OqdBvIu0fMNxqrp1_P4f05Ns1a1EJ',
        'Content-Type': 'application/json'
    }
    
    file_type = get_file_type(file_key)
    print("file_type",file_type)
    params = {
        'sub_path': file_type,  # 使用文件类型作为 sub_path
        'file_key': file_key
    }
    url=url+'sub_path='+file_type+'&file_key='+file_key
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        print("get_presigned_url",response.json()['data']['presign_url'])
        return response.json()['data']['presign_url']
    return None

def upload_file_to_s3(presigned_url: str, file_path: str) -> str:
    """上传文件到S3"""
    try:
        # 从预签名URL中获取正确的content-type
        parsed_url = urlparse(presigned_url)
        query_params = parse_qs(parsed_url.query)
        content_type = query_params.get('content-type', ['application/pdf'])[0]
        
        headers = {
            'Content-Type': content_type  # 使用从预签名URL中获取的content-type
        }
        
        print(f"使用的headers: {headers}")
        
        with open(file_path, 'rb') as file:
            response = requests.put(presigned_url, headers=headers, data=file)
            
        print(f"上传响应状态: {response.status_code}")
        print(f"上传响应内容: {response.text}")
            
        if response.status_code == 200:
            base_url = presigned_url.split('?')[0]
            print(f"上传成功，URL: {base_url}")
            return base_url
        else:
            print(f"上传失败: {response.status_code}")
            print(f"错误信息: {response.text}")
            return None
    except Exception as e:
        print(f"上传出错: {str(e)}")
        return None

def record_file_metadata(s3_url, description=""):
    url = 'https://data.dev.agione.ai/api/v1/object/common/record'
    headers = {
        'api-key': 'mc-n_KDyqNaDLJs6NOeoO-Y42rjtN_sJbV1kn7OqdBvIu0fMNxqrp1_P4f05Ns1a1EJ',
        'Content-Type': 'application/json'
    }
    file_type = get_file_type(s3_url)
    data = {
        "description": description,
        "file_type": file_type,
        "s3_url": s3_url
    }
    response = requests.post(url, headers=headers, data=json.dumps(data))
    return response.json()

# if __name__ == "__main__":
#     file_key = "121321.pdf"
#     local_file_path = r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\AI技术发现超16万种RNA病毒 阿里云联合研究成果发表于国际期刊《Cell》-阿里巴巴集团.pdf"
    
#     # 1. Get presigned URL
#     presigned_url = get_presigned_url(file_key)
#     print("presigned_url",presigned_url)
#     if presigned_url:
#         # 2. Upload file
#         s3_url = upload_file_to_s3(presigned_url, local_file_path)
#         print("s3_url",s3_url)
#         if s3_url:
#             # 3. Record metadata
#             result = record_file_metadata(s3_url, "Test file description")
#             print("result",result)

def upload_file_to_s3_by_key(file_key, local_file_path):
    presigned_url = get_presigned_url(file_key)
    print("presigned_url",presigned_url)
    if presigned_url:
        s3_url = upload_file_to_s3(presigned_url, local_file_path)
        print("s3_url",s3_url)
        if s3_url:
            result = record_file_metadata(s3_url, "Test file description")
            print("result",result)
            return s3_url##给到数据库保存
    return "error"

def download_file_from_s3(file_key: str, user_email: str) -> str:
    """从S3下载文件"""
    try:
        # 从数据库中获取文件URL
        db = SessionLocal()
        try:
            documents = document_crud.get_by_user_email(
                db=db,
                user_email=user_email,
            )
            if not documents:
                print(f"未找到用户 {user_email} 的文件记录")
                return "error"
                
            # 创建临时目录用于保存下载的文件
            temp_dir = os.path.abspath("temp_downloads")
            os.makedirs(temp_dir, exist_ok=True)
            local_path = os.path.join(temp_dir, file_key)
        finally:
            db.close()
        urls = [document.url for document in documents]
        headers = {
            'api-key': 'mc-n_KDyqNaDLJs6NOeoO-Y42rjtN_sJbV1kn7OqdBvIu0fMNxqrp1_P4f05Ns1a1EJ'
        }
        local_paths=[]
        for url in urls:
            # 下载文件
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                # 保存到本地路径
                with open(local_path, 'wb') as f:
                    f.write(response.content)
                    local_paths.append(local_path)
            else:
                print(f"下载失败: {response.status_code}")
                return "error"
        return local_paths
    except Exception as e:
        print(f"下载出错: {str(e)}")
        return "error"

def download_file_by_url(url: str) -> Tuple[bytes, str]:
    """根据文件URL下载文件，返回文件内容和MIME类型"""
    try:
        # 下载文件
        response = requests.get(url)
        if response.status_code == 200:
            # 获取文件类型
            content_type = response.headers.get('Content-Type', 'application/octet-stream')
            return response.content, content_type
        else:
            print(f"下载失败: {response.status_code}")
            return None, None
    except Exception as e:
        print(f"下载出错: {str(e)}")
        return None, None
