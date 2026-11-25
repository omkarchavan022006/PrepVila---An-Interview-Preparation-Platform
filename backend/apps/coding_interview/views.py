
from datetime import datetime, timezone as datetime_timezone
import logging

from bson import ObjectId

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from config.mongodb import get_database

from .ai_service import (
    generate_coding_question,
    evaluate_submitted_code,
    GeminiInvalidResponse,
    GeminiTemporaryError,
)

from .serializers import (
    CodingQuestionRequestSerializer,
    CodeSubmissionSerializer,
)

logger = logging.getLogger(__name__)


class GenerateCodingQuestionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CodingQuestionRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = request.user.data.get("_id")

        if not user_id:
            return Response(
                {"error": "Authenticated user ID not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = serializer.validated_data

        try:
            db = get_database()
        except Exception:
            logger.exception("Coding question storage is unavailable.")
            return Response(
                {"error": "Coding question storage is temporarily unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            result = generate_coding_question(
                topic=data["topic"],
                difficulty=data["difficulty"],
                programming_language=data["programming_language"],
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
                {"error": "The AI service returned an invalid coding question. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError:
            return Response(
                {"error": "AI configuration is incomplete. Please contact support."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception:
            return Response(
                {"error": "Unable to generate coding question."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        document = {
            "user_id": user_id,
            "topic": data["topic"],
            "difficulty": data["difficulty"],
            "programming_language": data["programming_language"],
            "question": result,
            "created_at": datetime.now(datetime_timezone.utc),
        }

        try:
            insert_result = db.coding_questions.insert_one(document)
            if not insert_result.acknowledged or insert_result.inserted_id is None:
                raise RuntimeError("MongoDB did not acknowledge the coding question write.")
        except Exception:
            logger.exception("Could not persist the generated coding question.")
            return Response(
                {"error": "The question outcome could not be confirmed. Check available history before generating again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "Coding question generated successfully.",
                "question_id": str(insert_result.inserted_id),
                "topic": data["topic"],
                "difficulty": data["difficulty"],
                "programming_language": data["programming_language"],
                "question": result,
            },
            status=status.HTTP_201_CREATED,
        )


class SubmitCodingSolutionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CodeSubmissionSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = request.user.data.get("_id")

        if not user_id:
            return Response(
                {"error": "Authenticated user ID not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = serializer.validated_data
        question_id = data["question_id"]

        if not ObjectId.is_valid(question_id):
            return Response(
                {"error": "Invalid question_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            db = get_database()
            question_record = db.coding_questions.find_one({
                "_id": ObjectId(question_id),
                "user_id": user_id,
            })
        except Exception:
            logger.exception("Could not load the coding question for submission.")
            return Response(
                {"error": "Coding question storage is temporarily unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not question_record:
            return Response(
                {"error": "Coding question not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        expected_language = question_record.get("programming_language")

        if data["programming_language"] != expected_language:
            return Response(
                {
                    "error": (
                        "Submitted programming language does not match "
                        "the question language."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            evaluation = evaluate_submitted_code(
                question=question_record["question"]["description"],
                submitted_code=data["submitted_code"],
                programming_language=data["programming_language"],
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
                {"error": "The AI service returned an invalid code evaluation. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError:
            return Response(
                {"error": "AI configuration is incomplete. Please contact support."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception:
            return Response(
                {"error": "Unable to evaluate submitted code."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        document = {
            "user_id": user_id,
            "question_id": ObjectId(question_id),
            "programming_language": data["programming_language"],
            "submitted_code": data["submitted_code"],
            "evaluation": evaluation,
            "created_at": datetime.now(datetime_timezone.utc),
        }

        try:
            insert_result = db.coding_submissions.insert_one(document)
            if not insert_result.acknowledged or insert_result.inserted_id is None:
                raise RuntimeError("MongoDB did not acknowledge the coding submission write.")
        except Exception:
            logger.exception("Could not persist the evaluated coding submission.")
            return Response(
                {"error": "The evaluation outcome could not be confirmed. Check submission history before retrying."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "Code evaluated successfully.",
                "submission_id": str(insert_result.inserted_id),
                "question_id": question_id,
                "evaluation": evaluation,
                "evaluation_type": "AI static analysis only; code was not executed.",
            },
            status=status.HTTP_201_CREATED,
        )


class CodingInterviewHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.data.get("_id")

        if not user_id:
            return Response(
                {"error": "Authenticated user ID not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        db = get_database()

        records = db.coding_submissions.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(50)

        history = []

        for record in records:
            history.append({
                "submission_id": str(record["_id"]),
                "question_id": str(record["question_id"]),
                "programming_language": record.get("programming_language", ""),
                "evaluation": record.get("evaluation", {}),
                "created_at": record.get("created_at"),
            })

        return Response(
            {
                "count": len(history),
                "history": history,
            },
            status=status.HTTP_200_OK,
        )


class CodingSubmissionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, submission_id):
        user_id = request.user.data.get("_id")

        if not user_id:
            return Response(
                {"error": "Authenticated user ID not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not ObjectId.is_valid(submission_id):
            return Response(
                {"error": "Invalid submission_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = get_database()

        record = db.coding_submissions.find_one({
            "_id": ObjectId(submission_id),
            "user_id": user_id,
        })

        if not record:
            return Response(
                {"error": "Coding submission not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "submission_id": str(record["_id"]),
                "question_id": str(record["question_id"]),
                "programming_language": record.get("programming_language", ""),
                "submitted_code": record.get("submitted_code", ""),
                "evaluation": record.get("evaluation", {}),
                "created_at": record.get("created_at"),
            },
            status=status.HTTP_200_OK,
        )
