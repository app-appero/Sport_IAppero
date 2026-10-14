import pytest
from fastapi.testclient import TestClient

from app.api.v1 import admin as admin_module
from app.auth import google
from app.core.config import get_settings
from app.main import app
from app.services.registry import get_providers
from tests.integration.test_auth import AUD, SECRET, google_token, keys, login  # noqa: F401

SUPER = "owner@example.com"


@pytest.fixture
def client(tmp_path, monkeypatch, keys):  # noqa: F811
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path / 'admin.db'}")
    monkeypatch.setenv("USE_PROVIDER_FIXTURES", "true")
    monkeypatch.setenv("LEDGER_SYNC_ENABLED", "false")
    monkeypatch.setenv("GOOGLE_CLIENT_IDS", AUD)
    monkeypatch.setenv("SESSION_SECRET", SECRET)
    monkeypatch.setenv("SUPER_ADMIN_EMAILS", f"  {SUPER.upper()} , other@example.com")
    get_settings.cache_clear()
    get_providers.cache_clear()
    monkeypatch.setattr(google, "_signing_key", lambda token: keys["public"])
    monkeypatch.setattr(admin_module, "_last_started", {})
    with TestClient(app) as c:
        yield c
    get_settings.cache_clear()
    get_providers.cache_clear()


def sign_in(client, keys, sub, email, name):  # noqa: F811
    body = login(client, google_token(keys, sub=sub, email=email, name=name)).json()
    return body["user"], {"Authorization": f"Bearer {body['access_token']}"}


def test_super_admin_comes_from_the_environment_not_the_database(client, keys):  # noqa: F811
    user, headers = sign_in(client, keys, "1", SUPER, "Owner")
    assert user["role"] == "super_admin"
    assert {"view_users", "refresh_data", "free_access"} <= set(user["permissions"])
    me = client.get("/api/v1/me", headers=headers).json()
    assert me["role"] == "super_admin"
    regular, _ = sign_in(client, keys, "2", "mario@example.com", "Mario")
    assert regular["role"] == "user" and regular["permissions"] == []


def test_regular_users_and_anonymous_are_rejected_everywhere(client, keys):  # noqa: F811
    _, headers = sign_in(client, keys, "2", "mario@example.com", "Mario")
    for method, path in (("get", "/api/v1/admin/users"), ("post", "/api/v1/admin/refresh"),
                         ("get", "/api/v1/admin/audit"), ("get", "/api/v1/admin/permissions")):
        kwargs = {"json": {}} if method == "post" else {}
        assert getattr(client, method)(path, headers=headers, **kwargs).status_code == 403
        assert getattr(client, method)(path, **kwargs).status_code == 401
    assert client.put("/api/v1/admin/users/x/role", headers=headers, json={"role": "admin"}).status_code == 403


def test_super_admin_promotes_an_admin_with_chosen_permissions(client, keys):  # noqa: F811
    _, owner = sign_in(client, keys, "1", SUPER, "Owner")
    luca, luca_h = sign_in(client, keys, "3", "luca@example.com", "Luca")
    assert client.get("/api/v1/admin/users", headers=luca_h).status_code == 403
    res = client.put(f"/api/v1/admin/users/{luca['id']}/role", headers=owner,
                     json={"role": "admin", "permissions": ["view_users"]})
    assert res.status_code == 200 and res.json()["role"] == "admin" and res.json()["permissions"] == ["view_users"]
    # the grant is live at once (no new login) and is limited to what was given
    assert client.get("/api/v1/admin/users", headers=luca_h).status_code == 200
    assert client.post("/api/v1/admin/refresh", headers=luca_h, json={}).status_code == 403
    # an admin cannot promote anybody, not even themselves
    assert client.put(f"/api/v1/admin/users/{luca['id']}/role", headers=luca_h,
                      json={"role": "admin", "permissions": ["refresh_data"]}).status_code == 403
    # demotion removes every permission
    client.put(f"/api/v1/admin/users/{luca['id']}/role", headers=owner, json={"role": "user"})
    assert client.get("/api/v1/admin/users", headers=luca_h).status_code == 403


def test_role_changes_are_validated_and_super_admins_are_protected(client, keys):  # noqa: F811
    owner_user, owner = sign_in(client, keys, "1", SUPER, "Owner")
    second, _ = sign_in(client, keys, "4", "other@example.com", "Second Owner")
    mario, _ = sign_in(client, keys, "2", "mario@example.com", "Mario")
    url = "/api/v1/admin/users/{}/role"
    assert client.put(url.format(second["id"]), headers=owner, json={"role": "user"}).status_code == 409
    assert client.put(url.format(owner_user["id"]), headers=owner, json={"role": "user"}).status_code == 409
    assert client.put(url.format("nope"), headers=owner, json={"role": "user"}).status_code == 404
    bad = client.put(url.format(mario["id"]), headers=owner, json={"role": "admin", "permissions": ["root"]})
    assert bad.status_code == 422
    assert client.put(url.format(mario["id"]), headers=owner, json={"role": "root"}).status_code == 422


