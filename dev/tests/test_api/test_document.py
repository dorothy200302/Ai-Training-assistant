import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def auth_headers(client):
    # 先登录获取token
    login_response = client.post(
        "/api/auth/login",
        json={
            "username": "test@example.com",
            "password": "testpassword"
        }
    )
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_create_document(client, auth_headers):
    response = client.post(
        "/api/documents/",
        headers=auth_headers,
        json={
            "title": "测试文档",
            "content": "这是一个测试文档内容"
        }
    )
    assert response.status_code == 200
    assert response.json()["title"] == "测试文档"

def test_get_document_list(client, auth_headers):
    response = client.get(
        "/api/documents/",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_document_detail(client, auth_headers):
    # 先创建一个文档
    create_response = client.post(
        "/api/documents/",
        headers=auth_headers,
        json={
            "title": "测试文档",
            "content": "这是一个测试文档内容"
        }
    )
    doc_id = create_response.json()["id"]
    
    # 获取文档详情
    response = client.get(
        f"/api/documents/{doc_id}",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["id"] == doc_id 