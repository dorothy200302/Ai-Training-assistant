import httpx
from typing import List, Union
import time
import urllib3
from tenacity import retry, stop_after_attempt, wait_exponential
from langchain.embeddings.base import Embeddings

# 禁用 SSL 警告
urllib3.disable_warnings()

class SiliconFlowEmbeddings(Embeddings):
    def __init__(self, api_key: str = "sk-jfiddowyvulysbcxctumczcxqwiwtrfuldjgfvpwujtvncbg"):
        self.url = "https://api.siliconflow.cn/v1/embeddings"
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.model = "BAAI/bge-large-zh-v1.5"
        
        self.client = httpx.Client(
            verify=False,
            timeout=httpx.Timeout(30.0),
            trust_env=False
        )
        
        # 减小最大文本长度和块大小
        self.max_text_length = 300  # 从2000减小到300
        self.chunk_size = 250  # 添加块大小限制

    def _truncate_text(self, text: str) -> str:
        """截断文本到最大长度"""
        if len(text) > self.max_text_length:
            return text[:self.max_text_length]
        return text

    def _split_text(self, text: str) -> List[str]:
        """将长文本分割成小段"""
        if len(text) <= self.max_text_length:
            return [text]
        
        chunks = []
        for i in range(0, len(text), self.max_text_length):
            chunk = text[i:i + self.max_text_length]
            chunks.append(chunk)
        return chunks

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10)
    )
    def _get_embedding(self, text: Union[str, List[str]]) -> List[float]:
        """获取单个文本的嵌入向量"""
        if isinstance(text, str):
            text = self._truncate_text(text)
        
        payload = {
            "model": self.model,
            "input": text,
            "encoding_format": "float"
        }
        
        try:
            response = self.client.post(
                self.url,
                json=payload,
                headers=self.headers
            )
            response.raise_for_status()
            result = response.json()
            return result["data"][0]["embedding"]
            
        except Exception as e:
            print(f"获取嵌入向量时出错: {str(e)}")
            raise

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """获取多个文档的嵌入向量"""
        results = []
        for i, text in enumerate(texts):
            try:
                # 分块处理长文本
                if len(text) > self.chunk_size:
                    chunks = [text[i:i + self.chunk_size] 
                            for i in range(0, len(text), self.chunk_size)]
                    # 获取每个块的嵌入向量并平均
                    chunk_embeddings = []
                    for chunk in chunks:
                        embedding = self._get_embedding(chunk)
                        chunk_embeddings.append(embedding)
                        time.sleep(1)  # 增加延迟避免请求过快
                    # 计算平均嵌入向量
                    avg_embedding = [sum(x)/len(x) for x in zip(*chunk_embeddings)]
                    results.append(avg_embedding)
                else:
                    embedding = self._get_embedding(text)
                    results.append(embedding)
                    time.sleep(1)
            except Exception as e:
                print(f"处理文档 {i+1} 失败: {str(e)}")
                raise
        return results

    def embed_query(self, text: str) -> List[float]:
        """获取查询文本的嵌入向量"""
        if len(text) > self.max_text_length:
            # 对于查询，我们只使用前面的部分
            text = self._truncate_text(text)
        return self._get_embedding(text)

    # 实现 Embeddings 接口所需的方法
    def embed_text(self, text: str) -> List[float]:
        """兼容 LangChain Embeddings 接口"""
        return self.embed_query(text)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """兼容 LangChain Embeddings 接口"""
        return self.embed_documents(texts)

def test_embeddings():
    try:
        embeddings = SiliconFlowEmbeddings()
        texts = [
            "人工智能正在快速发展",
            "机器学习是AI的一个重要分支",
            "深度学习模仿人脑神经网络"
        ]
        
        embeddings_list = embeddings.embed_documents(texts)
        print(f"成功获取嵌入向量，每个向量维度: {len(embeddings_list[0])}")
            
    except Exception as e:
        print(f"错误: {str(e)}")
        raise

if __name__ == "__main__":
    test_embeddings() 