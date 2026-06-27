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

# Sentinel the model returns when no existing category fits.
NEW_CATEGORY = "__new__"

_SYSTEM = (
    "You classify a single bank-transaction description into exactly one of the "
    "user's categories. Pick the best existing fit. Reply ONLY with the JSON object."
)


def _build_schema(labels: list[str], allow_new: bool) -> type[BaseModel]:
    """Per-call Pydantic model: ``category`` is a Literal of the labels (plus a
    ``__new__`` sentinel when new categories are allowed), with an optional
    free-text ``new_category`` name."""
    options = labels + ([NEW_CATEGORY] if allow_new else [])
    return create_model(
        "TxnCategory",
        category=(Literal[tuple(options)], ...),
        new_category=(str, ""),
        confidence=(float, Field(ge=0.0, le=1.0)),
    )


def classify(
    description: str,
    labels: list[str],
    allow_new: bool = False,
    label_descriptions: Optional[dict[str, str]] = None,
) -> Optional[tuple[str, float]]:
    """Return (category_label, confidence) or None.

    ``category_label`` is an existing label, or — when ``allow_new`` and the model
    decides nothing fits — a NEW concise category name to be created.
    ``label_descriptions`` (name -> hint) helps the model choose.
    """
    if not description or not labels:
        return None
    try:
        from ollama import Client

        schema_model = _build_schema(labels, allow_new)
        client = Client(host=OLLAMA_HOST)
        new_hint = (
            " If NONE of them reasonably fit, set category to \"__new__\" and put a "
            "short Title-Case name (1-2 words) in new_category."
            if allow_new
            else ""
        )
        if label_descriptions:
            lines = "\n".join(
                f"- {name}: {label_descriptions.get(name) or ''}".rstrip().rstrip(":")
                for name in labels
            )
            allowed_block = f"Allowed categories (name: when to use it):\n{lines}"
        else:
            allowed_block = f"Allowed categories: {', '.join(labels)}"
        prompt = (
            f"{allowed_block}\n"
            f'Transaction description: "{description}"\n'
            f"Pick the single best category and your confidence 0-1.{new_hint}"
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
        confidence = float(parsed.confidence)
        if parsed.category == NEW_CATEGORY:
            name = (parsed.new_category or "").strip()
            if not name:
                return None
            return name, confidence
        return parsed.category, confidence
    except Exception as exc:  # noqa: BLE001 — degrade gracefully on any failure
        logger.warning("Local LLM categorization unavailable: %s", exc)
        return None
