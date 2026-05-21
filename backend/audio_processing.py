import os
import sys
import subprocess
import numpy as np
from pathlib import Path

class AudioProcessor:
    def __init__(self, model_name="htdemucs"):
        self.model_name = model_name
        self._device = None
        
        # Load config for portability
        # Use .parent.parent because this file is in backend/
        project_root = Path(__file__).parent.parent
        config_path = Path(__file__).parent / "config.json"
        
        # Default relative path from PROJECT ROOT
        default_ffmpeg_rel = "Tools/ffmpeg/bin/ffmpeg.exe"
        self.ffmpeg_path = str(project_root / default_ffmpeg_rel)
        
        if config_path.exists():
            try:
                import json
                with open(config_path, "r") as f:
                    config = json.load(f)
                    raw_path = config.get("ffmpeg_path")
                    if raw_path:
                        if os.path.isabs(raw_path):
                            self.ffmpeg_path = raw_path
                        else:
                            # Resolve relative paths against project root
                            self.ffmpeg_path = str(project_root / raw_path)
            except Exception as e:
                print(f">> CONFIG LOAD FAILED: {e}. Using default.")
        
    @property
    def device(self):
        if self._device is None:
            import torch
            self._device = "cuda" if torch.cuda.is_available() else "cpu"
        return self._device

    def _standardize_audio(self, input_path: Path, output_path: Path):
        """
        Converts input and trims silence from start/end to prevent AI hallucinations.
        """
        print(f">> Standardizing and Trimming silence...")
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", str(input_path),
            "-ar", "24000",
            "-ac", "1",
            "-af", "silenceremove=start_periods=1:start_threshold=-50dB:stop_periods=-1:stop_threshold=-50dB",
            "-c:a", "pcm_s16le",
            str(output_path)
        ]
        subprocess.run(cmd, capture_output=True, check=True)
        return output_path
        
    def clean_audio(self, input_path: str, output_dir: str):
        """
        Reference Processor with Strict 10-Second Limit + Silence Trimming.
        """
        input_path = Path(input_path)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        python_exe = sys.executable

        import torch
        import torchaudio
        import torchaudio.functional as AF

        # --- STAGE 0: Standardize & Trim Silence ---
        std_path = output_dir / f"std_{input_path.stem}.wav"
        try:
            self._standardize_audio(input_path, std_path)
        except:
            std_path = input_path

        # --- STAGE 1: Load and Hard-Trim to 10s ---
        data, rate = torchaudio.load(std_path)
        max_samples = 10 * rate
        if data.shape[-1] > max_samples:
            data = data[:, :max_samples]
        
        trimmed_path = output_dir / f"trimmed_{input_path.name}"
        torchaudio.save(trimmed_path, data, rate)

        # --- STAGE 2: DeepFilterNet ---
        df_output_dir = output_dir / "stage1_df"
        df_output_dir.mkdir(parents=True, exist_ok=True)
        print(f">> STAGE 1: DeepFilterNet...")
        # Force DeepFilterNet to CPU to avoid GTX 1050 memory conflicts
        df_cmd = [
            python_exe, "-m", "df.enhance", 
            "--device", "cpu", 
            str(trimmed_path), 
            "-o", str(df_output_dir)
        ]
        subprocess.run(df_cmd, capture_output=True)
        
        df_filename = f"{trimmed_path.stem}_DeepFilterNet3.wav"
        stage1_path = df_output_dir / df_filename
        if not stage1_path.exists(): stage1_path = trimmed_path

        # --- STAGE 3: Demucs ---
        stage2_output_dir = output_dir / "stage2_demucs"
        stage2_output_dir.mkdir(parents=True, exist_ok=True)
        print(f">> STAGE 2: Demucs...")
        subprocess.run([python_exe, "-m", "demucs.separate", "-n", self.model_name, "--two-stems", "vocals", "-d", "cpu", str(stage1_path), "-o", str(stage2_output_dir)], capture_output=True)
        
        stage2_path = stage2_output_dir / self.model_name / stage1_path.stem / "vocals.wav"
        if not stage2_path.exists(): stage2_path = stage1_path

        # --- STAGE 4: Final 24kHz Normalization ---
        data, rate = torchaudio.load(stage2_path)
        if rate != 24000:
            data = AF.resample(data, rate, 24000)
            rate = 24000
        
        data = AF.highpass_biquad(data, rate, 80.0)
        final_path = output_dir / f"ready_ref_{input_path.stem}.wav"
        torchaudio.save(final_path, data, rate)

        return str(final_path)

    def normalize_audio(self, input_path: str, output_path: str, target_db=-20.0):
        import torch
        import torchaudio
        data, rate = torchaudio.load(input_path)
        rms = torch.sqrt(torch.mean(data**2))
        if rms > 0.0001:
            scalar = 10**(target_db / 20) / (rms + 1e-9)
            data = data * scalar
        data = torch.clamp(data, -1.0, 1.0)
        torchaudio.save(output_path, data, rate)
        return output_path
