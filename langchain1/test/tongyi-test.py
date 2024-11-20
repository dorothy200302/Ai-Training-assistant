import os
from openai import OpenAI

client = OpenAI(
    api_key="sk-ccbb91e15c89494a99eff2d7ffc845aa",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)
completion = client.chat.completions.create(
    model="qwen-plus",
    messages=[
        {'role': 'system', 'content': 'You are a helpful assistant.'},
        {'role': 'user', 'content': '你是谁？'}
    ]
)

print(completion.choices[0].message.content)