import asyncio
import aiohttp
import os
from datetime import datetime
from pathlib import Path
import sys
import uvicorn
import multiprocessing
import time
import json
import traceback
from fastapi import UploadFile

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from dev.CloudStorage.aws_api import app, generate_outline_and_upload

# 定义测试类
class TestAPI:
    def __init__(self):
        self.description = {
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

    async def generate_outline_and_upload(self, test_files):
        """测试生成大纲并上传接口"""
        async with aiohttp.ClientSession() as session:
            url = 'http://localhost:8000/generate_outline_and_upload/'
            data = aiohttp.FormData()
            
            # 添加文件
            for file_tuple in test_files:
                data.add_field(*file_tuple)
            
            # 添加必要的参数
            data.add_field('description', str(self.description))
            data.add_field('model_name', 'chatgpt-4o-mini')
            data.add_field('user_id', 'test_user')  # 添加user_id参数
            
            try:
                # 发送请求
                async with session.post(url, data=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        print(f"API错误: {error_text}")
                        raise Exception(f"API返回错误状态码: {response.status}")
                    
                    result = await response.json()
                    print(f"API响应状态码: {response.status}")
                    print(f"API响应内容: {result}")
                    return result
            except aiohttp.ClientError as e:
                print(f"请求失败: {str(e)}")
                raise

def run_server():
    """在单独的进程中运行服务器"""
    uvicorn.run(app, host="0.0.0.0", port=8000)

async def wait_for_server(max_attempts=5):
    """等待服务器启动"""
    async with aiohttp.ClientSession() as session:
        for i in range(max_attempts):
            try:
                async with session.get('http://localhost:8000/docs') as response:
                    if response.status == 200:
                        return True
            except aiohttp.ClientError:
                print(f"等待服务器启动... ({i+1}/{max_attempts})")
                await asyncio.sleep(2)
        return False

async def main():
    """运行所有测试"""
    test_instance = TestAPI()
    test_files = []
    server_process = None
    
    try:
        # 启动服务器进程
        server_process = multiprocessing.Process(target=run_server)
        server_process.start()
        
        # 等待服务器启动
        print("正在启动服务器...")
        if not await wait_for_server():
            raise Exception("服务器启动失败")
        
        # 创建测试记录目录
        test_dir = Path("test_results")
        test_dir.mkdir(exist_ok=True)
        
        # 记录开始时间
        start_time = datetime.now()
        timestamp = start_time.strftime("%Y%m%d_%H%M%S")
        
        # 准备测试文件
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
        
        # 查文件是否存在并打开
        for f in file_paths:
            if os.path.exists(f):
                try:
                    test_files.append(('files', open(f, 'rb')))
                    print(f"成功加载文件: {f}")
                except Exception as e:
                    print(f"打开文件失败 {f}: {str(e)}")
        
        if not test_files:
            raise ValueError("没有找到有效的测试文件！")
            
        print(f"\n找到 {len(test_files)} 个测试文件")
        print("\n2. 测试生成大纲并上传...")
        upload_result = await test_instance.generate_outline_and_upload(test_files)
        
        # 保存测试结果
        results_file = test_dir / f"test_results_{timestamp}.txt"
        with open(results_file, 'w', encoding='utf-8') as f:
            f.write(f"测试开始时间: {start_time}\n")
            f.write(f"测试结束时间: {datetime.now()}\n")
            f.write(f"测试文件数量: {len(test_files)}\n")
            f.write("\n\n=== 上传测试 ===\n")
        
    finally:
        # 清理服务器进程
        server_process.terminate()
        server_process.join()

async def test_generate_outline_and_upload():
    """
    测试生成大纲和上传功能
    """
    try:
        # 1. 准备测试文件
        file_paths = [
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach marketing · Resend.pdf",
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we evolve our knowledge base · Resend.pdf",
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we help users · Resend.pdf",
            r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
        ]
        
        # 2. 创建UploadFile对象列表
        upload_files = []
        for file_path in file_paths:
            if os.path.exists(file_path):
                file_obj = open(file_path, 'rb')
                upload_file = UploadFile(
                    filename=os.path.basename(file_path),
                    file=file_obj
                )
                upload_files.append(upload_file)
            else:
                print(f"Warning: File not found: {file_path}")

        # 3. 准备背景信息
        background_info = {
            "audience_info": "主要受众:abc集团新入职员工,受众特点:年轻化，学历高，学习能力强",
            "company_name": "ABC公司",
            "company_culture": "客户第一，团队合作，拥抱变化，诚信，激情，敬业",
            "company_industry": "互联网",
            "company_competition": "行业领先",
            "user_role": "市场营销经理",
            "industry_info": "互联网",
            "project_title": "市场营销经理",
            "project_dutys": "负责公司市场营销策略的制定和执行",
            "project_goals": "了解公司市场营销策略的制定和执行",
            "project_theme": "了解公司市场营销策略的制定和执行",
            "project_aim": "了解公司市场营销策略的制定和执行",
            "content_needs": "市场营销策略的制定和执行",
            "format_style": " "
        }

        # 4. 创建日志文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = f"test_logs/test_log_{timestamp}.txt"
        os.makedirs(os.path.dirname(log_file), exist_ok=True)

        # 5. 执行测试并记录结果
        with open(log_file, 'w', encoding='utf-8') as f:
            # 记录开始时间
            start_time = datetime.now()
            f.write(f"测试开始时间: {start_time}\n")
            f.write(f"测试文件数量: {len(upload_files)}\n")
            f.write("测试文件列表:\n")
            for file in upload_files:
                f.write(f"- {file.filename}\n")
            f.write("\n")

            try:
                # 调用API函数
                result = await generate_outline_and_upload(
                    files=upload_files,
                    user_id="test_user_001",
                    description=json.dumps(background_info),
                    model_name="gpt-4o-mini"
                )

                # 记录结果
                f.write("API调用结果:\n")
                f.write(json.dumps(result, ensure_ascii=False, indent=2))
                
            except Exception as e:
                f.write(f"\n错误发生:\n{str(e)}\n")
                f.write(f"错误详情:\n{traceback.format_exc()}\n")
                raise e
            finally:
                # 记录结束时间
                end_time = datetime.now()
                f.write(f"\n测试结束时间: {end_time}\n")
                f.write(f"总耗时: {end_time - start_time}\n")

                # 清理资源
                for upload_file in upload_files:
                    upload_file.file.close()

        print(f"测试日志已保存到: {log_file}")
        return result

    except Exception as e:
        print(f"测试过程中发生错误: {str(e)}")
        raise

if __name__ == "__main__":
    # Windows下需要这个
    multiprocessing.freeze_support()
    asyncio.run(main())