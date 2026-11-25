
import json
import os

from google import genai
from google.genai import types
from config.ai_runtime import (
    GeminiInvalidResponse,
    GeminiTemporaryError,
    generate_with_retry,
    gemini_http_options,
)


def generate_followup_questions(
    question,
    candidate_answer,
    job_title="Software Developer",
    difficulty="medium",
    number_of_followups=3,
):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")

    if not api_key or not model:
        raise ValueError("Gemini AI configuration is missing.")

    client = genai.Client(api_key=api_key, http_options=gemini_http_options())

    prompt = f"""
You are an expert technical interviewer and interview coach.

Analyze the following interview response and generate useful
follow-up questions.

Job Title: {job_title}
Difficulty: {difficulty}

Original Interview Question:
{question}

Candidate Answer:
{candidate_answer}

Generate exactly {number_of_followups} relevant follow-up questions.

For each follow-up question provide:
1. question: A clear follow-up interview question.
2. reason: Why an interviewer would ask this question.
3. ideal_answer: A technically correct sample answer.
4. explanation: A detailed but beginner-friendly explanation.
5. example: A practical example where applicable.

Important rules:
- Base follow-up questions on the original question and candidate answer.
- Identify missing concepts or unclear explanations.
- Do not assume the candidate has skills or experience not mentioned.
- Do not fabricate technical facts.
- Make answers accurate and easy to understand.
- Return valid JSON only.

Required JSON structure:
{{
    "analysis": "Brief analysis of the candidate's answer",
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["improvement 1", "improvement 2"],
    "follow_up_questions": [
        {{
            "question": "Follow-up question",
            "reason": "Reason for asking",
            "ideal_answer": "Sample answer",
            "explanation": "Detailed explanation",
            "example": "Practical example"
        }}
    ]
}}
"""

    try:
        response = generate_with_retry(
            client,
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
                max_output_tokens=4000,
            ),
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = json.loads(response.text)

        required_fields = [
            "analysis",
            "strengths",
            "improvements",
            "follow_up_questions",
        ]

        for field in required_fields:
            if field not in result:
                raise ValueError(
                    f"Gemini response is missing: {field}"
                )

        followups = result["follow_up_questions"]

        if not isinstance(followups, list):
            raise ValueError("Invalid follow-up questions format.")

        if len(followups) != number_of_followups:
            raise ValueError(
                "Gemini returned an unexpected number of questions."
            )

        for item in followups:
            for field in [
                "question",
                "reason",
                "ideal_answer",
                "explanation",
                "example",
            ]:
                if not isinstance(item.get(field), str) or not item[field].strip():
                    raise ValueError(
                        f"Invalid follow-up question field: {field}"
                    )

        return result

    except json.JSONDecodeError as error:
        raise GeminiInvalidResponse(
            "Gemini returned an invalid JSON response."
        ) from error

    except ValueError as error:
        raise GeminiInvalidResponse(
            "Gemini returned an invalid follow-up response."
        ) from error

    except Exception:
        raise

    finally:
        client.close()
