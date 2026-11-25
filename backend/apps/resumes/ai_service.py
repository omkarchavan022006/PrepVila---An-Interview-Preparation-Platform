
import json
import os

from google import genai
from google.genai import types
from config.ai_runtime import GeminiInvalidResponse, generate_with_retry, gemini_http_options


def analyze_resume_with_gemini(resume_text):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")

    if not api_key or not model:
        raise ValueError("Gemini AI configuration is missing.")

    if not resume_text or not resume_text.strip():
        raise ValueError("Resume text is empty.")

    # Avoid sending excessively large resume content.
    resume_text = resume_text[:30000]

    prompt = f"""
You are a professional resume evaluator and career coach.

Analyze the following resume carefully.

Return ONLY valid JSON with this exact structure:

{{
  "resume_score": 0,
  "candidate_summary": "",
  "technical_skills": [],
  "soft_skills": [],
  "experience_analysis": "",
  "strengths": [],
  "weaknesses": [],
  "missing_skills": [],
  "improvement_suggestions": [],
  "recommended_job_roles": [],
  "overall_feedback": ""
}}

Rules:
- resume_score must be an integer between 0 and 100.
- Do not invent qualifications or experience.
- Identify only skills supported by the resume.
- Explain weaknesses constructively.
- Missing skills must be relevant to the candidate's apparent career direction.
- If information is unavailable, say so.
- Return JSON only, without Markdown code fences.

RESUME CONTENT:

{resume_text}
"""

    client = genai.Client(api_key=api_key, http_options=gemini_http_options())

    try:
        response = generate_with_retry(
            client,
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=3000,
            ),
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        analysis = json.loads(response.text)

        score = analysis.get("resume_score")

        if (
            not isinstance(score, int)
            or isinstance(score, bool)
            or not 0 <= score <= 100
        ):
            raise GeminiInvalidResponse("Gemini returned an invalid resume score.")

        return analysis

    except json.JSONDecodeError as error:
        raise GeminiInvalidResponse("Gemini returned an invalid resume analysis.") from error

    except ValueError as error:
        raise GeminiInvalidResponse("Gemini returned an invalid resume analysis.") from error

    finally:
        client.close()
