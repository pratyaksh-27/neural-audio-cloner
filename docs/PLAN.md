# Architecture & Implementation Plan: NAC Studio

## Objective
Create a professional-grade, local voice cloning studio with 90%+ realism and studio-quality mastering for social media content.

## Final Architecture
### 1. Process Isolation (Isolated Node Pattern)
To prevent driver crashes on Pascal-era hardware (GTX 1050), the system uses physical process isolation:
- **API Server (CPU):** Handles all HTTP requests, file system operations, and status polling.
- **ML Worker (GPU):** A dedicated background process that owns the CUDA memory and performs the heavy lifting (Inference, Vocoding).
- **Socket Bridge:** The processes communicate via an internal 127.0.0.1:10101 link.

### 2. Audio Processing Pipeline
- **Reference Limit:** Strict 10-second hard-trim to ensure 1:1 transcription sync and prevent the 'speed-up' bug.
- **Dual-Stage Cleaning:** Sequential cleaning using DeepFilterNet3 (CPU) followed by Demucs (CPU) for perfect vocal isolation.
- **Golden Touch Mastering:** A professional DSP chain implemented via FFmpeg and Rubberband:
    - Harmonic Excitement (Saturation)
    - Dynamic Companding (Vocal Leveling)
    - Rubberband Pitch Shifting (Natural pitch modification without vibrations)

### 3. Enterprise Observability
- **Structured Logging:** Centralized logging with rolling files and timestamps.
- **Live Status Tracker:** A storage-synchronized JSON pulse that provides real-time progress (Initializing -> Generating -> Polishing -> Idle).

## Completed Phases
- [x] **Phase 1: Environment Stability** (Pascal Fix, CUDA 12.1 redirection).
- [x] **Phase 2: Process Bridge** (Socket-based communication).
- [x] **Phase 3: Mastering Engine** (The 'Golden Touch' harmonics).
- [x] **Phase 4: Bento UI** (Horizontal single-screen Control Deck).
- [x] **Phase 5: Enterprise Logging** (Correlation IDs and Persistent logs).
- [x] **Phase 6: v2.0.0 Wonders Release** (Block Editor, GPU Mutex, Diamond Touch).

## Active Roadmap: v3.0.0 "The Infinite Canvas"
- [ ] **Phase 7: Per-Block Settings** (Decentralizing global state to individual script segments).
- [ ] **Phase 8: Studio Pro Layout** (Light theme, 1200px Document Canvas, 70px Icon Rail).
- [ ] **Phase 9: Gutter Interactions** (Seamless hover-triggered Split and Join mechanics).
- [ ] **Phase 10: Smart Paste Tray** (Contextual import preferences without pop-up dialogs).

## Key Files
*   **`backend/api_server.py`**: Entry point for all UI communication.
*   **`backend/ml_worker.py`**: The GPU-bound AI brain.
*   **`backend/mastering_engine.py`**: The high-fidelity audio polisher.
*   **`backend/logging_config.py`**: The enterprise logging hub.
