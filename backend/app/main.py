import json
import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import FRONTEND_URL, MAX_FILE_BYTES, GEMINI_API_KEY, GEMINI_MODEL
from .pdf import extract_text
from .schemas import ChatRequest
from .llm import analyze, chat_stream

app = FastAPI(title="Contract Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS: dict[str, dict] = {}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "gemini_key_loaded": bool(GEMINI_API_KEY),
        "model": GEMINI_MODEL or None,
    }


def _run_analysis(job_id: str, text: str):
    try:
        result = analyze(text)
        JOBS[job_id] = {"status": "done", "result": result.model_dump()}
    except Exception as e:
        JOBS[job_id] = {"status": "error", "error": f"{type(e).__name__}: {e}"}


@app.post("/api/analyze")
async def start_analysis(bg: BackgroundTasks, file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, "File too large (10MB max)")

    try:
        text, pages = extract_text(data)
    except ValueError as e:
        raise HTTPException(422, str(e))

    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"status": "analyzing"}
    bg.add_task(_run_analysis, job_id, text)

    return {"job_id": job_id, "pages": pages, "document": text}


@app.get("/api/jobs/{job_id}")
async def job_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Unknown job")
    return job


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not req.document.strip():
        raise HTTPException(400, "No document provided")

    def event_stream():
        try:
            for piece in chat_stream(req.document, req.messages):
                yield f"data: {json.dumps({'t': piece})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")