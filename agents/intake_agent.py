"""
intake_agent.py  —  Replaces: legal_intent_agent.py + domain_router_agent.py
"""
import re, os, sys, json

_dir = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_dir)
for _p in [_root, _dir]:
    if _p not in sys.path: sys.path.insert(0, _p)

from agents.llm_client import fast_classify

_INTENT_RX = {
    "fir":         r"\bfir\b|first information report|complaint.*police|file.*complaint",
    "bail":        r"\bbail\b|anticipatory bail",
    "ipc_lookup":  r"section\s+\d+|ipc\s+\d+|bns\s+\d+",
    "draft":       r"\bdraft\b|write.*petition|vakalatnama",
    "strategy":    r"\bstrategy\b|how (should|can) i fight|defend my case",
    "case_search": r"case.*number|judgement of|find.*case",
    "rights":      r"\brights?\b|can (?:police|they)|am i allowed|is it legal",
}
_DOMAIN_RX = {
    "consumer":       r"consumer|defective product|refund|warranty",
    "cybercrime":     r"cyber|hacking|online fraud|phishing|it act",
    "fir":            r"\bfir\b|first information report",
    "constitutional": r"fundamental right|pil|habeas corpus|writ|constitution",
    "family":         r"divorce|maintenance|alimony|domestic violence|dowry|custody",
    "civil":          r"contract|property dispute|rent|landlord|cheque bounce",
}

_SYSTEM = """Indian legal classifier. Return ONLY JSON: {"intent":"fir|rights|bail|ipc_lookup|case_search|draft|strategy|general","domain":"ipc|consumer|cybercrime|fir|civil|constitutional|family|general"}"""

def analyse_intake(text: str) -> tuple:
    t = text.lower()
    intent = next((k for k, p in _INTENT_RX.items() if re.search(p, t)), "general")
    if intent == "fir":
        domain = "fir"
    else:
        domain = next((d for d, p in _DOMAIN_RX.items() if re.search(p, t)), "general")
        if domain == "general" and re.search(r"section\s+\d+|ipc|bns|murder|rape|assault|theft|fraud", t):
            domain = "ipc"
    if intent == "general" and domain == "general":
        try:
            parsed = json.loads(fast_classify(_SYSTEM, text[:400]))
            intent = parsed.get("intent", "general")
            domain = parsed.get("domain", "general")
        except Exception:
            pass
    return intent, domain