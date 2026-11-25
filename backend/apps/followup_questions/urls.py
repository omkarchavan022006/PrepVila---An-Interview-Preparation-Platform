
from django.urls import path

from .views import (
    GenerateFollowupQuestionsView,
    FollowupHistoryView,
    FollowupDetailView,
)


urlpatterns = [
    path(
        "generate/",
        GenerateFollowupQuestionsView.as_view(),
        name="generate-followup-questions",
    ),
    path(
        "history/",
        FollowupHistoryView.as_view(),
        name="followup-history",
    ),
    path(
        "<str:followup_id>/",
        FollowupDetailView.as_view(),
        name="followup-detail",
    ),
]
