import os
import sys
from pathlib import Path

# Redirect Cache to Workspace
BASE_DIR = Path(__file__).parent.parent
CACHE_DIR = BASE_DIR / "models" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
os.environ["HF_HOME"] = str(CACHE_DIR / "huggingface")
os.environ["XDG_CACHE_HOME"] = str(CACHE_DIR / "xdg")

print("Final System Stability Test:")

try:
    import torch
    print(f"1. PyTorch: {torch.__version__} (CUDA: {torch.cuda.is_available()})")
    if torch.cuda.is_available():
        print(f"   GPU: {torch.cuda.get_device_name(0)}")

    import transformers
    print(f"2. Transformers: {transformers.__version__}")

    import torchaudio
    print(f"3. Torchaudio: {torchaudio.__version__}")

    from f5_tts.api import F5TTS
    print("4. F5-TTS API: Imported successfully.")

    print("\nAttempting GPU Initialization...")
    f5tts = F5TTS(device="cuda" if torch.cuda.is_available() else "cpu")
    print(f"SUCCESS: Model loaded on {f5tts.device}")

except Exception as e:
    print(f"\nSTABILITY TEST FAILED: {e}")
    import traceback
    traceback.print_exc()
