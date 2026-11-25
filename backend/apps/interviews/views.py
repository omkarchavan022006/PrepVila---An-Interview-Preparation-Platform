
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from config.mongodb import get_database
from config.ai_runtime import GeminiInvalidResponse
from .ai_service import (
    generate_mock_interview_question,
    evaluate_mock_interview_answer,
    GeminiTemporaryError,
)


def get_user_id(request):
    return request.user.data["_id"]


class StartMockInterviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data

        job_id = data.get("job_id")
        resume_id = data.get("resume_id")
        difficulty = data.get("difficulty", "medium")
        total_questions = data.get("total_questions", 5)

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

        if difficulty not in ["easy", "medium", "hard"]:
            return Response(
                {"error": "Invalid difficulty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            isinstance(total_questions, bool)
            or not isinstance(total_questions, int)
            or not 1 <= total_questions <= 20
        ):
            return Response(
                {"error": "total_questions must be between 1 and 20."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = get_database()
        user_id = get_user_id(request)

        job = db.jobs.find_one({"_id": ObjectId(job_id)})

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
                "analysis_status": "completed",
            })

            if not resume:
                return Response(
                    {"error": "Completed resume not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            analysis = resume.get("analysis", {})
            resume_skills = analysis.get("technical_skills", [])

        try:
            question_data = generate_mock_interview_question(
                job_title=job.get("title", ""),
                job_description=job.get("description", ""),
                required_skills=job.get("required_skills", []),
                difficulty=difficulty,
                previous_questions=[],
                resume_skills=resume_skills,
            )

        except GeminiTemporaryError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except GeminiInvalidResponse:
            return Response(
                {"error": "The AI service returned an invalid interview question. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception:
            return Response(
                {"error": "Unable to generate interview question."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        now = datetime.now(timezone.utc)

        interview = {
            "user_id": user_id,
            "job_id": ObjectId(job_id),
            "resume_id": ObjectId(resume_id) if resume_id else None,
            "job_title": job.get("title", ""),
            "difficulty": difficulty,
            "total_questions": total_questions,
            "current_question_number": 1,
            "questions": [
                {
                    **question_data,
                    "user_answer": None,
                    "evaluation": None,
                }
            ],
            "status": "in_progress",
            "total_score": 0,
            "created_at": now,
            "updated_at": now,
            "completed_at": None,
        }

        result = db.mock_interviews.insert_one(interview)

        return Response(
            {
                "message": "Mock interview started successfully.",
                "interview_id": str(result.inserted_id),
                "job_title": interview["job_title"],
                "difficulty": difficulty,
                "current_question_number": 1,
                "total_questions": total_questions,
                "question": {
                    "question": question_data["question"],
                    "topic": question_data["topic"],
                },
            },
            status=status.HTTP_201_CREATED,
        )


class SubmitMockInterviewAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, interview_id):
        if not ObjectId.is_valid(interview_id):
            return Response(
                {"error": "Invalid interview_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_answer = request.data.get("answer")

        if not isinstance(user_answer, str) or not user_answer.strip():
            return Response(
                {"error": "answer is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = get_database()
        user_id = get_user_id(request)

        interview = db.mock_interviews.find_one({
            "_id": ObjectId(interview_id),
            "user_id": user_id,
        })

        if not interview:
            return Response(
                {"error": "Interview not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if interview.get("status") != "in_progress":
            return Response(
                {"error": "This interview is not in progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        question_index = interview["current_question_number"] - 1
        question_data = interview["questions"][question_index]

        try:
            evaluation = evaluate_mock_interview_answer(
                question=question_data["question"],
                expected_answer=question_data["expected_answer"],
                user_answer=user_answer.strip(),
                job_title=interview["job_title"],
            )

        except GeminiTemporaryError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except GeminiInvalidResponse:
            return Response(
                {"error": "The AI service returned an invalid answer evaluation. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception:
            return Response(
                {"error": "Unable to evaluate the submitted answer."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        db.mock_interviews.update_one(
            {
                "_id": ObjectId(interview_id),
                "user_id": user_id,
                "status": "in_progress",
                "current_question_number": interview["current_question_number"],
            },
            {
                "$set": {
                    f"questions.{question_index}.user_answer": user_answer.strip(),
                    f"questions.{question_index}.evaluation": evaluation,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        return Response({
            "message": "Answer evaluated successfully.",
            "question_number": interview["current_question_number"],
            "evaluation": evaluation,
        }, status=status.HTTP_200_OK)


class NextMockInterviewQuestionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, interview_id):
        if not ObjectId.is_valid(interview_id):
            return Response(
                {"error": "Invalid interview_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = get_database()
        user_id = get_user_id(request)

        interview = db.mock_interviews.find_one({
            "_id": ObjectId(interview_id),
            "user_id": user_id,
        })

        if not interview:
            return Response(
                {"error": "Interview not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if interview.get("status") != "in_progress":
            return Response(
                {"error": "Interview is not in progress."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_number = interview["current_question_number"]

        if not interview["questions"][-1].get("evaluation"):
            return Response(
                {"error": "Submit and evaluate your current answer first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if current_number >= interview["total_questions"]:
            return Response(
                {"error": "All questions have been answered. Complete the interview."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_questions = [
            item["question"] for item in interview["questions"]
        ]

        job = db.jobs.find_one({"_id": interview["job_id"]})

        try:
            question_data = generate_mock_interview_question(
                job_title=interview["job_title"],
                job_description=job.get("description", "") if job else "",
                required_skills=job.get("required_skills", []) if job else [],
                difficulty=interview["difficulty"],
                previous_questions=previous_questions,
            )

        except GeminiTemporaryError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except GeminiInvalidResponse:
            return Response(
                {"error": "The AI service returned an invalid interview question. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception:
            return Response(
                {"error": "Unable to generate the next question."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        new_number = current_number + 1

        db.mock_interviews.update_one(
            {
                "_id": ObjectId(interview_id),
                "user_id": user_id,
                "status": "in_progress",
                "current_question_number": current_number,
            },
            {
                "$push": {
                    "questions": {
                        **question_data,
                        "user_answer": None,
                        "evaluation": None,
                    }
                },
                "$set": {
                    "current_question_number": new_number,
                    "updated_at": datetime.now(timezone.utc),
                },
            },
        )

        return Response({
            "message": "Next question generated successfully.",
            "current_question_number": new_number,
            "question": {
                "question": question_data["question"],
                "topic": question_data["topic"],
            },
        }, status=status.HTTP_200_OK)


class CompleteMockInterviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, interview_id):
        if not ObjectId.is_valid(interview_id):
            return Response(
                {"error": "Invalid interview_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = get_database()
        user_id = get_user_id(request)

        interview = db.mock_interviews.find_one({
            "_id": ObjectId(interview_id),
            "user_id": user_id,
        })

        if not interview:
            return Response(
                {"error": "Interview not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if interview.get("status") != "in_progress":
            return Response(
                {"error": "Interview is already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        questions = interview.get("questions", [])

        if len(questions) != interview["total_questions"]:
            return Response(
                {"error": "Answer all interview questions before completing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if any(not item.get("evaluation") for item in questions):
            return Response(
                {"error": "Every question must be answered and evaluated."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scores = [
            item["evaluation"]["score"]
            for item in questions
        ]

        average_score = round(sum(scores) / len(scores))

        now = datetime.now(timezone.utc)

        db.mock_interviews.update_one(
            {
                "_id": ObjectId(interview_id),
                "user_id": user_id,
                "status": "in_progress",
            },
            {
                "$set": {
                    "status": "completed",
                    "total_score": average_score,
                    "completed_at": now,
                    "updated_at": now,
                }
            },
        )

        return Response({
            "message": "Mock interview completed successfully.",
            "interview_id": interview_id,
            "job_title": interview["job_title"],
            "total_questions": len(questions),
            "total_score": average_score,
            "status": "completed",
            "question_scores": scores,
        }, status=status.HTTP_200_OK)


class MockInterviewHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        db = get_database()
        user_id = get_user_id(request)

        records = list(
            db.mock_interviews.find(
                {"user_id": user_id}
            ).sort("created_at", -1).limit(50)
        )

        history = []

        for item in records:
            history.append({
                "interview_id": str(item["_id"]),
                "job_title": item["job_title"],
                "difficulty": item["difficulty"],
                "total_questions": item["total_questions"],
                "current_question_number": item["current_question_number"],
                "total_score": item.get("total_score", 0),
                "status": item["status"],
                "created_at": item["created_at"].isoformat(),
                "completed_at": (
                    item["completed_at"].isoformat()
                    if item.get("completed_at") else None
                ),
            })

        return Response({
            "count": len(history),
            "history": history,
        }, status=status.HTTP_200_OK)


class MockInterviewDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, interview_id):
        if not ObjectId.is_valid(interview_id):
            return Response(
                {"error": "Invalid interview_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = get_database()
        user_id = get_user_id(request)

        interview = db.mock_interviews.find_one({
            "_id": ObjectId(interview_id),
            "user_id": user_id,
        })

        if not interview:
            return Response(
                {"error": "Interview not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            "interview_id": str(interview["_id"]),
            "job_title": interview["job_title"],
            "difficulty": interview["difficulty"],
            "status": interview["status"],
            "total_questions": interview["total_questions"],
            "current_question_number": interview["current_question_number"],
            "total_score": interview["total_score"],
            "questions": interview["questions"],
            "created_at": interview["created_at"].isoformat(),
            "completed_at": (
                interview["completed_at"].isoformat()
                if interview.get("completed_at") else None
            ),
        }, status=status.HTTP_200_OK)
