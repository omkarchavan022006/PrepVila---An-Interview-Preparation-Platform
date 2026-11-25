
from django.urls import path
from django.http import JsonResponse
from .views import health_check
from django.urls import path, include






def home(request):
    return JsonResponse({
        "project": "PrepVela",
        "status": "Backend Running",
        "message": "Welcome to PrepVela"
    })


urlpatterns = [
    path("", home, name="home"),
    path("api/health/", health_check, name="health-check"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/resumes/", include("apps.resumes.urls")),
    path("api/jobs/", include("apps.jobs.urls")),
    path("api/skills/", include("apps.skills.urls")),
    path("api/questions/", include("apps.questions.urls")),
    path("api/interviews/", include("apps.interviews.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
    path("api/chatbot/", include("apps.chatbot.urls")),
    path("api/coding-interview/", include("apps.coding_interview.urls")),
    path("api/resume-builder/", include("apps.resume_builder.urls")),
    path("api/followup-questions/",include("apps.followup_questions.urls")),
    path("api/interview-feedback/",include("apps.interview_feedback.urls")),
    path("api/code-debugger/",include("apps.code_debugger.urls")),
]
