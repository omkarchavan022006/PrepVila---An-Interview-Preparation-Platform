
from datetime import datetime, timezone as datetime_timezone

from bson import ObjectId
from bson.errors import InvalidId

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from config.mongodb import get_database
from config.ai_runtime import GeminiInvalidResponse

from .ai_service import (
    generate_interview_questions,
    GeminiTemporaryError,
)


class GenerateInterviewQuestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        job_id = request.data.get("job_id")
        resume_id = request.data.get("resume_id")

        question_type = request.data.get("question_type", "technical")
        difficulty = request.data.get("difficulty", "medium")
        number_of_questions = request.data.get("number_of_questions", 10)

        if not job_id:
            return Response(
                {"error": "job_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not ObjectId.is_valid(job_id):
            return Response(
                {"error": "Invalid job_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = request.user.data.get("_id")

        if not user_id:
            return Response(
                {"error": "Authenticated user ID not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if isinstance(number_of_questions, bool):
            return Response(
                {"error": "number_of_questions must be an integer between 1 and 20."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            number_of_questions = int(number_of_questions)
        except (TypeError, ValueError):
            return Response(
                {"error": "number_of_questions must be an integer between 1 and 20."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not 1 <= number_of_questions <= 20:
            return Response(
                {"error": "number_of_questions must be between 1 and 20."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if question_type not in ["technical", "hr", "mixed"]:
            return Response(
                {"error": "question_type must be technical, hr or mixed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if difficulty not in ["easy", "medium", "hard"]:
            return Response(
                {"error": "difficulty must be easy, medium or hard."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = get_database()

        job = db.jobs.find_one({
            "_id": ObjectId(job_id)
        })

        if not job:
            return Response(
                {"error": "Job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        resume_skills = []

        if resume_id:
            if not ObjectId.is_valid(resume_id):
                return Response(
                    {"error": "Invalid resume_id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            resume = db.resumes.find_one({
                "_id": ObjectId(resume_id),
                "owner_id": user_id,
            })

            if not resume:
                return Response(
                    {"error": "Resume not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if resume.get("analysis_status") != "completed":
                return Response(
                    {"error": "Please complete resume analysis first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            resume_skills = (
                resume.get("analysis", {}).get("technical_skills", [])
            )

        try:
            result = generate_interview_questions(
                job_title=job.get("title", ""),
                job_description=job.get("description", ""),
                required_skills=job.get("required_skills", []),
                question_type=question_type,
                difficulty=difficulty,
                number_of_questions=number_of_questions,
                resume_skills=resume_skills,
            )

        except GeminiTemporaryError:
            return Response(
                {
                    "error": "Gemini AI is temporarily unavailable. Please try again later.",
                    "retry": True,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except GeminiInvalidResponse:
            return Response(
                {"error": "The AI service returned invalid interview questions. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception:
            return Response(
                {"error": "Unable to generate interview questions."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        document = {
            "user_id": user_id,
            "job_id": ObjectId(job_id),
            "job_title": job.get("title", ""),
            "resume_id": ObjectId(resume_id) if resume_id else None,
            "question_type": question_type,
            "difficulty": difficulty,
            "number_of_questions": number_of_questions,
            "questions": result["questions"],
            "created_at": datetime.now(datetime_timezone.utc),
        }

        insert_result = db.interview_questions.insert_one(document)

        return Response(
            {
                "message": "Interview questions generated successfully.",
                "generation_id": str(insert_result.inserted_id),
                "job_title": document["job_title"],
                "question_type": question_type,
                "difficulty": difficulty,
                "questions": result["questions"],
            },
            status=status.HTTP_201_CREATED,
        )


class InterviewQuestionHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.data.get("_id")

        if not user_id:
            return Response(
                {"error": "Authenticated user ID not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        db = get_database()

        records = db.interview_questions.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(50)

        history = []

        for record in records:
            history.append({
                "generation_id": str(record["_id"]),
                "job_id": str(record["job_id"]),
                "job_title": record.get("job_title", ""),
                "question_type": record.get("question_type", ""),
                "difficulty": record.get("difficulty", ""),
                "number_of_questions": record.get("number_of_questions", 0),
                "questions": record.get("questions", []),
                "created_at": record.get("created_at"),
            })

        return Response(
            {
                "count": len(history),
                "history": history,
            },
            status=status.HTTP_200_OK,
        )


class InterviewQuestionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, generation_id):
        user_id = request.user.data.get("_id")

        if not user_id:
            return Response(
                {"error": "Authenticated user ID not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not ObjectId.is_valid(generation_id):
            return Response(
                {"error": "Invalid generation_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = get_database()

        record = db.interview_questions.find_one({
            "_id": ObjectId(generation_id),
            "user_id": user_id,
        })

        if not record:
            return Response(
                {"error": "Interview question record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "generation_id": str(record["_id"]),
                "job_id": str(record["job_id"]),
                "job_title": record.get("job_title", ""),
                "question_type": record.get("question_type", ""),
                "difficulty": record.get("difficulty", ""),
                "questions": record.get("questions", []),
                "created_at": record.get("created_at"),
            },
            status=status.HTTP_200_OK,
        )
