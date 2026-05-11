"""
ipc_metadata_loader.py
Loads ipc_normalized.json / ipc.json and provides utility functions
used by other vector stores and agents.
"""
import json
from pathlib import Path
from functools import lru_cache

_BASE = Path(__file__).resolve().parent.parent
_IPC_NORM = _BASE / "datasets" / "indian_laws" / "ipc_normalized.json"
_IPC_RAW  = _BASE / "datasets" / "indian_laws" / "ipc.json"
_IPC_FULL = _BASE / "ipc_full.json"

@lru_cache(maxsize=1)
def load_ipc_sections() -> list[dict]:
    """
    Returns a list of section dicts:
    {
        "section": "302",
        "title": "Punishment for murder",
        "description": "...",
        "punishment": "...",
        "bns_equivalent": "101"   (if available)
    }
    """
    for path in [_IPC_NORM, _IPC_RAW, _IPC_FULL]:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, list):
                    return [_normalise(s) for s in data]
                if isinstance(data, dict) and "sections" in data:
                    return [_normalise(s) for s in data["sections"]]
            except Exception:
                continue
    return []

def _normalise(raw: dict) -> dict:
    """Map various CSV/JSON key formats to a standard schema."""
    return {
        "section":     str(raw.get("section", raw.get("ipc_section", raw.get("id", "")))),
        "title":       raw.get("title", raw.get("heading", raw.get("offence", ""))),
        "description": raw.get("description", raw.get("text", raw.get("detail", ""))),
        "punishment":  raw.get("punishment", raw.get("penalty", "")),
        "bns_equivalent": raw.get("bns_section", raw.get("bns_equivalent", "")),
        "chapter":     raw.get("chapter", ""),
    }

def get_section(section_number: str) -> dict | None:
    """Fetch a single IPC section by number (e.g. '302', '498A')."""
    sections = load_ipc_sections()
    sn = section_number.strip().upper()
    for s in sections:
        if s["section"].upper() == sn:
            return s
    return None

def get_all_sections() -> list[dict]:
    return load_ipc_sections()

def get_chapter_sections(chapter: str) -> list[dict]:
    return [s for s in load_ipc_sections() if s.get("chapter", "").upper() == chapter.upper()]