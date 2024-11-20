import asyncio
import aiohttp
import os
from datetime import datetime
from fastapi.testclient import TestClient
import pytest
from pathlib import Path
import sys

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# 现在可以导入dev模块了
from dev.CloudStorage.aws_api import app

class TestAPI:
    @pytest.fixture
    def test_files(self):
        """准备测试文件"""
        file_paths = [
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach marketing · Resend.pdf",
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we evolve our knowledge base · Resend.pdf",
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we help users · Resend.pdf",
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach CI_CD · Resend.html",
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we scale support · Resend.pdf",
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about swag · Resend.pdf",
        ]
        return [
            ('files', open(f, 'rb'))
            for f in file_paths
            if os.path.exists(f)
        ]

    @pytest.fixture
    def test_description(self):
        """准备测试描述信息"""
        return {
             "audience_info": "主要受众:abc集团新入职员工,受众特点:年轻化，学历高，学习能力强",
            "company_name": "123",
            "company_culture": "客户第一，团队合作，拥抱变化，诚信，激情，敬业",
            "company_industry": "互联网",
            "company_competition": "行业领先",
            "user_role": "市场营销经",
            "industry_info": "互联网",
            "project_title": "市场营销经理",
            "project_dutys": "负责公司市场营销策略的制定和执行",
            "project_goals": "了解公司市场营销策略的制定和执行",
            "project_theme": "了解公司市场营销策略的制定和执行",
            "project_aim": "了解公司市场营销策略的制定和执行",
            "content_needs": "市场营销策略的制定和执行",
            "format_style": " "
        }

    async def test_generate_outline_with_doc(self, test_files):
        """测试生成大纲接口"""
        async with aiohttp.ClientSession() as session:
            url = 'http://localhost:8000/generate_outline_with_doc/'
            
            # 准备文件和表单数据
            data = aiohttp.FormData()
            for file_tuple in test_files:
                data.add_field(*file_tuple)
            data.add_field('description', str(self.test_description()))
            data.add_field('model_name', 'chatgpt-4o-mini')
            
            # 发送请求
            async with session.post(url, data=data) as response:
                assert response.status == 200
                result = await response.json()
                assert 'outline' in result
                print(f"生成的大纲: {result['outline']}")
                return result['outline']

    async def test_generate_outline_and_upload(self, test_files):
        """测试生成大纲并上传接口"""
        async with aiohttp.ClientSession() as session:
            url = 'http://localhost:8000/generate_outline_and_upload/'
            
            data = aiohttp.FormData()
            for file_tuple in test_files:
                data.add_field(*file_tuple)
            data.add_field('description', str(self.test_description()))
            data.add_field('model_name', 'chatgpt-4o-mini')
            
            async with session.post(url, data=data) as response:
                assert response.status == 200
                result = await response.json()
                assert 'outline' in result
                assert 'urls' in result
                print(f"上传的URL: {result['urls']}")
                return result

    async def test_generate_full_doc(self, test_files):
        """测试生成完整文档接口"""
        # 先获取大纲
        outline = await self.test_generate_outline_with_doc(test_files)
        
        async with aiohttp.ClientSession() as session:
            url = 'http://localhost:8000/generate_full_doc_with_doc_and_upload/'
            
            data = {
                "outline": outline,
                "user_id": "test_user",
                "description": str(self.test_description()),
                "model_name": "chatgpt-4o-mini"
            }
            
            async with session.post(url, json=data) as response:
                assert response.status == 200
                result = await response.json()
                assert 'full_doc' in result
                print(f"生成的文档长度: {len(result['full_doc'])}")
                return result

async def main():
    """运行所有测试"""
    test_instance = TestAPI()
    
    # 创建测试记录目录
    test_dir = Path("test_results")
    test_dir.mkdir(exist_ok=True)
    
    # 记录开始时间
    start_time = datetime.now()
    timestamp = start_time.strftime("%Y%m%d_%H%M%S")
    
    try:
        # 运行测试
        test_files = test_instance.test_files()
        
        # print("1. 测试生成大纲...")
        # outline_result = await test_instance.test_generate_outline_with_doc(test_files)
        
        print("\n2. 测试生成大纲并上传...")
        upload_result = await test_instance.test_generate_outline_and_upload(test_files)
        
        # print("\n3. 测试生成完整文档...")
        # doc_result = await test_instance.test_generate_full_doc(test_files)
        
        # 保存测试结果
        results_file = test_dir / f"test_results_{timestamp}.txt"
        with open(results_file, 'w', encoding='utf-8') as f:
            f.write(f"测试开始时间: {start_time}\n")
            f.write(f"测试结束时间: {datetime.now()}\n")
            f.write("\n=== 大纲生成测试 ===\n")
            f.write(str(outline_result))
            f.write("\n\n=== 上传测试 ===\n")
            f.write(str(upload_result))
            f.write("\n\n=== 文档生成测试 ===\n")
            f.write(str(doc_result))
        
        print(f"\n测试结果已保存到: {results_file}")
        
    except Exception as e:
        print(f"测试过程中出现错误: {str(e)}")
        raise
    finally:
        # 清理测试文件
        for file_tuple in test_files:
            file_tuple[1].close()

if __name__ == "__main__":
    asyncio.run(main()) 