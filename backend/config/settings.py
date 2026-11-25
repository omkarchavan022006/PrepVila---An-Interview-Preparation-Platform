
import os
from pathlib import Path
from dotenv import load_dotenv


# ==========================================
# BASE DIRECTORY
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")


# ==========================================
# SECURITY SETTINGS
# ==========================================

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "development-only-secret-key"
)

DEBUG = os.getenv("DEBUG", "False").lower() == "true"

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "ALLOWED_HOSTS",
        "127.0.0.1,localhost"
    ).split(",")
    if host.strip()
]


# ==========================================
# INSTALLED APPLICATIONS
# ==========================================

INSTALLED_APPS = [

    # Django Core Applications
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",

    # Third Party Applications
    "corsheaders",
    "rest_framework",

    # PrepVela applications
    "apps.accounts.apps.AccountsConfig",
    "apps.resumes.apps.ResumesConfig",
    "apps.skills.apps.SkillsConfig",
    "apps.questions.apps.QuestionsConfig",
    "apps.interviews.apps.InterviewsConfig",
    "apps.dashboard.apps.DashboardConfig",
    "apps.resume_builder.apps.ResumeBuilderConfig",
    "apps.feedback.apps.FeedbackConfig",
    "apps.jobs.apps.JobsConfig",
    "apps.chatbot.apps.ChatbotConfig",
    "apps.coding_interview.apps.CodingInterviewConfig",
    "apps.followup_questions.apps.FollowupQuestionsConfig",
    "apps.interview_feedback.apps.InterviewFeedbackConfig",
    "apps.code_debugger.apps.CodeDebuggerConfig",
]


# ==========================================
# MIDDLEWARE
# ==========================================

MIDDLEWARE = [

    "django.middleware.security.SecurityMiddleware",

    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.common.CommonMiddleware",

]


# ==========================================
# URL CONFIGURATION
# ==========================================

ROOT_URLCONF = "config.urls"


# ==========================================
# TEMPLATE CONFIGURATION
# ==========================================

TEMPLATES = []


# ==========================================
# WSGI / ASGI CONFIGURATION
# ==========================================

WSGI_APPLICATION = "config.wsgi.application"

ASGI_APPLICATION = "config.asgi.application"


# ==========================================
# DATABASE CONFIGURATION
# ==========================================

# Django system database.
# Application data continues to use MongoDB through PyMongo.

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "django_system.sqlite3",
    }
}


# ==========================================
# CORS CONFIGURATION
# ==========================================

CORS_ALLOWED_ORIGINS = [
    os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173"
    )
]


# ==========================================
# REST FRAMEWORK CONFIGURATION
# ==========================================

REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "config.api_exceptions.safe_exception_handler",
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.MongoJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}


# ==========================================
# LANGUAGE AND TIMEZONE
# ==========================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True


# ==========================================
# STATIC FILES
# ==========================================

STATIC_URL = "static/"

STATIC_ROOT = BASE_DIR / "staticfiles"


# ==========================================
# DEFAULT PRIMARY KEY
# ==========================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
