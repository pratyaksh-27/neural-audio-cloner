import subprocess
import os
from pathlib import Path

class MasteringEngine:
    def __init__(self):
        self.ffmpeg_path = r"E:\workspace-gemini-cli\Tools\ffmpeg-2026-05-11-git-17bc88e67f-essentials_build\bin\ffmpeg.exe"

    def apply_studio_polish(self, input_path: str, output_path: str, clarity: float = 1.0, deepness: float = 1.0):
        """
        Refined Pro-Vocal Mastering:
        Focuses on high-quality pitch shift (Rubberband) and extreme clarity.
        """
        print(f">> MASTERING: Applying Refined Polish (Clarity: {clarity}, Deepness: {deepness})...")
        
        # 1. Base Cleanup
        filters = ["highpass=f=80"]
        
        # 2. PITCH (Deepness) using RUBBERBAND
        # We use a slightly more conservative mapping to avoid any 'vibrations'
        if abs(deepness - 1.0) > 0.01:
            pitch_val = 1.0 / deepness
            filters.append(f"rubberband=pitch={pitch_val}")

        # 3. CLARITY & WARMTH
        # We add a gentle bass/treble tilt instead of complex EQs
        treble_g = (clarity - 1.0) * 8
        bass_g = (deepness - 1.0) * 5
        filters.append(f"treble=g={2 + treble_g}:f=5000")
        filters.append(f"bass=g={1 + bass_g}:f=150")

        # 4. COMPRESSION (Standard stable compand)
        # Threshold at -20dB ensures constant professional volume
        filters.append("compand=attacks=0:points=-80/-80|-20/-12|-10/-10|0/-7|20/-7")
        
        # 5. FINAL PEAK NORMALIZATION
        filters.append("volume=1.4")

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
            if result.returncode == 0:
                print(">> MASTERING: Pro Polish Successful.")
                return True
            else:
                print(f">> MASTERING FAILED: {result.stderr}")
                return False
        except Exception as e:
            print(f">> MASTERING EXCEPTION: {e}")
            return False

if __name__ == "__main__":
    engine = MasteringEngine()
    print("Refined Mastering Engine Ready.")
