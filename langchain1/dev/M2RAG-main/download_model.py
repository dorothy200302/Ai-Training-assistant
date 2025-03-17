import os
import requests
from tqdm import tqdm
import time

def download_file(url, local_path, chunk_size=8192):
    """
    下载文件，支持断点续传
    """
    # 创建目录
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    
    # 检查文件是否已经存在
    file_size = 0
    headers = {}
    if os.path.exists(local_path):
        file_size = os.path.getsize(local_path)
        headers['Range'] = f'bytes={file_size}-'
        print(f"文件已存在，从 {file_size} 字节处继续下载")
    
    # 发送请求
    try:
        response = requests.get(url, headers=headers, stream=True, timeout=30)
        
        # 如果是断点续传，服务器应该返回206状态码
        if file_size > 0 and response.status_code == 206:
            mode = 'ab'  # 追加模式
        else:
            mode = 'wb'  # 写入模式
            file_size = 0
        
        # 获取文件总大小
        total_size = int(response.headers.get('content-length', 0)) + file_size
        
        # 下载文件
        with open(local_path, mode) as f:
            with tqdm(total=total_size, initial=file_size, unit='B', unit_scale=True, desc=os.path.basename(local_path)) as pbar:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    if chunk:
                        f.write(chunk)
                        pbar.update(len(chunk))
        
        return True
    except Exception as e:
        print(f"下载失败: {str(e)}")
        return False

def download_bge_visualized():
    """
    下载BGE-Visualized模型
    """
    model_dir = "pretrained_model/bge-visualized"
    os.makedirs(model_dir, exist_ok=True)
    
    # 模型文件列表
    files = [
        {
            "name": "config.json",
            "url": "https://huggingface.co/BAAI/bge-visualized/resolve/main/config.json"
        },
        {
            "name": "tokenizer_config.json",
            "url": "https://huggingface.co/BAAI/bge-visualized/resolve/main/tokenizer_config.json"
        },
        {
            "name": "vocab.txt",
            "url": "https://huggingface.co/BAAI/bge-visualized/resolve/main/vocab.txt"
        },
        {
            "name": "pytorch_model.bin",
            "url": "https://huggingface.co/BAAI/bge-visualized/resolve/main/pytorch_model.bin?download=true"
        }
    ]
    
    # 下载文件
    for file in files:
        local_path = os.path.join(model_dir, file["name"])
        print(f"下载 {file['name']}...")
        
        # 尝试下载，最多重试3次
        success = False
        for attempt in range(3):
            if download_file(file["url"], local_path):
                success = True
                break
            else:
                print(f"下载失败，{3-attempt-1}次重试机会...")
                time.sleep(2)
        
        if not success:
            print(f"下载 {file['name']} 失败，跳过")
    
    print(f"模型下载完成，保存在 {os.path.abspath(model_dir)}")

if __name__ == "__main__":
    print("开始下载BGE-Visualized模型...")
    download_bge_visualized() 