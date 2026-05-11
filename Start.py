"""
start.py  —  Run this from the project root folder.
Usage:  python start.py
"""
import sys
import os
import urllib.request
import urllib.error
import json
import subprocess

OLLAMA_BASE  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

def print_ok(msg):   print(f"  \033[32mv\033[0m  {msg}")
def print_err(msg):  print(f"  \033[31mx\033[0m  {msg}")
def print_warn(msg): print(f"  \033[33m!\033[0m  {msg}")
def print_info(msg): print(f"     {msg}")

def check_ollama_running() -> bool:
    try:
        with urllib.request.urlopen(f"{OLLAMA_BASE}/api/tags", timeout=3):
            return True
    except Exception:
        return False

def check_model_available() -> bool:
    try:
        with urllib.request.urlopen(f"{OLLAMA_BASE}/api/tags", timeout=3) as r:
            data = json.loads(r.read())
            models = [m["name"] for m in data.get("models", [])]
            return any(OLLAMA_MODEL in m for m in models)
    except Exception:
        return False

def pull_model():
    print_info(f"Pulling {OLLAMA_MODEL} — please wait...")
    payload = json.dumps({"name": OLLAMA_MODEL, "stream": False}).encode()
    req = urllib.request.Request(
        f"{OLLAMA_BASE}/api/pull", data=payload,
        headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            resp = json.loads(r.read())
            return resp.get("status") == "success"
    except Exception as e:
        print_err(f"Pull failed: {e}")
        return False

def run_checks() -> bool:
    print("\n=== LegalSeva startup check ===\n")
    ok = True

    if check_ollama_running():
        print_ok("Ollama is running")
    else:
        print_err("Ollama is NOT running")
        print_info("Fix: open a terminal and run:  ollama serve")
        print_info("     Download from:             https://ollama.com/download")
        ok = False

    if not ok:
        return False

    if check_model_available():
        print_ok(f"Model '{OLLAMA_MODEL}' is available")
    else:
        print_warn(f"Model '{OLLAMA_MODEL}' not found — pulling now...")
        if pull_model():
            print_ok(f"Model '{OLLAMA_MODEL}' pulled successfully")
        else:
            print_err(f"Could not pull model. Run:  ollama pull {OLLAMA_MODEL}")
            ok = False

    missing = []
    for pkg in ["fastapi", "uvicorn", "pydantic", "jwt", "numpy"]:
        try:
            __import__(pkg.replace("-", "_"))
        except ImportError:
            missing.append(pkg)

    if missing:
        print_err(f"Missing packages: {', '.join(missing)}")
        print_info("Fix:  pip install -r requirements.txt")
        ok = False
    else:
        print_ok("Python dependencies OK")

    print()
    return ok

if __name__ == "__main__":
    ok = run_checks()
    if not ok:
        print("Fix the issues above then re-run:  python start.py\n")
        sys.exit(1)

    print_ok("All checks passed!\n")
    print("Starting FastAPI backend on http://localhost:8000 ...\n")

    # KEY FIX: ensure project root is cwd so relative imports resolve
    project_root = os.path.dirname(os.path.abspath(__file__))

    # Launch uvicorn as a subprocess from the correct directory
    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "backend.api:app",
        "--reload",
        "--port", "8000",
        "--host", "0.0.0.0",
    ], cwd=project_root)