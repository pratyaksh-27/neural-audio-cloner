import os
import sys
import time
import json
import socket
import shutil
import gc
import threading
from pathlib import Path

# --- 1. STRICT ENVIRONMENT SETUP ---
try:
    BASE_DIR = Path(__file__).parent.parent
    CACHE_DIR = BASE_DIR / "models" / "cache"
    STORAGE_DIR = BASE_DIR / "storage"
    STATUS_FILE = STORAGE_DIR / "task_status.json"

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    os.environ["HF_HOME"] = str(CACHE_DIR / "huggingface")
    os.environ["XDG_CACHE_HOME"] = str(CACHE_DIR / "xdg")
    
    # Fix for 'Python has stopped working' hard crashes on Windows
    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
    os.environ["CUDA_MODULE_LOADING"] = "LAZY" 

    # NEW: Global Lock to prevent OOM on GTX 1050
    GPU_LOCK = threading.Lock()

    # --- NEW: Enterprise Logging ---
    from logging_config import setup_logger
    logger = setup_logger("ML_WORKER", "worker.log")

    def write_status(stage, detail="", progress=0):
        try:
            logger.info(f"STATUS UPDATE: [{stage}] {detail} ({progress}%)")
            temp_status = STATUS_FILE.with_suffix(".tmp")
            with open(temp_status, "w", encoding="utf-8") as f:
                json.dump({
                    "stage": stage, 
                    "detail": detail, 
                    "progress": progress, 
                    "pulse": time.time()
                }, f)
            if os.path.exists(STATUS_FILE): os.remove(STATUS_FILE)
            os.rename(temp_status, STATUS_FILE)
        except Exception as e:
            if 'logger' in globals():
                logger.error(f"Status Write Failure: {e}")

    # Initial status
    write_status("Idle")

    logger.info("--- NAC ENTERPRISE WORKER v2.0 STARTING ---")

    # --- 2. TOP-LEVEL STABLE IMPORTS ---
    logger.info("Importing heavy AI libraries (Torch, Transformers)...")
    write_status("Initializing", "Loading AI engines...")
    import torch
    from transformers import pipeline
    
    logger.info("Loading F5-TTS components...")
    from f5_tts.api import F5TTS
    import f5_tts.infer.utils_infer as utils_infer
    
    # Force Monkey-patching ASR to Tiny-Whisper on CPU
    logger.info("Configuring CPU-based Transcription (Whisper-Tiny)...")
    utils_infer.asr_pipe = pipeline("automatic-speech-recognition", model="openai/whisper-tiny", device="cpu")

    logger.info("Loading Studio Tools...")
    from audio_processing import AudioProcessor
    from verify_audio import AudioAuditor
    from mastering_engine import MasteringEngine
    
    processor = AudioProcessor()
    auditor = AudioAuditor()
    mastering = MasteringEngine()

    logger.info("Initializing F5-TTS weights on CUDA device...")
    write_status("Initializing", "Preparing GPU memory...")
    f5tts = F5TTS(device="cuda")
    logger.info(f"Worker Ready! AI models active on {f5tts.device}")
    write_status("Idle")

    # --- 3. SOCKET LOOP ---
    WORKER_PORT = 10101
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('127.0.0.1', WORKER_PORT))
    server.listen(1)
    logger.info(f"Enterprise Listener active on 127.0.0.1:{WORKER_PORT}")

    STYLE_SPEEDS = {
        "Calm": 0.85, "Professional": 0.95, "Dark Cinematic": 0.8,
        "Energetic": 1.1, "Whisper": 0.8, "Storyteller": 0.9, "Default": 1.0
    }

    while True:
        conn, addr = server.accept()
        t_id = "N/A"
        try:
            raw_data = conn.recv(65536).decode('utf-8')
            if not raw_data: continue
            task = json.loads(raw_data)
            t_id = task.get("id", "Unknown")
            t_type = task.get("type")
            
            logger.info(f"[{t_id}] Incoming {t_type} request")
            
            if t_type == "upload":
                write_status("Processing", "Standardizing audio...", 10)
                cleaned = processor.clean_audio(task["input"], task["output_dir"])
                write_status("Processing", "Quality audit...", 50)
                audit_res = auditor.audit(cleaned)
                write_status("Processing", "Transcribing...", 80)
                text = f5tts.transcribe(cleaned)
                res = {"status": "success", "path": cleaned, "audit": audit_res, "transcription": text}
                write_status("Idle")
                
            elif t_type == "generate":
                with GPU_LOCK:
                    style = task.get("style", "Default")
                    clarity = task.get("clarity", 1.0)
                    deepness = task.get("deepness", 1.0)
                    sibilance = task.get("sibilance", 0.5)
                    final_speed = task.get("speed", 1.0) * STYLE_SPEEDS.get(style, 1.0)
                    
                    logger.info(f"[{t_id}] Generating block (Style: {style})")
                    write_status("Generating", f"Block: {t_id[:8]}...", progress=40)
                    
                    raw_output = task["output_path"].replace(".wav", "_raw.wav")
                    
                    f5tts.infer(
                        ref_file=task["ref_file"],
                        ref_text=task["ref_text"],
                        gen_text=task["gen_text"],
                        speed=final_speed,
                        nfe_step=task.get("nfe_step", 32),
                        file_wave=raw_output
                    )
                    
                    write_status("Polishing", "Applying Studio Mastering...", progress=90)
                    master_success = mastering.apply_studio_polish(raw_output, task["output_path"], clarity=clarity, deepness=deepness, sibilance=sibilance)
                    
                    if not master_success:
                        shutil.move(raw_output, task["output_path"])
                    elif os.path.exists(raw_output):
                        os.remove(raw_output)
                    
                    res = {"status": "success", "path": task["output_path"]}
                    logger.info(f"[{t_id}] Block mastered successfully")
                    write_status("Idle")
                    
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                        gc.collect()
            
            elif t_type == "glue_project":
                logger.info(f"[{t_id}] Gluing {len(task['paths'])} blocks...")
                write_status("Exporting", "Stitching audio blocks...", 50)
                
                output_path = task["output_path"]
                concat_list = Path(output_path).with_suffix(".txt")
                with open(concat_list, "w") as f:
                    for p in task["paths"]:
                        safe_p = p.replace('\\', '/')
                        f.write(f"file '{safe_p}'\n")
                
                cmd = [
                    processor.ffmpeg_path, "-y", "-f", "concat", "-safe", "0",
                    "-i", str(concat_list), "-c", "copy", output_path
                ]
                import subprocess
                subprocess.run(cmd, capture_output=True)
                if os.path.exists(concat_list): os.remove(concat_list)
                
                res = {"status": "success", "path": output_path}
                write_status("Idle")

            else:
                res = {"status": "error", "message": "Unknown task type"}
            
            conn.send(json.dumps(res).encode('utf-8'))
        except Exception as task_e:
            logger.error(f"[{t_id}] TASK ERROR: {task_e}")
            write_status("Idle", f"Error: {str(task_e)}")
            try:
                conn.send(json.dumps({"status": "error", "message": str(task_e)}).encode('utf-8'))
            except: pass
        finally:
            conn.close()

except Exception as e:
    # If the logger failed to initialize, use print
    print(f"\nFATAL CRASH: {e}")
    import traceback
    traceback.print_exc()
    # Write to a crash file in root if possible
    try:
        with open("crash_report.txt", "w") as f:
            f.write(f"FATAL ERROR: {str(e)}\n")
            f.write(traceback.format_exc())
    except: pass
