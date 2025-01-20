import os
from openai import OpenAI
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def summarize_text():
    try:
        # 使用更有意义的测试文本
        text = """
        人工智能(AI)正在快速发展，影响着各个领域。机器学习让计算机能从数据中学习，
        深度学习则模仿人脑神经网络处理复杂任务。AI在医疗诊断、自动驾驶、智能客服等
        方面都有广泛应用。但AI发展也面临着伦理、隐私和安全等挑战，需要社会各界共同
        关注和规范。
        """
        user_input = text + "\n\n请用中文总结上述文本的主要内容。"

        # 禁用代理设置
        os.environ['NO_PROXY'] = '*'
        if 'http_proxy' in os.environ:
            del os.environ['http_proxy']
        if 'https_proxy' in os.environ:
            del os.environ['https_proxy']

        # 初始化 OpenAI 客户端
        client = OpenAI(
            api_key="sk-3767598f60e9415e852ff4c43ccc0852",  # DeepSeek API Key
            base_url="https://api.deepseek.com",  # DeepSeek API endpoint
            timeout=30,
            max_retries=3
        )

        # 调用模型
        completion = client.chat.completions.create(
            model="deepseek-chat",  # DeepSeek 模型
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": user_input}
            ],
            temperature=0.7,
            max_tokens=2000,
            stream=False
        )

        # 打印结果
        print(completion.choices[0].message)
        
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        print("Please check your network connection and API configuration")

if __name__ == "__main__":
    summarize_text()
