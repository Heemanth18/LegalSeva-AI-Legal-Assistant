"""
law_database.py
Manages a lightweight SQLite database that stores:
  - IPC / BNS sections (with full text)
  - Case law index (metadata only; full text in vector store)
  - FIR templates
  - Lawyer verification records

Run directly to seed the database:
  python -m backend.law_database seed
"""
import sqlite3
import json
import logging
from pathlib import Path
from contextlib import contextmanager

from .india_code_loader import (
    load_ipc_from_json,
    load_all_case_laws,
    load_fir_dataset,
    load_consumer_dataset,
    load_cybercrime_dataset,
)

logger = logging.getLogger(__name__)

_BASE   = Path(__file__).resolve().parent.parent
_DB_PATH = _BASE / "database" / "legalseva.db"

# ── Schema ─────────────────────────────────────────────────────────────────────

SCHEMA = """
CREATE TABLE IF NOT EXISTS ipc_sections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    section     TEXT NOT NULL,
    title       TEXT,
    description TEXT,
    punishment  TEXT,
    chapter     TEXT,
    bns_equiv   TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS case_law (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    case_name   TEXT NOT NULL,
    citation    TEXT,
    court       TEXT,
    year        TEXT,
    facts       TEXT,
    judgement   TEXT,
    sections    TEXT,
    domain      TEXT DEFAULT 'general',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fir_templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category    TEXT,
    step_no     INTEGER,
    title       TEXT,
    detail      TEXT
);

CREATE TABLE IF NOT EXISTS consumer_law (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    section     TEXT,
    title       TEXT,
    description TEXT,
    penalty     TEXT
);

CREATE TABLE IF NOT EXISTS cybercrime_law (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    section     TEXT,
    title       TEXT,
    description TEXT,
    punishment  TEXT
);

CREATE TABLE IF NOT EXISTS lawyer_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    bar_council_id  TEXT UNIQUE NOT NULL,
    name            TEXT,
    state           TEXT,
    verified_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ipc_section  ON ipc_sections(section);
CREATE INDEX IF NOT EXISTS idx_case_domain  ON case_law(domain);
CREATE INDEX IF NOT EXISTS idx_lawyer_bar   ON lawyer_sessions(bar_council_id);
"""

# ── Connection helper ──────────────────────────────────────────────────────────

@contextmanager
def get_connection():
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Create tables if they don't exist."""
    with get_connection() as conn:
        conn.executescript(SCHEMA)
    logger.info("Database initialised.")

# ── Seeding functions ──────────────────────────────────────────────────────────

def seed_ipc():
    sections = load_ipc_from_json()
    if not sections:
        logger.warning("No IPC sections found to seed.")
        return
    with get_connection() as conn:
        conn.execute("DELETE FROM ipc_sections")
        conn.executemany(
            "INSERT INTO ipc_sections (section, title, description, punishment, chapter, bns_equiv) "
            "VALUES (:section, :title, :description, :punishment, :chapter, :bns_equivalent)",
            [
                {
                    "section":     s.get("section", ""),
                    "title":       s.get("title", ""),
                    "description": s.get("description", ""),
                    "punishment":  s.get("punishment", ""),
                    "chapter":     s.get("chapter", ""),
                    "bns_equivalent": s.get("bns_equivalent", ""),
                }
                for s in sections
            ],
        )
    logger.info(f"Seeded {len(sections)} IPC sections.")

def seed_case_law():
    cases = load_all_case_laws()
    if not cases:
        logger.warning("No case law records found.")
        return
    with get_connection() as conn:
        conn.execute("DELETE FROM case_law")
        conn.executemany(
            "INSERT INTO case_law (case_name, citation, court, year, facts, judgement, sections, domain) "
            "VALUES (:case_name, :citation, :court, :year, :facts, :judgement, :sections, :domain)",
            [
                {
                    "case_name": c.get("case_name", c.get("title", "Unknown")),
                    "citation":  c.get("citation", c.get("case_no", "")),
                    "court":     c.get("court", ""),
                    "year":      c.get("year", c.get("date", "")),
                    "facts":     c.get("facts", c.get("summary", ""))[:2000],
                    "judgement": c.get("judgement", c.get("holding", ""))[:2000],
                    "sections":  c.get("sections", c.get("acts", "")),
                    "domain":    c.get("domain", c.get("category", "general")),
                }
                for c in cases
            ],
        )
    logger.info(f"Seeded {len(cases)} case law records.")

def seed_all():
    init_db()
    seed_ipc()
    seed_case_law()
    logger.info("All seeding complete.")

# ── Query helpers ──────────────────────────────────────────────────────────────

def get_ipc_section(section: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM ipc_sections WHERE section = ? LIMIT 1",
            (section.strip(),)
        ).fetchone()
    return dict(row) if row else None

def search_ipc_db(query: str, limit: int = 5) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM ipc_sections WHERE title LIKE ? OR description LIKE ? LIMIT ?",
            (f"%{query}%", f"%{query}%", limit)
        ).fetchall()
    return [dict(r) for r in rows]

def log_lawyer_session(bar_id: str, name: str, state: str):
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO lawyer_sessions (bar_council_id, name, state)
               VALUES (?, ?, ?)
               ON CONFLICT(bar_council_id) DO UPDATE SET
                 last_active = CURRENT_TIMESTAMP""",
            (bar_id, name, state)
        )

# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "seed"
    if cmd == "seed":
        seed_all()
    elif cmd == "init":
        init_db()
    else:
        print(f"Unknown command: {cmd}. Use 'seed' or 'init'.")