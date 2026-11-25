
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from config.mongodb import get_database


def get_user_id(request):
    return request.user.data["_id"]


def format_datetime(value):
    if value and hasattr(value, "isoformat"):
        return value.isoformat()
    return None


class DashboardOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            db = get_database()
            user_id = get_user_id(request)

            # Fetch only the logged-in user's interviews
            interviews = list(
                db.mock_interviews.find(
                    {"user_id": user_id}
                ).sort("created_at", -1)
            )

            completed = [
                item for item in interviews
                if item.get("status") == "completed"
            ]

            in_progress = [
                item for item in interviews
                if item.get("status") == "in_progress"
            ]

            scores = [
                item.get("total_score", 0)
                for item in completed
                if isinstance(item.get("total_score"), (int, float))
            ]

            average_score = (
                round(sum(scores) / len(scores), 2)
                if scores else 0
            )

            highest_score = max(scores) if scores else 0

            # Recent interview history
            recent_history = []

            for item in interviews[:5]:
                recent_history.append({
                    "interview_id": str(item["_id"]),
                    "job_title": item.get("job_title", ""),
                    "difficulty": item.get("difficulty", ""),
                    "total_questions": item.get("total_questions", 0),
                    "total_score": item.get("total_score", 0),
                    "status": item.get("status", ""),
                    "created_at": format_datetime(
                        item.get("created_at")
                    ),
                    "completed_at": format_datetime(
                        item.get("completed_at")
                    ),
                })

            # Performance chart: latest 10 completed interviews
            performance_chart = []

            chart_interviews = sorted(
                completed,
                key=lambda item: item.get("completed_at")
                or item.get("created_at"),
            )[-10:]

            for item in chart_interviews:
                performance_chart.append({
                    "date": format_datetime(
                        item.get("completed_at")
                        or item.get("created_at")
                    ),
                    "job_title": item.get("job_title", ""),
                    "score": item.get("total_score", 0),
                })

            # Question-wise performance
            topic_scores = {}

            for interview in completed:
                for question in interview.get("questions", []):
                    evaluation = question.get("evaluation") or {}
                    topic = question.get("topic", "General")
                    score = evaluation.get("score")

                    if isinstance(score, (int, float)):
                        topic_scores.setdefault(topic, []).append(score)

            question_performance = [
                {
                    "topic": topic,
                    "average_score": round(
                        sum(topic_values) / len(topic_values), 2
                    ),
                    "attempts": len(topic_values),
                }
                for topic, topic_values in topic_scores.items()
            ]

            return Response({
                "message": "Dashboard data retrieved successfully.",
                "statistics": {
                    "total_interviews": len(interviews),
                    "completed_interviews": len(completed),
                    "in_progress_interviews": len(in_progress),
                    "average_score": average_score,
                    "highest_score": highest_score,
                },
                "performance_chart": performance_chart,
                "question_performance": question_performance,
                "recent_history": recent_history,
            }, status=status.HTTP_200_OK)

        except Exception:
            return Response(
                {
                    "error": "Unable to retrieve dashboard data."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
