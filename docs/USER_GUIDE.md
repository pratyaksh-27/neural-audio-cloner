# User & Operator Guide: NAC Studio

This guide provides instructions on how to operate and maintain the NAC Studio voice cloning system.

## System Workflow

### 1. Launching the Studio
Always use the provided scripts to ensure both the API and the ML Worker start in the correct order.
- **Start:** `.\scripts\start.ps1` (Launches UI on 5173, API on 8000, Worker on 10101)
- **Stop:** `.\scripts\stop.ps1` (Safely kills all child processes and releases GPU memory)

### 2. Voice Cloning (The 10-Second Rule)
For maximum realism and to prevent synchronization issues:
1.  **Recording:** Click **Record** and read the script provided.
2.  **Duration:** Aim for exactly **10 seconds**. The system will hard-trim anything beyond 10 seconds for stability.
3.  **Verification:** Click **Clean & Verify**. The system will perform:
    - Background noise removal (DeepFilterNet3)
    - Vocal isolation (Demucs)
    - Scientific Audio Audit (SNR and Noise Floor check)
4.  **Confirmation:** If the **Audio Score** is high, enter an **Identity Name** and click **Save Voice Identity**.

### 3. Speech Studio (The Golden Touch)
Once a voice is cloned, use the Studio tab for high-fidelity generation:
- **Style Selection:** Choose from moods like 'Narration', 'Energetic', or 'Dark Cinematic'.
- **Golden Touch Sliders:** 
    - **Deepness:** Adds bass harmonics for a "radio voice" feel.
    - **Clarity:** Increases treble excitement for better intelligibility.
- **Generation:** Click **Generate Studio Audio**. Watch the **Worker Status** in the sidebar for real-time progress.

## Maintenance & Observability

### Logging (Enterprise Grade)
If you encounter errors, check the persistent logs in `storage/logs/`:
- `api.log`: Web server requests and errors.
- `worker.log`: GPU inference status and AI model loading.

### Troubleshooting
- **Status Stuck on "Initializing":** The ML Worker is downloading weights or allocating VRAM. Wait 30-60 seconds.
- **Win32 Error:** Ensure no other process is using the GPU. Run `.\scripts\stop.ps1` and try again.
- **Slow Generation:** On a GTX 1050, generation takes ~2x real-time (a 30s script takes 60s to generate).

## Professional Aesthetic Note
The UI is a **Bento Box Control Deck**. It is designed to fit on a single 1080p screen. If components are overlapping, ensure your browser zoom is at 100%.
