import os
import re
import json
import asyncio
import aiohttp
from enum import Enum
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from crawl4ai import *
from typing import List, Optional, Dict

class CacheMode(Enum):
    """缓存模式"""
    DISABLED = "disabled"  # 禁用缓存
    ENABLED = "enabled"    # 启用缓存
    FORCE_REFRESH = "force_refresh"  # 强制刷新缓存

@dataclass
class CrawlerRunConfig:
    """爬虫运行配置"""
    cache_mode: CacheMode = CacheMode.ENABLED
    cache_ttl: int = 3600  # 缓存有效期（秒）
    max_retries: int = 3   # 最大重试次数
    timeout: int = 30      # 请求超时时间（秒）
    delay: float = 0.5     # 请求间隔（秒）

@dataclass
class CrawlerResult:
    """爬虫结果"""
    url: str
    html: str
    markdown: str
    images: List[str]
    timestamp: datetime

class CacheManager:
    """缓存管理器"""
    
    def __init__(self, cache_dir: str = ".cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_cache_path(self, url: str) -> Path:
        """获取缓存文件路径"""
        import hashlib
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return self.cache_dir / f"{url_hash}.json"
    
    def get(self, url: str) -> Optional[CrawlerResult]:
        """获取缓存"""
        cache_path = self._get_cache_path(url)
        if not cache_path.exists():
            return None
            
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                cached_time = datetime.fromisoformat(data['timestamp'])
                if datetime.now() - cached_time > timedelta(seconds=data.get('ttl', 3600)):
                    return None
                    
                return CrawlerResult(
                    url=data['url'],
                    html=data['html'],
                    markdown=data['markdown'],
                    images=data['images'],
                    timestamp=cached_time
                )
        except Exception:
            return None
    
    def save(self, result: CrawlerResult, ttl: int = 3600):
        """保存缓存"""
        cache_path = self._get_cache_path(result.url)
        try:
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'url': result.url,
                    'html': result.html,
                    'markdown': result.markdown,
                    'images': result.images,
                    'timestamp': result.timestamp.isoformat(),
                    'ttl': ttl
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Cache save error: {str(e)}")

class AsyncWebCrawler:
    """异步网页爬虫"""
    
    def __init__(self):
        self.cache_manager = CacheManager()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass
    
    async def arun(self, url: str, config: Optional[CrawlerRunConfig] = None) -> Optional[CrawlerResult]:
        """运行爬虫"""
        if config is None:
            config = CrawlerRunConfig()
            
        # 检查缓存
        if config.cache_mode == CacheMode.ENABLED:
            cached = self.cache_manager.get(url)
            if cached:
                return cached
        
        try:
            # 使用crawl4ai爬取页面
            crawler_config = CrawlerRunConfig(
                cache_mode=CacheMode.ENABLED
            )
            
            async with AsyncWebCrawler() as crawler:
                result = await crawler.arun(
                    url=url,
                    config=crawler_config
                )
                
                if not result:
                    return None
                
                # 提取图片URL
                image_urls = await self._extract_image_urls(result.markdown)
                
                # 创建结果
                crawler_result = CrawlerResult(
                    url=url,
                    html=result.html,
                    markdown=result.markdown,
                    images=image_urls,
                    timestamp=datetime.now()
                )
                
                # 保存缓存
                if config.cache_mode == CacheMode.ENABLED:
                    self.cache_manager.save(crawler_result, config.cache_ttl)
                
                return crawler_result
                
        except Exception as e:
            print(f"Crawler error: {str(e)}")
            return None
    
    async def _extract_image_urls(self, markdown_text: str) -> List[str]:
        """从Markdown中提取图片URL"""
        image_pattern = r'!\[.*?\]\((.*?)\)'
        return re.findall(image_pattern, markdown_text)
    
    async def download_images(self, 
        image_urls: List[str], 
        save_dir: str,
        max_workers: int = 3
    ) -> List[str]:
        """下载图片"""
        save_dir = Path(save_dir)
        save_dir.mkdir(parents=True, exist_ok=True)
        
        async def download_image(session: aiohttp.ClientSession, url: str, index: int) -> Optional[str]:
            try:
                async with session.get(url) as response:
                    if response.status == 200:
                        content = await response.read()
                        ext = url.split('.')[-1].lower()
                        if ext not in ['jpg', 'jpeg', 'png', 'gif']:
                            ext = 'jpg'
                        
                        file_path = save_dir / f"image_{index}.{ext}"
                        with open(file_path, 'wb') as f:
                            f.write(content)
                        return str(file_path)
            except Exception as e:
                print(f"Download error for {url}: {str(e)}")
            return None
        
        async with aiohttp.ClientSession(headers=self.headers) as session:
            semaphore = asyncio.Semaphore(max_workers)
            
            async def download_with_semaphore(url: str, index: int):
                async with semaphore:
                    return await download_image(session, url, index)
            
            tasks = [
                download_with_semaphore(url, i) 
                for i, url in enumerate(image_urls)
            ]
            
            results = await asyncio.gather(*tasks)
            return [path for path in results if path]

# 使用示例：
# async def main():
#     # 配置爬虫
#     config = CrawlerRunConfig(
#         cache_mode=CacheMode.ENABLED
#     )
#     
#     # 创建保存目录
#     save_dir = "downloaded_images"
#     os.makedirs(save_dir, exist_ok=True)
#     
#     # 运行爬虫
#     async with AsyncWebCrawler() as crawler:
#         result = await crawler.arun(
#             url="https://example.com",
#             config=config
#         )
#         
#         if result and result.markdown:
#             print(f"Found {len(result.images)} images")
#             
#             # 下载图片
#             downloaded_paths = await crawler.download_images(
#                 image_urls=result.images,
#                 save_dir=save_dir
#             )
#             
#             print(f"Successfully downloaded {len(downloaded_paths)} images")
