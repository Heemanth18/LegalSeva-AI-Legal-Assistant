"""translation_agent.py"""
import os, sys

_dir = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_dir)
for _p in [_root, _dir]:
    if _p not in sys.path: sys.path.insert(0, _p)

from agents.llm_client import chat, fast_classify

LANGS = {"en":"English","hi":"Hindi","ta":"Tamil","te":"Telugu","kn":"Kannada",
         "ml":"Malayalam","mr":"Marathi","bn":"Bengali","gu":"Gujarati","pa":"Punjabi","ur":"Urdu"}

def detect_language(text):
    r = fast_classify("Detect language. Respond ONLY with ISO 639-1 code (en,hi,ta,kn). If unsure: en", text[:200]).strip().lower()[:2]
    return r if r in LANGS else "en"

def translate_if_needed(text, language="en"):
    if language == "en": return text
    if detect_language(text) == "en": return text
    return _t(text, "en")

def translate_output(text, target="en"):
    if not target or target == "en" or target not in LANGS: return text
    return _t(text, target)

def _t(text, target):
    return chat(f"Translate to {LANGS[target]}. Preserve IPC refs, court names, citations. ONLY the translation.", text, max_tokens=1800)