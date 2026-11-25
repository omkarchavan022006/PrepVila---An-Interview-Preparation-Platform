
from django.urls import path
from .views import ResumeAnalysisView

from .views import (
    ResumeUploadView,
    ResumeListView,
    ResumeDetailView,
    ResumeDeleteView,
)

urlpatterns = [
    path("upload/", ResumeUploadView.as_view(), name="resume-upload"),
    path("", ResumeListView.as_view(), name="resume-list"),
    path("<str:resume_id>/", ResumeDetailView.as_view(), name="resume-detail"),
    path("<str:resume_id>/delete/", ResumeDeleteView.as_view(), name="resume-delete"),
    path(
    "<str:resume_id>/analyze/",
    ResumeAnalysisView.as_view(),
    name="resume-analyze"
    ),
]
