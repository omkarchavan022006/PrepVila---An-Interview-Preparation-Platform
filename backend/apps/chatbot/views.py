
from datetime import datetime, timezone
import logging

from bson import ObjectId

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from config.mongodb import get_database
from config.ai_runtime import GeminiInvalidResponse
from .ai_service import (
    generate_chatbot_response,
    GeminiTemporaryError,
)

logger = logging.getLogger(__name__)


def get_user_id(request):
    return request.user.data["_id"]


def serialize_conversation(conversation):
    return {
        "conversation_id": str(conversation["_id"]),
        "title": conversation.get("title", ""),
        "messages": conversation.get("messages", []),
        "created_at": conversation.get("created_at"),
        "updated_at": conversation.get("updated_at"),
    }


class ChatbotMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get("message")
        conversation_id = request.data.get("conversation_id")

        if not isinstance(message, str) or not message.strip():
            return Response(
                {"error": "message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(message) > 10000:
            return Response(
                {"error": "Message cannot exceed 10000 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            db = get_database()
            user_id = get_user_id(request)
            now = datetime.now(timezone.utc)

            conversation = None

            if conversation_id:
                if (
                    not isinstance(conversation_id, str)
                    or not ObjectId.is_valid(conversation_id)
                ):
                    return Response(
                        {"error": "Invalid conversation_id."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                conversation = db.chatbot_conversations.find_one({
                    "_id": ObjectId(conversation_id),
                    "user_id": user_id,
                })

                if not conversation:
                    return Response(
                        {"error": "Conversation not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

            history = (
                conversation.get("messages", [])
                if conversation else []
            )

            try:
                answer = generate_chatbot_response(
                    message=message,
                    conversation_history=history,
                )

            except GeminiInvalidResponse:
                logger.exception("Chatbot AI returned an invalid response.")
                return Response(
                    {"error": "The AI service returned an invalid response. Please try again later."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            except ValueError:
                logger.exception("Chatbot configuration/validation error")
                return Response(
                    {"error": "AI configuration is incomplete. Please contact support."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            except GeminiTemporaryError as exc:
                logger.exception(
                    "CHATBOT GEMINI TEMPORARY ERROR: %s", exc
                )
                return Response(
                    {
                        "error": (
                            "AI service is temporarily unavailable. "
                            "Please try again."
                        )
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            except Exception:
                logger.exception("CHATBOT UNEXPECTED AI ERROR")
                return Response(
                    {"error": "Unable to generate AI response."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            user_message = {
                "role": "user",
                "content": message.strip(),
                "created_at": now,
            }

            assistant_message = {
                "role": "assistant",
                "content": answer,
                "created_at": datetime.now(timezone.utc),
            }

            if conversation:
                update_result = db.chatbot_conversations.update_one(
                    {
                        "_id": conversation["_id"],
                        "user_id": user_id,
                    },
                    {
                        "$push": {
                            "messages": {
                                "$each": [
                                    user_message,
                                    assistant_message,
                                ]
                            }
                        },
                        "$set": {
                            "updated_at": assistant_message["created_at"]
                        },
                    },
                )
                if update_result.matched_count == 0:
                    return Response(
                        {"error": "Conversation was not available to save this message."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                conversation_id = str(conversation["_id"])

            else:
                result = db.chatbot_conversations.insert_one({
                    "user_id": user_id,
                    "title": message.strip()[:80],
                    "messages": [
                        user_message,
                        assistant_message,
                    ],
                    "created_at": now,
                    "updated_at": assistant_message["created_at"],
                })
                if not result.acknowledged or result.inserted_id is None:
                    raise RuntimeError("MongoDB did not acknowledge the conversation write.")

                conversation_id = str(result.inserted_id)

            return Response(
                {
                    "message": "AI response generated successfully.",
                    "conversation_id": conversation_id,
                    "user_message": user_message,
                    "assistant_message": assistant_message,
                },
                status=status.HTTP_200_OK,
            )

        except Exception:
            logger.exception("CHATBOT DATABASE OR REQUEST ERROR")
            return Response(
                {"error": "Unable to process chatbot request."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChatbotHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            db = get_database()
            user_id = get_user_id(request)

            conversations = db.chatbot_conversations.find(
                {"user_id": user_id},
                {
                    "title": 1,
                    "created_at": 1,
                    "updated_at": 1,
                    "messages": {"$slice": -2},
                },
            ).sort("updated_at", -1).limit(50)

            return Response(
                {
                    "count": db.chatbot_conversations.count_documents(
                        {"user_id": user_id}
                    ),
                    "history": [
                        serialize_conversation(item)
                        for item in conversations
                    ],
                },
                status=status.HTTP_200_OK,
            )

        except Exception:
            logger.exception("CHATBOT HISTORY ERROR")
            return Response(
                {"error": "Unable to retrieve chatbot history."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChatbotConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        if not ObjectId.is_valid(conversation_id):
            return Response(
                {"error": "Invalid conversation_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            db = get_database()

            conversation = db.chatbot_conversations.find_one({
                "_id": ObjectId(conversation_id),
                "user_id": get_user_id(request),
            })

            if not conversation:
                return Response(
                    {"error": "Conversation not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                serialize_conversation(conversation),
                status=status.HTTP_200_OK,
            )

        except Exception:
            logger.exception("CHATBOT CONVERSATION DETAIL ERROR")
            return Response(
                {"error": "Unable to retrieve conversation."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ChatbotDeleteConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, conversation_id):
        if not ObjectId.is_valid(conversation_id):
            return Response(
                {"error": "Invalid conversation_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            db = get_database()

            result = db.chatbot_conversations.delete_one({
                "_id": ObjectId(conversation_id),
                "user_id": get_user_id(request),
            })

            if result.deleted_count == 0:
                return Response(
                    {"error": "Conversation not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(
                {"message": "Conversation deleted successfully."},
                status=status.HTTP_200_OK,
            )

        except Exception:
            logger.exception("CHATBOT DELETE CONVERSATION ERROR")
            return Response(
                {"error": "Unable to delete conversation."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
