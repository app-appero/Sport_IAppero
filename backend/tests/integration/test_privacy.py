import os
from pathlib import Path

os.environ["USE_PROVIDER_FIXTURES"] = "true"

from fastapi.testclient import TestClient

from app.legal.privacy_text import PRIVACY_POLICY_MD
from app.legal.render import markdown_to_html
from app.main import app

client = TestClient(app)
DOC = Path(__file__).resolve().parents[3] / "Sport_IAppero-documentazione-v2/docs/legal/PRIVACY_POLICY.md"


def test_privacy_page_is_html_with_title():
    r = client.get("/privacy")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/html")
    assert "<title>Informativa sulla privacy di Sport IApperò</title>" in r.text
    assert "Ultimo aggiornamento" in r.text
    assert 'name="viewport"' in r.text


def test_privacy_not_under_api_prefix():
    assert client.get("/api/v1/privacy").status_code == 404


def test_markdown_is_escaped():
    assert "<script>" not in markdown_to_html("ciao <script>x</script>")


def test_docs_copy_matches_served_text():
    if not DOC.exists():  # es. immagine Docker senza documentazione
        return
    assert DOC.read_text(encoding="utf-8") == PRIVACY_POLICY_MD


def test_published_text_has_no_draft_markers():
    assert "BOZZA" not in PRIVACY_POLICY_MD
    assert "DA CONFERMARE" not in PRIVACY_POLICY_MD


def test_titolare_data_is_filled_in():
    # Gate: the page must not go live with the controller's details still missing.
    assert "[NOME E INDIRIZZO DEL TITOLARE]" not in PRIVACY_POLICY_MD
    assert "[EMAIL DI CONTATTO]" not in PRIVACY_POLICY_MD
