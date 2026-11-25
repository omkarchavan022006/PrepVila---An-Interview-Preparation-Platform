
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from config.mongodb import get_database

from .serializers import FollowupQuestionRequestSerializer
from .ai_service import (
    generate_followup_questions,
    GeminiTemporaryError,
)


logger = logging.getLogger(__name__)


def get_user_id(request):
    return request.user.data["_id"]


class GenerateFollowupQuestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FollowupQuestionRequestSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        if not ObjectId.is_valid(data["interview_id"]):
            return Response(
                {"error": "Invalid interview ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            db = get_database()
            user_id = get_user_id(request)

            interview_id = ObjectId(data["interview_id"])

            interview = db.mock_interviews.find_one({
                "_id": interview_id,
                "user_id": user_id,
            })

            if not interview:
                return Response(
                    {"error": "Interview not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            question_text = data["question"].strip()

            question_data = next(
                (
                    item
                    for item in interview.get("questions", [])
                    if item.get("question", "").strip() == question_text
                ),
                None,
            )

            if not question_data:
                return Response(
                    {
                        "error": (
                            "Question does not belong to this interview."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            stored_answer = question_data.get("user_answer")

            if (
                not isinstance(stored_answer, str)
                or not stored_answer.strip()
            ):
                return Response(
                    {
                        "error": (
                            "Submit an answer to this interview question first."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if stored_answer.strip() != data["candidate_answer"].strip():
                return Response(
                    {
                        "error": (
                            "Candidate answer does not match the saved "
                            "interview answer."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            result = generate_followup_questions(
                question=question_text,
                candidate_answer=stored_answer,
                job_title=interview.get(
                    "job_title",
                    data["job_title"],
                ),
                difficulty=data["difficulty"],
                number_of_followups=data["number_of_followups"],
            )

            document = {
                "user_id": user_id,
                "interview_id": interview_id,
                "question": question_text,
                "candidate_answer": stored_answer,
                "job_title": interview.get("job_title", ""),
                "difficulty": data["difficulty"],
                "number_of_followups": data["number_of_followups"],
                "result": result,
                "created_at": datetime.now(timezone.utc),
            }

            inserted = db.followup_questions.insert_one(document)

            return Response(
                {
                    "message": (
                        "Follow-up questions generated successfully."
                    ),
                    "followup_id": str(inserted.inserted_id),
                    "interview_id": str(interview_id),
                    "result": result,
                },
                status=status.HTTP_201_CREATED,
            )

        except ValueError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except GeminiTemporaryError:
            logger.exception("Gemini temporarily unavailable.")
            return Response(
                {
                    "error": (
                        "AI service is temporarily unavailable. "
                        "Please try again."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception:
            logger.exception("Follow-up generation failed.")
            return Response(
                {"error": "Unable to generate follow-up questions."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class FollowupHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            db = get_database()
            user_id = get_user_id(request)

            records = list(
                db.followup_questions.find(
                    {"user_id": user_id}
                ).sort("created_at", -1).limit(50)
            )

            history = []

            for record in records:
                history.append({
                    "followup_id": str(record["_id"]),
                    "interview_id": str(record["interview_id"]),
                    "question": record["question"],
                    "job_title": record.get("job_title", ""),
                    "difficulty": record.get("difficulty", ""),
                    "created_at": record["created_at"].isoformat(),
                })

            return Response(
                {
                    "count": len(history),
                    "history": history,
                },
                status=status.HTTP_200_OK,
            )

        except Exception:
            logger.exception("Could not retrieve follow-up history.")
            return Response(
                {"error": "Unable to retrieve follow-up history."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class FollowupDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, followup_id):
        try:
            object_id = ObjectId(followup_id)
        except (InvalidId, TypeError):
            return Response(
                {"error": "Invalid follow-up ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            db = get_database()
            user_id = get_user_id(request)

            record = db.followup_questions.find_one({
                "_id": object_id,
                "user_id": user_id,
            })

            if not record:
                return Response(
                    {"error": "Follow-up record not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {
                    "followup_id": str(record["_id"]),
                    "interview_id": str(record["interview_id"]),
                    "question": record["question"],
                    "candidate_answer": record["candidate_answer"],
                    "job_title": record.get("job_title", ""),
                    "difficulty": record.get("difficulty", ""),
                    "result": record["result"],
                    "created_at": record["created_at"].isoformat(),
                },
                status=status.HTTP_200_OK,
            )

        except Exception:
            logger.exception("Could not retrieve follow-up details.")
            return Response(
                {"error": "Unable to retrieve follow-up details."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
