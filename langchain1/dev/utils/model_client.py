import os
import httpx
from openai import OpenAI
from typing import List, Dict, Any
from ..Chatbot.test_embeddings import SiliconFlowEmbeddings

class ModelClient:
    def __init__(self):
        self.client = OpenAI(
            api_key="sk-3767598f60e9415e852ff4c43ccc0852",
            base_url="https://api.deepseek.com/v1/chat",
            timeout=30,
            max_retries=3
        )

    def generate_completion(self, prompt: str, system_prompt: str = "You are a helpful assistant.") -> str:
        try:
            completion = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000,
                stream=False
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Error in model completion: {str(e)}")
            raise

    async def generate_completion_async(self, prompt: str, system_prompt: str = "You are a helpful assistant.") -> str:
        async_client = OpenAI(
            api_key="sk-3767598f60e9415e852ff4c43ccc0852",
            base_url="https://api.deepseek.com",
            timeout=30,
            max_retries=3,
            http_client=httpx.AsyncClient()
        )
        try:
            completion = await async_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000,
                stream=False
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Error in async model completion: {str(e)}")
            raise 