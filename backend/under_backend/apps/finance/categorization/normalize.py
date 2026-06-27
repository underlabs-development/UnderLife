"""Normalize a transaction description so that the same merchant maps to one
cache key regardless of dates, card digits, store numbers or amounts.

This is the load-bearing piece of the categorization cascade: too aggressive
and distinct merchants collapse together; too weak and the cache never hits.
Kept deliberately conservative and fully unit-tested.
"""

from __future__ import annotations

import hashlib
import re

# Order matters: strip the most specific noise first.
_PATTERNS = [
    # Card / masked numbers: ****1234, xxxx-1234, ending 1234
    # (no leading \b: it can't anchor before '*', a non-word char)
    (re.compile(r"(?:x{2,}|\*{2,})[\s\-]?\d{2,}", re.I), " "),
    (re.compile(r"\bending\s+\d{3,}\b", re.I), " "),
    # ISO and common date formats: 2026-06-14, 14/06/2026, 14.06.26
    (re.compile(r"\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b"), " "),
    (re.compile(r"\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b"), " "),
    # Times: 14:30, 14:30:00
    (re.compile(r"\b\d{1,2}:\d{2}(?::\d{2})?\b"), " "),
    # Currency amounts: 12,34 €, €12.34, eur 12.34, $12
    (re.compile(r"[€$£]\s?\d[\d.,]*"), " "),
    (re.compile(r"\b\d[\d.,]*\s?(?:eur|usd|gbp)\b", re.I), " "),
    # Long digit runs (store/terminal/transaction numbers)
    (re.compile(r"\b\d{3,}\b"), " "),
    # POS / payment boilerplate noise
    (re.compile(r"\b(?:pos|carta|card|pagamento|payment|addebito|debit|credit|trans(?:action)?|auth|ref|id)\b", re.I), " "),
]

_NON_ALNUM = re.compile(r"[^a-z0-9\s]")
_MULTISPACE = re.compile(r"\s+")


def normalize_description(text: str) -> str:
    """Return a stable, lowercased key for ``text``.

    Empty / whitespace-only input returns "" (caller treats that as
    un-categorizable rather than caching a useless key).
    """
    if not text:
        return ""
    s = text.lower()
    for pattern, repl in _PATTERNS:
        s = pattern.sub(repl, s)
    s = _NON_ALNUM.sub(" ", s)
    s = _MULTISPACE.sub(" ", s).strip()
    return s


def hash_description(text: str) -> str:
    """SHA-256 of the normalized description; "" for empty input."""
    norm = normalize_description(text)
    if not norm:
        return ""
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()
