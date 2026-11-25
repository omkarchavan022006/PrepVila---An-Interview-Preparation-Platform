
from datetime import datetime, timezone

from bson import ObjectId
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from config.mongodb import get_database


def serialize_job(job):
    job["id"] = str(job.pop("_id"))
    for field in ("created_at", "updated_at"):
        if field in job and isinstance(job[field], datetime):
            job[field] = job[field].isoformat()
    return job


class JobListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        db = get_database()

        query = {}

        search = request.query_params.get("search", "").strip()
        category = request.query_params.get("category", "").strip()
        experience = request.query_params.get("experience", "").strip()
        difficulty = request.query_params.get("difficulty", "").strip()

        if search:
            query["title"] = {
                "$regex": search,
                "$options": "i"
            }

        if category:
            query["category"] = category

        if experience:
            query["experience_level"] = experience

        if difficulty:
            query["difficulty"] = difficulty

        page = max(int(request.query_params.get("page", 1)), 1)
        limit = min(max(int(request.query_params.get("limit", 10)), 1), 100)
        skip = (page - 1) * limit

        collection = db["jobs"]
        total = collection.count_documents(query)

        jobs = list(
            collection.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

        return Response({
            "items": [serialize_job(job) for job in jobs],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        })

    def post(self, request):
        db = get_database()
        data = request.data

        title = str(data.get("title", "")).strip()
        description = str(data.get("description", "")).strip()
        category = str(data.get("category", "")).strip()
        experience_level = str(data.get("experience_level", "")).strip()
        difficulty = str(data.get("difficulty", "")).strip()
        required_skills = data.get("required_skills", [])
        responsibilities = data.get("responsibilities", [])

        if not title or not description or not category:
            return Response(
                {"error": "Title, description and category are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(required_skills, list) or not isinstance(responsibilities, list):
            return Response(
                {"error": "required_skills and responsibilities must be lists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        now = datetime.now(timezone.utc)

        job = {
            "title": title,
            "description": description,
            "category": category,
            "experience_level": experience_level,
            "difficulty": difficulty,
            "required_skills": required_skills,
            "responsibilities": responsibilities,
            "created_at": now,
            "updated_at": now
        }

        result = db["jobs"].insert_one(job)
        job["_id"] = result.inserted_id

        return Response(
            {
                "message": "Job created successfully.",
                "job": serialize_job(job)
            },
            status=status.HTTP_201_CREATED
        )


class JobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_job(self, job_id):
        if not ObjectId.is_valid(job_id):
            return None

        return get_database()["jobs"].find_one({
            "_id": ObjectId(job_id)
        })

    def get(self, request, job_id):
        job = self.get_job(job_id)

        if not job:
            return Response(
                {"error": "Job not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({"job": serialize_job(job)})

    def put(self, request, job_id):
        job = self.get_job(job_id)

        if not job:
            return Response(
                {"error": "Job not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        allowed_fields = [
            "title",
            "description",
            "category",
            "experience_level",
            "difficulty",
            "required_skills",
            "responsibilities"
        ]

        updates = {
            key: request.data[key]
            for key in allowed_fields
            if key in request.data
        }

        if not updates:
            return Response(
                {"error": "No valid fields provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if "required_skills" in updates and not isinstance(updates["required_skills"], list):
            return Response(
                {"error": "required_skills must be a list."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if "responsibilities" in updates and not isinstance(updates["responsibilities"], list):
            return Response(
                {"error": "responsibilities must be a list."},
                status=status.HTTP_400_BAD_REQUEST
            )

        updates["updated_at"] = datetime.now(timezone.utc)

        get_database()["jobs"].update_one(
            {"_id": ObjectId(job_id)},
            {"$set": updates}
        )

        updated_job = self.get_job(job_id)

        return Response({
            "message": "Job updated successfully.",
            "job": serialize_job(updated_job)
        })

    def delete(self, request, job_id):
        job = self.get_job(job_id)

        if not job:
            return Response(
                {"error": "Job not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        get_database()["jobs"].delete_one({
            "_id": ObjectId(job_id)
        })

        return Response({
            "message": "Job deleted successfully."
        })
