
import logging
import re
from datetime import datetime, timezone
from io import BytesIO

from bson import ObjectId
from bson.errors import InvalidId
from gridfs import GridFSBucket

from django.http import FileResponse
from django.utils.text import get_valid_filename

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from config.mongodb import get_database
from config.ai_runtime import GeminiInvalidResponse, GeminiTemporaryError

from .serializers import ResumeGenerateSerializer
from .ai_service import generate_professional_resume
from .pdf_service import generate_resume_pdf


logger = logging.getLogger(__name__)


def get_user_id(request):
    return request.user.data["_id"]


def parse_resume_id(resume_id):
    try:
        return ObjectId(resume_id)
    except (InvalidId, TypeError):
        return None


class ResumeGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ResumeGenerateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {
                    "error": "Invalid resume information.",
                    "details": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        personal_data = serializer.validated_data

        try:
            # Generate professional resume content using Gemini.
            resume_content = generate_professional_resume(personal_data)

            # Generate PDF in memory.
            pdf_bytes = generate_resume_pdf(
                personal_data,
                resume_content,
            )

            if not pdf_bytes.startswith(b"%PDF-"):
                raise ValueError("Generated file is not a valid PDF.")

            db = get_database()
            bucket = GridFSBucket(db)

            safe_name = get_valid_filename(
                personal_data["full_name"]
            )
            filename = f"{safe_name}_Resume.pdf"

            file_id = bucket.upload_from_stream(
                filename,
                BytesIO(pdf_bytes),
                metadata={
                    "owner_id": get_user_id(request),
                    "content_type": "application/pdf",
                    "document_type": "generated_resume",
                },
            )

            created_at = datetime.now(timezone.utc)

            document = {
                "owner_id": get_user_id(request),
                "filename": filename,
                "content_type": "application/pdf",
                "file_id": file_id,
                "personal_data": personal_data,
                "resume_content": resume_content,
                "created_at": created_at,
            }

            try:
                result = db["generated_resumes"].insert_one(document)
            except Exception:
                bucket.delete(file_id)
                raise

            return Response(
                {
                    "message": "Professional resume PDF generated successfully.",
                    "resume": {
                        "id": str(result.inserted_id),
                        "filename": filename,
                        "content_type": "application/pdf",
                        "created_at": created_at.isoformat(),
                        "download_url": (
                            f"/api/resume-builder/download/"
                            f"{result.inserted_id}/"
                        ),
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        except GeminiInvalidResponse:
            logger.exception("Gemini returned an invalid resume builder response.")
            return Response(
                {"error": "The AI service returned an invalid resume. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except GeminiTemporaryError:
            logger.exception("Gemini is temporarily unavailable for resume generation.")
            return Response(
                {"error": "AI service is temporarily unavailable. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except ValueError:
            return Response(
                {"error": "AI configuration is incomplete. Please contact support."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except Exception:
            logger.exception("Resume PDF generation failed")

            return Response(
                {
                    "error": (
                        "Resume PDF generation failed. "
                        "Please check server logs and try again."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )


class ResumeDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, resume_id):
        object_id = parse_resume_id(resume_id)

        if object_id is None:
            return Response(
                {"error": "Invalid resume ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = get_database()

        resume = db["generated_resumes"].find_one(
            {
                "_id": object_id,
                "owner_id": get_user_id(request),
            }
        )

        if not resume:
            return Response(
                {"error": "Generated resume not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        file_id = resume.get("file_id")

        if not file_id:
            return Response(
                {"error": "Resume PDF file is unavailable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            grid_out = GridFSBucket(db).open_download_stream(file_id)
            pdf_bytes = grid_out.read()
            grid_out.close()

            response = FileResponse(
                BytesIO(pdf_bytes),
                content_type="application/pdf",
            )

            response["Content-Disposition"] = (
                f'attachment; filename="{resume["filename"]}"'
            )
            response["X-Content-Type-Options"] = "nosniff"

            return response

        except Exception:
            logger.exception("Resume PDF download failed")

            return Response(
                {"error": "Unable to download resume PDF."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ResumeBuilderHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        db = get_database()

        resumes = db["generated_resumes"].find(
            {
                "owner_id": get_user_id(request),
            },
            {
                "personal_data": 0,
                "resume_content": 0,
                "file_id": 0,
            },
        ).sort("created_at", -1).limit(50)

        results = []

        for resume in resumes:
            results.append(
                {
                    "id": str(resume["_id"]),
                    "filename": resume.get("filename"),
                    "content_type": resume.get("content_type"),
                    "created_at": (
                        resume["created_at"].isoformat()
                        if resume.get("created_at")
                        else None
                    ),
                    "download_url": (
                        f"/api/resume-builder/download/"
                        f"{resume['_id']}/"
                    ),
                }
            )

        return Response(
            {
                "count": len(results),
                "resumes": results,
            },
            status=status.HTTP_200_OK,
        )


class ResumeBuilderDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, resume_id):
        object_id = parse_resume_id(resume_id)

        if object_id is None:
            return Response(
                {"error": "Invalid resume ID."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        db = get_database()

        resume = db["generated_resumes"].find_one(
            {
                "_id": object_id,
                "owner_id": get_user_id(request),
            }
        )

        if not resume:
            return Response(
                {"error": "Generated resume not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            if resume.get("file_id"):
                GridFSBucket(db).delete(resume["file_id"])

            db["generated_resumes"].delete_one(
                {
                    "_id": object_id,
                    "owner_id": get_user_id(request),
                }
            )

            return Response(
                {"message": "Generated resume deleted successfully."},
                status=status.HTTP_200_OK,
            )

        except Exception:
            logger.exception("Generated resume deletion failed")

            return Response(
                {"error": "Unable to delete generated resume."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
