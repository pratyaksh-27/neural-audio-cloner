import torch
import torchaudio
import numpy as np
from pathlib import Path

class AudioAuditor:
    def __init__(self):
        pass

    def audit(self, file_path: str):
        """
        Performs a scientific audit of the audio file to ensure it meets 
        'Studio Mark' standards for high-fidelity voice cloning.
        """
        path = Path(file_path)
        if not path.exists():
            return {"status": "error", "message": "File not found"}

        data, rate = torchaudio.load(file_path)
        
        # 1. Sample Rate Check
        # F5-TTS works best at 24kHz. High-end is 44.1/48kHz.
        rate_score = 100 if rate >= 24000 else (rate / 24000) * 100
        
        # 2. Clipping Detection
        # Check if audio is hitting the ceiling (distorted)
        clipping_count = torch.sum(torch.abs(data) >= 0.99).item()
        clipping_percent = (clipping_count / data.numel()) * 100
        clipping_score = max(0, 100 - (clipping_percent * 10)) # 1% clipping = 90 score

        # 3. Dynamic Range & Energy
        rms = torch.sqrt(torch.mean(data**2)).item()
        peak = torch.max(torch.abs(data)).item()
        # Ideal RMS for cloning is between -25dB and -15dB
        db_rms = 20 * np.log10(rms + 1e-9)
        if -25 <= db_rms <= -15:
            energy_score = 100
        else:
            energy_score = max(0, 100 - abs(db_rms - (-20)) * 5)

        # 4. Silence Purity (Artifact Check)
        # Check the energy of the quietest parts to ensure 'chrr' noise is gone
        # We look at the bottom 10th percentile of frame energy
        hop = int(rate * 0.02) # 20ms frames
        frames = data[0].unfold(0, hop, hop)
        frame_rms = torch.sqrt(torch.mean(frames**2, dim=1))
        silence_level = torch.quantile(frame_rms, 0.1).item()
        db_silence = 20 * np.log10(silence_level + 1e-9)
        
        # Studio standard is below -50dB for silence
        if db_silence < -50:
            silence_score = 100
        else:
            silence_score = max(0, 100 - (db_silence - (-50)) * 4)

        # 5. Signal-to-Noise Ratio (SNR) Estimate
        # Comparing peak speech energy to silence floor
        speech_level = torch.quantile(frame_rms, 0.9).item()
        snr = 20 * np.log10((speech_level / (silence_level + 1e-9)) + 1e-9)
        snr_score = min(100, (snr / 40) * 100) # 40dB SNR = 100%

        # Final "Studio Mark" Calculation
        total_score = (rate_score * 0.1) + (clipping_score * 0.2) + (energy_score * 0.2) + (silence_score * 0.25) + (snr_score * 0.25)

        return {
            "status": "success",
            "studio_mark_score": round(total_score, 1),
            "details": {
                "sample_rate_hz": rate,
                "clipping_detected": clipping_percent > 0.1,
                "rms_level_db": round(db_rms, 1),
                "noise_floor_db": round(db_silence, 1),
                "snr_estimate_db": round(snr, 1)
            },
            "verdict": "Studio Grade" if total_score >= 85 else "Acceptable" if total_score >= 70 else "Poor (Noise detected)"
        }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        auditor = AudioAuditor()
        print(auditor.audit(sys.argv[1]))
