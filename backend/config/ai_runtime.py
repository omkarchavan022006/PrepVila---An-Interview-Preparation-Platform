"""Shared, bounded runtime helpers for synchronous Gemini requests."""

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import os
import random
import time

from google import genai
from google.genai import types


DEFAULT_GEMINI_TIMEOUT_MS = 40000
MIN_GEMINI_TIMEOUT_MS = 10000
MAX_GEMINI_TIMEOUT_MS = 90000
MAX_RETRY_AFTER_SECONDS = 3


class GeminiTemporaryError(Exception):
    """A transient provider failure that exhausted the bounded retry policy."""


class GeminiInvalidResponse(Exception):
    """The provider responded, but its output did not satisfy the contract."""


def get_gemini_timeout_ms():
    raw_value = os.getenv("GEMINI_REQUEST_TIMEOUT_MS", "")
    try:
        configured = int(raw_value) if raw_value else DEFAULT_GEMINI_TIMEOUT_MS
    except (TypeError, ValueError):
        configured = DEFAULT_GEMINI_TIMEOUT_MS
    return min(MAX_GEMINI_TIMEOUT_MS, max(MIN_GEMINI_TIMEOUT_MS, configured))


def create_gemini_client(api_key):
    """Build a Gemini client with explicit per-request timeout and no hidden retries."""
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            timeout=get_gemini_timeout_ms(),
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )


def gemini_http_options():
    """Options for call sites that retain their module's mocked client factory."""
    return types.HttpOptions(
        timeout=get_gemini_timeout_ms(),
        retry_options=types.HttpRetryOptions(attempts=1),
    )


def _provider_status(error):
    response = getattr(error, "response", None)
    return (
        getattr(error, "code", None)
        or getattr(error, "status_code", None)
        or getattr(response, "status_code", None)
    )


def is_transient_provider_error(error):
    status_code = _provider_status(error)
    if status_code in {429, 500, 502, 503, 504}:
        return True
    if status_code is not None:
        return False

    exception_name = type(error).__name__.lower()
    exception_module = type(error).__module__.lower()
    transport_transient = any(
        marker in exception_name
        for marker in ("timeout", "connecterror", "networkerror")
    ) and ("httpx" in exception_module or "google" in exception_module)
    return transport_transient


def _retry_after_seconds(error):
    response = getattr(error, "response", None)
    headers = getattr(response, "headers", None)
    if not headers:
        return None
    value = headers.get("Retry-After") or headers.get("retry-after")
    if not value:
        return None
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        try:
            retry_at = parsedate_to_datetime(value)
            if retry_at.tzinfo is None:
                retry_at = retry_at.replace(tzinfo=timezone.utc)
            return max(0.0, (retry_at - datetime.now(timezone.utc)).total_seconds())
        except (TypeError, ValueError, OverflowError):
            return None


def retry_delay_seconds(error, attempt):
    retry_after = _retry_after_seconds(error)
    if retry_after is not None:
        if retry_after > MAX_RETRY_AFTER_SECONDS:
            return None
        return retry_after
    return min(0.5 * (2 ** attempt) + random.uniform(0, 0.5), MAX_RETRY_AFTER_SECONDS)


def generate_with_retry(client, *, model, contents, config=None):
    """Retry one transient provider failure once; never retry invalid requests."""
    options = {"model": model, "contents": contents}
    if config is not None:
        options["config"] = config

    for attempt in range(2):
        try:
            return client.models.generate_content(**options)
        except Exception as error:
            if not is_transient_provider_error(error):
                raise
            if attempt == 1:
                raise GeminiTemporaryError(
                    "Gemini is temporarily unavailable after a bounded retry."
                ) from error

            delay = retry_delay_seconds(error, attempt)
            if delay is None:
                raise GeminiTemporaryError(
                    "Gemini is temporarily unavailable; retry later."
                ) from error
            time.sleep(delay)

