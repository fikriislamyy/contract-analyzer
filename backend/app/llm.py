import logging

from google import genai
from google.genai import types

from .config import GEMINI_API_KEY, GEMINI_MODEL
from .schemas import Analysis

logging.getLogger("google_genai.models").setLevel(logging.ERROR)

client = genai.Client(api_key=GEMINI_API_KEY)

CHECKLISTS = {
    "contract": """Flag clauses that create risk for the party receiving this
document: auto-renewal and notice windows, unilateral termination rights,
uncapped or one-sided liability, broad indemnification, IP assignment,
non-compete and non-solicit scope, unusual governing law or venue, payment
terms and late fees, confidentiality surviving indefinitely.""",

    "invoice": """Check the arithmetic: do line items sum to the stated subtotal,
tax, and total? Flag charges that are unexplained, duplicated, or absent from
the referenced agreement. Flag unusual payment windows, late-fee rates, missing
purchase order or tax identifiers, and any currency or unit inconsistency.""",

    "policy": """Surface obligations that fall on the reader, deadlines and
notice periods, actions requiring acknowledgement or consent, data handling and
retention commitments, and any clause that limits the reader's options or
remedies.""",
}

BASE_RULES = """Rules:
- Quote the document verbatim in the `quote` field. Never paraphrase there.
- Rate severity by real-world consequence, not by unusual wording.
- If the document is unremarkable, return few or no findings. Do not manufacture
  concerns to appear thorough.
- Set `doc_type` to what the document actually is.
- You are not a lawyer or an accountant, and must not present this as
  legal or financial advice."""


def build_instruction(doc_type: str | None) -> str:
    checklist = CHECKLISTS.get(doc_type or "")
    if checklist:
        return (
            f"You are reviewing a business document on behalf of the person who "
            f"received it.\n\nThis document has been filed as a {doc_type}. Verify "
            f"that is correct. If it clearly is not, analyze it as what it actually "
            f"is and set `doc_type` accordingly.\n\n{checklist}\n\n{BASE_RULES}"
        )

    listed = "\n\n".join(f"{k.upper()} — {v}" for k, v in CHECKLISTS.items())
    return (
        f"You are reviewing a business document on behalf of the person who "
        f"received it.\n\nFirst identify what kind of document this is, then apply "
        f"the matching checklist.\n\n{listed}\n\nOTHER — summarize the document and "
        f"surface anything requiring a decision or carrying a deadline.\n\n{BASE_RULES}"
    )


def analyze(text: str, doc_type: str | None = None) -> Analysis:
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=f"<document>\n{text}\n</document>",
        config=types.GenerateContentConfig(
            system_instruction=build_instruction(doc_type),
            response_mime_type="application/json",
            response_schema=Analysis,
        ),
    )
    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, Analysis):
        return parsed

    raw = response.text
    if not raw:
        raise ValueError("The model returned an empty response. Try again.")
    return Analysis.model_validate_json(raw)


CHAT_FRAMING = {
    "contract": "You are helping someone understand a contract they may sign.",
    "invoice": "You are helping someone review an invoice they have received.",
    "policy": "You are helping someone understand a policy that applies to them.",
}


def chat_stream(document: str, messages: list[dict], doc_type: str | None = None):
    framing = CHAT_FRAMING.get(
        doc_type or "", "You are helping someone understand a business document."
    )
    instruction = (
        f"{framing}\n\nGround every answer in the document text below and name the "
        f"section you are relying on. If the document does not address the question, "
        f"say so plainly rather than guessing. Write plain prose with no markdown, "
        f"asterisks, or bullet points. You are not a lawyer or an accountant.\n\n"
        f"<document>\n{document}\n</document>"
    )
    contents = [
        types.Content(role=m["role"], parts=[types.Part(text=m["text"])])
        for m in messages
    ]
    stream = client.models.generate_content_stream(
        model=GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=instruction),
    )
    for chunk in stream:
        if chunk.text:
            yield chunk.text