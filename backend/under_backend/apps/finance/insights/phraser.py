"""Layer-2 advisor: optionally rewrite each deterministic insight into friendlier
prose with the LOCAL model — but never let it invent numbers.

Guardrail: every number in a generated sentence must already appear in that
insight's ``template_text``; otherwise we fall back to the template verbatim.
The model only ever sees pre-computed facts, never raw transaction data.
"""

from __future__ import annotations

import logging
import re

from ..categorization.llm import DEFAULT_MODEL, OLLAMA_HOST
from .engine import Insight

logger = logging.getLogger(__name__)

# A number is any run of digits with optional thousands/decimal separators.
_NUM_RE = re.compile(r"\d[\d.,]*")

_SYSTEM = (
    "You rewrite a personal-finance tip to be warm, concise and encouraging. "
    "Rules: keep it to ONE sentence. Copy every number, currency symbol, "
    "percentage and category name EXACTLY as given. Never compute, round, infer "
    "or add any number. Output only the rewritten sentence."
)


def _numbers(text: str) -> list[str]:
    return _NUM_RE.findall(text)


def _is_grounded(generated: str, source: str) -> bool:
    """True iff every number in ``generated`` appears in ``source``."""
    allowed = set(_numbers(source))
    return all(n in allowed for n in _numbers(generated))


def _rephrase_one(client, text: str) -> str:
    resp = client.chat(
        model=DEFAULT_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": text},
        ],
        options={"temperature": 0.4},
    )
    candidate = (resp["message"]["content"] or "").strip()
    if candidate and _is_grounded(candidate, text):
        return candidate
    # Hallucinated a number (or empty) -> keep the exact template.
    return text


def phrase_insights(insights: list[Insight]) -> list[str]:
    """Return one display string per insight, AI-rephrased where safe."""
    texts = [i.template_text for i in insights]
    try:
        from ollama import Client

        client = Client(host=OLLAMA_HOST)
        return [_rephrase_one(client, t) for t in texts]
    except Exception as exc:  # noqa: BLE001 — any failure -> plain templates
        logger.warning("Advisor phrasing unavailable, using templates: %s", exc)
        return texts
