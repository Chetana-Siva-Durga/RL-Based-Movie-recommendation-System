from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_movies_endpoint_returns_paginated_shape():
    response = client.get("/api/movies/?page=1&limit=5")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"items", "total", "page", "limit", "pages"}
    assert body["page"] == 1
    assert body["limit"] == 5
    assert len(body["items"]) <= 5
