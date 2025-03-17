import asyncio
import os
import sys
import logging
from typing import List

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../.."))
sys.path.insert(0, project_root)

# 使用相对导入
from langchain1.dev.Generate.AsyncTrainingDocGenerator import AsyncTrainingDocGenerator

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_generator():
    # 测试文件路径
    file_paths = [
        # 添加您的测试文件路径，例如：
        # "path/to/your/test/document.pdf",
        # "path/to/your/test/document.docx",
        r"C:\Users\dorot\Desktop\crawl爬虫\downloaded_document_images\google：智能体白皮书(翻译校对).pdf"
    ]
    
    # 背景信息
    background_info = {
        "project_title": "测试项目",
        "target_audience": "开发人员",
        "learning_objectives": "了解agent的功能",
        "key_topics": "工具, 记忆力, 图像检索",
        "preferred_style": "技术性, 详细"
    }
    
    # 初始化生成器
    generator = AsyncTrainingDocGenerator(
        file_paths=file_paths,
        background_informations=background_info,
        model_name="gpt-3.5-turbo",
        user_email="test@example.com"
    )
    
    try:
        # 初始化向量存储
        await generator.initialize_vector_store()
        
        # 生成培训大纲
        outline = await generator.generate_training_outline()
        logger.info(f"生成的大纲:\n{outline}")
        
        # 生成完整文档
        full_doc = await generator.generate_full_training_doc_async(outline)
        logger.info(f"生成的文档长度: {len(full_doc)} 字符")
        
        # 保存文档
        saved_path = await generator.save_full_doc(full_doc)
        logger.info(f"文档已保存到: {saved_path}")
        
        # 获取使用统计
        stats = generator.get_usage_statistics()
        logger.info(f"使用统计: {stats}")
        
    except Exception as e:
        logger.error(f"测试过程中出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(test_generator()) 