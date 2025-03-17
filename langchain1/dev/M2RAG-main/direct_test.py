import os
import sys
import torch
from PIL import Image
import matplotlib.pyplot as plt

# 添加src目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

def main():
    print("测试BGE-Visualized模型...")
    
    # 导入Visualized_BGE
    from src.visual_bge.modeling import Visualized_BGE
    
    # 设置参数
    model_path = "pretrained_model/bge-visualized"
    config_path = os.path.join(model_path, "config")
    
    # 检查模型文件
    if os.path.exists(os.path.join(model_path, "Visualized_m3.pth")):
        model_weight = os.path.join(model_path, "Visualized_m3.pth")
        print(f"使用 Visualized_m3.pth 模型权重")
        hidden_dim = 1024
    elif os.path.exists(os.path.join(model_path, "Visualized_base_en_v1.5.pth")):
        model_weight = os.path.join(model_path, "Visualized_base_en_v1.5.pth")
        print(f"使用 Visualized_base_en_v1.5.pth 模型权重")
        hidden_dim = 768
    else:
        print("找不到模型权重文件")
        return
    
    try:
        # 加载模型
        print("加载模型...")
        
        # 直接使用本地配置文件路径
        model = Visualized_BGE(
            model_name_bge="bge-m3" if "m3" in model_weight else "bge-base-en-v1.5",
            model_weight=model_weight,
            normlized=True,
            from_pretrained=config_path
        )
        
        # 设置为评估模式
        model.eval()
        if torch.cuda.is_available():
            model = model.cuda()
            print("使用GPU进行推理")
        else:
            print("使用CPU进行推理")
        
        # 测试文本编码
        print("\n测试文本编码...")
        text = "这是一个测试文本"
        with torch.no_grad():
            try:
                # 使用tokenizer处理文本
                text_tokens = model.tokenizer([text], return_tensors="pt", padding=True, truncation=True, max_length=512)
                text_embedding = model.encode_text(text_tokens)
                print(f"文本嵌入形状: {text_embedding.shape}")
            except Exception as e:
                print(f"文本编码失败: {e}")
                import traceback
                traceback.print_exc()
        
        # 测试图像编码
        test_image_path = os.path.join("src", "imgs", "cir_query.png")
        if not os.path.exists(test_image_path):
            test_image_path = os.path.join(model_path, "imgs", "cir_query.png")
        
        if os.path.exists(test_image_path):
            print(f"\n测试图像编码... 使用图像: {test_image_path}")
            image = Image.open(test_image_path).convert("RGB")
            
            # 显示测试图像
            plt.figure(figsize=(5, 5))
            plt.imshow(image)
            plt.title("测试图像")
            plt.axis("off")
            plt.show()
            
            # 预处理图像
            try:
                image_tensor = model.preprocess_val(image).unsqueeze(0)
                if torch.cuda.is_available():
                    image_tensor = image_tensor.cuda()
                
                # 编码图像
                with torch.no_grad():
                    image_embedding = model.encode_image(image_tensor)
                    print(f"图像嵌入形状: {image_embedding.shape}")
            except Exception as e:
                print(f"图像编码失败: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"测试图像文件不存在: {test_image_path}")
        
        print("\n模型测试完成!")
        
    except Exception as e:
        print(f"测试过程中出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()