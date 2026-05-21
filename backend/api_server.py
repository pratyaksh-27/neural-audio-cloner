import os
import sys
import shutil
import uuid
import json
import socket
import asyncio
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from concurrent.futures import ThreadPoolExecutor

# --- NEW: Enterprise Logging ---
from logging_config import setup_logger
logger = setup_logger("API_SERVER", "api.log")

os.environ["CUDA_VISIBLE_DEVICES"] = ""

BASE_DIR = Path(__file__).parent.parent
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
VOICES_DIR = BASE_DIR / "storage" / "voices"
STORAGE_DIR = BASE_DIR / "storage"

app = FastAPI(title="Neural Audio Cloner API")
executor = ThreadPoolExecutor(max_workers=5)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.error(f"API Validation Error: {exc} | Body: {await request.body()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors(), "body": exc.body})

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

WORKER_PORT = 10101

def send_to_worker_sync(task):
    task_id = task.get("id", str(uuid.uuid4()))
    task["id"] = task_id
    try:
        logger.info(f"[{task_id}] Dispatching {task.get('type')} task to worker...")
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        client.settimeout(3600)
        client.connect(('127.0.0.1', WORKER_PORT))
        client.send(json.dumps(task).encode('utf-8'))

        chunks = []
        while True:
            chunk = client.recv(32768)
            if not chunk: break
            chunks.append(chunk)

        response_str = b"".join(chunks).decode('utf-8')
        client.close()
        
        if response_str:
            res = json.loads(response_str)
            logger.info(f"[{task_id}] Worker response: {res.get('status')}")
            return res
        return {"status": "error", "message": "No response from worker"}
    except Exception as e:
        logger.error(f"[{task_id}] Communication Failure: {e}")
        return {"status": "error", "message": str(e)}

async def send_to_worker(task):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, send_to_worker_sync, task)

@app.get("/")
async def root():
    return {"status": "Online", "mode": "Enterprise Isolated (CPU-API)"}

@app.get("/status")
async def get_status():
    status_file = STORAGE_DIR / "task_status.json"
    if status_file.exists():
        try:
            with open(status_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read status file: {e}") 
    return {"stage": "Idle"}

@app.get("/version")
async def get_version():
    version_file = BASE_DIR / "version.json"
    if version_file.exists():
        try:
            with open(version_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read version file: {e}")
    return {"version": "Unknown"}

@app.post("/upload-voice")
async def upload_voice(file: UploadFile = File(...)):
    logger.info(f"New Voice Upload Request: {file.filename}")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    task_id = str(uuid.uuid4())
    temp_input = UPLOAD_DIR / f"raw_{task_id}_{file.filename}"
    with temp_input.open("wb") as buffer: shutil.copyfileobj(file.file, buffer)
    
    res = await send_to_worker({
        "id": task_id,
        "type": "upload", 
        "input": str(temp_input), 
        "output_dir": str(UPLOAD_DIR / "processed"), 
        "final_path": str(UPLOAD_DIR / f"ready_{task_id}.wav")
    })
    
    if res["status"] == "success":
        return {"status": "success", "temp_path": res["path"], "original_filename": file.filename, "studio_mark": res.get("audit"), "transcription": res.get("transcription")}
    raise HTTPException(status_code=500, detail=res.get("message"))

@app.post("/confirm-voice")
async def confirm_voice(voice_name: str = Form(...), temp_path: str = Form(...), ref_text: str = Form("")):
    logger.info(f"Confirming Voice Identity: {voice_name}")
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    voice_dir = VOICES_DIR / voice_name.replace(" ", "_")
    voice_dir.mkdir(parents=True, exist_ok=True)
    final_ref = voice_dir / "ref.wav"
    if not os.path.exists(temp_path): 
        logger.error(f"Confirmation failed: {temp_path} not found")
        raise HTTPException(status_code=400, detail="Temp file missing")
    shutil.move(temp_path, str(final_ref))
    with (voice_dir / "meta.txt").open("w", encoding="utf-8") as f: f.write(ref_text)
    return {"status": "success", "voice_name": voice_name}

@app.get("/voices")
async def list_voices():
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    return {"voices": [d.name for d in VOICES_DIR.iterdir() if d.is_dir() and (d / "ref.wav").exists()]}

@app.delete("/delete-voice/{voice_name}")
async def delete_voice(voice_name: str):
    logger.warning(f"Deleting Voice Identity: {voice_name}")
    voice_dir = VOICES_DIR / voice_name.replace(" ", "_")
    if voice_dir.exists():
        shutil.rmtree(voice_dir)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Not found")

@app.post("/generate")
async def generate(
    voice_name: str = Form(...), text: str = Form(...), speed: float = Form(1.0),
    nfe_step: int = Form(32), style: str = Form("Default"),
    clarity: float = Form(1.0), deepness: float = Form(1.0)
):
    task_id = str(uuid.uuid4())
    logger.info(f"[{task_id}] Studio Generation Start: {voice_name} | Style: {style}")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    voice_dir = VOICES_DIR / voice_name.replace(" ", "_")
    if not (voice_dir / "ref.wav").exists(): 
        logger.error(f"[{task_id}] Generation failed: Voice {voice_name} missing")
        raise HTTPException(status_code=404, detail="Voice missing")
    with (voice_dir / "meta.txt").open("r", encoding="utf-8") as f: ref_text = f.read()

    res = await send_to_worker({
        "id": task_id,
        "type": "generate", "ref_file": str(voice_dir / "ref.wav"), "ref_text": ref_text,
        "gen_text": text, "speed": speed, "nfe_step": nfe_step, "style": style,
        "clarity": clarity, "deepness": deepness,
        "output_path": str(UPLOAD_DIR / f"gen_{task_id}.wav"),
        "voice_name": voice_name
    })

    if res["status"] == "success": 
        logger.info(f"[{task_id}] Generation complete: {res['path']}")
        return FileResponse(res["path"], media_type="audio/wav")
    
    logger.error(f"[{task_id}] Generation error: {res.get('message')}")
    raise HTTPException(status_code=500, detail=res.get("message"))

@app.get("/preview-audio")
async def preview_audio(path: str):
    if os.path.exists(path): return FileResponse(path)
    raise HTTPException(status_code=404, detail="Not found")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Enterprise API Server on port 8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
