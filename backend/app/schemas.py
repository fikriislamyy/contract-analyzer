from typing import Literal
from pydantic import BaseModel, Field


class Risk(BaseModel):
    clause_title: str = Field(description="Short name of the clause, e.g. 'Auto-renewal'")
    severity: Literal["high", "medium", "low"]
    explanation: str = Field(description="Why this is risky, in plain language, 1-2 sentences")
    quote: str = Field(description="Short verbatim excerpt from the contract, under 25 words")
    suggestion: str = Field(description="What to negotiate or ask about")


class Analysis(BaseModel):
    doc_type: str = Field(description="e.g. 'Non-disclosure agreement'")
    parties: list[str]
    summary: str = Field(description="3-4 sentences covering what this contract does")
    key_terms: list[str] = Field(description="Duration, payment, governing law, etc.")
    risks: list[Risk]


class ChatRequest(BaseModel):
    document: str
    messages: list[dict]