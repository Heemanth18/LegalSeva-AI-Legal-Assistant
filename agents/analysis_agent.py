"""
analysis_agent.py  —  Replaces: law_agent.py + reasoning_agent.py + explanation_agent.py
"""
import os, sys, json

_dir = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_dir)
for _p in [_root, _dir]:
    if _p not in sys.path: sys.path.insert(0, _p)

from agents.llm_client import chat
from vector_store.ipc_vector_store        import search_ipc
from vector_store.consumer_vector_store   import search_consumer
from vector_store.cybercrime_vector_store import search_cybercrime
from vector_store.fir_vector_store        import search_fir

_STORE_MAP = {
    "ipc": search_ipc, "consumer": search_consumer, "cybercrime": search_cybercrime,
    "fir": search_fir, "family": search_ipc, "civil": search_ipc,
    "constitutional": search_ipc, "general": search_ipc,
}

_CITIZEN = """You are a compassionate Indian legal assistant for ordinary citizens.
- Simple language (Class 10 level). Cite IPC/BNS sections where relevant.
- For FIR queries list steps numbered 1,2,3.
- Be warm. Under 280 words.
- End: "This is general legal information. For court proceedings, consult a qualified advocate." """

_LAWYER = """You are an expert Indian legal assistant for practising advocates.
Respond using EXACTLY these headings:
## Case Analysis
## Applicable Sections
## Key Arguments For Client
## Anticipated Counter-Arguments
## Recommended Next Steps
## Landmark Precedents
Cite exact section numbers. Concise bullets. Under 450 words."""

_STRATEGY = """You are a senior Indian advocate writing a strategy memo.
Respond using EXACTLY these headings:
## Case Analysis
## Applicable Sections
## Key Arguments For Client
## Anticipated Counter-Arguments
## Recommended Next Steps
## Landmark Precedents
Strategic, actionable. Cite procedural steps and real cases."""


def analyse(text: str, domain: str, intent: str,
            role: str = "citizen", case_meta: dict = None) -> dict:
    sections  = _STORE_MAP.get(domain, search_ipc)(text, top_k=4).get("sections", [])
    fir_steps = search_fir(text, top_k=3).get("steps", []) if intent == "fir" or domain == "fir" else []
    sec_json  = json.dumps(sections[:3], indent=2) if sections else "None."
    fir_json  = json.dumps(fir_steps, indent=2) if fir_steps else ""
    meta_blk  = f"\nCase info: {json.dumps(case_meta)}" if case_meta else ""
    user = f"Query: {text}{meta_blk}\nRelevant law sections:\n{sec_json}"
    if fir_json: user += f"\nFIR steps:\n{fir_json}"
    if role == "citizen":
        answer = chat(_CITIZEN,  user, max_tokens=550,  lawyer=False)
    elif role == "lawyer_strategy":
        answer = chat(_STRATEGY, user, max_tokens=900,  lawyer=True)
    else:
        answer = chat(_LAWYER,   user, max_tokens=850,  lawyer=True)
    return {"answer": answer, "sections": sections, "fir_steps": fir_steps}