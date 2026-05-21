import os
import sys
import json
import socket
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from concurrent.futures import ThreadPoolExecutor

# --- Enterprise Logging ---
from logging_config import setup_logger
logger = setup_logger("API_SERVER", "api.log")

# --- Environment Setup ---
os.environ["CUDA_VISIBLE_DEVICES"] = ""
BASE_DIR = Path(__file__).parent.parent
STORAGE_DIR = BASE_DIR / "storage"

app = FastAPI(title="NAC Studio v2.0.0 API")
executor = ThreadPoolExecutor(max_workers=5)

# --- Routers ---
from routes import voices, generation
app.include_router(voices.router)
app.include_router(generation.router)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.error(f"API Validation Error: {exc}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

WORKER_PORT = 10101

def send_to_worker_sync(task):
    task_id = task.get("id", "N/A")
    try:
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
        return json.loads(response_str) if response_str else {"status": "error", "message": "No response"}
    except Exception as e:
        logger.error(f"[{task_id}] Worker communication failed: {e}")
        return {"status": "error", "message": str(e)}

async def send_to_worker(task):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, send_to_worker_sync, task)

@app.get("/")
async def root():
    return {"status": "Online", "version": "2.0.0", "codename": "Wonders"}

@app.get("/status")
async def get_status():
    status_file = STORAGE_DIR / "task_status.json"
    if status_file.exists():
        try:
            with open(status_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except: pass
    return {"stage": "Idle"}

@app.get("/version")
async def get_version():
    version_file = BASE_DIR / "version.json"
    if version_file.exists():
        with open(version_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"version": "2.0.0"}

@app.get("/preview-audio")
async def preview_audio(path: str):
    if os.path.exists(path): return FileResponse(path)
    raise HTTPException(status_code=404, detail="Not found")

if __name__ == "__main__":
    import uvicorn
    logger.info("NAC Studio v2.0.0 API Starting on port 8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
