import os
import sys
import torch
import argparse
from PIL import Image
import matplotlib.pyplot as plt

print("脚本开始执行...")

# 添加src目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))
print(f"Python路径: {sys.path}")

def main():
    print("测试BGE-Visualized模型...")
    
    # 设置参数
    model_path = "pretrained_model/bge-visualized"
    print(f"模型路径: {model_path}")
    
    # 检查模型文件
    if os.path.exists(os.path.join(model_path, "Visualized_m3.pth")):
        model_name = "BAAI/bge-base-en-v1.5"  # 使用公共模型名称
        model_weight = os.path.join(model_path, "Visualized_m3.pth")
        print(f"使用 Visualized_m3.pth 模型权重")
    elif os.path.exists(os.path.join(model_path, "Visualized_base_en_v1.5.pth")):
        model_name = "BAAI/bge-base-en-v1.5"  # 使用公共模型名称
        model_weight = os.path.join(model_path, "Visualized_base_en_v1.5.pth")
        print(f"使用 Visualized_base_en_v1.5.pth 模型权重")
    else:
        print("找不到模型权重文件")
        return
    
    # 创建参数对象
    args = argparse.Namespace()
    args.model_name = model_name
    args.model_weight = model_weight
    args.data_dir = "."  # 当前目录
    
    try:
        # 导入必要的模块
        print("导入必要的模块...")
        from src.visual_bge.modeling import Visualized_BGE
        from transformers import AutoTokenizer
        
        # 加载模型
        print("加载模型...")
        model = Visualized_BGE(
            model_name_bge=args.model_name,
            model_weight=args.model_weight,
            normlized=True
        )
        model.eval()
        if torch.cuda.is_available():
            model = model.cuda()
            print("使用GPU进行推理")
        else:
            print("使用CPU进行推理")
        
        # 加载分词器
        tokenizer = AutoTokenizer.from_pretrained(args.model_name, use_fast=False)
        
        # 测试文本编码
        print("\n测试文本编码...")
        text = "这是一个测试文本"
        with torch.no_grad():
            text_embedding = model.encode_text([text])
            print(f"文本嵌入形状: {text_embedding.shape}")
        
        # 测试图像编码
        test_image_path = os.path.join(model_path, "imgs/cir_query.png")
        if os.path.exists(test_image_path):
            print("\n测试图像编码...")
            image = Image.open(test_image_path).convert("RGB")
            
            # 显示测试图像
            plt.figure(figsize=(5, 5))
            plt.imshow(image)
            plt.title("测试图像")
            plt.axis("off")
            plt.show()
            
            # 预处理图像
            image_tensor = model.img_processor(image).unsqueeze(0)
            if torch.cuda.is_available():
                image_tensor = image_tensor.cuda()
            
            # 编码图像
            with torch.no_grad():
                image_embedding = model.encode_image(image_tensor)
                print(f"图像嵌入形状: {image_embedding.shape}")
        
        print("\n模型测试成功!")
        
    except Exception as e:
        print(f"测试过程中出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("执行main函数...")
    main() 