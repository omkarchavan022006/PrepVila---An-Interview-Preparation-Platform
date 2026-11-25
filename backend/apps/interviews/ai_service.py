
import json
import logging
import os

from google import genai
from config.ai_runtime import GeminiInvalidResponse, GeminiTemporaryError, generate_with_retry as bounded_gemini_request, gemini_http_options

logger = logging.getLogger(__name__)


def generate_with_retry(client, model, prompt):
    return bounded_gemini_request(client, model=model, contents=prompt)


def parse_gemini_json(response):
    response_text = getattr(response, "text", None)

    if not isinstance(response_text, str) or not response_text.strip():
        raise GeminiInvalidResponse("Gemini returned an empty response.")

    text = response_text.strip()

    if text.startswith("```"):
        lines = text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError as error:
        raise GeminiInvalidResponse("Gemini returned invalid JSON.") from error

    if not isinstance(result, dict):
        raise GeminiInvalidResponse("Gemini response must be a JSON object.")

    return result


def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")

    if not api_key or not model:
        raise ValueError("Gemini AI configuration is missing.")

    return genai.Client(api_key=api_key, http_options=gemini_http_options()), model


def handle_gemini_error(error, operation):
    logger.exception("Gemini %s failed (%s)", operation, type(error).__name__)
    raise error


def generate_mock_interview_question(
    job_title,
    job_description,
    required_skills,
    difficulty="medium",
    previous_questions=None,
    resume_skills=None,
):
    previous_questions = previous_questions or []
    resume_skills = resume_skills or []

    prompt = f"""
You are an expert technical interviewer.

Generate exactly ONE interview question.

Job Title: {job_title}
Job Description: {job_description}
Required Skills: {required_skills}
Candidate Skills: {resume_skills}
Difficulty: {difficulty}
Previous Questions: {previous_questions}

Do not repeat previous questions.

Return ONLY valid JSON:
{{
    "question": "Interview question",
    "expected_answer": "A detailed ideal answer",
    "explanation": "What this question evaluates",
    "topic": "Question topic"
}}
"""

    client, model = get_gemini_client()

    try:
        response = generate_with_retry(client, model, prompt)

        result = parse_gemini_json(response)

        required_fields = [
            "question",
            "expected_answer",
            "explanation",
            "topic",
        ]

        for field in required_fields:
            value = result.get(field)

            if not isinstance(value, str) or not value.strip():
                raise ValueError(
                    f"Invalid AI response: {field} is missing."
                )

        return result

    except GeminiTemporaryError:
        raise

    except GeminiInvalidResponse:
        raise

    except ValueError as error:
        raise GeminiInvalidResponse("Gemini returned an invalid question response.") from error

    except Exception as error:
        handle_gemini_error(error, "Question Generation")

    finally:
        client.close()


def evaluate_mock_interview_answer(
    question,
    expected_answer,
    user_answer,
    job_title,
):
    prompt = f"""
You are an expert interview evaluator.

Job: {job_title}

Question:
{question}

Expected Answer:
{expected_answer}

Candidate Answer:
{user_answer}

Evaluate the candidate fairly.

Return ONLY valid JSON:
{{
    "score": 0,
    "rating": "Poor",
    "strengths": ["strength 1"],
    "improvements": ["improvement 1"],
    "feedback": "Detailed feedback",
    "ideal_answer": "Improved answer"
}}

Rules:
- Score must be an integer between 0 and 100.
- Rating must reflect the score honestly.
- Strengths must be an array of strings.
- Improvements must be an array of strings.
- Do not invent candidate experience.
"""

    client, model = get_gemini_client()

    try:
        response = generate_with_retry(client, model, prompt)
        result = parse_gemini_json(response)

        score = result.get("score")
        if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= 100:
            raise GeminiInvalidResponse("Gemini returned an invalid evaluation score.")
        if not isinstance(result.get("rating"), str):
            raise GeminiInvalidResponse("Gemini returned an invalid evaluation rating.")

        for field in ["strengths", "improvements"]:
            value = result.get(field)
            if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
                raise GeminiInvalidResponse(f"Gemini returned an invalid {field} field.")

        for field in ["feedback", "ideal_answer"]:
            value = result.get(field)
            if not isinstance(value, str) or not value.strip():
                raise GeminiInvalidResponse(f"Gemini returned an invalid {field} field.")

        return result

    except GeminiTemporaryError:
        raise

    except GeminiInvalidResponse:
        raise

    except ValueError as error:
        raise GeminiInvalidResponse("Gemini returned an invalid evaluation response.") from error

    except Exception as error:
        handle_gemini_error(error, "Answer Evaluation")

    finally:
        client.close()
