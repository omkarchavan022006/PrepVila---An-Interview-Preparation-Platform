
import json
import os
import time

from google import genai
from config.ai_runtime import GeminiInvalidResponse, GeminiTemporaryError, gemini_http_options, is_transient_provider_error, retry_delay_seconds


def generate_skill_gap_analysis(resume_skills, required_skills, job_title):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("Gemini API key is not configured.")

    primary_model = os.getenv("GEMINI_MODEL")

    if not primary_model:
        raise ValueError("GEMINI_MODEL is not configured.")

    # Optional fallback model. Configure it in .env if available.
    fallback_model = os.getenv("GEMINI_FALLBACK_MODEL")

    models = [primary_model]

    if fallback_model and fallback_model != primary_model:
        models.append(fallback_model)

    client = genai.Client(api_key=api_key, http_options=gemini_http_options())

    prompt = f"""
You are an expert technical recruiter and career mentor.

Compare candidate skills with job requirements.

Job Title: {job_title}

Candidate Skills:
{json.dumps(resume_skills)}

Required Job Skills:
{json.dumps(required_skills)}

Return ONLY valid JSON:

{{
  "skill_gap_score": 0,
  "matched_skills": [],
  "missing_skills": [],
  "additional_skills": [],
  "analysis": "",
  "learning_roadmap": [
    {{
      "week": 1,
      "topic": "",
      "skills_to_learn": [],
      "tasks": []
    }}
  ],
  "recommendations": []
}}

Rules:
- Score is the percentage of required skills the candidate already has.
- Compare skills semantically.
- Do not assume skills without evidence.
- Make the roadmap practical.
- Return JSON only.
"""

    for model in models:
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
            )

            response_text = response.text

            if not response_text:
                raise ValueError("Gemini returned an empty response.")

            text = response_text.strip()

            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                text = text.rsplit("```", 1)[0].strip()

            result = json.loads(text)

            required_fields = [
                "skill_gap_score",
                "matched_skills",
                "missing_skills",
                "additional_skills",
                "analysis",
                "learning_roadmap",
                "recommendations",
            ]

            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Invalid AI response: missing {field}")

            score = result["skill_gap_score"]

            if (
                isinstance(score, bool)
                or not isinstance(score, (int, float))
                or not 0 <= score <= 100
            ):
                raise ValueError("Invalid skill gap score.")

            for field in [
                "matched_skills",
                "missing_skills",
                "additional_skills",
                "learning_roadmap",
                "recommendations",
            ]:
                if not isinstance(result[field], list):
                    raise ValueError(f"{field} must be a list.")

            return result

        except GeminiTemporaryError:
            if model == models[-1]:
                raise
        except (json.JSONDecodeError, ValueError) as exc:
            raise GeminiInvalidResponse(
                "Gemini returned an invalid skill analysis."
            ) from exc
        except Exception as exc:
            if not is_transient_provider_error(exc):
                raise
            if model == models[-1]:
                raise GeminiTemporaryError(
                    "Gemini is temporarily unavailable after bounded attempts."
                ) from exc
            delay = retry_delay_seconds(exc, 0)
            if delay is not None:
                time.sleep(delay)

    raise GeminiTemporaryError(
        "Gemini is temporarily unavailable after the configured model attempts."
    )
