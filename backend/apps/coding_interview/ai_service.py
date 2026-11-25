
import json
import os
import time

from google import genai
from config.ai_runtime import (
    GeminiInvalidResponse,
    GeminiTemporaryError,
    gemini_http_options,
    is_transient_provider_error,
    retry_delay_seconds,
)


def generate_coding_question(
    topic="Python",
    difficulty="medium",
    programming_language="python",
):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")

    if not api_key:
        raise ValueError("Gemini API key is not configured.")

    if not model:
        raise ValueError("GEMINI_MODEL is not configured.")

    allowed_difficulties = ["easy", "medium", "hard"]

    allowed_languages = [
        "python", "javascript", "java", "cpp",
        "c", "csharp", "go", "php"
    ]

    if difficulty not in allowed_difficulties:
        raise ValueError("Invalid difficulty.")

    if programming_language not in allowed_languages:
        raise ValueError("Unsupported programming language.")

    if not isinstance(topic, str) or not topic.strip():
        raise ValueError("Topic is required.")

    prompt = f"""
You are an expert coding interview question setter.

Generate one original coding interview problem.

TOPIC: {topic}
DIFFICULTY: {difficulty}
PROGRAMMING LANGUAGE: {programming_language}

Return ONLY valid JSON:

{{
  "title": "Problem title",
  "description": "Detailed problem statement",
  "input_format": "Input description",
  "output_format": "Output description",
  "constraints": ["Constraint 1", "Constraint 2"],
  "examples": [
    {{
      "input": "Sample input",
      "output": "Expected output",
      "explanation": "Why this output is correct"
    }}
  ],
  "starter_code": "Starter code for selected language",
  "test_cases": [
    {{
      "input": "Test input",
      "expected_output": "Expected output"
    }}
  ],
  "hints": ["Hint 1", "Hint 2"]
}}

RULES:
- Match the requested difficulty.
- Generate a clear and original problem.
- Include at least two examples.
- Include at least three test cases.
- Starter code must match the selected language.
- Test cases must have correct expected outputs.
- Do not include solutions in the question.
- Return JSON only without Markdown.
"""

    client = genai.Client(api_key=api_key, http_options=gemini_http_options())
    try:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )

                if not response.text:
                    raise ValueError("Gemini returned an empty response.")

                response_text = response.text.strip()

                if response_text.startswith("```"):
                    response_text = response_text.split("\n", 1)[1]
                    response_text = response_text.rsplit("```", 1)[0].strip()

                result = json.loads(response_text)

                required_fields = [
                    "title",
                    "description",
                    "input_format",
                    "output_format",
                    "constraints",
                    "examples",
                    "starter_code",
                    "test_cases",
                    "hints",
                ]

                for field in required_fields:
                    if field not in result:
                        raise ValueError(
                            f"AI response is missing {field}."
                        )

                if not isinstance(result["examples"], list) or len(result["examples"]) < 2:
                    raise ValueError("At least two examples are required.")

                if not isinstance(result["test_cases"], list) or len(result["test_cases"]) < 3:
                    raise ValueError("At least three test cases are required.")

                if not isinstance(result["constraints"], list):
                    raise ValueError("Constraints must be a list.")

                if not isinstance(result["hints"], list):
                    raise ValueError("Hints must be a list.")

                return result

            except GeminiTemporaryError:
                raise
            except (json.JSONDecodeError, ValueError) as exc:
                raise GeminiInvalidResponse(
                    "Gemini returned an invalid coding question."
                ) from exc
            except Exception as exc:
                if not is_transient_provider_error(exc):
                    raise

                if attempt < 1:
                    delay = retry_delay_seconds(exc, attempt)
                    if delay is None:
                        raise GeminiTemporaryError(
                            "Gemini is temporarily unavailable; retry later."
                        ) from exc
                    time.sleep(delay)
                else:
                    raise GeminiTemporaryError(
                        "Gemini is temporarily unavailable after a bounded retry."
                    ) from exc

    finally:
        client.close()


def evaluate_submitted_code(
    question,
    submitted_code,
    programming_language,
):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")

    if not api_key or not model:
        raise ValueError("Gemini configuration is missing.")

    if not isinstance(submitted_code, str) or not submitted_code.strip():
        raise ValueError("Submitted code cannot be empty.")

    prompt = f"""
You are a strict but helpful coding interview evaluator.

Evaluate the submitted code through static analysis only.
DO NOT execute the submitted code.
Do not claim that test cases were actually executed.

QUESTION:
{question}

PROGRAMMING LANGUAGE:
{programming_language}

SUBMITTED CODE:
{submitted_code}

Return ONLY valid JSON:

{{
  "score": 0,
  "correctness": "Detailed assessment",
  "logic": "Logic assessment",
  "time_complexity": "Estimated time complexity",
  "space_complexity": "Estimated space complexity",
  "code_quality": "Code quality feedback",
  "bugs": ["Potential issue"],
  "suggestions": ["Improvement suggestion"],
  "overall_feedback": "Final feedback",
  "verdict": "excellent, good, needs_improvement or incorrect"
}}

RULES:
- Score must be between 0 and 100.
- Assess correctness, logic and code quality.
- Identify possible edge cases.
- Be honest about uncertainty.
- Never claim code was executed.
- Return JSON only.
"""

    client = genai.Client(api_key=api_key, http_options=gemini_http_options())
    try:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )

                if not response.text:
                    raise ValueError("Gemini returned an empty response.")

                response_text = response.text.strip()

                if response_text.startswith("```"):
                    response_text = response_text.split("\n", 1)[1]
                    response_text = response_text.rsplit("```", 1)[0].strip()

                result = json.loads(response_text)

                score = result.get("score")

                if (
                    isinstance(score, bool)
                    or not isinstance(score, (int, float))
                    or not 0 <= score <= 100
                ):
                    raise ValueError("AI returned an invalid score.")

                required_fields = [
                    "correctness",
                    "logic",
                    "time_complexity",
                    "space_complexity",
                    "code_quality",
                    "bugs",
                    "suggestions",
                    "overall_feedback",
                    "verdict",
                ]

                for field in required_fields:
                    if field not in result:
                        raise ValueError(f"Missing evaluation field: {field}")

                if not isinstance(result["bugs"], list):
                    raise ValueError("Bugs must be a list.")

                if not isinstance(result["suggestions"], list):
                    raise ValueError("Suggestions must be a list.")

                return result

            except GeminiTemporaryError:
                raise
            except (json.JSONDecodeError, ValueError) as exc:
                raise GeminiInvalidResponse(
                    "Gemini returned an invalid coding evaluation."
                ) from exc
            except Exception as exc:
                if not is_transient_provider_error(exc):
                    raise

                if attempt < 1:
                    delay = retry_delay_seconds(exc, attempt)
                    if delay is None:
                        raise GeminiTemporaryError(
                            "Gemini is temporarily unavailable; retry later."
                        ) from exc
                    time.sleep(delay)
                else:
                    raise GeminiTemporaryError(
                        "Gemini is temporarily unavailable after a bounded retry."
                    ) from exc

    finally:
        client.close()
