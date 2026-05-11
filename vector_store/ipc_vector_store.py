"""
ipc_vector_store.py
Reads ipc.json (section_or_article, title, full_text) +
       ipc_metadata.csv (section, title, punishment, cognizable, bailable, court)
Builds a simple cosine-similarity index using numpy (no faiss needed).
"""
import os, json, csv, numpy as np
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_IPC_JSON  = _ROOT / "datasets" / "indian_laws" / "ipc.json"
_IPC_JSON2 = _ROOT / "ipc.json"                          # fallback at project root
_META_CSV  = _ROOT / "datasets" / "ipc_metadata.csv"
_META_CSV2 = _ROOT / "ipc_metadata.csv"

_sections: list[dict] = []
_embeddings: np.ndarray | None = None


def _bow(text: str, dim: int = 512) -> np.ndarray:
    vec = np.zeros(dim, dtype="float32")
    for w in str(text).lower().split():
        vec[hash(w) % dim] += 1.0
    n = np.linalg.norm(vec)
    return vec / n if n else vec


def _load():
    global _sections, _embeddings
    records: list[dict] = []

    # 1. Load ipc.json
    for p in [_IPC_JSON, _IPC_JSON2]:
        if p.exists():
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(data, list):
                    for s in data:
                        records.append({
                            "section":     str(s.get("section_or_article", s.get("section", ""))),
                            "title":       s.get("title", ""),
                            "description": s.get("full_text", s.get("description", "")),
                            "punishment":  s.get("punishment", ""),
                            "keywords":    ", ".join(s.get("keywords", [])),
                        })
            except Exception:
                pass
            break

    # 2. Load ipc_metadata.csv (section, title, punishment, cognizable, bailable, court)
    for p in [_META_CSV, _META_CSV2]:
        if p.exists():
            try:
                with open(p, encoding="utf-8", errors="ignore") as f:
                    for row in csv.DictReader(f):
                        records.append({
                            "section":     row.get("section", ""),
                            "title":       row.get("title", ""),
                            "description": f"{row.get('title','')}. Punishment: {row.get('punishment','')}. "
                                           f"Cognizable: {row.get('cognizable','')}. "
                                           f"Bailable: {row.get('bailable','')}. Court: {row.get('court','')}",
                            "punishment":  row.get("punishment", ""),
                            "cognizable":  row.get("cognizable", ""),
                            "bailable":    row.get("bailable", ""),
                            "court":       row.get("court", ""),
                        })
            except Exception:
                pass
            break

    if not records:
        return

    _sections = records
    texts      = [f"{r['section']} {r['title']} {r['description']}" for r in records]
    _embeddings = np.array([_bow(t) for t in texts], dtype="float32")


_load()


def search_ipc(query: str, top_k: int = 5) -> dict:
    if not _sections or _embeddings is None:
        return {"sections": []}
    q    = _bow(query).reshape(1, -1)
    sims = (_embeddings @ q.T).squeeze()
    idx  = np.argsort(sims)[::-1][:top_k]
    return {"sections": [_sections[i] for i in idx]}