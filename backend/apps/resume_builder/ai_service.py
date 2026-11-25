
import json
import os

from google import genai
from google.genai import types
from config.ai_runtime import GeminiInvalidResponse, generate_with_retry, gemini_http_options


def generate_professional_resume(data):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")

    if not api_key:
        raise ValueError("Gemini API key is not configured.")

    if not model:
        raise ValueError("Gemini model is not configured.")

    prompt = f"""
You are an expert professional resume writer.

Improve the candidate's resume content using ONLY the information supplied.
Do not invent employers, job titles, dates, degrees, skills, achievements,
certifications, metrics, or experience.

Correct grammar, improve clarity, and use concise professional language.
Preserve all factual details. Do not add unsupported claims.

Return ONLY valid JSON with this exact structure:

{{
  "professional_title": "",
  "professional_summary": "",
  "skills": [],
  "experience": [
    {{
      "job_title": "",
      "company": "",
      "duration": "",
      "responsibilities": []
    }}
  ],
  "education": [
    {{
      "degree": "",
      "institution": "",
      "year": "",
      "details": ""
    }}
  ],
  "projects": [
    {{
      "name": "",
      "description": "",
      "technologies": []
    }}
  ],
  "certifications": [],
  "achievements": []
}}

Rules:
- Keep empty sections as empty arrays.
- Do not create fictional experience for freshers.
- Do not invent numerical results or performance metrics.
- Keep the candidate's skills consistent with the supplied skills.
- Return valid JSON only, without Markdown fences.

CANDIDATE INFORMATION:

{json.dumps(data, ensure_ascii=False)}
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
                max_output_tokens=4000,
            ),
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = json.loads(response.text)

        required_fields = [
            "professional_title",
            "professional_summary",
            "skills",
            "experience",
            "education",
            "projects",
            "certifications",
            "achievements",
        ]

        if not isinstance(result, dict):
            raise ValueError("Gemini returned an invalid resume structure.")

        for field in required_fields:
            if field not in result:
                raise ValueError(f"Missing resume field: {field}")

        if not isinstance(result["skills"], list):
            raise ValueError("Invalid skills format.")

        if not isinstance(result["experience"], list):
            raise ValueError("Invalid experience format.")

        if not isinstance(result["education"], list):
            raise ValueError("Invalid education format.")

        if not isinstance(result["projects"], list):
            raise ValueError("Invalid projects format.")

        if not isinstance(result["certifications"], list):
            raise ValueError("Invalid certifications format.")

        if not isinstance(result["achievements"], list):
            raise ValueError("Invalid achievements format.")

        return result

    except json.JSONDecodeError as error:
        raise GeminiInvalidResponse("Gemini returned an invalid resume response.") from error

    except ValueError as error:
        raise GeminiInvalidResponse("Gemini returned an invalid resume response.") from error

    finally:
        client.close()
