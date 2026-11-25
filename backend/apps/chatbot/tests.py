from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from bson import ObjectId
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from config.ai_runtime import GeminiTemporaryError
from apps.chatbot.views import (
    ChatbotMessageView,
    ChatbotHistoryView,
    ChatbotConversationDetailView,
    ChatbotDeleteConversationView,
)


class ChatbotPersistenceTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user_id = "test-user-id"
        self.user = MagicMock()
        self.user.data = {"_id": self.user_id}
        self.user.is_authenticated = True
        self.conversation_id = ObjectId("507f1f77bcf86cd799439011")
        self.conversation = {
            "_id": self.conversation_id,
            "user_id": self.user_id,
            "title": "First question",
            "messages": [
                {"role": "user", "content": "First question"},
                {"role": "assistant", "content": "Saved answer"},
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def post_message(self, payload):
        request = self.factory.post("/api/chatbot/message/", payload, format="json")
        force_authenticate(request, user=self.user)
        return ChatbotMessageView.as_view()(request)

    @patch("apps.chatbot.views.generate_chatbot_response", return_value="A real generated answer")
    @patch("apps.chatbot.views.get_database")
    def test_new_conversation_persists_both_messages_and_returns_saved_id(self, get_database, generate):
        db = MagicMock()
        db.chatbot_conversations.insert_one.return_value = MagicMock(
            acknowledged=True,
            inserted_id=self.conversation_id,
        )
        get_database.return_value = db

        response = self.post_message({"message": "How should I prepare?"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["conversation_id"], str(self.conversation_id))
        self.assertEqual(response.data["assistant_message"]["content"], "A real generated answer")
        saved = db.chatbot_conversations.insert_one.call_args.args[0]
        self.assertEqual([message["role"] for message in saved["messages"]], ["user", "assistant"])
        self.assertEqual(saved["messages"][0]["content"], "How should I prepare?")
        generate.assert_called_once()

    @patch("apps.chatbot.views.generate_chatbot_response", return_value="Second generated answer")
    @patch("apps.chatbot.views.get_database")
    def test_second_message_updates_same_owned_conversation(self, get_database, _generate):
        db = MagicMock()
        db.chatbot_conversations.find_one.return_value = self.conversation
        db.chatbot_conversations.update_one.return_value = MagicMock(matched_count=1)
        get_database.return_value = db

        response = self.post_message({
            "message": "Can you clarify?",
            "conversation_id": str(self.conversation_id),
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["conversation_id"], str(self.conversation_id))
        pushed = db.chatbot_conversations.update_one.call_args.args[1]["$push"]["messages"]["$each"]
        self.assertEqual([message["role"] for message in pushed], ["user", "assistant"])
        self.assertEqual(db.chatbot_conversations.find_one.call_args.args[0]["user_id"], self.user_id)

    @patch("apps.chatbot.views.generate_chatbot_response", side_effect=GeminiTemporaryError("temporary provider failure"))
    @patch("apps.chatbot.views.get_database")
    def test_provider_failure_returns_503_without_persisting(self, get_database, _generate):
        db = MagicMock()
        get_database.return_value = db

        response = self.post_message({"message": "Can you help?"})

        self.assertEqual(response.status_code, 503)
        db.chatbot_conversations.insert_one.assert_not_called()
        db.chatbot_conversations.update_one.assert_not_called()
        self.assertNotIn("stack", str(response.data).lower())

    def test_history_detail_and_delete_are_scoped_to_current_user(self):
        db = MagicMock()
        db.chatbot_conversations.find.return_value.sort.return_value.limit.return_value = [self.conversation]
        db.chatbot_conversations.count_documents.return_value = 1
        db.chatbot_conversations.find_one.return_value = self.conversation
        db.chatbot_conversations.delete_one.return_value = MagicMock(deleted_count=1)

        with patch("apps.chatbot.views.get_database", return_value=db):
            history_request = self.factory.get("/api/chatbot/history/")
            force_authenticate(history_request, user=self.user)
            history = ChatbotHistoryView.as_view()(history_request)

            detail_request = self.factory.get("/api/chatbot/conversation/x/")
            force_authenticate(detail_request, user=self.user)
            detail = ChatbotConversationDetailView.as_view()(
                detail_request,
                conversation_id=str(self.conversation_id),
            )

            delete_request = self.factory.delete("/api/chatbot/conversation/x/delete/")
            force_authenticate(delete_request, user=self.user)
            deleted = ChatbotDeleteConversationView.as_view()(
                delete_request,
                conversation_id=str(self.conversation_id),
            )

        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data["history"][0]["conversation_id"], str(self.conversation_id))
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["conversation_id"], str(self.conversation_id))
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(db.chatbot_conversations.find.call_args.args[0]["user_id"], self.user_id)
        self.assertEqual(db.chatbot_conversations.find_one.call_args.args[0]["user_id"], self.user_id)
        self.assertEqual(db.chatbot_conversations.delete_one.call_args.args[0]["user_id"], self.user_id)

