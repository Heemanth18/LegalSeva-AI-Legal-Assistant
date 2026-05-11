"""
orchestrator.py — Slim 3-agent pipeline (was 8 agents, 3-4 LLM calls → now 1-2 LLM calls).
"""
import os, sys

# Ensure both project root and agents/ are on the path regardless of how this is launched
_root   = os.path.dirname(os.path.abspath(__file__))          # Hello/backend/
_parent = os.path.dirname(_root)                               # Hello/
for _p in [_parent, os.path.join(_parent, "agents")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from agents.intake_agent      import analyse_intake
from agents.analysis_agent    import analyse
from agents.tools_agent       import search_case_law, find_similar_cases, draft_document
from agents.translation_agent import translate_if_needed, translate_output


def run_agents(text: str, role: str = "citizen", language: str = "en") -> dict:
    eng            = translate_if_needed(text, language)
    intent, domain = analyse_intake(eng)
    result         = analyse(eng, domain, intent, role="citizen")
    return {
        "intent":            intent,
        "domain":            domain,
        "answer":            translate_output(result["answer"], language),
        "raw_law_reference": result["sections"],
        "suggestions":       _sug(intent),
    }


def _sug(intent: str) -> list:
    if intent == "fir":
        return ["What documents do I need to file an FIR?", "Can I file an FIR online?",
                "What if police refuse to register my FIR?"]
    return ["What punishment applies?", "Can I get bail?", "What are my rights during arrest?"]


def run_lawyer_agents(text: str, task: str = "research", doc_type: str = None,
                      language: str = "en", lawyer_meta: dict = None,
                      case_meta: dict = None) -> dict:
    eng            = translate_if_needed(text, language)
    intent, domain = analyse_intake(eng)

    if task == "research":
        cases  = search_case_law(eng, domain)
        result = analyse(eng, domain, intent, role="lawyer", case_meta=case_meta)
        return {"task": "research", "answer": translate_output(result["answer"], language),
                "cases": cases.get("cases", []), "domain": domain}

    elif task == "strategy":
        result = analyse(eng, domain, intent, role="lawyer_strategy", case_meta=case_meta)
        cases  = search_case_law(eng, domain)
        return {"task": "strategy", "answer": translate_output(result["answer"], language),
                "applicable_sections": result["sections"], "key_precedents": cases.get("cases", [])[:3]}

    elif task == "draft":
        doc = draft_document(eng, doc_type or "petition", lawyer_meta or {})
        return {"task": "draft", "document": translate_output(doc["content"], language),
                "doc_type": doc_type, "instructions": doc["instructions"]}

    elif task == "similar":
        similar = find_similar_cases(eng)
        return {"task": "similar", "answer": "", "cases": similar.get("cases", [])}

    raise ValueError(f"Unknown task: {task}")