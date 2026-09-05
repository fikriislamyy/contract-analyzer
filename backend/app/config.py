import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
ANALYZER_API_KEY = os.environ.get("ANALYZER_API_KEY", "")

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_PAGES = 60
JOB_TTL_SECONDS = 60 * 30