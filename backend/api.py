from dotenv import load_dotenv
load_dotenv(override=True)

import os, sys, datetime, shutil, tempfile, sqlite3, hashlib, secrets

_backend_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir    = os.path.dirname(_backend_dir)
_agents_dir  = os.path.join(_root_dir, "agents")
for _p in [_root_dir, _agents_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import jwt
import traceback

from backend.orchestrator import run_agents, run_lawyer_agents
from agents.tools_agent import (
    search_case_law, find_similar_cases, draft_document,
    extract_text_from_file, detect_document_type,
    ocr_analyse_citizen, ocr_analyse_lawyer,
)

app = FastAPI(title="LegalSeva API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "legalseva-dev-secret")
security   = HTTPBearer(auto_error=False)

# ── Database setup ────────────────────────────────────────────────────────────

DB_PATH = os.path.join(_root_dir, "database", "legalseva.db")

def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS lawyers (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            email           TEXT    UNIQUE NOT NULL,
            password_hash   TEXT    NOT NULL,
            salt            TEXT    NOT NULL,
            name            TEXT    NOT NULL,
            bar_council_id  TEXT    UNIQUE NOT NULL,
            state           TEXT    NOT NULL,
            phone           TEXT,
            specialization  TEXT,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login      DATETIME
        );

        CREATE TABLE IF NOT EXISTS lawyer_cases (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            lawyer_id   INTEGER NOT NULL,
            client_name TEXT,
            accused     TEXT,
            case_type   TEXT,
            sections    TEXT,
            description TEXT,
            witnesses   TEXT,
            court       TEXT,
            police_station TEXT,
            fir_number  TEXT,
            status      TEXT DEFAULT 'active',
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lawyer_id) REFERENCES lawyers(id)
        );

        CREATE TABLE IF NOT EXISTS lawyer_activity (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            lawyer_id   INTEGER NOT NULL,
            action      TEXT,
            detail      TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lawyer_id) REFERENCES lawyers(id)
        );
    """)
    conn.commit()
    conn.close()

init_db()

# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(password: str, salt: str = None):
    if not salt:
        salt = secrets.token_hex(32)
    hashed = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 260000
    ).hex()
    return hashed, salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    hashed, _ = hash_password(password, salt)
    return secrets.compare_digest(hashed, stored_hash)

# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_jwt(payload: dict) -> str:
    payload["exp"] = datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def get_lawyer_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Token required. Please log in again.")
    try:
        data = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        if data.get("role") != "lawyer":
            raise HTTPException(status_code=403, detail="Lawyer access only.")
        return data
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

def log_activity(lawyer_id: int, action: str, detail: str = ""):
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO lawyer_activity (lawyer_id, action, detail) VALUES (?,?,?)",
            (lawyer_id, action, detail)
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

# ── Request / Response models ─────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text: str
    role: str = "citizen"
    language: Optional[str] = "en"

class LawyerAnalyzeRequest(BaseModel):
    text: str
    task: str = "research"
    doc_type: Optional[str] = None
    language: Optional[str] = "en"
    case_meta: Optional[dict] = None

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    bar_council_id: str
    state: str
    phone: Optional[str] = None
    specialization: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    lawyer_name: str
    bar_council_id: str
    email: str

class SaveCaseRequest(BaseModel):
    client_name: Optional[str] = None
    accused: Optional[str] = None
    case_type: Optional[str] = None
    sections: Optional[str] = None
    description: Optional[str] = None
    witnesses: Optional[str] = None
    court: Optional[str] = None
    police_station: Optional[str] = None
    fir_number: Optional[str] = None

# Keep old Bar Council verify for backward compatibility
class BarCouncilVerifyRequest(BaseModel):
    bar_council_id: str
    name: str
    state: str

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "4.0.0", "auth": "email+password"}

# ── Citizen endpoint ──────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    try:
        return run_agents(request.text, request.role, request.language)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}\n{traceback.format_exc()}")

# ── Auth: Register ────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    # Validate email
    if "@" not in req.email or "." not in req.email:
        raise HTTPException(400, "Invalid email address.")
    # Validate password strength
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")
    # Validate Bar Council ID format
    parts = req.bar_council_id.strip().split("/")
    if not (len(parts) == 3 and parts[0].isalpha() and parts[1].isdigit()):
        raise HTTPException(400, "Invalid Bar Council ID. Format: STATE/YEAR/NUMBER e.g. KA/2015/12345")

    password_hash, salt = hash_password(req.password)

    try:
        conn = get_db()
        conn.execute(
            """INSERT INTO lawyers
               (email, password_hash, salt, name, bar_council_id, state, phone, specialization)
               VALUES (?,?,?,?,?,?,?,?)""",
            (req.email.lower().strip(), password_hash, salt,
             req.name, req.bar_council_id.upper(), req.state,
             req.phone or "", req.specialization or "")
        )
        conn.commit()
        lawyer_id = conn.execute(
            "SELECT id FROM lawyers WHERE email=?", (req.email.lower().strip(),)
        ).fetchone()["id"]
        conn.close()
    except sqlite3.IntegrityError as e:
        if "email" in str(e):
            raise HTTPException(409, "This email is already registered. Please sign in instead.")
        if "bar_council_id" in str(e):
            raise HTTPException(409, "This Bar Council ID is already registered.")
        raise HTTPException(409, "Account already exists.")

    token = create_jwt({
        "role":     "lawyer",
        "name":     req.name,
        "bar_id":   req.bar_council_id.upper(),
        "state":    req.state,
        "email":    req.email.lower().strip(),
        "lawyer_id": lawyer_id,
    })
    log_activity(lawyer_id, "register", f"New account created from {req.state}")
    return TokenResponse(
        access_token=token,
        lawyer_name=req.name,
        bar_council_id=req.bar_council_id.upper(),
        email=req.email.lower().strip(),
    )

# ── Auth: Login ───────────────────────────────────────────────────────────────

@app.post("/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    conn = get_db()
    row  = conn.execute(
        "SELECT * FROM lawyers WHERE email=?", (req.email.lower().strip(),)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(401, "No account found with this email. Please register first.")

    if not verify_password(req.password, row["password_hash"], row["salt"]):
        conn.close()
        raise HTTPException(401, "Incorrect password. Please try again.")

    # Update last login
    conn.execute(
        "UPDATE lawyers SET last_login=CURRENT_TIMESTAMP WHERE id=?", (row["id"],)
    )
    conn.commit()
    conn.close()

    token = create_jwt({
        "role":      "lawyer",
        "name":      row["name"],
        "bar_id":    row["bar_council_id"],
        "state":     row["state"],
        "email":     row["email"],
        "lawyer_id": row["id"],
    })
    log_activity(row["id"], "login", "Signed in")
    return TokenResponse(
        access_token=token,
        lawyer_name=row["name"],
        bar_council_id=row["bar_council_id"],
        email=row["email"],
    )

# ── Old Bar Council verify (kept for backward compatibility) ──────────────────

@app.post("/auth/verify-bar-council", response_model=TokenResponse)
async def verify_lawyer(req: BarCouncilVerifyRequest):
    parts = req.bar_council_id.strip().split("/")
    if not (len(parts) == 3 and parts[0].isalpha() and parts[1].isdigit()):
        raise HTTPException(400, "Invalid Bar Council ID. Format: STATE/YEAR/NUMBER e.g. KA/2015/12345")
    token = create_jwt({
        "role":   "lawyer",
        "name":   req.name,
        "bar_id": req.bar_council_id,
        "state":  req.state,
        "email":  "",
        "lawyer_id": None,
    })
    return TokenResponse(
        access_token=token,
        lawyer_name=req.name,
        bar_council_id=req.bar_council_id,
        email="",
    )

# ── Lawyer profile ────────────────────────────────────────────────────────────

@app.get("/lawyer/me")
async def lawyer_me(lawyer: dict = Depends(get_lawyer_from_token)):
    lawyer_id = lawyer.get("lawyer_id")
    profile   = {
        "name":           lawyer.get("name"),
        "bar_council_id": lawyer.get("bar_id"),
        "state":          lawyer.get("state"),
        "email":          lawyer.get("email", ""),
    }
    if lawyer_id:
        try:
            conn = get_db()
            row  = conn.execute(
                "SELECT phone, specialization, created_at, last_login FROM lawyers WHERE id=?",
                (lawyer_id,)
            ).fetchone()
            conn.close()
            if row:
                profile.update({
                    "phone":          row["phone"],
                    "specialization": row["specialization"],
                    "member_since":   row["created_at"],
                    "last_login":     row["last_login"],
                })
        except Exception:
            pass
    return profile

# ── Save / retrieve cases ─────────────────────────────────────────────────────

@app.post("/lawyer/cases")
async def save_case(
    req: SaveCaseRequest,
    lawyer: dict = Depends(get_lawyer_from_token),
):
    lawyer_id = lawyer.get("lawyer_id")
    if not lawyer_id:
        raise HTTPException(400, "Case saving requires a registered account. Please register.")
    conn = get_db()
    cursor = conn.execute(
        """INSERT INTO lawyer_cases
           (lawyer_id, client_name, accused, case_type, sections, description,
            witnesses, court, police_station, fir_number)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (lawyer_id, req.client_name, req.accused, req.case_type, req.sections,
         req.description, req.witnesses, req.court, req.police_station, req.fir_number)
    )
    case_id = cursor.lastrowid
    conn.commit()
    conn.close()
    log_activity(lawyer_id, "save_case", f"Case #{case_id} — {req.client_name or 'unnamed'}")
    return {"case_id": case_id, "message": "Case saved successfully."}

