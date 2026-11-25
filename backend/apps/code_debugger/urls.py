
from django.urls import path

from .views import (
    DebugCodeView,
    CodeDebugHistoryView,
    CodeDebugDetailView,
)

urlpatterns = [
    path(
        "analyze/",
        DebugCodeView.as_view(),
        name="debug-code",
    ),
    path(
        "history/",
        CodeDebugHistoryView.as_view(),
        name="code-debug-history",
    ),
    path(
        "<str:debug_id>/",
        CodeDebugDetailView.as_view(),
        name="code-debug-detail",
    ),
]
