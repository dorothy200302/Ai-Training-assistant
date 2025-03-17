import os
import torch
from transformers import AutoModel, AutoProcessor
import shutil

def download_model():
    print("开始下载BGE-Visualized模型...")
    
    # 设置模型保存路径
    model_path = "pretrained_model/bge-visualized-new"
    os.makedirs(model_path, exist_ok=True)
    
    try:
        # 使用transformers库下载模型
        print("下载模型文件...")
        model = AutoModel.from_pretrained("BAAI/bge-visualized", trust_remote_code=True)
        model.save_pretrained(model_path)
        
        print("下载处理器文件...")
        processor = AutoProcessor.from_pretrained("BAAI/bge-visualized", trust_remote_code=True)
        processor.save_pretrained(model_path)
        
        print(f"模型下载完成，保存在 {os.path.abspath(model_path)}")
        
        # 复制已有的.pth文件到新目录
        pth_files = [
            "Visualized_m3.pth",
            "Visualized_base_en_v1.5.pth"
        ]
        
        old_model_path = "pretrained_model/bge-visualized"
        for pth_file in pth_files:
            old_file_path = os.path.join(old_model_path, pth_file)
            new_file_path = os.path.join(model_path, pth_file)
            
            if os.path.exists(old_file_path) and not os.path.exists(new_file_path):
                print(f"复制 {pth_file} 到新目录...")
                shutil.copy2(old_file_path, new_file_path)
        
        # 重命名目录
        if os.path.exists(old_model_path + "_backup"):
            shutil.rmtree(old_model_path + "_backup")
        
        os.rename(old_model_path, old_model_path + "_backup")
        os.rename(model_path, old_model_path)
        
        print("模型目录已更新")
        
    except Exception as e:
        print(f"下载过程中出错: {e}")
        return False
    
    return True

if __name__ == "__main__":
    download_model() 