"""Tier-2 categorizer: a small LOCAL model via Ollama with schema-constrained
JSON output. Privacy-first — only the single transaction description leaves the
process, and only to localhost.

Kept FLAT (one enum + confidence): quantized small models fail on nested
schemas. Any failure (Ollama down, parse error) returns None, and the cascade
simply leaves the transaction uncategorized — the app never errors on this.

A hosted backend (Gemini/Mistral) would slot in behind this same ``classify``
signature; local is the only path built today.
"""

from __future__ import annotations

import logging
import os
from typing import Literal, Optional

from pydantic import BaseModel, Field, create_model

logger = logging.getLogger(__name__)

DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b-instruct-q4_K_M")
OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

_SYSTEM = (
    "You classify a single bank-transaction description into exactly one of the "
    "user's categories. Pick the best fit. Reply ONLY with the JSON object."
)


def _build_schema(labels: list[str]) -> type[BaseModel]:
    """A per-call Pydantic model whose ``category`` is a Literal of the labels."""
    return create_model(
        "TxnCategory",
        category=(Literal[tuple(labels)], ...),
        confidence=(float, Field(ge=0.0, le=1.0)),
    )


def classify(description: str, labels: list[str]) -> Optional[tuple[str, float]]:
    """Return (category_label, confidence) or None if unavailable/failed."""
    if not description or not labels:
        return None
    try:
        from ollama import Client

        schema_model = _build_schema(labels)
        client = Client(host=OLLAMA_HOST)
        prompt = (
            f"Allowed categories: {', '.join(labels)}\n"
            f'Transaction description: "{description}"\n'
            "Return JSON: the single best category and your confidence 0-1."
        )
        resp = client.chat(
            model=DEFAULT_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": prompt},
            ],
            format=schema_model.model_json_schema(),
            options={"temperature": 0},
        )
        parsed = schema_model.model_validate_json(resp["message"]["content"])
        return parsed.category, float(parsed.confidence)
    except Exception as exc:  # noqa: BLE001 — degrade gracefully on any failure
        logger.warning("Local LLM categorization unavailable: %s", exc)
        return None
