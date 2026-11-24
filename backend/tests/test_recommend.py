from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_epsilon_greedy_recommendation():
    response = client.post("/api/recommend/", json={
        "mood": "Happy",
        "algorithm": "epsilon_greedy",
        "session_count": 1,
    })
    assert response.status_code == 200
    body = response.json()
    assert "error" not in body
    assert body["movie"]["title"]
    assert isinstance(body["similar_movies"], list)


def test_thompson_recommendation():
    response = client.post("/api/recommend/", json={
        "mood": "Romantic",
        "algorithm": "thompson",
    })
    assert response.status_code == 200
    body = response.json()
    assert "error" not in body
    assert body["movie"]["title"]
