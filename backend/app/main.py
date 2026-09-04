from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import FRONTEND_URL, MAX_FILE_BYTES, GEMINI_API_KEY, GEMINI_MODEL
from .pdf import extract_text

app = FastAPI(title="Contract Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "gemini_key_loaded": bool(GEMINI_API_KEY),
        "model": GEMINI_MODEL or None,
    }


@app.post("/api/extract")
async def extract(file: UploadFile = File(...)):
    data = await file.read()

    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, "File too large (10MB max)")
    if not data:
        raise HTTPException(400, "Empty file")

    try:
        text, pages = extract_text(data)
    except ValueError as e:
        raise HTTPException(422, str(e))

    return {
        "filename": file.filename,
        "pages": pages,
        "chars": len(text),
        "preview": text[:500],
    }