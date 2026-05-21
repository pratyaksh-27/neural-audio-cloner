# 🛠️ Step-by-Step Installation Guide

Welcome to **NAC Studio**! This guide is designed for absolute beginners. Follow these steps to get your local voice cloning studio up and running.

## Prerequisites

Before starting, ensure you have these two things installed on your computer:
1.  **Python (3.10 or higher):** [Download here](https://www.python.org/downloads/windows/). *Important: Check the box "Add Python to PATH" during installation.*
2.  **Node.js:** [Download here](https://nodejs.org/).

---

## 🚀 Installation Steps

### 1. Download the Project
Click the green **Code** button on GitHub and select **Download ZIP**. Extract the folder to a place on your computer (e.g., your Desktop).

### 2. Run the One-Click Setup
1. Open the extracted `neural-audio-cloner` folder.
2. Find the file named `setup.ps1`.
3. **Right-click** it and select **Run with PowerShell**.
4. A blue window will open. It will automatically download FFmpeg and set up the AI engines. This might take 5-10 minutes depending on your internet speed.

### 3. Launch the Studio
Once the setup window closes:
1. Find the `scripts` folder.
2. **Right-click** `start.ps1` and select **Run with PowerShell**.
3. A few windows will open (don't close them!).
4. Open your web browser and go to: `http://localhost:5173`

---

## 🎙️ Your First Voice Clone

1. Go to the **Voice Cloning** tab.
2. Read the script on the screen aloud for exactly 10 seconds.
3. Click **Clean & Verify**.
4. Once processed, type a name for the voice and click **Save**.
5. Switch to the **Audio Studio** tab to start generating speech!

---

## ❓ Troubleshooting

*   **"Python not found":** You likely forgot to check "Add Python to PATH" during installation. Re-install Python and make sure that box is checked.
*   **"Mic Access Denied":** Ensure your browser has permission to use your microphone in your Windows Privacy Settings.
*   **"NVIDIA Driver Error":** This app requires an NVIDIA GPU. Ensure your drivers are up to date.

---

## 🛡️ Important Safety Note
This software is for personal, creative use. Always ensure you have permission to clone a voice. Do not use this tool to create misleading or harmful content.
