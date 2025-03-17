import os
import sys
import logging
import traceback

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 获取当前文件的目录
current_dir = os.path.dirname(os.path.abspath(__file__))

try:
    # 尝试直接导入TrainingDocGenerator
    logger.info("尝试导入TrainingDocGenerator...")
    from TrainingDocGenerator import TrainingDocGenerator
    logger.info("成功导入TrainingDocGenerator!")
    
    # 打印TrainingDocGenerator的文档字符串
    logger.info(f"TrainingDocGenerator文档: {TrainingDocGenerator.__doc__}")
    
    # 尝试创建TrainingDocGenerator实例
    logger.info("尝试创建TrainingDocGenerator实例...")
    generator = TrainingDocGenerator(
        file_paths=["test.txt"],
        model_name="gpt-3.5-turbo",
        background_informations={
            "project_title": "测试项目",
            "target_audience": "开发人员",
            "learning_objectives": "测试目标",
            "key_topics": "测试主题",
            "preferred_style": "技术性"
        }
    )
    logger.info("成功创建TrainingDocGenerator实例!")
    
    # 尝试导入AsyncTrainingDocGenerator
    logger.info("尝试导入AsyncTrainingDocGenerator...")
    from AsyncTrainingDocGenerator import AsyncTrainingDocGenerator
    logger.info("成功导入AsyncTrainingDocGenerator!")
    
    # 打印AsyncTrainingDocGenerator的文档字符串
    logger.info(f"AsyncTrainingDocGenerator文档: {AsyncTrainingDocGenerator.__doc__}")
    
except Exception as e:
    logger.error(f"测试过程中出错: {str(e)}")
    logger.error(f"错误详情: {traceback.format_exc()}")

if __name__ == "__main__":
    logger.info("测试脚本开始执行")
    try:
        logger.info("测试完成")
    except Exception as e:
        logger.error(f"测试过程中出错: {str(e)}") 