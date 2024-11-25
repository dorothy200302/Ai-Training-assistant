import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = str(Path(__file__).parent.parent.parent)
sys.path.append(project_root)

import pytest
from fastapi.testclient import TestClient
from dev.main import app
from dev.config.settings import settings

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def test_db():
    # 配置测试数据库
    from dev.database import Base, engine
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine) 