
import json
import os
import logging

from google import genai
from google.genai import types
from config.ai_runtime import (
    GeminiInvalidResponse,
    GeminiTemporaryError,
    generate_with_retry,
    gemini_http_options,
)


logger = logging.getLogger(__name__)


def debug_code(
    code,
    programming_language,
    error_message="",
    expected_behavior="",
):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")

    if not api_key or not model:
        raise ValueError("Gemini AI configuration is missing.")

    client = genai.Client(api_key=api_key, http_options=gemini_http_options())

    prompt = f"""
You are an expert software developer and code debugging assistant.

Analyze the following code carefully.

Programming Language:
{programming_language}

Source Code:
{code}

Reported Error:
{error_message or "Not provided"}

Expected Behavior:
{expected_behavior or "Not provided"}

Tasks:
1. Identify actual bugs and potential errors.
2. Explain the root cause in simple language.
3. Provide corrected code in the same programming language.
4. Explain the corrections.
5. Suggest code quality and performance improvements.
6. If no clear bug exists, say so honestly.
7. Never invent an error or claim that code was executed.
8. Perform static analysis only.

Return valid JSON with exactly these fields:

{{
    "summary": "Short debugging summary",
    "has_errors": true,
    "overall_severity": "low",
    "root_cause": "Detailed root cause",
    "issues": [
        {{
            "title": "Issue title",
            "error_type": "Syntax or Logic or Runtime or Performance or Security",
            "severity": "low",
            "line_number": null,
            "explanation": "Explain the issue",
            "suggestion": "How to fix it"
        }}
    ],
    "corrected_code": "Complete corrected source code",
    "corrections": [
        "Explain each important correction"
    ],
    "optimization_suggestions": [
        "Improvement suggestion"
    ]
}}

Rules:
- overall_severity must be low, medium, high, or critical.
- Issue severity must be low, medium, high, or critical.
- has_errors must be a boolean.
- line_number must be an integer or null.
- If no errors are found, return an empty issues array.
- Preserve the original functionality.
- Never fabricate missing requirements.
- Return JSON only.
"""

    try:
        response = generate_with_retry(
            client,
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = json.loads(response.text)

        required_fields = [
            "summary",
            "has_errors",
            "overall_severity",
            "root_cause",
            "issues",
            "corrected_code",
            "corrections",
            "optimization_suggestions",
        ]

        for field in required_fields:
            if field not in result:
                raise GeminiInvalidResponse(
                    f"AI response is missing field: {field}"
                )

        if not isinstance(result["has_errors"], bool):
            raise GeminiInvalidResponse("Invalid has_errors value.")

        if result["overall_severity"] not in [
            "low", "medium", "high", "critical"
        ]:
            raise GeminiInvalidResponse("Invalid severity value.")

        if not isinstance(result["issues"], list):
            raise GeminiInvalidResponse("Invalid issues format.")

        if not isinstance(result["corrections"], list):
            raise GeminiInvalidResponse("Invalid corrections format.")

        if not isinstance(result["optimization_suggestions"], list):
            raise GeminiInvalidResponse("Invalid optimization suggestions format.")

        if not isinstance(result["corrected_code"], str):
            raise GeminiInvalidResponse("Invalid corrected code.")

        return result

    except json.JSONDecodeError as error:
        logger.exception("Invalid JSON returned by Gemini.")
        raise GeminiInvalidResponse("AI returned an invalid debugging response.") from error

    except GeminiInvalidResponse:
        raise

    except Exception:
        logger.exception("Code debugging AI service failed.")
        raise

    finally:
        client.close()
