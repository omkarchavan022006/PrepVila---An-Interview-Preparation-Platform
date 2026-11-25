
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


def generate_interview_feedback(interview):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")

    if not api_key or not model:
        raise ValueError("Gemini AI configuration is missing.")

    questions = []

    for item in interview.get("questions", []):
        evaluation = item.get("evaluation") or {}

        questions.append({
            "question": item.get("question", ""),
            "topic": item.get("topic", "General"),
            "candidate_answer": item.get("user_answer", ""),
            "score": evaluation.get("score", 0),
            "rating": evaluation.get("rating", ""),
            "feedback": evaluation.get("feedback", ""),
            "strengths": evaluation.get("strengths", []),
            "improvements": evaluation.get("improvements", []),
        })

    interview_data = {
        "job_title": interview.get("job_title", ""),
        "difficulty": interview.get("difficulty", ""),
        "total_questions": interview.get("total_questions", len(questions)),
        "total_score": interview.get("total_score", 0),
        "questions": questions,
    }

    prompt = f"""
You are an expert technical interview evaluator and career coach.

Generate a detailed interview feedback report using the supplied
completed mock interview data.

Interview Data:
{json.dumps(interview_data, ensure_ascii=False, default=str)}

Return valid JSON only with this exact structure:

{{
    "overall_summary": "Detailed summary of candidate performance",
    "overall_rating": "Excellent/Very Good/Good/Average/Needs Improvement",
    "overall_score": 0,
    "strengths": [
        "Specific candidate strength"
    ],
    "weaknesses": [
        "Specific area that needs improvement"
    ],
    "topic_wise_performance": [
        {{
            "topic": "Topic name",
            "score": 0,
            "rating": "Performance rating",
            "feedback": "Topic-specific feedback"
        }}
    ],
    "improvement_plan": [
        {{
            "priority": "High/Medium/Low",
            "area": "Skill or topic to improve",
            "action": "Specific practical action"
        }}
    ],
    "recommendations": [
        "Actionable recommendation"
    ]
}}

Important rules:
- Base the report only on the supplied interview data.
- Use the saved interview total_score as overall_score.
- Do not invent candidate skills, experience, or achievements.
- Identify strengths and weaknesses using actual answers and evaluations.
- Give practical and specific improvement suggestions.
- Topic-wise scores must reflect the available question evaluations.
- Do not create topics that are not present in the interview.
- Return valid JSON only, without Markdown formatting.
"""

    client = genai.Client(api_key=api_key, http_options=gemini_http_options())

    try:
        response = generate_with_retry(
            client,
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
                max_output_tokens=5000,
            ),
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = json.loads(response.text)

        required_fields = [
            "overall_summary",
            "overall_rating",
            "overall_score",
            "strengths",
            "weaknesses",
            "topic_wise_performance",
            "improvement_plan",
            "recommendations",
        ]

        for field in required_fields:
            if field not in result:
                raise ValueError(
                    f"Gemini response is missing: {field}"
                )

        if not isinstance(result["overall_summary"], str):
            raise ValueError("Invalid overall summary.")

        if not isinstance(result["overall_score"], (int, float)):
            raise ValueError("Invalid overall score.")

        result["overall_score"] = interview.get("total_score", 0)

        for field in ["strengths", "weaknesses", "recommendations"]:
            if not isinstance(result[field], list):
                raise ValueError(f"Invalid {field} format.")

        if not isinstance(result["topic_wise_performance"], list):
            raise ValueError("Invalid topic-wise performance format.")

        if not isinstance(result["improvement_plan"], list):
            raise ValueError("Invalid improvement plan format.")

        for item in result["topic_wise_performance"]:
            for field in ["topic", "score", "rating", "feedback"]:
                if field not in item:
                    raise ValueError(
                        f"Topic performance is missing: {field}"
                    )

        for item in result["improvement_plan"]:
            for field in ["priority", "area", "action"]:
                if field not in item:
                    raise ValueError(
                        f"Improvement plan is missing: {field}"
                    )

        return result

    except json.JSONDecodeError as error:
        raise GeminiInvalidResponse(
            "Gemini returned an invalid JSON response."
        ) from error

    except ValueError as error:
        raise GeminiInvalidResponse(
            "Gemini returned an invalid feedback response."
        ) from error

    except Exception as error:
        raise

    finally:
        client.close()
