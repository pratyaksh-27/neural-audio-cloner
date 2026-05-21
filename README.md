# 🎙️ NAC Studio: Next-Gen Neural Audio Cloner

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-indigo.svg)](https://www.python.org/)
[![React 18](https://img.shields.io/badge/frontend-React%2018-61dafb.svg)](https://reactjs.org/)
[![GTX 1050 Optimized](https://img.shields.io/badge/GPU-Pascal%20Optimized-green.svg)](https://developer.nvidia.com/cuda-gpus)

**NAC Studio** is a professional-grade, local voice cloning suite built for high-fidelity audio synthesis. Designed specifically for content creators, it leverages the cutting-edge **F5-TTS** architecture to provide zero-shot cloning with unparalleled realism.

---

## ✨ Key Features

*   **Zero-Shot Cloning:** Clone any voice with just 10 seconds of reference audio.
*   **Golden Touch Mastering:** Integrated DSP chain for professional-quality harmonics and clarity.
*   **Bento Box UI:** A minimalist, single-screen control deck for a seamless creative workflow.
*   **Scientific Audio Audit:** Real-time technical analysis (SNR, Noise Floor) for every cloned voice.
*   **Isolated Architecture:** Split-process design (API/Worker) for 100% stability on Pascal-era hardware.
*   **Privacy First:** Entirely local. Your voices and scripts never leave your machine.

---

## ⚙️ Custom Configuration

While NAC Studio is designed to be "zero-config," you can manually override paths (like FFmpeg) for your specific setup:
1.  Copy `backend/config.json.example` to `backend/config.json`.
2.  Edit the `ffmpeg_path` to point to your local installation.
3.  The app will prioritize your custom paths over the defaults.

---

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/neural-audio-cloner.git
    cd neural-audio-cloner
    ```

2.  **Run One-Click Setup:**
    Right-click `setup.ps1` and select "Run with PowerShell". This will automatically:
    *   Install FFmpeg (local build).
    *   Configure Python virtual environment.
    *   Install all AI models and UI dependencies.

3.  **Launch the Studio:**
    ```powershell
    .\scripts\start.ps1
    ```
    Open `http://localhost:5173` in your browser.

---

## 🛠️ Architecture

NAC Studio uses a **Physical Process Isolation** pattern to maintain stability on consumer GPUs:

*   **Process A (API):** A lightweight FastAPI server handling orchestration and file management.
*   **Process B (Worker):** A dedicated Python process owning the CUDA context and performing inference.
*   **Process C (UI):** A modern React/Vite interface with real-time status polling.

---

## 📚 Documentation

*   **[Installation Guide (Layman-Friendly)](docs/INSTALL.md)** - Step-by-step for non-technical users.
*   **[Architecture & Implementation Plan](docs/PLAN.md)** - Technical breakdown of the stack.
*   **[User Guide](docs/USER_GUIDE.md)** - Learn how to master the 'Golden Touch' settings.

---

## 📜 License

This project is licensed under the **GPL-3.0 License**. See the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.
