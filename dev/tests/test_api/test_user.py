import pytest
from fastapi.testclient import TestClient

def test_create_user(client):
    response = client.post(
        "/api/users/",
        json={
            "email": "newuser@example.com",
            "password": "newpassword",
            "full_name": "New User"
        }
    )
    assert response.status_code == 200
    assert response.json()["email"] == "newuser@example.com"

def test_get_current_user(client, auth_headers):
    response = client.get(
        "/api/users/me",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert "email" in response.json() 