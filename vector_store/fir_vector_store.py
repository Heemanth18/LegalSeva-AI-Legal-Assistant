"""
fir_vector_store.py
Actual FIR_DATASET.csv columns:
  URL, Description, Offense, Punishment, Cognizable, Bailable, Court

This dataset is actually an IPC section reference with cognizable/bailable info —
we use it for FIR guidance AND as a supplement to IPC search.
"""
import csv, numpy as np
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_FILES = [
    _ROOT / "datasets" / "FIR_DATASET.csv",
    _ROOT / "FIR_DATASET.csv",
]

_records: list[dict] = []
_embeddings: np.ndarray | None = None

# Hardcoded FIR steps shown to citizens (always available regardless of dataset)
FIR_STEPS = [
    {"step":1,"title":"Visit the nearest police station",
     "detail":"Go to the police station with jurisdiction over where the offence occurred. Check jurisdiction on Dial 100 or state police website."},
    {"step":2,"title":"Meet the Station House Officer (SHO)",
     "detail":"Request the SHO or duty officer. For cognisable offences (theft, assault, cheating) the police are legally bound to register the FIR."},
    {"step":3,"title":"Submit a written complaint",
     "detail":"Write your complaint: your name, address, date/time/place of incident, description of offence, names of accused if known, witnesses, evidence list. Sign at the bottom."},
    {"step":4,"title":"FIR is recorded and read back to you",
     "detail":"The officer records the FIR. It must be read back to you. Correct any errors before signing. You are entitled to a FREE copy under Section 154(2) CrPC."},
    {"step":5,"title":"Obtain your FIR copy (free)",
     "detail":"Demand your copy immediately. It has the FIR number you need to track progress. Keep it safely — it is proof of your complaint."},
    {"step":6,"title":"If police refuse to register",
     "detail":"Option A: Send complaint by Registered Post to Superintendent of Police (SP). Option B: File before Magistrate under Section 156(3) CrPC. Option C: Approach State Human Rights Commission."},
    {"step":7,"title":"E-FIR option (select states)",
     "detail":"Maharashtra, Delhi, UP, Karnataka, Tamil Nadu allow online FIR for vehicle theft, lost documents, cybercrime. For cybercrime: use cybercrime.gov.in (national portal)."},
]


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
                    desc    = row.get("Description", "").strip()
                    offense = row.get("Offense", "").strip()
                    if not desc and not offense:
                        continue
                    _records.append({
                        "section":     "",           # section extracted from URL if needed
                        "title":       offense or desc[:80],
                        "description": desc,
                        "punishment":  row.get("Punishment", ""),
                        "cognizable":  row.get("Cognizable", ""),
                        "bailable":    row.get("Bailable", ""),
                        "court":       row.get("Court", ""),
                        "source":      row.get("URL", ""),
                    })
        except Exception:
            continue
        break

    if _records:
        texts = [f"{r['title']} {r['description'][:200]}" for r in _records]
        _embeddings = np.array([_bow(t) for t in texts], dtype="float32")


_load()


def search_fir(query: str, top_k: int = 3) -> dict:
    """
    Returns FIR filing steps (always) + matching IPC sections from FIR dataset.
    """
    matched_sections: list[dict] = []

    if _records and _embeddings is not None:
        q    = _bow(query).reshape(1, -1)
        sims = (_embeddings @ q.T).squeeze()
        if sims.ndim == 0:
            sims = sims.reshape(1)
        idx  = np.argsort(sims)[::-1][:top_k]
        matched_sections = [_records[i] for i in idx]

    return {
        "steps":    FIR_STEPS,
        "sections": matched_sections,
    }