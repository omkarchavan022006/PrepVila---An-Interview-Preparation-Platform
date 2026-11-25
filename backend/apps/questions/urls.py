
from django.urls import path
from .views import (
    GenerateInterviewQuestionsView,
    InterviewQuestionHistoryView,
    InterviewQuestionDetailView,
)

urlpatterns = [
    path(
        "generate/",
        GenerateInterviewQuestionsView.as_view(),
        name="generate-interview-questions",
    ),
    path(
        "history/",
        InterviewQuestionHistoryView.as_view(),
        name="interview-question-history",
    ),
    path(
        "<str:generation_id>/",
        InterviewQuestionDetailView.as_view(),
        name="interview-question-detail",
    ),
]
