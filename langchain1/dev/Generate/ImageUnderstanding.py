import os
import io
import base64
import json
import asyncio
from PIL import Image
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from typing import Optional, List, Dict
from openai import OpenAI
import os
from PIL import Image
import base64
import io
import logging  # 添加日志模块
import concurrent.futures

def encode_image_to_base64(image):
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

class ImageUnderstanding:
    """图像理解模块，用于分析和理解图片内容"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        初始化图像理解模块
        
        Args:
            api_key: ModelScope API密钥，如果不提供则使用默认密钥
        """
        # 添加日志记录器
        self.logger = logging.getLogger(__name__)
        
        # 配置日志（如果尚未配置）
        if not self.logger.handlers:
            logging.basicConfig(
                level=logging.INFO,
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                handlers=[
                    logging.StreamHandler(),
                    logging.FileHandler('image_understanding.log')
                ]
            )
        
        self.api_key = api_key or '4e50e771-be7e-4a53-aef0-e8e5a982684d'
        self.client = OpenAI(
            base_url='https://api-inference.modelscope.cn/v1/',
            api_key=self.api_key
        )
        
    async def analyze_image(self, 
        image_path: str, 
        max_retries: int = 3,
        timeout: int = 60
    ) -> Dict:
        """
        分析图片内容
        
        Args:
            image_path: 图片文件路径
            max_retries: 最大重试次数
            timeout: API调用超时时间（秒）
            
        Returns:
            Dict: 包含图片分析结果的字典
        """
        try:
            # 读取并预处理图片
            base64_image = await self._preprocess_image(image_path)
            
            # 调用API分析图片
            response = await self._call_api(base64_image, timeout)
            response=json.loads(response)
            response['path']=image_path
            print("response:{}",response)
            
            # 解析响应
            return self._parse_response(response)
            
        except Exception as e:
            raise Exception(f"Image analysis error: {str(e)}")
    
    async def _preprocess_image(self, image_path: str) -> str:
        """
        预处理图片并转换为base64
        
        Args:
            image_path: 图片文件路径
            
        Returns:
            str: base64编码的图片数据
        """
        try:
            with Image.open(image_path) as img:
                # 转换为RGB模式
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # 转换为base64
                buffered = io.BytesIO()
                img.save(buffered, format="JPEG")
                return base64.b64encode(buffered.getvalue()).decode('utf-8')
                
        except Exception as e:
            raise Exception(f"Image preprocessing error: {str(e)}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )

    def batch_analyze_images_sync(self, image_paths: List[str], max_workers: int = 4) -> Dict[str, Dict]:
        """
        并行同步批量分析图片的方法
        
        Args:
            image_paths (List[str]): 图片路径列表
            max_workers (int): 最大并行工作线程数
        
        Returns:
            Dict[str, Dict]: 图片路径到分析结果的映射
        """
        results = {}
        
        # 使用线程池进行并行处理
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 为每个图片路径创建一个分析任务
            future_to_path = {
                executor.submit(self.analyze_image_sync, path): path 
                for path in image_paths
            }
            
            # 收集结果
            for future in concurrent.futures.as_completed(future_to_path):
                path = future_to_path[future]
                try:
                    result = future.result()
                    results[path] = result
                except Exception as e:
                    self.logger.error(f"分析图片 {path} 失败: {e}")
                    results[path] = {
                        "type": "error", 
                        "content": str(e)
                    }
        
        return results

    def analyze_image_sync(self, image_path: str) -> Dict:
        """
        同步分析单张图像的方法
        
        Args:
            image_path (str): 图像路径
        
        Returns:
            Dict: 图像分析结果
        """
        try:
            # 使用同步方法处理图像分析
            base64_image = self._preprocess_image_sync(image_path)
            response = self._call_api_sync(base64_image, timeout=60)
            
            # 解析响应
            result = self._parse_response(response)
            result['path'] = image_path
            
            return result
        
        except Exception as e:
            self.logger.error(f"图像 {image_path} 分析失败: {e}")
            return {
                "type": "error", 
                "content": str(e),
                "path": image_path
            }
    def get_image_answer(self, image_path: str, question: str) -> Dict:
        """
        传入图像地址和问句，获取回答
        
        Args:
            image_path (str): 图像路径
            question (str): 问题内容
            
        Returns:
            Dict: 回答结果
        """
        try:
            # 预处理图像
            base64_image = self._preprocess_image_sync(image_path)
            
            # 调用API
            try:
                response = self.client.chat.completions.create(
                    model='Qwen/Qwen2.5-VL-7B-Instruct',
                    messages=[{
                        'role': 'user',
                        'content': [{
                            'type': 'text',
                            'text': question
                        }, {
                            'type': 'image_url',
                            'image_url': {
                                'url': f"data:image/jpeg;base64,{base64_image}"
                            }
                        }]
                    }],
                    timeout=60
                )
                
                # 解析响应
                answer = response.choices[0].message.content
                return {
                    "status": "success",
                    "answer": answer,
                    "path": image_path
                }
                
            except Exception as e:
                self.logger.error(f"API调用失败: {e}")
                return {
                    "status": "error",
                    "error": f"API调用失败: {str(e)}",
                    "path": image_path
                }
                
        except Exception as e:
            self.logger.error(f"图像 {image_path} 处理失败: {e}")
            return {
                "status": "error",
                "error": str(e),
                "path": image_path
            }

    def _preprocess_image_sync(self, image_path: str) -> str:
        """
        同步预处理图片并转换为base64
        
        Args:
            image_path: 图片文件路径
            
        Returns:
            str: base64编码的图片数据
        """
        try:
            with Image.open(image_path) as img:
                # 转换为RGB模式
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # 转换为base64
                buffered = io.BytesIO()
                img.save(buffered, format="JPEG")
                return base64.b64encode(buffered.getvalue()).decode('utf-8')
                
        except Exception as e:
            raise Exception(f"Image preprocessing error: {str(e)}")

    def _call_api_sync(self, base64_image: str, timeout: int) -> Dict:
        """
        同步调用ModelScope API
        
        Args:
            base64_image: base64编码的图片数据
            timeout: API调用超时时间
            
        Returns:
            Dict: API响应数据
        """
        try:
            response = self.client.chat.completions.create(
                model='Qwen/Qwen2.5-VL-7B-Instruct',
                messages=[{
                    'role': 'user',
                    'content': [{
                        'type': 'text',
                        'text': '请详细描述这张图片的内容，包括：它是否是一张图表，如果是，请描述图表的类型、数据和图表的含义。如果不是，请描述图片的内容、场景、活动等。使用json格式返回,格式为：{"type": "chart", "content": "图表内容描述"}或{"type": "image", "content": "图片内容描述"}'
                    }, {
                        'type': 'image_url',
                        'image_url': {
                            'url': f"data:image/jpeg;base64,{base64_image}"
                        }
                    }]
                }],
                stream=False,
                timeout=timeout
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"API call error: {str(e)}")
    
    def _parse_response(self, response: str) -> Dict:
        """
        解析API响应
        
        Args:
            response: API响应文本
            
        Returns:
            Dict: 解析后的响应数据
        """
        try:
            # 尝试解析JSON响应
            if isinstance(response, str):
                return json.loads(response)
           
        except json.JSONDecodeError:
            # 如果无法解析为JSON，返回原始响应
            return {
                "type": "unknown",
                "content": response
            }
    
    # async def batch_analyze_images(self, 
    #     image_paths: list[str],
    #     max_workers: int = 3
    # ) -> Dict[str, Dict]:
    #     """
    #     批量分析图片
        
    #     Args:
    #         image_paths: 图片文件路径列表
    #         max_workers: 最大并发数
            
    #     Returns:
    #         Dict[str, Dict]: 图片路径到分析结果的映射
    #     """
    #     results = {}
    #     semaphore = asyncio.Semaphore(max_workers)
        
    #     async def analyze_with_semaphore(path: str):
    #         async with semaphore:
    #             try:
    #                 result = await self.analyze_image(path)
    #                 results[path] = result
    #             except Exception as e:
    #                 results[path] = {
    #                     "type": "error",
    #                     "content": str(e)
    #                 }
        
    #     tasks = [analyze_with_semaphore(path) for path in image_paths]
    #     await asyncio.gather(*tasks)
        
    #     return results

# # 如果直接运行此脚本进行测试
# if __name__ == "__main__":
    
    
#     # 获取图像路径
#     image_paths = [r"C:\Users\dorot\Desktop\crawl爬虫\downloaded_document_images\image_14.jpg",r"C:\Users\dorot\Desktop\crawl爬虫\downloaded_document_images\image_18.jpg"]
#     # path=r"C:\Users\dorot\Desktop\crawl爬虫\downloaded_document_images\image_14.jpg"
#     # 创建图像分析器
#     analyzer = ImageUnderstanding()
    
#     # 运行主程序
#     def main():
#         # results=await analyzer.analyze_single_image(path)
#         results = analyzer.batch_analyze_images_sync(image_paths)
        
#     # 遍历结果
#         for path, result in results.items():
#             print(f"图片 {path} 的分析结果: {result}")
    
#     # 运行异步主程序
#     main()
    
#     # 批量分析图片
#     # image_paths = [r"C:\Users\dorot\Desktop\crawl爬虫\downloaded_document_images\image_14.jpg"]
#     # results = await image_analyzer.batch_analyze_images(image_paths)
#     # for path, result in results.items():
#     #     print(f"{path}: {result}")

# analyzer = ImageUnderstanding()
# answer=analyzer.get_image_answer(r"C:\Users\dorot\Desktop\crawl爬虫\downloaded_document_images\images\image_10.jpg","告诉我一线城市的高收入是大于多少元,二线城市是多少,三线城市是多少?")
# print(answer)