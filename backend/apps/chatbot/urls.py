
from django.urls import path

from .views import (
    ChatbotMessageView,
    ChatbotHistoryView,
    ChatbotConversationDetailView,
    ChatbotDeleteConversationView,
)

urlpatterns = [
    path("message/", ChatbotMessageView.as_view(), name="chatbot-message"),
    path("history/", ChatbotHistoryView.as_view(), name="chatbot-history"),
    path(
        "conversation/<str:conversation_id>/",
        ChatbotConversationDetailView.as_view(),
        name="chatbot-conversation-detail",
    ),
    path(
        "conversation/<str:conversation_id>/delete/",
        ChatbotDeleteConversationView.as_view(),
        name="chatbot-conversation-delete",
    ),
]
