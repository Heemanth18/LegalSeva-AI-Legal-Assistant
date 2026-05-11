"""
case_law_vector_store.py
Reads case_law_dataset.csv, case_laws_dataset.csv, large_case_law_dataset.csv
Actual columns: title, summary, sections, domain, verdict, source_link
NOTE: summary is empty in most rows — we search on title + sections + verdict instead.
"""
import csv, numpy as np
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_FILES = [
    _ROOT / "datasets" / "case_law_dataset.csv",
    _ROOT / "datasets" / "case_laws_dataset.csv",
    _ROOT / "datasets" / "large_case_law_dataset.csv",
    # fallbacks at project root
    _ROOT / "case_law_dataset.csv",
    _ROOT / "case_laws_dataset.csv",
    _ROOT / "large_case_law_dataset.csv",
]

_cases: list[dict] = []
_embeddings: np.ndarray | None = None


def _bow(text: str, dim: int = 512) -> np.ndarray:
    vec = np.zeros(dim, dtype="float32")
    for w in str(text).lower().split():
        vec[hash(w) % dim] += 1.0
    n = np.linalg.norm(vec)
    return vec / n if n else vec


def _load():
    global _cases, _embeddings
    seen: set = set()

    for p in _FILES:
        if not p.exists():
            continue
        try:
            with open(p, encoding="utf-8", errors="ignore") as f:
                for row in csv.DictReader(f):
                    title = row.get("title", "").strip()
                    if not title or title in seen:
                        continue
                    seen.add(title)
                    _cases.append({
                        "case_name":  title,
                        "citation":   row.get("source_link", ""),
                        "court":      "",           # not in dataset
                        "year":       "",           # not in dataset
                        "facts":      row.get("summary", ""),
                        "judgement":  row.get("verdict", ""),
                        "sections":   row.get("sections", ""),
                        "domain":     row.get("domain", "general"),
                    })
        except Exception:
            continue

    if not _cases:
        return

    texts = [
        f"{c['case_name']} {c['sections']} {c['facts'][:200]} {c['judgement'][:200]}"
        for c in _cases
    ]
    _embeddings = np.array([_bow(t) for t in texts], dtype="float32")


_load()


def search_cases(query: str, domain: str = "all", top_k: int = 8) -> dict:
    if not _cases or _embeddings is None:
        return {"cases": []}

    q = _bow(query).reshape(1, -1)

    if domain != "all":
        pool_idx = [i for i, c in enumerate(_cases)
                    if domain.lower() in c.get("domain", "").lower()]
        if not pool_idx:
            pool_idx = list(range(len(_cases)))
    else:
        pool_idx = list(range(len(_cases)))

    sub_emb = _embeddings[pool_idx]
    sims    = (sub_emb @ q.T).squeeze()
    if sims.ndim == 0:
        sims = sims.reshape(1)
    top_idx = np.argsort(sims)[::-1][:top_k]

    return {"cases": [_cases[pool_idx[i]] for i in top_idx]}