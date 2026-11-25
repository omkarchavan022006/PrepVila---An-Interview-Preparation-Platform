
from django.urls import path

from .views import (
    ResumeGenerateView,
    ResumeDownloadView,
    ResumeBuilderHistoryView,
    ResumeBuilderDeleteView,
)


urlpatterns = [
    path(
        "generate/",
        ResumeGenerateView.as_view(),
        name="resume-generate",
    ),
    path(
        "download/<str:resume_id>/",
        ResumeDownloadView.as_view(),
        name="resume-download",
    ),
    path(
        "history/",
        ResumeBuilderHistoryView.as_view(),
        name="resume-builder-history",
    ),
    path(
        "<str:resume_id>/delete/",
        ResumeBuilderDeleteView.as_view(),
        name="resume-builder-delete",
    ),
]
