import redis
import json
import logging
from config.settings import settings
from typing import Dict, Any, Optional

class RedisClient:
    def __init__(self):
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            decode_responses=True
        )
      
    def ping(self) -> bool:
        try:
            return self.client.ping()
        except Exception as e:
            return False
    
    def hmset(self, key: str, mapping: Dict[str, Any]) -> bool:
        try:
            return bool(self.client.hset(key, mapping=mapping))
        except Exception as e:
            return False
    
    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        try:
            return self.client.set(key, value, ex=ex)
        except Exception:
            return False
    
    def get(self, key: str) -> Optional[str]:
        try:
            return self.client.get(key)
        except Exception:
            return None
    
    def expire(self, key: str, seconds: int) -> bool:
        try:
            return bool(self.client.expire(key, seconds))
        except Exception:
            return False
    
    def exists(self, key: str) -> bool:
        try:
            return bool(self.client.exists(key))
        except Exception:
            return False

    def delete(self, key: str) -> bool:
        try:
            return bool(self.client.delete(key))
        except Exception:
            return False