import os
import sys
import datetime
from pathlib import Path

# --- LOGGING ---
BASE_DIR = Path(__file__).parent.parent
LOG_FILE = BASE_DIR / "backend" / "import_debug_log.txt"

def log_debug(msg):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}\n"
    print(line, end="")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line)
        f.flush()

log_debug("--- DETAILED IMPORT DEBUGGER ---")

def try_import(module_name):
    log_debug(f"Attempting to import: {module_name}")
    try:
        __import__(module_name)
        log_debug(f"   SUCCESS: {module_name}")
        return True
    except Exception as e:
        log_debug(f"   FAILED: {module_name} -> {e}")
        return False

# Suspected modules that often cause win32 crashes
modules_to_test = [
    "torch",
    "torchaudio",
    "numpy",
    "scipy",
    "librosa",
    "transformers",
    "accelerate",
    "wandb",
    "gradio",
    "vocos",
    "f5_tts.model.backbones.dit",
    "f5_tts.api"
]

if __name__ == "__main__":
    for mod in modules_to_test:
        try_import(mod)
    
    log_debug("--- DEBUGGER FINISHED ---")
