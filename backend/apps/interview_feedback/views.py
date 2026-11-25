
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from config.mongodb import get_database

from .serializers import InterviewFeedbackRequestSerializer
from .ai_service import (
    generate_interview_feedback,
    GeminiInvalidResponse,
    GeminiTemporaryError,
)


logger = logging.getLogger(__name__)


def get_user_id(request):
    return request.user.data["_id"]


class GenerateInterviewFeedbackView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InterviewFeedbackRequestSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        interview_id = serializer.validated_data["interview_id"]

        if not ObjectId.is_valid(interview_id):
            return Response(
                {"error": "Invalid interview ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            db = get_database()
            user_id = get_user_id(request)
            object_id = ObjectId(interview_id)

            interview = db.mock_interviews.find_one({
                "_id": object_id,
                "user_id": user_id,
            })

            if not interview:
                return Response(
                    {"error": "Interview not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if interview.get("status") != "completed":
                return Response(
                    {
                        "error": (
                            "Complete the mock interview before "
                            "generating its feedback report."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            questions = interview.get("questions", [])

            if not questions:
                return Response(
                    {"error": "No interview questions found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if any(
                not isinstance(item.get("user_answer"), str)
                or not item.get("user_answer", "").strip()
                or not isinstance(item.get("evaluation"), dict)
                for item in questions
            ):
                return Response(
                    {
                        "error": (
                            "All interview questions must have "
                            "saved answers and evaluations."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            existing = db.interview_feedback.find_one(
                {"user_id": user_id, "interview_id": object_id},
                sort=[("created_at", -1)],
            )
            if existing:
                return Response(
                    {
                        "message": "A saved feedback report already exists for this interview.",
                        "feedback_id": str(existing["_id"]),
                        "interview_id": str(object_id),
                        "result": existing.get("result", {}),
                    },
                    status=status.HTTP_200_OK,
                )

            result = generate_interview_feedback(interview)

            document = {
                "user_id": user_id,
                "interview_id": object_id,
                "job_title": interview.get("job_title", ""),
                "overall_score": interview.get("total_score", 0),
                "overall_rating": result["overall_rating"],
                "result": result,
                "created_at": datetime.now(timezone.utc),
            }

            try:
                inserted = db.interview_feedback.insert_one(document)
            except Exception:
                logger.exception("Could not persist generated feedback report.")
                return Response(
                    {"error": "The report outcome could not be confirmed. Check feedback history before retrying."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            if not inserted.acknowledged or inserted.inserted_id is None:
                logger.error("MongoDB did not acknowledge the feedback report write.")
                return Response(
                    {"error": "The report outcome could not be confirmed. Check feedback history before retrying."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            return Response(
                {
                    "message": (
                        "Interview feedback report generated successfully."
                    ),
                    "feedback_id": str(inserted.inserted_id),
                    "interview_id": str(object_id),
                    "result": result,
                },
                status=status.HTTP_201_CREATED,
            )

        except GeminiInvalidResponse:
            logger.exception("Gemini returned invalid interview feedback.")
            return Response(
                {"error": "The AI service returned an invalid feedback report. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError:
            return Response(
                {"error": "AI configuration is incomplete. Please contact support."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except GeminiTemporaryError:
            logger.exception(
                "Gemini temporarily unavailable during feedback generation."
            )
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
            logger.exception("Interview feedback generation failed.")
            return Response(
                {"error": "Unable to generate interview feedback report."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class InterviewFeedbackHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            db = get_database()
            user_id = get_user_id(request)

            records = list(
                db.interview_feedback.find(
                    {"user_id": user_id}
                ).sort("created_at", -1).limit(50)
            )

            history = []

            for record in records:
                history.append({
                    "feedback_id": str(record["_id"]),
                    "interview_id": str(record["interview_id"]),
                    "job_title": record.get("job_title", ""),
                    "overall_score": record.get("overall_score", 0),
                    "overall_rating": record.get("overall_rating", ""),
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
            logger.exception("Could not retrieve feedback history.")
            return Response(
                {"error": "Unable to retrieve feedback history."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class InterviewFeedbackDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, feedback_id):
        try:
            object_id = ObjectId(feedback_id)
        except (InvalidId, TypeError):
            return Response(
                {"error": "Invalid feedback ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            db = get_database()
            user_id = get_user_id(request)

            record = db.interview_feedback.find_one({
                "_id": object_id,
                "user_id": user_id,
            })

            if not record:
                return Response(
                    {"error": "Feedback report not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {
                    "feedback_id": str(record["_id"]),
                    "interview_id": str(record["interview_id"]),
                    "job_title": record.get("job_title", ""),
                    "overall_score": record.get("overall_score", 0),
                    "overall_rating": record.get("overall_rating", ""),
                    "result": record["result"],
                    "created_at": record["created_at"].isoformat(),
                },
                status=status.HTTP_200_OK,
            )

        except Exception:
            logger.exception("Could not retrieve feedback details.")
            return Response(
                {"error": "Unable to retrieve feedback details."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
