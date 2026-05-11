"""
llm_client.py  —  Groq API client (replaces Ollama)
Groq runs Llama 3 on custom LPU chips — 10-20x faster than local Ollama.

Setup:
  1. Get free API key: https://console.groq.com
  2. Add to your .env file:  GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
  3. Run: pip install groq
"""
from dotenv import load_dotenv
load_dotenv(override=True)

import os, json
from groq import Groq

# ── Model config ──────────────────────────────────────────────────────────────
# Free Groq models (fastest to slowest):
#   llama-3.1-8b-instant   — fastest, good for citizen queries + classification
#   llama-3.3-70b-versatile — smarter, better for lawyer tasks
#   llama3-70b-8192         — very capable, good context window

CITIZEN_MODEL = os.getenv("GROQ_CITIZEN_MODEL", "llama-3.1-8b-instant")
LAWYER_MODEL  = os.getenv("GROQ_LAWYER_MODEL",  "llama-3.3-70b-versatile")

_client = None

def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY not set. "
                "Get a free key at https://console.groq.com and add it to your .env file: "
                "GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx"
            )
        _client = Groq(api_key=api_key)
    return _client


def _call(model: str, system: str, user: str, max_tokens: int, json_mode: bool) -> str:
    if json_mode:
        user += "\n\nRespond ONLY with valid JSON. No markdown fences. No explanation."

    kwargs = dict(
        model       = model,
        messages    = [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        max_tokens  = max_tokens,
        temperature = 0.1,
    )
    # Groq supports JSON mode natively
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    try:
        resp = _get_client().chat.completions.create(**kwargs)
        return resp.choices[0].message.content.strip()
    except Exception as e:
        err = str(e)
        if "api_key" in err.lower() or "authentication" in err.lower():
            raise RuntimeError(
                "Invalid Groq API key. Check GROQ_API_KEY in your .env file."
            )
        if "rate_limit" in err.lower():
            raise RuntimeError(
                "Groq rate limit hit. Wait a few seconds and try again. "
                "Free tier: 30 requests/min for 8b, 30 req/min for 70b."
            )
        raise RuntimeError(f"Groq API error: {e}")


# ── Public API (same interface as before — no other files need to change) ──────

def chat(system: str, user: str, max_tokens: int = 800,
         json_mode: bool = False, lawyer: bool = False) -> str:
    """Main chat function. lawyer=True uses the larger 70b model."""
    model = LAWYER_MODEL if lawyer else CITIZEN_MODEL
    return _call(model, system, user, max_tokens, json_mode)


def chat_json(system: str, user: str, max_tokens: int = 900,
              lawyer: bool = False) -> str:
    """Chat with forced JSON output."""
    model = LAWYER_MODEL if lawyer else CITIZEN_MODEL
    return _call(model, system, user, max_tokens, True)


def fast_classify(system: str, user: str) -> str:
    """Ultra-fast single-label classification — always uses 8b instant model."""
    return _call(CITIZEN_MODEL, system, user, 15, False)


def classify(system: str, user: str, valid_labels: set,
             default: str, lawyer: bool = False) -> str:
    """Classify into one of valid_labels, fall back to default."""
    raw = fast_classify(system, user).lower().rstrip(".").strip()
    if raw in valid_labels:
        return raw
    for label in valid_labels:
        if label in raw:
            return label
    return default