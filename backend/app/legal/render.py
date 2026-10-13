"""Conversione Markdown -> HTML minima (titoli, paragrafi, elenchi, citazioni, tabelle, grassetto, codice, link)."""

from __future__ import annotations

import html
import re

_URL = re.compile(r"(https?://[^\s<>()]+[^\s<>().,;:])")


def _inline(text: str) -> str:
    out = html.escape(text, quote=False)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", out)
    return _URL.sub(r'<a href="\1" rel="noopener">\1</a>', out)


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def markdown_to_html(md: str) -> str:
    lines = md.splitlines()
    out: list[str] = []
    para: list[str] = []
    i = 0

    def flush() -> None:
        if para:
            out.append("<p>" + _inline(" ".join(para)) + "</p>")
            para.clear()

    while i < len(lines):
        line = lines[i].rstrip()
        if not line.strip():
            flush()
        elif line.startswith("#"):
            flush()
            level = min(len(line) - len(line.lstrip("#")), 6)
            out.append(f"<h{level}>{_inline(line[level:].strip())}</h{level}>")
        elif line.startswith(">"):
            flush()
            out.append(f'<blockquote class="warn">{_inline(line.lstrip("> ").strip())}</blockquote>')
        elif line.startswith("- "):
            flush()
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{_inline(lines[i][2:].strip())}</li>")
                i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
            continue
        elif line.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            head, body = _cells(rows[0]), [_cells(r) for r in rows[2:]]
            th = "".join(f"<th>{_inline(c)}</th>" for c in head)
            tr = "".join("<tr>" + "".join(f"<td>{_inline(c)}</td>" for c in r) + "</tr>" for r in body)
            out.append(f'<div class="t"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>')
            continue
        else:
            para.append(line.strip())
        i += 1
    flush()
    return "\n".join(out)


_PAGE = """<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>{title}</title>
<style>
body{{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:16px;color:#1a1a1a;background:#fff}}
main{{max-width:720px;margin:0 auto}}
h1{{font-size:1.6rem}}h2{{font-size:1.2rem;margin-top:2rem}}h3{{font-size:1.05rem}}
blockquote.warn{{margin:1rem 0;padding:12px 14px;background:#fff4d6;border-left:4px solid #d98f00;border-radius:4px}}
code{{background:#f0f0f0;padding:1px 4px;border-radius:3px}}
.t{{overflow-x:auto}}table{{border-collapse:collapse;font-size:.9rem}}
th,td{{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}}
a{{color:#0b57d0;word-break:break-word}}
@media (prefers-color-scheme:dark){{body{{background:#111;color:#eee}}code{{background:#2a2a2a}}
blockquote.warn{{background:#3a2e0a}}th,td{{border-color:#555}}a{{color:#8ab4f8}}}}
</style>
</head>
<body><main>
{body}
</main></body>
</html>
"""


def render_page(md: str) -> str:
    m = re.search(r"^# (.+)$", md, re.M)
    title = html.escape(m.group(1) if m else "Informativa sulla privacy")
    return _PAGE.format(title=title, body=markdown_to_html(md))
