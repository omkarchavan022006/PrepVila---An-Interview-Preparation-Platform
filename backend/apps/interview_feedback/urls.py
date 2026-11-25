
from django.urls import path

from .views import (
    GenerateInterviewFeedbackView,
    InterviewFeedbackHistoryView,
    InterviewFeedbackDetailView,
)

urlpatterns = [
    path(
        "generate/",
        GenerateInterviewFeedbackView.as_view(),
        name="generate-interview-feedback",
    ),
    path(
        "history/",
        InterviewFeedbackHistoryView.as_view(),
        name="interview-feedback-history",
    ),
    path(
        "<str:feedback_id>/",
        InterviewFeedbackDetailView.as_view(),
        name="interview-feedback-detail",
    ),
]
