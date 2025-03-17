import os
import subprocess
import sys

def run_command(command):
    """运行命令并实时输出结果"""
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        shell=True,
        universal_newlines=True
    )
    
    for line in process.stdout:
        print(line, end='')
    
    process.wait()
    return process.returncode

def clone_model(repo_id, target_dir):
    """克隆模型仓库"""
    # 确保目录存在
    os.makedirs(target_dir, exist_ok=True)
    
    # 构建git命令
    git_command = f'git clone https://hf-mirror.com/{repo_id} {target_dir}'
    
    print(f"正在从镜像站点克隆 {repo_id} 到 {target_dir}...")
    return run_command(git_command)

if __name__ == "__main__":
    # 设置模型ID和目标目录
    model_id = "BAAI/bge-visualized"
    target_dir = "pretrained_model/bge-visualized"
    
    # 克隆模型
    result = clone_model(model_id, target_dir)
    
    if result == 0:
        print(f"模型克隆成功，保存在 {os.path.abspath(target_dir)}")
    else:
        print(f"模型克隆失败，退出代码: {result}")
        sys.exit(1) 