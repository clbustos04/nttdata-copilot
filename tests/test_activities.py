from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # basic sanity checks
    assert "Chess Club" in data


def test_signup_and_unregister():
    activity = "Chess Club"
    email = "testuser@example.com"

    # Ensure clean state for this email in the activity
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Signup should succeed
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    # Duplicate signup should fail (400)
    resp_dup = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp_dup.status_code == 400

    # Unregister should succeed
    resp_unreg = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp_unreg.status_code == 200
    assert email not in activities[activity]["participants"]

    # Unregistering again should return 404
    resp_unreg2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp_unreg2.status_code == 404
