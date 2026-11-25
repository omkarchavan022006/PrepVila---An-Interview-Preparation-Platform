
import json
import os
import time

from google import genai
from config.ai_runtime import GeminiInvalidResponse, GeminiTemporaryError, gemini_http_options, is_transient_provider_error, retry_delay_seconds


def generate_interview_questions(
    job_title,
    job_description,
    required_skills,
    question_type="technical",
    difficulty="medium",
    number_of_questions=10,
    resume_skills=None,
):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL")

    if not api_key:
        raise ValueError("Gemini API key is not configured.")

    if not model:
        raise ValueError("GEMINI_MODEL is not configured.")

    if question_type not in ["technical", "hr", "mixed"]:
        raise ValueError("question_type must be technical, hr or mixed.")

    if difficulty not in ["easy", "medium", "hard"]:
        raise ValueError("difficulty must be easy, medium or hard.")

    if (
        isinstance(number_of_questions, bool)
        or not isinstance(number_of_questions, int)
        or not 1 <= number_of_questions <= 20
    ):
        raise ValueError("number_of_questions must be between 1 and 20.")

    resume_skills = resume_skills or []

    prompt = f"""
You are an expert technical interviewer and career coach.

Generate interview questions using the job and candidate information.

JOB TITLE:
{job_title}

JOB DESCRIPTION:
{job_description}

REQUIRED SKILLS:
{json.dumps(required_skills)}

CANDIDATE RESUME SKILLS:
{json.dumps(resume_skills)}

QUESTION TYPE: {question_type}
DIFFICULTY: {difficulty}
NUMBER OF QUESTIONS: {number_of_questions}

Return ONLY valid JSON in this exact structure:

{{
  "questions": [
    {{
      "question": "Interview question",
      "answer": "Detailed sample answer",
      "explanation": "Why this question is asked and what the interviewer evaluates",
      "topic": "Relevant technical or HR topic",
      "question_type": "technical or hr",
      "difficulty": "easy, medium or hard"
    }}
  ]
}}

RULES:
- Generate exactly the requested number of questions.
- Questions must be relevant to the selected job.
- For technical questions, focus on required skills.
- For HR questions, focus on communication, teamwork,
  problem-solving and professional behaviour.
- For mixed questions, include both technical and HR questions.
- Answers must be accurate, clear and useful for interview preparation.
- Explanations must describe what the interviewer evaluates.
- Do not invent candidate experience or qualifications.
- Avoid duplicate questions.
- Match the requested difficulty.
- Return JSON only. Do not use Markdown code fences.
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

                questions = result.get("questions")

                if not isinstance(questions, list):
                    raise ValueError("AI response must contain a questions list.")

                if len(questions) != number_of_questions:
                    raise ValueError(
                        f"Expected {number_of_questions} questions, "
                        f"but Gemini returned {len(questions)}."
                    )

                required_fields = [
                    "question",
                    "answer",
                    "explanation",
                    "topic",
                    "question_type",
                    "difficulty",
                ]

                for index, question in enumerate(questions):
                    if not isinstance(question, dict):
                        raise ValueError(
                            f"Question {index + 1} must be an object."
                        )

                    for field in required_fields:
                        if not isinstance(question.get(field), str) or not question[field].strip():
                            raise ValueError(
                                f"Question {index + 1} has an invalid {field}."
                            )

                    if question["question_type"] not in ["technical", "hr"]:
                        raise ValueError(
                            f"Question {index + 1} has an invalid question_type."
                        )

                    if question["difficulty"] not in ["easy", "medium", "hard"]:
                        raise ValueError(
                            f"Question {index + 1} has an invalid difficulty."
                        )

                return result

            except GeminiTemporaryError:
                raise
            except (json.JSONDecodeError, ValueError) as exc:
                raise GeminiInvalidResponse(
                    "Gemini returned an invalid interview question response."
                ) from exc
            except Exception as exc:
                if not is_transient_provider_error(exc):
                    raise

                if attempt == 1:
                    raise GeminiTemporaryError(
                        "Gemini is temporarily unavailable after a bounded retry."
                    ) from exc
                delay = retry_delay_seconds(exc, attempt)
                if delay is None:
                    raise GeminiTemporaryError(
                        "Gemini is temporarily unavailable; retry later."
                    ) from exc
                time.sleep(delay)

    finally:
        client.close()
