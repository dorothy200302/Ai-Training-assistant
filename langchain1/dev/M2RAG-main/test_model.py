import os
import sys
import torch
from PIL import Image
import matplotlib.pyplot as plt

# 添加src目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

def test_model():
    print("测试BGE-Visualized模型...")
    
    # 检查模型文件是否存在
    model_dir = "pretrained_model/bge-visualized"
    model_files = [
        "Visualized_m3.pth",
        "Visualized_base_en_v1.5.pth"
    ]
    
    missing_files = []
    for file in model_files:
        file_path = os.path.join(model_dir, file)
        if not os.path.exists(file_path):
            missing_files.append(file)
    
    if missing_files:
        print(f"警告: 以下文件不存在: {', '.join(missing_files)}")
        print("模型可能无法正常工作")
    
    try:
        # 导入VisualBGEModel
        from src.get_emb import VisualBGEModel
        
        # 尝试加载模型
        print("加载模型...")
        
        model = VisualBGEModel(model_dir)
        print("模型加载成功!")
        
        # 测试文本编码
        print("\n测试文本编码...")
        text = "这是一个测试文本"
        text_embedding = model.encode_text([text])
        
        print(f"文本嵌入形状: {text_embedding.shape}")
        
        # 测试图像编码（如果有测试图像）
        test_image_path = os.path.join(model_dir, "imgs/cir_query.png")
        if os.path.exists(test_image_path):
            print("\n测试图像编码...")
            image = Image.open(test_image_path).convert("RGB")
            
            # 显示测试图像
            plt.figure(figsize=(5, 5))
            plt.imshow(image)
            plt.title("测试图像")
            plt.axis("off")
            plt.show()
            
            # 编码图像
            image_embedding = model.encode_image(image)
            
            print(f"图像嵌入形状: {image_embedding.shape}")
        
        print("\n模型测试完成!")
        return True
        
    except Exception as e:
        print(f"测试过程中出错: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_model() 