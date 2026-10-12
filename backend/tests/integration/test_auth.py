import os
import time

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

os.environ["USE_PROVIDER_FIXTURES"] = "true"

from app.auth import google
from app.core.config import get_settings
from app.main import app
from app.services.feed_service import reset_feed_state
from app.services.registry import get_providers

AUD = "web-client-id.apps.googleusercontent.com"
SECRET = "test-secret-" + "x" * 40


@pytest.fixture(scope="module")
def keys():
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = lambda k: k.private_bytes(  # noqa: E731
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    return {"private": pem(private), "public": private.public_key(), "other": pem(other)}


def google_token(keys, *, sub="1100", aud=AUD, iss="https://accounts.google.com", exp_in=3600,
                 email="mario@example.com", verified=True, signer="private", name="Mario Rossi"):
    now = int(time.time())
    claims = {
        "sub": sub, "aud": aud, "iss": iss, "iat": now, "exp": now + exp_in,
        "email": email, "email_verified": verified, "name": name,
        "picture": "https://lh3.example/photo.jpg",
    }
    return jwt.encode(claims, keys[signer], algorithm="RS256")


def _env(monkeypatch, tmp_path, *, configured=True):
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path / 'auth.db'}")
    monkeypatch.setenv("USE_PROVIDER_FIXTURES", "true")
    monkeypatch.setenv("LEDGER_SYNC_ENABLED", "false")
    if configured:
        monkeypatch.setenv("GOOGLE_CLIENT_IDS", AUD)
        monkeypatch.setenv("SESSION_SECRET", SECRET)
    else:
        monkeypatch.delenv("GOOGLE_CLIENT_IDS", raising=False)
        monkeypatch.delenv("SESSION_SECRET", raising=False)
    get_settings.cache_clear()
    get_providers.cache_clear()
    reset_feed_state()


@pytest.fixture
def client(tmp_path, monkeypatch, keys):
    _env(monkeypatch, tmp_path)
    monkeypatch.setattr(google, "_signing_key", lambda token: keys["public"])
    with TestClient(app) as c:
        yield c
    get_settings.cache_clear()
    get_providers.cache_clear()


def login(client, token):
    return client.post("/api/v1/auth/google", json={"id_token": token})


def test_first_login_creates_user_and_repeat_login_reuses_it(client, keys):
    first = login(client, google_token(keys))
    assert first.status_code == 200
    body = first.json()
    assert body["token_type"] == "bearer" and body["access_token"]
    assert body["user"]["display_name"] == "Mario Rossi"
    assert body["user"]["email"] == "mario@example.com"
    again = login(client, google_token(keys)).json()
    assert again["user"]["id"] == body["user"]["id"]
    other = login(client, google_token(keys, sub="2200", email="luca@example.com", name="Luca")).json()
    assert other["user"]["id"] != body["user"]["id"]


def test_unverified_email_is_not_stored(client, keys):
    user = login(client, google_token(keys, verified=False)).json()["user"]
    assert user["email"] is None


def test_me_requires_a_valid_session(client, keys):
    token = login(client, google_token(keys)).json()["access_token"]
    ok = client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert ok.status_code == 200 and ok.json()["display_name"] == "Mario Rossi"
    assert client.get("/api/v1/me").status_code == 401
    assert client.get("/api/v1/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401
    assert client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}x"}).status_code == 401


@pytest.mark.parametrize(
    "kwargs",
    [
        {"aud": "someone-elses-app.apps.googleusercontent.com"},
        {"iss": "https://evil.example"},
        {"exp_in": -3600},
        {"signer": "other"},  # signed by a key Google does not publish
    ],
)
def test_bad_google_tokens_are_rejected(client, keys, kwargs):
    res = login(client, google_token(keys, **kwargs))
    assert res.status_code == 401
    assert res.json()["detail"]["code"] == "invalid_google_token"


def test_delete_account_kills_the_session_and_login_starts_fresh(client, keys):
    first = login(client, google_token(keys)).json()
    auth = {"Authorization": f"Bearer {first['access_token']}"}
    assert client.delete("/api/v1/me", headers=auth).status_code == 204
    assert client.get("/api/v1/me", headers=auth).status_code == 401
    assert client.delete("/api/v1/me", headers=auth).status_code == 401
    again = login(client, google_token(keys)).json()
    assert again["user"]["id"] != first["user"]["id"]


def test_login_is_unavailable_when_not_configured(tmp_path, monkeypatch, keys):
    _env(monkeypatch, tmp_path, configured=False)
    with TestClient(app) as c:
        res = login(c, google_token(keys))
        assert res.status_code == 503 and res.json()["detail"]["code"] == "auth_disabled"
        assert c.get("/api/v1/me").status_code == 503
        # The rest of the API is untouched.
        assert c.get("/api/v1/feed", params={"date": "2026-09-20"}).status_code == 200
    get_settings.cache_clear()
    get_providers.cache_clear()


def test_verify_requires_an_audience(keys):
    with pytest.raises(google.InvalidGoogleToken):
        google.verify_google_id_token(google_token(keys), [])
