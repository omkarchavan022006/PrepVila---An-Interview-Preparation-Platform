
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from config.mongodb import get_database

from .serializers import CodeDebugRequestSerializer
from .ai_service import debug_code, GeminiInvalidResponse, GeminiTemporaryError


logger = logging.getLogger(__name__)


def get_user_id(request):
    return request.user.data["_id"]


class DebugCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CodeDebugRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        try:
            result = debug_code(
                code=data["code"],
                programming_language=data["programming_language"],
                error_message=data["error_message"],
                expected_behavior=data["expected_behavior"],
            )

        except GeminiInvalidResponse:
            logger.exception("Gemini returned an invalid debugging result.")
            return Response(
                {"error": "The AI service returned an invalid analysis. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError:
            return Response(
                {"error": "AI configuration is incomplete. Please contact support."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except GeminiTemporaryError:
            logger.exception("Gemini temporarily unavailable during code debugging.")
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
            logger.exception("Code debugging failed.")
            return Response(
                {"error": "Unable to debug the submitted code."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            db = get_database()
            user_id = get_user_id(request)
            document = {
                "user_id": user_id,
                "programming_language": data["programming_language"],
                "original_code": data["code"],
                "error_message": data["error_message"],
                "expected_behavior": data["expected_behavior"],
                "result": result,
                "created_at": datetime.now(timezone.utc),
            }
            inserted = db.code_debugger_reports.insert_one(document)
            if not inserted.acknowledged or inserted.inserted_id is None:
                raise RuntimeError("MongoDB did not acknowledge the report write.")
        except Exception:
            logger.exception("Could not persist the code debugging report.")
            return Response(
                {"error": "The analysis completed but could not be confirmed as saved. Check report history before retrying."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": "Code debugging completed successfully.",
                "debug_id": str(inserted.inserted_id),
                "programming_language": data["programming_language"],
                "evaluation_type": (
                    "AI static code analysis only; "
                    "submitted code was not executed."
                ),
                "result": result,
            },
            status=status.HTTP_201_CREATED,
        )


class CodeDebugHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            db = get_database()
            user_id = get_user_id(request)

            records = list(
                db.code_debugger_reports.find(
                    {"user_id": user_id}
                ).sort("created_at", -1).limit(50)
            )

            history = []

            for record in records:
                result = record.get("result", {})

                history.append({
                    "debug_id": str(record["_id"]),
                    "programming_language": record.get(
                        "programming_language", ""
                    ),
                    "summary": result.get("summary", ""),
                    "has_errors": result.get("has_errors", False),
                    "overall_severity": result.get(
                        "overall_severity", ""
                    ),
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
            logger.exception("Could not retrieve code debugging history.")
            return Response(
                {"error": "Unable to retrieve debugging history."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CodeDebugDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, debug_id):
        try:
            object_id = ObjectId(debug_id)

        except (InvalidId, TypeError):
            return Response(
                {"error": "Invalid debugging report ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            db = get_database()
            user_id = get_user_id(request)

            record = db.code_debugger_reports.find_one({
                "_id": object_id,
                "user_id": user_id,
            })

            if not record:
                return Response(
                    {"error": "Debugging report not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {
                    "debug_id": str(record["_id"]),
                    "programming_language": record.get(
                        "programming_language", ""
                    ),
                    "original_code": record.get("original_code", ""),
                    "error_message": record.get("error_message", ""),
                    "expected_behavior": record.get(
                        "expected_behavior", ""
                    ),
                    "result": record["result"],
                    "evaluation_type": (
                        "AI static code analysis only; "
                        "submitted code was not executed."
                    ),
                    "created_at": record["created_at"].isoformat(),
                },
                status=status.HTTP_200_OK,
            )

        except Exception:
            logger.exception("Could not retrieve debugging report.")
            return Response(
                {"error": "Unable to retrieve debugging report."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
