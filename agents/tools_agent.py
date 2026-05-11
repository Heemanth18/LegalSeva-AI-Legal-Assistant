"""
tools_agent.py  —  Replaces: case_law_agent.py + similar_case_agent.py + document_agent.py
               Also contains: OCR / document reading & verification tools
"""
import os, sys, json, re
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

_dir = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_dir)
for _p in [_root, _dir]:
    if _p not in sys.path: sys.path.insert(0, _p)

from agents.llm_client import chat, chat_json
from vector_store.case_law_vector_store import search_cases

_CASE_SYSTEM = """Indian legal research assistant. Given raw case entries return a JSON array.
Each item: {"case_name":"","citation":"","court":"","year":"","key_holding":"one sentence","relevance":"why relevant"}
Return ONLY the raw JSON array. No markdown."""

def search_case_law(text: str, domain: str, top_k: int = 6) -> dict:
    raw = search_cases(text, domain=domain, top_k=top_k).get("cases", [])
    if not raw: return {"cases": [], "total": 0}
    try:
        resp  = chat_json(_CASE_SYSTEM, f"Query:{text}\nCases:{json.dumps(raw[:4])}", max_tokens=900, lawyer=True)
        clean = resp.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        out   = json.loads(clean)
        if not isinstance(out, list): raise ValueError
    except Exception:
        out = [{"case_name": c.get("case_name", c.get("title","Unknown")),
                "citation":  c.get("citation", c.get("source_link","")),
                "court":     c.get("court",""), "year": str(c.get("year","")),
                "key_holding": (c.get("judgement") or c.get("verdict") or "")[:120] or "See source",
                "relevance": "Matched by keyword"} for c in raw[:4]]
    return {"cases": out, "total": len(out)}

_SIM_SYSTEM = """Senior Indian advocate identifying precedents. Return JSON array of top 5 cases:
{"case_name":"","citation":"","court":"","year":"","similarity_reason":"","outcome_for_client":"favourable|unfavourable|neutral","key_principle":""}
Return ONLY raw JSON array."""

def find_similar_cases(text: str, top_k: int = 8) -> dict:
    raw = search_cases(text, domain="all", top_k=top_k).get("cases", [])
    if not raw: return {"cases": [], "total": 0}
    try:
        resp  = chat_json(_SIM_SYSTEM, f"Facts:{text}\nCases:{json.dumps(raw[:5])}", max_tokens=900, lawyer=True)
        clean = resp.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        out   = json.loads(clean)
        if not isinstance(out, list): raise ValueError
    except Exception:
        out = [{"case_name": c.get("case_name", c.get("title","Unknown")),
                "citation":  c.get("citation",""), "court": c.get("court",""),
                "year": str(c.get("year","")), "similarity_reason": "Matched by keyword",
                "outcome_for_client": "neutral",
                "key_principle": (c.get("judgement") or c.get("verdict") or "")[:100] or "See source"
                } for c in raw[:5]]
    return {"cases": out, "total": len(out)}

_TEMPLATES = {
    "bail_application": ("Bail Application under Section 437/439 CrPC",    "Fill [ACCUSED NAME], [FIR NUMBER], [POLICE STATION], [OFFENCE SECTION], [COURT NAME]."),
    "legal_notice":     ("Legal Notice",                                     "Send via Registered Post AD. Give 15-30 days for compliance."),
    "vakalatnama":      ("Vakalatnama (Authority to Appear)",                "Signed by client and countersigned by advocate with Bar Council enrollment number."),
    "petition":         ("Petition / Writ",                                  "File with court fee, affidavit, and all annexures."),
    "complaint":        ("Complaint / FIR Draft",                            "Present to SHO. If refused, send by Registered Post to SP/DSP."),
}

_DOC_SYSTEM = """Expert Indian advocate drafting a formal legal document.
Rules: formal legal English, [PLACEHOLDER] for variable info.
Include: heading, court address, cause title, RESPECTFULLY SHOWETH, PRAYER, VERIFICATION, signature block, IPC/CrPC citations.
Write the complete document only. No commentary."""

