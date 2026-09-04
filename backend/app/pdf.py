import fitz  # pymupdf
from .config import MAX_PAGES


def extract_text(data: bytes) -> tuple[str, int]:
    """Return (text, page_count). Raises ValueError on unusable input."""
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception:
        raise ValueError("Could not read this file as a PDF")

    try:
        pages = doc.page_count
        if pages > MAX_PAGES:
            raise ValueError(f"Document is {pages} pages; the limit is {MAX_PAGES}")
        text = "\n\n".join(page.get_text("text") for page in doc).strip()
    finally:
        doc.close()

    if len(text) < 200:
        raise ValueError(
            "Almost no text found. This looks like a scanned PDF, "
            "which needs OCR that this app doesn't do yet."
        )

    return text, pages