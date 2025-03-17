from huggingface_hub import snapshot_download
import os

# 确保目录存在
os.makedirs("pretrained_model", exist_ok=True)

# 下载VISTA模型
print("开始下载VISTA模型...")
model_path = snapshot_download(
    repo_id="BAAI/VISTA", 
    local_dir="pretrained_model",
    ignore_patterns=["*.bin", "*.safetensors"]  # 忽略大文件
)
print(f"模型已下载到: {model_path}") 