@app.get("/lawyer/cases")
async def get_cases(lawyer: dict = Depends(get_lawyer_from_token)):
    lawyer_id = lawyer.get("lawyer_id")
    if not lawyer_id:
        return {"cases": []}
    conn   = get_db()
    rows   = conn.execute(
        "SELECT * FROM lawyer_cases WHERE lawyer_id=? ORDER BY created_at DESC",
        (lawyer_id,)
    ).fetchall()
    conn.close()
    return {"cases": [dict(r) for r in rows]}

@app.get("/lawyer/cases/{case_id}")
async def get_case(case_id: int, lawyer: dict = Depends(get_lawyer_from_token)):
    lawyer_id = lawyer.get("lawyer_id")
    conn = get_db()
    row  = conn.execute(
        "SELECT * FROM lawyer_cases WHERE id=? AND lawyer_id=?", (case_id, lawyer_id)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Case not found.")
    return dict(row)

@app.get("/lawyer/activity")
async def get_activity(lawyer: dict = Depends(get_lawyer_from_token)):
    lawyer_id = lawyer.get("lawyer_id")
    if not lawyer_id:
        return {"activity": []}
    conn = get_db()
    rows = conn.execute(
        "SELECT action, detail, created_at FROM lawyer_activity WHERE lawyer_id=? ORDER BY created_at DESC LIMIT 20",
        (lawyer_id,)
    ).fetchall()
    conn.close()
    return {"activity": [dict(r) for r in rows]}

# ── Lawyer AI analysis ────────────────────────────────────────────────────────

@app.post("/lawyer/analyze")
async def lawyer_analyze(
    request: LawyerAnalyzeRequest,
    lawyer: dict = Depends(get_lawyer_from_token),
):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    try:
        result = run_lawyer_agents(
            text=request.text,
            task=request.task,
            doc_type=request.doc_type,
            language=request.language,
            lawyer_meta=lawyer,
            case_meta=request.case_meta,
        )
        log_activity(
            lawyer.get("lawyer_id") or 0,
            f"ai_{request.task}",
            request.text[:80]
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Task '{request.task}' failed: {e}\n\n{traceback.format_exc()}"
        )

# ── OCR endpoints ─────────────────────────────────────────────────────────────

_ALLOWED_EXTS = {".pdf", ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".txt"}

def _save_upload(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename or "upload")[1].lower() or ".tmp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        return tmp.name

@app.post("/ocr/citizen")
async def ocr_citizen(
    file: UploadFile = File(...),
    language: str = Form("en"),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _ALLOWED_EXTS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: PDF, PNG, JPG, TIFF, TXT")
    tmp = None
    try:
        tmp      = _save_upload(file)
        text     = extract_text_from_file(tmp)
        if not text.strip():
            raise HTTPException(422, "Could not extract text. Check the file is not blank.")
        doc_type = detect_document_type(text)
        result   = ocr_analyse_citizen(text, doc_type)
        return {**result, "characters_extracted": len(text)}
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"OCR error: {e}\n{traceback.format_exc()}")
    finally:
        if tmp and os.path.exists(tmp):
            os.unlink(tmp)

@app.post("/ocr/lawyer")
async def ocr_lawyer(
    file: UploadFile = File(...),
    mode: str = Form("both"),
    lawyer: dict = Depends(get_lawyer_from_token),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in _ALLOWED_EXTS:
        raise HTTPException(400, f"Unsupported file type '{ext}'.")
    if mode not in ("brief", "verify", "both"):
        mode = "both"
    tmp = None
    try:
        tmp      = _save_upload(file)
        text     = extract_text_from_file(tmp)
        if not text.strip():
            raise HTTPException(422, "Could not extract text from this file.")
        doc_type = detect_document_type(text)
        result   = ocr_analyse_lawyer(text, doc_type, mode)
        log_activity(lawyer.get("lawyer_id") or 0, "ocr_lawyer", file.filename or "")
        return {**result, "characters_extracted": len(text), "filename": file.filename}
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"OCR error: {e}\n{traceback.format_exc()}")
    finally:
        if tmp and os.path.exists(tmp):
            os.unlink(tmp)