def draft_document(text: str, doc_type: str, lawyer_meta: dict) -> dict:
    title, instructions = _TEMPLATES.get(doc_type, _TEMPLATES["petition"])
    content = chat(_DOC_SYSTEM,
        f"Draft a {title} for:\n{text}\n\nAdvocate: {lawyer_meta.get('name','[ADVOCATE NAME]')}\n"
        f"Bar Council ID: {lawyer_meta.get('bar_id','[BAR ID]')}\nState: {lawyer_meta.get('state','[STATE]')}\n\nDraft now.",
        max_tokens=2000, lawyer=True)
    return {"content": content, "instructions": instructions, "doc_type": doc_type, "title": title}


# ═══════════════════════════════════════════════════════════════════════════════
# OCR & DOCUMENT ANALYSIS TOOLS
# Uses existing ocr_translation/ocr_reader.py for extraction,
# then runs LLM analysis for citizen summary or lawyer brief/verify.
# ═══════════════════════════════════════════════════════════════════════════════

def extract_text_from_file(file_path: str) -> str:
    """
    Extract raw text directly using pytesseract + pdfplumber.
    Does NOT depend on ocr_reader.py — works standalone.
    Supports: PDF (selectable + scanned), PNG, JPG, TIFF, BMP, TXT.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext in (".txt", ".text"):
        return open(file_path, encoding="utf-8", errors="ignore").read().strip()

    if ext in (".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".webp"):
        return _ocr_image(file_path)

    if ext == ".pdf":
        # Try selectable text first (fast)
        text = _pdf_text(file_path)
        if text.strip():
            return text.strip()
        # Scanned PDF — rasterise each page and OCR
        return _ocr_scanned_pdf(file_path)

    raise RuntimeError(
        f"Unsupported file type: '{ext}'. Allowed: PDF, PNG, JPG, TIFF, BMP, TXT"
    )


def _ocr_image(path: str) -> str:
    """Run pytesseract OCR on an image file."""
    try:
        import pytesseract
        from PIL import Image
        img  = Image.open(path)
        # Convert to RGB if needed (handles RGBA/palette images)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        text = pytesseract.image_to_string(img, lang="eng")
        return text.strip()
    except ImportError:
        raise RuntimeError(
            "pytesseract or Pillow not installed.\n"
            "Run: pip install pytesseract Pillow\n"
            "Also install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki"
        )
    except Exception as e:
        raise RuntimeError(f"Image OCR failed: {e}")


def _pdf_text(path: str) -> str:
    """Extract selectable text from PDF using pdfplumber."""
    try:
        import pdfplumber
        full = ""
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                full += (page.extract_text() or "") + "\n"
        return full.strip()
    except ImportError:
        raise RuntimeError("pdfplumber not installed. Run: pip install pdfplumber")
    except Exception as e:
        raise RuntimeError(f"PDF text extraction failed: {e}")


def _ocr_scanned_pdf(path: str) -> str:
    """Convert each PDF page to image then OCR — for scanned PDFs."""
    try:
        import pdfplumber, pytesseract
        from PIL import Image
        pages = ""
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                img = page.to_image(resolution=200).original
                pages += pytesseract.image_to_string(img, lang="eng+hin") + "\n"
        return pages.strip()
    except Exception:
        return ""


# ── Document type detection ───────────────────────────────────────────────────

_DOC_TYPE_PATTERNS = {
    "FIR Report":                   r"first information report|f\.i\.r\.|fir no|station house officer",
    "Bail Application":             r"bail application|section 437|section 439|anticipatory bail",
    "Judgement / Order":            r"judgment|judgement|the court holds|it is hereby ordered|decreed",
    "Charge Sheet":                 r"charge.?sheet|challan|charges framed|accused is charged",
    "Legal Notice":                 r"legal notice|take notice|demand notice|through advocate",
    "Vakalatnama":                  r"vakalatnama|authority to appear|i hereby authorise",
    "Petition / Writ":              r"writ petition|high court|supreme court|petition.*filed|pil",
    "Affidavit":                    r"affidavit|solemnly affirm|sworn before|deponent",
    "Contract / Agreement":         r"agreement|this deed|party of the first part|whereas the parties",
    "Property Document":            r"sale deed|title deed|property no|survey no|registration",
    "Consumer Complaint":           r"consumer complaint|district forum|national commission|deficiency in service",
    "Post-mortem / Medical Report": r"post.?mortem|cause of death|injury report|medical certificate",
}

def detect_document_type(text: str) -> str:
    t = text.lower()
    for doc_type, pattern in _DOC_TYPE_PATTERNS.items():
        if re.search(pattern, t):
            return doc_type
    return "Legal Document"


# ── Citizen OCR analysis ──────────────────────────────────────────────────────

_CITIZEN_OCR_SYSTEM = """You are a compassionate Indian legal assistant helping an ordinary citizen understand a legal document.

