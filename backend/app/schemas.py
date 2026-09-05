from typing import Literal, Optional
from pydantic import BaseModel, Field

DocType = Literal["contract", "invoice", "policy", "other"]


class Finding(BaseModel):
    title: str = Field(description="Short name for the issue, e.g. 'Auto-renewal'")
    severity: Literal["high", "medium", "low"]
    explanation: str = Field(description="Why this matters, plain language, 1-2 sentences")
    quote: str = Field(description="Verbatim excerpt from the document, under 25 words")
    suggestion: str = Field(description="What to do, ask, or negotiate")


class Analysis(BaseModel):
    doc_type: DocType
    doc_type_label: str = Field(description="Human-readable, e.g. 'Mutual NDA'")
    parties: list[str] = Field(description="Named parties, or empty if none stated")
    summary: str = Field(description="3-4 sentences on what this document does")
    key_terms: list[str] = Field(description="Dates, amounts, durations, governing law")
    findings: list[Finding]


class ChatRequest(BaseModel):
    document: str
    messages: list[dict]
    doc_type: Optional[DocType] = None