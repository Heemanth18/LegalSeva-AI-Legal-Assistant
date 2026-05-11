"""
consumer_vector_store.py
Actual columns: title, summary, law, source_link
"""
import csv, numpy as np
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_FILES = [
    _ROOT / "datasets" / "consumer_law_dataset.csv",
    _ROOT / "consumer_law_dataset.csv",
]

_records: list[dict] = []
_embeddings: np.ndarray | None = None


def _bow(text: str, dim: int = 512) -> np.ndarray:
    vec = np.zeros(dim, dtype="float32")
    for w in str(text).lower().split():
        vec[hash(w) % dim] += 1.0
    n = np.linalg.norm(vec)
    return vec / n if n else vec


def _load():
    global _records, _embeddings
    for p in _FILES:
        if not p.exists():
            continue
        try:
            with open(p, encoding="utf-8", errors="ignore") as f:
                for row in csv.DictReader(f):
                    _records.append({
                        "section":     row.get("law", ""),
                        "title":       row.get("title", ""),
                        "description": row.get("summary", ""),
                        "punishment":  "",
                        "source":      row.get("source_link", ""),
                    })
        except Exception:
            continue
        break           # stop at first file found

    if _records:
        texts = [f"{r['title']} {r['section']} {r['description']}" for r in _records]
        _embeddings = np.array([_bow(t) for t in texts], dtype="float32")


_load()


def search_consumer(query: str, top_k: int = 5) -> dict:
    if not _records or _embeddings is None:
        return {"sections": []}
    q    = _bow(query).reshape(1, -1)
    sims = (_embeddings @ q.T).squeeze()
    if sims.ndim == 0:
        sims = sims.reshape(1)
    idx  = np.argsort(sims)[::-1][:top_k]
    return {"sections": [_records[i] for i in idx]}