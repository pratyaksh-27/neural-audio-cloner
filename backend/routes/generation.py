from fastapi import APIRouter, Form, HTTPException, Body
from fastapi.responses import FileResponse
from pathlib import Path
import os
import uuid
import logging
from typing import List

router = APIRouter(tags=["Generation"])
logger = logging.getLogger("API_SERVER")

BASE_DIR = Path(__file__).parent.parent.parent
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
VOICES_DIR = BASE_DIR / "storage" / "voices"

@router.post("/generate")
async def generate(
    voice_name: str = Form(...), text: str = Form(...), speed: float = Form(1.0),
    nfe_step: int = Form(32), style: str = Form("Default"),
    clarity: float = Form(1.0), deepness: float = Form(1.0),
    sibilance: float = Form(0.5)
):
    from api_server import send_to_worker
    task_id = str(uuid.uuid4())
    logger.info(f"[{task_id}] Block Generation: {voice_name}")
    
    voice_dir = VOICES_DIR / voice_name.replace(" ", "_")
    if not (voice_dir / "ref.wav").exists(): 
        raise HTTPException(status_code=404, detail="Voice missing")
    with (voice_dir / "meta.txt").open("r", encoding="utf-8") as f: ref_text = f.read()

    res = await send_to_worker({
        "id": task_id,
        "type": "generate", "ref_file": str(voice_dir / "ref.wav"), "ref_text": ref_text,
        "gen_text": text, "speed": speed, "nfe_step": nfe_step, "style": style,
        "clarity": clarity, "deepness": deepness, "sibilance": sibilance,
        "output_path": str(UPLOAD_DIR / f"chunk_{task_id}.wav"),
        "voice_name": voice_name
    })

    if res["status"] == "success": 
        # Return metadata instead of blob, UI will use /preview-audio?path=...
        return {
            "status": "success", 
            "path": res["path"], 
            "task_id": task_id
        }
    
    raise HTTPException(status_code=500, detail=res.get("message"))

@router.post("/export-project")
async def export_project(paths: List[str] = Body(..., embed=True)):
    from api_server import send_to_worker
    task_id = str(uuid.uuid4())
    logger.info(f"[{task_id}] Project Export: {len(paths)} blocks")
    
    res = await send_to_worker({
        "id": task_id,
        "type": "glue_project",
        "paths": paths,
        "output_path": str(UPLOAD_DIR / f"export_{task_id}.wav")
    })
    
    if res["status"] == "success":
        return {
            "status": "success",
            "path": res["path"]
        }
    raise HTTPException(status_code=500, detail=res.get("message"))