Your job:
1. State what type of document this is (FIR, bail order, notice, judgement, etc.)
2. Explain in very simple language (Class 8 level) what the document says and means
3. Tell them clearly what action they may need to take, if any
4. Flag anything urgent or time-sensitive (court dates, deadlines, compliance periods)
5. Mention IPC/legal sections referenced, explained in plain terms

Keep it under 350 words. Be warm and reassuring.
End with: "If you have concerns about this document, please consult a qualified advocate immediately." """

def ocr_analyse_citizen(text: str, doc_type: str) -> dict:
    """Plain-language document summary for citizens."""
    prompt = f"Document type: {doc_type}\n\nDocument content:\n{text[:3000]}"
    answer = chat(_CITIZEN_OCR_SYSTEM, prompt, max_tokens=600, lawyer=False)
    return {"doc_type": doc_type, "summary": answer, "mode": "citizen"}


# ── Lawyer OCR analysis ───────────────────────────────────────────────────────

_LAWYER_BRIEF_SYSTEM = """You are a senior Indian advocate producing a structured brief of a legal document for a practising lawyer.

Use EXACTLY these headings:

## Document Type & Overview
(What this document is, which court/authority issued it, parties involved)

## Key Facts & Findings
(Bullet points: important facts, dates, amounts, orders)

## Sections & Provisions Cited
(Every IPC/CrPC/BNS/CPC section mentioned with one-line explanation)

## Critical Observations
(Anything unusual, strategically important, or potentially problematic)

## Recommended Next Steps
(What the advocate should do — file reply, appear on date, seek bail, etc.)

Precise legal language. Under 550 words."""

_LAWYER_VERIFY_SYSTEM = """You are a meticulous Indian legal document reviewer checking for ALL errors and defects.

## Drafting Errors
- Grammatical / spelling mistakes in legal text
- Incorrect section numbers or act citations
- Wrong court names or jurisdiction references
- Missing mandatory clauses or prayers

## Procedural Defects
- Missing signatures, dates, stamps, or notarisation
- Court fee / stamp duty issues
- Missing verification / affidavit
- Incorrect cause title or party names

## Substantive Legal Issues
- Wrong sections applied to the facts
- Internal contradictions
- Limitation period concerns
- Jurisdiction problems

## Formatting Issues
- Non-standard format for this document type
- Missing required headings or paragraphs per court rules

## Overall Assessment
Rate the document: ✅ GOOD / ⚠ NEEDS MINOR CORRECTIONS / ❌ NEEDS MAJOR REVISION
Give a 2-sentence summary of the most critical issues found.

Be thorough — flag even minor issues."""

def ocr_analyse_lawyer(text: str, doc_type: str, mode: str = "both") -> dict:
    """
    Structured brief and/or error check for advocates.
    mode: 'brief' | 'verify' | 'both'
    """
    snippet = text[:4000]
    prompt  = f"Document type: {doc_type}\n\nDocument content:\n{snippet}"
    result  = {"doc_type": doc_type, "mode": mode}

    if mode in ("brief", "both"):
        result["brief"]        = chat(_LAWYER_BRIEF_SYSTEM,  prompt, max_tokens=900, lawyer=True)
    if mode in ("verify", "both"):
        result["verification"] = chat(_LAWYER_VERIFY_SYSTEM, prompt, max_tokens=900, lawyer=True)

    return result