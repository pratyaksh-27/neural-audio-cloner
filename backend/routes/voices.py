from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import os
import shutil
import uuid
import logging
from concurrent.futures import ThreadPoolExecutor

router = APIRouter(tags=["Voices"])
logger = logging.getLogger("API_SERVER")

# Access globals from the main app context
BASE_DIR = Path(__file__).parent.parent.parent
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
VOICES_DIR = BASE_DIR / "storage" / "voices"

@router.post("/upload-voice")
async def upload_voice(file: UploadFile = File(...)):
    from api_server import send_to_worker # Import here to avoid circularity
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

@router.post("/confirm-voice")
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

@router.get("/voices")
async def list_voices():
    VOICES_DIR.mkdir(parents=True, exist_ok=True)
    return {"voices": [d.name for d in VOICES_DIR.iterdir() if d.is_dir() and (d / "ref.wav").exists()]}

@router.delete("/delete-voice/{voice_name}")
async def delete_voice(voice_name: str):
    logger.warning(f"Deleting Voice Identity: {voice_name}")
    voice_dir = VOICES_DIR / voice_name.replace(" ", "_")
    if voice_dir.exists():
        shutil.rmtree(voice_dir)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Not found")
