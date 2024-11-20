import requests
from typing import Dict, Any, Optional
from ..config import Config

class APIService:
    def __init__(self):
        self.base_url = Config.JAVA_API_BASE_URL
        self.headers = {
            'Content-Type': 'application/json'
        }
    
    def set_token(self, token: str):
        """设置认证token"""
        self.headers['Authorization'] = f'Bearer {token}'
    
    async def get(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """GET请求"""
        try:
            response = requests.get(
                f"{self.base_url}{endpoint}",
                headers=self.headers,
                params=params
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")
    
    async def post(self, endpoint: str, data: Dict) -> Dict:
        """POST请求"""
        try:
            response = requests.post(
                f"{self.base_url}{endpoint}",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")
    
    async def put(self, endpoint: str, data: Dict) -> Dict:
        """PUT请求"""
        try:
            response = requests.put(
                f"{self.base_url}{endpoint}",
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")
    
    async def delete(self, endpoint: str) -> Dict:
        """DELETE请求"""
        try:
            response = requests.delete(
                f"{self.base_url}{endpoint}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}") 