import os
import sys
from pathlib import Path

# Cache Setup
BASE_DIR = Path(__file__).parent.parent
CACHE_DIR = BASE_DIR / "models" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
os.environ["HF_HOME"] = str(CACHE_DIR / "huggingface")
os.environ["XDG_CACHE_HOME"] = str(CACHE_DIR / "xdg")
os.environ["CUDA_MODULE_LOADING"] = "LAZY"

print("--- GRANULAR ML DEBUGGER ---")

def test_step(name, fn):
    print(f"\n>> TESTING: {name}")
    try:
        fn()
        print(f"   SUCCESS: {name}")
        return True
    except Exception as e:
        print(f"   FAILED: {name}")
        print(f"   ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

import torch

def check_env():
    print(f"Python: {sys.version}")
    print(f"Torch Version: {torch.__version__}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"Device: {torch.cuda.get_device_name(0)}")
        mem = torch.cuda.get_device_properties(0).total_memory / 1024**2
        print(f"VRAM: {mem:.0f}MB")
        
    try:
        import flash_attn
        print("Flash Attention: INSTALLED (Might crash on Pascal!)")
    except ImportError:
        print("Flash Attention: NOT INSTALLED (Safe)")

def load_f5_cpu():
    from f5_tts.api import F5TTS
    print("Loading F5-TTS on CPU...")
    model = F5TTS(device="cpu")
    print("CPU Load Successful.")

def load_f5_gpu():
    from f5_tts.api import F5TTS
    print("Loading F5-TTS on CUDA...")
    # Attempting to load with specific precision if possible
    model = F5TTS(device="cuda")
    print("GPU Load Successful.")

if __name__ == "__main__":
    check_env()
    
    # Run tests sequentially
    if test_step("F5-TTS CPU Load", load_f5_cpu):
        print("\n--- CPU TEST PASSED. TESTING GPU ---")
        test_step("F5-TTS GPU Load", load_f5_gpu)
    else:
        print("\n--- CPU TEST FAILED. Environment is broken. ---")

    print("\n--- DEBUGGER FINISHED ---")
    input("Press Enter to close...")
