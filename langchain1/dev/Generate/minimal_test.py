import os
import sys
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../.."))
sys.path.insert(0, project_root)

# 导入所需的类和函数
try:
    # 直接导入TrainingDocGenerator
    from langchain1.dev.Generate.TrainingDocGenerator import TrainingDocGenerator
    logger.info("成功导入TrainingDocGenerator")
    
    # 打印类信息
    logger.info(f"TrainingDocGenerator文档: {TrainingDocGenerator.__doc__}")
    
except Exception as e:
    logger.error(f"导入错误: {str(e)}")
    import traceback
    logger.error(traceback.format_exc())

if __name__ == "__main__":
    logger.info("测试脚本完成") 