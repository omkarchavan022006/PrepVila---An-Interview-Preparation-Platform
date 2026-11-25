
from django.urls import path

from .views import (
    StartMockInterviewView,
    SubmitMockInterviewAnswerView,
    NextMockInterviewQuestionView,
    CompleteMockInterviewView,
    MockInterviewHistoryView,
    MockInterviewDetailView,
)

urlpatterns = [
    path(
        "start/",
        StartMockInterviewView.as_view(),
        name="start-mock-interview",
    ),
    path(
        "history/",
        MockInterviewHistoryView.as_view(),
        name="mock-interview-history",
    ),
    path(
        "<str:interview_id>/answer/",
        SubmitMockInterviewAnswerView.as_view(),
        name="submit-mock-interview-answer",
    ),
    path(
        "<str:interview_id>/next/",
        NextMockInterviewQuestionView.as_view(),
        name="next-mock-interview-question",
    ),
    path(
        "<str:interview_id>/complete/",
        CompleteMockInterviewView.as_view(),
        name="complete-mock-interview",
    ),
    path(
        "<str:interview_id>/",
        MockInterviewDetailView.as_view(),
        name="mock-interview-detail",
    ),
]
