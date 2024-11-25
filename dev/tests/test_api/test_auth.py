import pytest
from fastapi.testclient import TestClient

def test_login(client):
    response = client.post(
        "/api/auth/login",
        json={
            "username": "test@example.com",
            "password": "testpassword"
        }
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_invalid_credentials(client):
    response = client.post(
        "/api/auth/login",
        json={
            "username": "wrong@example.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401 