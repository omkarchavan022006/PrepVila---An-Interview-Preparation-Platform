
from datetime import datetime, timezone
import logging

from bson import ObjectId
from bson.errors import InvalidId

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from config.mongodb import get_database
from config.ai_runtime import GeminiInvalidResponse

from .ai_service import (
    generate_skill_gap_analysis,
    GeminiTemporaryError,
)


class SkillGapAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # 1. Get IDs
        resume_id = request.data.get("resume_id")
        job_id = request.data.get("job_id")

        if not resume_id or not job_id:
            return Response(
                {"error": "resume_id and job_id are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Validate ObjectIds
        try:
            resume_object_id = ObjectId(resume_id)
            job_object_id = ObjectId(job_id)

        except (InvalidId, TypeError):
            return Response(
                {"error": "Invalid resume_id or job_id."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Database connection
        db = get_database()

        user_id = request.user.data.get("_id")

        if not user_id:
            return Response(
                {"error": "Authenticated user ID not found."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # 4. Get user's resume
        resume = db.resumes.find_one({
            "_id": resume_object_id,
            "owner_id": user_id
        })

        if not resume:
            return Response(
                {"error": "Resume not found or access denied."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 5. Check resume analysis
        if resume.get("analysis_status") != "completed":
            return Response(
                {"error": "Complete resume analysis first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 6. Get job
        job = db.jobs.find_one({
            "_id": job_object_id
        })

        if not job:
            return Response(
                {"error": "Job not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 7. Get skills
        resume_analysis = resume.get("analysis") or {}

        resume_skills = resume_analysis.get(
            "technical_skills", []
        )

        required_skills = job.get(
            "required_skills", []
        )

        if not resume_skills or not required_skills:
            return Response(
                {"error": "Resume skills or job requirements are missing."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 8. Gemini AI analysis
        try:
            result = generate_skill_gap_analysis(
                resume_skills=resume_skills,
                required_skills=required_skills,
                job_title=job.get("title", "Unknown Job")
            )

        except GeminiTemporaryError as exc:
            return Response(
                {
                    "error": "Gemini AI is temporarily unavailable.",
                    "retry": True
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except GeminiInvalidResponse:
            return Response(
                {"error": "The AI service returned an invalid skill analysis. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY
            )

        except ValueError:
            return Response(
                {"error": "AI configuration is incomplete. Please contact support."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception:
            logging.getLogger(__name__).exception("Skill gap analysis failed.")
            return Response(
                {"error": "AI skill gap analysis failed."},
                status=status.HTTP_502_BAD_GATEWAY
            )

        # 9. Save analysis in MongoDB
        document = {
            "user_id": user_id,
            "resume_id": resume_object_id,
            "job_id": job_object_id,
            "job_title": job.get("title"),
            "analysis": result,
            "created_at": datetime.now(timezone.utc)
        }

        try:
            inserted = db.skill_gap_analyses.insert_one(document)

        except Exception:
            return Response(
                {"error": "Analysis generated but could not be saved."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 10. API response
        return Response(
            {
                "message": "AI skill gap analysis completed successfully.",
                "analysis_id": str(inserted.inserted_id),
                "job_title": job.get("title"),
                "analysis": result
            },
            status=status.HTTP_201_CREATED
        )
