import subprocess
import os
import json
from pathlib import Path

class MasteringEngine:
    def __init__(self):
        # Load config for portability
        base_dir = Path(__file__).parent.parent
        config_path = Path(__file__).parent / "config.json"
        
        default_ffmpeg = str(base_dir / "Tools" / "ffmpeg" / "bin" / "ffmpeg.exe")
        
        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)
                    raw_path = config.get("ffmpeg_path", default_ffmpeg)
                    if raw_path and not os.path.isabs(raw_path):
                        self.ffmpeg_path = str(base_dir / raw_path)
                    else:
                        self.ffmpeg_path = raw_path
            except:
                self.ffmpeg_path = default_ffmpeg
        else:
            self.ffmpeg_path = default_ffmpeg

    def apply_studio_polish(self, input_path: str, output_path: str, clarity: float = 1.0, deepness: float = 1.0, sibilance: float = 0.5):
        """
        NAC STUDIO v2.0 'Diamond Touch' Mastering:
        Includes sibilance reduction (De-Esser) and pro-vocal harmonics.
        """
        
        # 1. Base Cleanup (Low-cut)
        filters = ["highpass=f=80"]
        
        # 2. THE DIAMOND TOUCH: DE-ESSER
        # Targets the 5kHz-8kHz range where harsh 'S' sounds live.
        # sibilance 0.0 = no reduction, 1.0 = heavy reduction.
        s_reduction = 0.1 + (sibilance * 0.9) # Range 0.1 to 1.0
        # We use a specialized band-stop style dynamic filter
        filters.append(f"deesser=i={s_reduction}:f=0.5:m=o")

        # 3. PITCH (Deepness) using RUBBERBAND
        if abs(deepness - 1.0) > 0.01:
            pitch_val = 1.0 / deepness
            filters.append(f"rubberband=pitch={pitch_val}")

        # 4. GOLDEN TOUCH: CLARITY & WARMTH
        treble_g = (clarity - 1.0) * 8
        bass_g = (deepness - 1.0) * 6
        filters.append(f"treble=g={1 + treble_g}:f=5500")
        filters.append(f"bass=g={1 + bass_g}:f=150")

        # 5. DYNAMIC COMPRESSION (Vocal Leveling)
        filters.append("compand=attacks=0:points=-80/-80|-20/-12|-10/-10|0/-7|20/-7")
        
        # 6. FINAL GAIN
        filters.append("volume=1.35")

        filter_chain = ",".join(filters)
        
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", str(input_path),
            "-af", filter_chain,
            "-c:a", "pcm_s16le",
            str(output_path)
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.returncode == 0
        except:
            return False

if __name__ == "__main__":
    engine = MasteringEngine()
    print("Diamond Touch Mastering Engine Active.")