def test_users_list_search_and_pagination(client, keys):  # noqa: F811
    _, owner = sign_in(client, keys, "1", SUPER, "Owner")
    for i in range(3):
        sign_in(client, keys, f"10{i}", f"user{i}@example.com", f"Utente {i}")
    data = client.get("/api/v1/admin/users", headers=owner, params={"limit": 2}).json()
    assert data["total"] == 4 and len(data["items"]) == 2
    found = client.get("/api/v1/admin/users", headers=owner, params={"q": "UTENTE 1"}).json()
    assert [u["email"] for u in found["items"]] == ["user1@example.com"]
    assert {"id", "email", "created_at", "last_login_at", "role", "permissions"} <= set(data["items"][0])


def test_refresh_starts_both_engines_with_cooldown_and_status(client, keys):  # noqa: F811
    _, owner = sign_in(client, keys, "1", SUPER, "Owner")
    res = client.post("/api/v1/admin/refresh", headers=owner, json={})
    assert res.status_code == 200
    results = res.json()["results"]
    assert results["football"]["state"] == "started" and results["football"]["ref"] == "fixture-job-1"
    assert results["tennis"]["state"] == "started" and results["tennis"]["ref"] == "42"
    again = client.post("/api/v1/admin/refresh", headers=owner, json={})
    assert again.status_code == 429 and again.json()["detail"]["retry_after_seconds"] > 0
    status = client.get("/api/v1/admin/refresh/status", headers=owner,
                        params={"football": "fixture-job-1", "tennis": "42"}).json()
    assert status["football"]["state"] == "success" and status["tennis"]["state"] == "success"
    only = client.get("/api/v1/admin/refresh/status", headers=owner, params={"tennis": "99"}).json()
    assert only["tennis"]["state"] == "unknown"  # a different run than the one asked about


def test_every_privileged_action_is_audited(client, keys):  # noqa: F811
    _, owner = sign_in(client, keys, "1", SUPER, "Owner")
    mario, _ = sign_in(client, keys, "2", "mario@example.com", "Mario")
    client.put(f"/api/v1/admin/users/{mario['id']}/role", headers=owner,
               json={"role": "admin", "permissions": ["refresh_data"]})
    client.post("/api/v1/admin/refresh", headers=owner, json={"sports": ["tennis"]})
    items = client.get("/api/v1/admin/audit", headers=owner).json()["items"]
    assert [i["action"] for i in items] == ["refresh", "set_role"]
    assert items[1]["target_email"] == "mario@example.com"
    assert items[1]["details"]["after"] == {"role": "admin", "permissions": ["refresh_data"]}


def test_refused_engine_gives_a_readable_reason_and_does_not_start_the_cooldown(client, keys, monkeypatch):  # noqa: F811
    from app.core.exceptions import ProviderResponseError

    _, owner = sign_in(client, keys, "1", SUPER, "Owner")
    tennis = get_providers()["tennis"]
    calls = []

    async def refuse(*, force_outside_hours=False):
        calls.append(force_outside_hours)
        if not force_outside_hours:
            raise ProviderResponseError(
                "tennis-oracle",
                '/api/global-update returned 423: '
                '{"detail":"La finestra del pool schedine di oggi è chiusa dalle 10:00."}',
                423)
        return {"ref": "7", "message": "forced"}

    monkeypatch.setattr(tennis, "start_refresh", refuse)
    first = client.post("/api/v1/admin/refresh", headers=owner, json={"sports": ["tennis"]}).json()["results"]["tennis"]
    assert first["state"] == "error" and first["code"] == "window_closed"
    assert "chiusa dalle 10:00" in first["message"]
    # a refusal does not start the wait: the admin can force it at once
    forced = client.post("/api/v1/admin/refresh", headers=owner,
                         json={"sports": ["tennis"], "force_outside_hours": True}).json()["results"]["tennis"]
    assert forced["state"] == "started" and calls == [False, True]
    # now the wait applies to tennis only
    assert client.post("/api/v1/admin/refresh", headers=owner, json={"sports": ["tennis"]}).status_code == 429


def test_engine_errors_are_summarised_without_leaking_details(client, keys, monkeypatch):  # noqa: F811
    from app.core.exceptions import ProviderUnavailable

    _, owner = sign_in(client, keys, "1", SUPER, "Owner")
    soccer = get_providers()["football"]

    async def broken(*, force_outside_hours=False):
        raise ProviderUnavailable("soccer-oracle", "/jobs/daily-refresh returned 500", 500)

    monkeypatch.setattr(soccer, "start_refresh", broken)
    res = client.post("/api/v1/admin/refresh", headers=owner, json={"sports": ["football"]}).json()
    assert res["results"]["football"]["message"] == "Errore interno del motore (500)"
    assert res["results"]["football"]["code"] == "engine_error"
