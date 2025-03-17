import os
import torch
from PIL import Image
import sys
from transformers import AutoTokenizer
import numpy as np

# 添加src目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

# 导入Visualized_BGE
from src.visual_bge.modeling import Visualized_BGE

class VisualBGEModel:
    def __init__(self, model_path):
        """初始化模型"""
        print(f"初始化模型: {model_path}")
        
        # 检查模型文件
        if os.path.exists(os.path.join(model_path, "Visualized_m3.pth")):
            model_name = "bge-m3"
            model_weight = os.path.join(model_path, "Visualized_m3.pth")
            print(f"使用 {model_name} 模型")
        elif os.path.exists(os.path.join(model_path, "Visualized_base_en_v1.5.pth")):
            model_name = "bge-base-en-v1.5"
            model_weight = os.path.join(model_path, "Visualized_base_en_v1.5.pth")
            print(f"使用 {model_name} 模型")
        else:
            raise FileNotFoundError("找不到模型权重文件")
        
        # 加载模型
        self.model = Visualized_BGE(
            model_name_bge=model_name,
            model_weight=model_weight,
            normlized=True
        )
        
        # 设置为评估模式
        self.model.eval()
        if torch.cuda.is_available():
            self.model = self.model.cuda()
            print("使用GPU进行推理")
        else:
            print("使用CPU进行推理")
        
        # 加载分词器
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=False)
            print("分词器加载成功")
        except Exception as e:
            print(f"分词器加载失败: {e}")
            # 使用备用方法
            if "bge-base-en-v1.5" in model_name:
                self.tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-base-en-v1.5", use_fast=False)
            else:
                self.tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-large-en-v1.5", use_fast=False)
            print("使用备用分词器")
    
    def encode_text(self, texts):
        """编码文本"""
        with torch.no_grad():
            text_embeddings = self.model.encode_text(texts)
        return text_embeddings
    
    def encode_image(self, image):
        """编码图像"""
        with torch.no_grad():
            # 预处理图像
            image_tensor = self.model.img_processor(image).unsqueeze(0)
            if torch.cuda.is_available():
                image_tensor = image_tensor.cuda()
            
            # 编码图像
            image_embeddings = self.model.encode_image(image_tensor)
        return image_embeddings
    
    def encode_multimodal(self, image, text):
        """编码多模态输入（图像+文本）"""
        with torch.no_grad():
            # 预处理图像
            image_tensor = self.model.img_processor(image).unsqueeze(0)
            if torch.cuda.is_available():
                image_tensor = image_tensor.cuda()
            
            # 编码多模态输入
            embeddings = self.model.encode_mm(image_tensor, [text])
        return embeddings
    
    def compute_similarity(self, query_embedding, doc_embeddings):
        """计算相似度"""
        # 确保输入是numpy数组
        if isinstance(query_embedding, torch.Tensor):
            query_embedding = query_embedding.cpu().numpy()
        if isinstance(doc_embeddings, torch.Tensor):
            doc_embeddings = doc_embeddings.cpu().numpy()
        
        # 计算余弦相似度
        similarity = np.dot(doc_embeddings, query_embedding.T)
        return similarity

def test_model():
    """测试模型"""
    model_path = "pretrained_model/bge-visualized"
    
    try:
        # 初始化模型
        model = VisualBGEModel(model_path)
        
        # 测试文本编码
        text = "这是一个测试文本"
        text_embedding = model.encode_text([text])
        print(f"文本嵌入形状: {text_embedding.shape}")
        
        # 测试图像编码
        test_image_path = os.path.join(model_path, "imgs/cir_query.png")
        if os.path.exists(test_image_path):
            image = Image.open(test_image_path).convert("RGB")
            image_embedding = model.encode_image(image)
            print(f"图像嵌入形状: {image_embedding.shape}")
            
            # 测试多模态编码
            multimodal_embedding = model.encode_multimodal(image, text)
            print(f"多模态嵌入形状: {multimodal_embedding.shape}")
        
        print("模型测试成功!")
        return True
    
    except Exception as e:
        print(f"测试过程中出错: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_model() 