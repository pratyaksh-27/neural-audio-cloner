import os
import sys
import time
import shutil
import uuid
from pathlib import Path
from multiprocessing import Process, Queue, Event

# --- 1. THE ML WORKER (Runs in its own process, away from FastAPI) ---
def ml_worker_process(task_queue, result_queue, stop_event, cache_dir):
    # Set environment variables for this process
    os.environ["HF_HOME"] = str(Path(cache_dir) / "huggingface")
    os.environ["XDG_CACHE_HOME"] = str(Path(cache_dir) / "xdg")
    os.environ["CUDA_MODULE_LOADING"] = "LAZY"

    print(">> WORKER: Initializing ML Stack...")
    try:
        import torch
        from f5_tts.api import F5TTS
        from audio_processing import AudioProcessor
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        processor = AudioProcessor()
        f5tts = F5TTS(device=device)
        print(f">> WORKER: Ready on {device}.")
        
        while not stop_event.is_set():
            if not task_queue.empty():
                task = task_queue.get()
                task_type = task.get("type")
                
                try:
                    if task_type == "upload":
                        cleaned = processor.clean_audio(task["input"], task["output_dir"])
                        norm = processor.normalize_audio(cleaned, task["final_path"])
                        result_queue.put({"id": task["id"], "status": "success", "path": norm})
                        
                    elif task_type == "generate":
                        f5tts.infer(
                            ref_file=task["ref_file"],
                            ref_text=task["ref_text"],
                            gen_text=task["gen_text"],
                            speed=task["speed"],
                            file_wave=task["output_path"]
                        )
                        result_queue.put({"id": task["id"], "status": "success", "path": task["output_path"]})
                        
                    elif task_type == "transcribe":
                        text = f5tts.transcribe(task["path"])
                        result_queue.put({"id": task["id"], "status": "success", "text": text})
                        
                except Exception as e:
                    print(f">> WORKER ERROR: {e}")
                    result_queue.put({"id": task["id"], "status": "error", "message": str(e)})
            
            time.sleep(0.1)
            
    except Exception as e:
        print(f">> WORKER FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()

# --- 2. THE API (CPU Only, communicates with Worker) ---
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

# Globals for IPC
task_queue = Queue()
result_queue = Queue()
stop_event = Event()
worker_process = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global worker_process
    worker_process = Process(
        target=ml_worker_process, 
        args=(task_queue, result_queue, stop_event, CACHE_DIR),
        daemon=True
    )
    worker_process.start()
    yield
    stop_event.set()
    worker_process.join(timeout=5)

BASE_DIR = Path(__file__).parent.parent
CACHE_DIR = BASE_DIR / "models" / "cache"
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
VOICES_DIR = BASE_DIR / "storage" / "voices"

app = FastAPI(title="Neural Audio Cloner API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

async def wait_for_result(task_id, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        # Check if result is in queue
        temp_results = []
        found_result = None
        while not result_queue.empty():
            res = result_queue.get()
            if res["id"] == task_id:
                found_result = res
                break
            temp_results.append(res)
        
        # Put back other results
        for r in temp_results: result_queue.put(r)
        
        if found_result: return found_result
        time.sleep(0.5)
    raise TimeoutError("ML task timed out")

@app.get("/")
async def root():
    return {"status": "Online", "worker_alive": worker_process.is_alive() if worker_process else False}

@app.post("/upload-voice")
async def upload_voice(file: UploadFile = File(...)):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    task_id = str(uuid.uuid4())
    temp_input = UPLOAD_DIR / f"raw_{task_id}_{file.filename}"
    
    with temp_input.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    final_path = str(UPLOAD_DIR / f"ready_{task_id}.wav")
    task_queue.put({
        "id": task_id, 
        "type": "upload", 
        "input": str(temp_input), 
        "output_dir": str(UPLOAD_DIR / "processed"),
        "final_path": final_path
    })
    
    try:
        res = await wait_for_result(task_id)
        if res["status"] == "success":
            return {"status": "success", "temp_path": res["path"], "original_filename": file.filename}
        raise HTTPException(status_code=500, detail=res["message"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/confirm-voice")
async def confirm_voice(voice_name: str = Form(...), temp_path: str = Form(...), ref_text: str = Form("")):
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    voice_dir = VOICES_DIR / voice_name.replace(" ", "_")
    voice_dir.mkdir(parents=True, exist_ok=True)
    final_ref = voice_dir / "ref.wav"
    shutil.move(temp_path, str(final_ref))
    
    if not ref_text:
        task_id = str(uuid.uuid4())
        task_queue.put({"id": task_id, "type": "transcribe", "path": str(final_ref)})
        res = await wait_for_result(task_id)
        ref_text = res["text"]
        
    with (voice_dir / "meta.txt").open("w", encoding="utf-8") as f:
        f.write(ref_text)
    return {"status": "success", "voice_name": voice_name, "transcription": ref_text}

@app.get("/voices")
async def list_voices():
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    voices = [d.name for d in VOICES_DIR.iterdir() if d.is_dir() and (d / "ref.wav").exists()]
    return {"voices": voices}

@app.post("/generate")
async def generate(voice_name: str = Form(...), text: str = Form(...), speed: float = Form(1.0)):
    task_id = str(uuid.uuid4())
    voice_dir = VOICES_DIR / voice_name
    ref_file = voice_dir / "ref.wav"
    with (voice_dir / "meta.txt").open("r", encoding="utf-8") as f: ref_text = f.read()
    
    output_path = str(UPLOAD_DIR / f"gen_{task_id}.wav")
    task_queue.put({
        "id": task_id,
        "type": "generate",
        "ref_file": str(ref_file),
        "ref_text": ref_text,
        "gen_text": text,
        "speed": speed,
        "output_path": output_path
    })
    
    res = await wait_for_result(task_id)
    if res["status"] == "success":
        return FileResponse(res["path"], media_type="audio/wav")
    raise HTTPException(status_code=500, detail=res["message"])

@app.get("/preview-audio")
async def preview_audio(path: str):
    if os.path.exists(path): return FileResponse(path)
    raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    import uvicorn
    # Important for Windows multiprocessing with FastAPI
    from multiprocessing import freeze_support
    freeze_support()
    uvicorn.run(app, host="0.0.0.0", port=8000)
