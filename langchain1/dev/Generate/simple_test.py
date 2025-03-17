import asyncio
import os
import sys
import logging
from typing import List

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 直接从当前目录导入
try:
    from AsyncTrainingDocGenerator import AsyncTrainingDocGenerator
    logger.info("成功导入AsyncTrainingDocGenerator")
except Exception as e:
    logger.error(f"导入错误: {str(e)}")
    import traceback
    logger.error(traceback.format_exc())

def main():
    logger.info("测试脚本开始运行")
    try:
        # 打印AsyncTrainingDocGenerator类的文档字符串
        logger.info(f"AsyncTrainingDocGenerator文档: {AsyncTrainingDocGenerator.__doc__}")
        logger.info("测试成功")
    except Exception as e:
        logger.error(f"测试过程中出错: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    main() 