
from django.urls import path

from .views import (
    GenerateCodingQuestionView,
    SubmitCodingSolutionView,
    CodingInterviewHistoryView,
    CodingSubmissionDetailView,
)

urlpatterns = [
    path(
        "generate/",
        GenerateCodingQuestionView.as_view(),
        name="generate-coding-question",
    ),
    path(
        "submit/",
        SubmitCodingSolutionView.as_view(),
        name="submit-coding-solution",
    ),
    path(
        "history/",
        CodingInterviewHistoryView.as_view(),
        name="coding-interview-history",
    ),
    path(
        "submission/<str:submission_id>/",
        CodingSubmissionDetailView.as_view(),
        name="coding-submission-detail",
    ),
]
