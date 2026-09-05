import hmac
import json
import time
import uuid

from fastapi import (
    BackgroundTasks, Depends, FastAPI, File, Form,
    Header, HTTPException, UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import (
    ANALYZER_API_KEY, FRONTEND_URL, GEMINI_API_KEY,
    GEMINI_MODEL, JOB_TTL_SECONDS, MAX_FILE_BYTES,
)
from .llm import analyze, chat_stream
from .pdf import extract_text
from .schemas import ChatRequest

app = FastAPI(title="Document Analyzer API")

origins = [o.strip() for o in FRONTEND_URL.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS: dict[str, dict] = {}
VALID_TYPES = {"contract", "invoice", "policy", "other"}


async def require_key(x_api_key: str = Header(default="")):
    """No-op when ANALYZER_API_KEY is unset, so local dev needs no header."""
    if ANALYZER_API_KEY and not hmac.compare_digest(x_api_key, ANALYZER_API_KEY):
        raise HTTPException(401, "Invalid or missing API key")


def _sweep_jobs():
    cutoff = time.time() - JOB_TTL_SECONDS
    for jid in [k for k, v in JOBS.items() if v.get("created", 0) < cutoff]:
        JOBS.pop(jid, None)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "gemini_key_loaded": bool(GEMINI_API_KEY),
        "model": GEMINI_MODEL or None,
        "auth_required": bool(ANALYZER_API_KEY),
        "supported_types": sorted(VALID_TYPES),
    }


def _run_analysis(job_id: str, text: str, doc_type: str | None):
    try:
        result = analyze(text, doc_type)
        JOBS[job_id] = {
            "status": "done",
            "result": result.model_dump(),
            "created": time.time(),
        }
    except Exception as e:
        JOBS[job_id] = {
            "status": "error",
            "error": f"{type(e).__name__}: {e}",
            "created": time.time(),
        }


@app.post("/api/analyze", dependencies=[Depends(require_key)])
async def start_analysis(
    bg: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str | None = Form(default=None),
):
    _sweep_jobs()

    if doc_type and doc_type not in VALID_TYPES:
        raise HTTPException(422, f"doc_type must be one of {sorted(VALID_TYPES)}")

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
    JOBS[job_id] = {"status": "analyzing", "created": time.time()}
    bg.add_task(_run_analysis, job_id, text, doc_type)

    return {"job_id": job_id, "pages": pages, "document": text}


@app.get("/api/jobs/{job_id}", dependencies=[Depends(require_key)])
async def job_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Unknown or expired job")
    return {k: v for k, v in job.items() if k != "created"}


@app.post("/api/chat", dependencies=[Depends(require_key)])
async def chat(req: ChatRequest):
    if not req.document.strip():
        raise HTTPException(400, "No document provided")

    def event_stream():
        try:
            for piece in chat_stream(req.document, req.messages, req.doc_type):
                yield f"data: {json.dumps({'t': piece})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")