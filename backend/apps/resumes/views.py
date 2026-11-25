
import logging
from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from gridfs import GridFSBucket

from django.utils.text import get_valid_filename

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from config.mongodb import get_database

from .utils import extract_resume_text
from .ai_service import analyze_resume_with_gemini
from config.ai_runtime import GeminiInvalidResponse, GeminiTemporaryError


logger = logging.getLogger(__name__)


# ==========================================
# Helper Function
# ==========================================

def get_user_id(request):
    return request.user.data["_id"]


def parse_resume_id(resume_id):
    try:
        return ObjectId(resume_id)
    except (InvalidId, TypeError):
        return None


# ==========================================
# 1. Resume Upload API
# POST /api/resumes/upload/
# ==========================================

class ResumeUploadView(APIView):

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):

        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response(
                {"error": "Please upload a resume using the file field."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            file_bytes, extracted_text = extract_resume_text(
                uploaded_file
            )

        except GeminiInvalidResponse:
            logger.exception("Gemini returned an invalid resume analysis.")
            return Response(
                {"error": "The AI service returned an invalid resume analysis. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY
            )

        except GeminiTemporaryError:
            logger.exception("Gemini is temporarily unavailable for resume analysis.")
            return Response(
                {"error": "AI service is temporarily unavailable. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except ValueError:
            return Response(
                {"error": "AI configuration is incomplete. Please contact support."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        db = get_database()
        bucket = GridFSBucket(db)

        safe_filename = get_valid_filename(uploaded_file.name)

        if safe_filename.lower().endswith(".pdf"):
            content_type = "application/pdf"

        elif safe_filename.lower().endswith(".docx"):
            content_type = (
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            )

        else:
            return Response(
                {"error": "Only PDF and DOCX files are supported."},
                status=status.HTTP_400_BAD_REQUEST
            )

        file_id = None

        try:

            file_id = bucket.upload_from_stream(
                safe_filename,
                file_bytes,
                metadata={
                    "owner_id": get_user_id(request),
                    "content_type": content_type,
                }
            )

            created_at = datetime.now(timezone.utc)

            document = {
                "owner_id": get_user_id(request),
                "filename": safe_filename,
                "content_type": content_type,
                "file_id": file_id,
                "extracted_text": extracted_text,
                "analysis": None,
                "analysis_status": "pending",
                "created_at": created_at,
            }

            result = db["resumes"].insert_one(document)

            return Response(
                {
                    "message": "Resume uploaded successfully.",
                    "resume": {
                        "id": str(result.inserted_id),
                        "filename": safe_filename,
                        "content_type": content_type,
                        "analysis_status": "pending",
                        "created_at": created_at.isoformat(),
                    }
                },
                status=status.HTTP_201_CREATED
            )

        except Exception:

            logger.exception("Resume upload failed")

            if file_id is not None:
                try:
                    bucket.delete(file_id)
                except Exception:
                    logger.exception("Failed to clean up uploaded GridFS file")

            return Response(
                {"error": "Resume upload failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==========================================
# 2. Resume List API
# GET /api/resumes/
# ==========================================

class ResumeListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        db = get_database()

        resumes = db["resumes"].find(
            {
                "owner_id": get_user_id(request)
            },
            {
                "extracted_text": 0,
                "file_id": 0,
            }
        ).sort("created_at", -1)

        results = []

        for resume in resumes:

            analysis = resume.get("analysis") or {}

            results.append({
                "id": str(resume["_id"]),
                "filename": resume.get("filename"),
                "content_type": resume.get("content_type"),
                "analysis_status": resume.get(
                    "analysis_status", "pending"
                ),
                "resume_score": analysis.get("resume_score"),
                "created_at": (
                    resume["created_at"].isoformat()
                    if resume.get("created_at")
                    else None
                ),
            })

        return Response(
            {"resumes": results},
            status=status.HTTP_200_OK
        )


# ==========================================
# 3. Resume Detail API
# GET /api/resumes/<resume_id>/
# ==========================================

class ResumeDetailView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, resume_id):

        object_id = parse_resume_id(resume_id)

        if object_id is None:
            return Response(
                {"error": "Invalid resume ID."},
                status=status.HTTP_400_BAD_REQUEST
            )

        db = get_database()

        resume = db["resumes"].find_one({
            "_id": object_id,
            "owner_id": get_user_id(request),
        })

        if not resume:
            return Response(
                {"error": "Resume not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {
                "id": str(resume["_id"]),
                "filename": resume.get("filename"),
                "content_type": resume.get("content_type"),
                "extracted_text": resume.get("extracted_text", ""),
                "analysis": resume.get("analysis"),
                "analysis_status": resume.get(
                    "analysis_status", "pending"
                ),
                "created_at": (
                    resume["created_at"].isoformat()
                    if resume.get("created_at")
                    else None
                ),
                "analyzed_at": (
                    resume["analyzed_at"].isoformat()
                    if resume.get("analyzed_at")
                    else None
                ),
            },
            status=status.HTTP_200_OK
        )


# ==========================================
# 4. Resume Delete API
# DELETE /api/resumes/<resume_id>/delete/
# ==========================================

class ResumeDeleteView(APIView):

    permission_classes = [IsAuthenticated]

    def delete(self, request, resume_id):

        object_id = parse_resume_id(resume_id)

        if object_id is None:
            return Response(
                {"error": "Invalid resume ID."},
                status=status.HTTP_400_BAD_REQUEST
            )

        db = get_database()

        resume = db["resumes"].find_one({
            "_id": object_id,
            "owner_id": get_user_id(request),
        })

        if not resume:
            return Response(
                {"error": "Resume not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:

            if resume.get("file_id"):
                GridFSBucket(db).delete(resume["file_id"])

            db["resumes"].delete_one({
                "_id": object_id,
                "owner_id": get_user_id(request),
            })

            return Response(
                {"message": "Resume deleted successfully."},
                status=status.HTTP_200_OK
            )

        except Exception:

            logger.exception("Resume deletion failed")

            return Response(
                {"error": "Unable to delete resume."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==========================================
# 5. AI Resume Analysis API
# POST /api/resumes/<resume_id>/analyze/
# ==========================================

class ResumeAnalysisView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, resume_id):

        object_id = parse_resume_id(resume_id)

        if object_id is None:
            return Response(
                {"error": "Invalid resume ID."},
                status=status.HTTP_400_BAD_REQUEST
            )

        db = get_database()

        resume = db["resumes"].find_one({
            "_id": object_id,
            "owner_id": get_user_id(request),
        })

        if not resume:
            return Response(
                {"error": "Resume not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        resume_text = resume.get("extracted_text", "")

        if not resume_text.strip():
            return Response(
                {"error": "Resume text is empty. Upload a readable resume."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            analysis = analyze_resume_with_gemini(resume_text)

            analyzed_at = datetime.now(timezone.utc)

            update_result = db["resumes"].update_one(
                {
                    "_id": object_id,
                    "owner_id": get_user_id(request),
                },
                {
                    "$set": {
                        "analysis": analysis,
                        "analysis_status": "completed",
                        "analyzed_at": analyzed_at,
                    }
                }
            )

            if update_result.matched_count == 0:
                return Response(
                    {"error": "Resume was not found during save."},
                    status=status.HTTP_404_NOT_FOUND
                )

            return Response(
                {
                    "message": "AI resume analysis completed successfully.",
                    "resume_id": str(object_id),
                    "analysis_status": "completed",
                    "analyzed_at": analyzed_at.isoformat(),
                    "analysis": analysis,
                },
                status=status.HTTP_200_OK
            )

        except ValueError as error:

            return Response(
                {"error": str(error)},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception:

            logger.exception("Gemini resume analysis failed")

            return Response(
                {
                    "error": (
                        "AI resume analysis failed. "
                        "Please check Gemini configuration and server logs."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY
            )
