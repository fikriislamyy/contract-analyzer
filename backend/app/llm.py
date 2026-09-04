from google import genai
from google.genai import types

from .config import GEMINI_API_KEY, GEMINI_MODEL
from .schemas import Analysis

client = genai.Client(api_key=GEMINI_API_KEY)

ANALYST_INSTRUCTION = """You are a contract analyst helping someone who is about to \
sign a document understand what they are agreeing to.

Flag clauses that create risk for the receiving party. Pay particular attention to:
auto-renewal and notice windows, unilateral termination rights, uncapped or one-sided
liability, broad indemnification, IP assignment, non-compete and non-solicit scope,
unusual governing law or venue, payment terms and late fees, and confidentiality that
survives indefinitely.

Rules:
- Quote the contract verbatim in the `quote` field. Never paraphrase there.
- Rate severity by real-world consequence, not by how unusual the wording is.
- If the contract is even-handed, return few or no risks. Do not manufacture concerns.
- You are not a lawyer and must not present this as legal advice."""


def analyze(text: str) -> Analysis:
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=f"<contract>\n{text}\n</contract>",
        config=types.GenerateContentConfig(
            system_instruction=ANALYST_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=Analysis,
        ),
    )
    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, Analysis):
        return parsed
    return Analysis.model_validate_json(response.text)


def chat_stream(document: str, messages: list[dict]):
    instruction = (
        "Answer questions about the contract below. Ground every answer in the text "
        "and name the clause you are relying on. If the contract does not address "
        "the question, say so plainly rather than guessing. You are not a lawyer.\n\n"
        f"<contract>\n{document}\n</contract>"
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