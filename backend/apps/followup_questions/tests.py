
import json
import os
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from google.genai.errors import APIError

from apps.followup_questions.serializers import FollowupQuestionRequestSerializer
from apps.followup_questions.ai_service import (
    GeminiInvalidResponse,
    generate_followup_questions,
    GeminiTemporaryError,
)
from apps.followup_questions.views import GenerateFollowupQuestionsView

from datetime import datetime, timezone

from apps.followup_questions.views import (
    GenerateFollowupQuestionsView,
    FollowupHistoryView,
    FollowupDetailView,
)

def valid_ai_response():
    return {
        "analysis": "The candidate understands the basic concept.",
        "strengths": ["Clear explanation"],
        "improvements": ["Add a practical example"],
        "follow_up_questions": [
            {
                "question": "How would you handle this in production?",
                "reason": "To evaluate practical understanding.",
                "ideal_answer": "Use appropriate production safeguards.",
                "explanation": "Production systems need reliability and monitoring.",
                "example": "Add logging and error handling.",
            }
        ],
    }


class FollowupSerializerTests(SimpleTestCase):

    def valid_payload(self):
        return {
            "interview_id": "507f1f77bcf86cd799439011",
            "question": "What is Python?",
            "candidate_answer": "Python is a programming language.",
            "job_title": "Python Developer",
            "difficulty": "medium",
            "number_of_followups": 3,
        }

    def test_valid_request(self):
        serializer = FollowupQuestionRequestSerializer(
            data=self.valid_payload()
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_blank_candidate_answer_rejected(self):
        payload = self.valid_payload()
        payload["candidate_answer"] = "   "

        serializer = FollowupQuestionRequestSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("candidate_answer", serializer.errors)

    def test_invalid_difficulty_rejected(self):
        payload = self.valid_payload()
        payload["difficulty"] = "extreme"

        serializer = FollowupQuestionRequestSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("difficulty", serializer.errors)

    def test_followup_count_must_be_between_one_and_five(self):
        for count in [0, 6]:
            payload = self.valid_payload()
            payload["number_of_followups"] = count

            serializer = FollowupQuestionRequestSerializer(data=payload)

            self.assertFalse(serializer.is_valid())
            self.assertIn("number_of_followups", serializer.errors)


class FollowupAIServiceTests(SimpleTestCase):

    @patch.dict(os.environ, {}, clear=True)
    def test_missing_gemini_configuration(self):
        with self.assertRaisesRegex(
            ValueError,
            "Gemini AI configuration is missing",
        ):
            generate_followup_questions(
                question="What is Python?",
                candidate_answer="Python is a language.",
            )

    @patch("apps.followup_questions.ai_service.genai.Client")
    @patch.dict(
        os.environ,
        {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"},
    )
    def test_successful_generation(self, mock_client_class):
        mock_client = mock_client_class.return_value
        mock_client.models.generate_content.return_value = MagicMock(
            text=json.dumps(valid_ai_response())
        )

        result = generate_followup_questions(
            question="What is Python?",
            candidate_answer="Python is a programming language.",
            number_of_followups=1,
        )

        self.assertEqual(len(result["follow_up_questions"]), 1)
        self.assertIn("analysis", result)
        mock_client.close.assert_called_once()

    @patch("apps.followup_questions.ai_service.genai.Client")
    @patch.dict(
        os.environ,
        {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"},
    )
    def test_invalid_json_response(self, mock_client_class):
        mock_client = mock_client_class.return_value
        mock_client.models.generate_content.return_value = MagicMock(
            text="not valid json"
        )

        with self.assertRaisesRegex(GeminiInvalidResponse, "invalid JSON"):
            generate_followup_questions(
                question="What is Python?",
                candidate_answer="Python is a language.",
                number_of_followups=1,
            )

        mock_client.close.assert_called_once()

    @patch("apps.followup_questions.ai_service.genai.Client")
    @patch.dict(
        os.environ,
        {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"},
    )
    def test_unexpected_followup_count_rejected(self, mock_client_class):
        mock_client = mock_client_class.return_value
        mock_client.models.generate_content.return_value = MagicMock(
            text=json.dumps(valid_ai_response())
        )

        with self.assertRaises(GeminiInvalidResponse):
            generate_followup_questions(
                question="What is Python?",
                candidate_answer="Python is a language.",
                number_of_followups=2,
            )

        mock_client.close.assert_called_once()

    @patch("apps.followup_questions.ai_service.genai.Client")
    @patch.dict(
        os.environ,
        {"GEMINI_API_KEY": "test-key", "GEMINI_MODEL": "test-model"},
    )
    def test_temporary_gemini_error(self, mock_client_class):
        mock_client = mock_client_class.return_value
        mock_client.models.generate_content.side_effect = APIError(
            code=503,
            response_json={"error": {"message": "temporarily unavailable"}},
        )

        with patch("config.ai_runtime.time.sleep") as sleep, self.assertRaises(GeminiTemporaryError):
            generate_followup_questions(
                question="What is Python?",
                candidate_answer="Python is a language.",
                number_of_followups=1,
            )

        sleep.assert_called_once()
        mock_client.close.assert_called_once()


class FollowupAPIViewValidationTests(SimpleTestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock()
        self.user.data = {"_id": "test-user-id"}
        self.user.is_authenticated = True

    def test_invalid_interview_id_rejected(self):
        request = self.factory.post(
            "/api/followup-questions/generate/",
            {
                "interview_id": "invalid-id",
                "question": "What is Python?",
                "candidate_answer": "Python is a language.",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = GenerateFollowupQuestionsView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Invalid interview ID.")

    def test_blank_answer_rejected(self):
        request = self.factory.post(
            "/api/followup-questions/generate/",
            {
                "interview_id": "507f1f77bcf86cd799439011",
                "question": "What is Python?",
                "candidate_answer": "   ",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = GenerateFollowupQuestionsView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("candidate_answer", response.data)


from bson import ObjectId


class FollowupDatabaseIntegrationTests(SimpleTestCase):

    def setUp(self):
        self.factory = APIRequestFactory()

        self.user = MagicMock()
        self.user.data = {"_id": "test-user-id"}
        self.user.is_authenticated = True

        self.interview_id = "507f1f77bcf86cd799439011"

        self.interview = {
            "_id": ObjectId(self.interview_id),
            "user_id": "test-user-id",
            "job_title": "Python Developer",
            "questions": [
                {
                    "question": "What is Python?",
                    "user_answer": "Python is a programming language.",
                }
            ],
        }

        self.payload = {
            "interview_id": self.interview_id,
            "question": "What is Python?",
            "candidate_answer": "Python is a programming language.",
            "difficulty": "medium",
            "number_of_followups": 1,
        }

    def make_request(self, payload=None):
        request = self.factory.post(
            "/api/followup-questions/generate/",
            payload or self.payload,
            format="json",
        )
        force_authenticate(request, user=self.user)
        return GenerateFollowupQuestionsView.as_view()(request)

    @patch("apps.followup_questions.views.generate_followup_questions")
    @patch("apps.followup_questions.views.get_database")
    def test_successful_generation_and_database_save(
        self,
        mock_get_database,
        mock_generate,
    ):
        db = MagicMock()
        db.mock_interviews.find_one.return_value = self.interview

        saved_id = ObjectId("507f1f77bcf86cd799439012")
        db.followup_questions.insert_one.return_value = MagicMock(
            inserted_id=saved_id
        )

        mock_get_database.return_value = db
        mock_generate.return_value = valid_ai_response()

        response = self.make_request()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["followup_id"], str(saved_id))

        mock_generate.assert_called_once()
        db.followup_questions.insert_one.assert_called_once()

        saved_document = db.followup_questions.insert_one.call_args[0][0]

        self.assertEqual(
            saved_document["candidate_answer"],
            self.payload["candidate_answer"],
        )
        self.assertEqual(
            saved_document["user_id"],
            "test-user-id",
        )
        self.assertEqual(
            saved_document["interview_id"],
            ObjectId(self.interview_id),
        )

    @patch("apps.followup_questions.views.generate_followup_questions")
    @patch("apps.followup_questions.views.get_database")
    def test_interview_not_owned_or_not_found_returns_404(
        self,
        mock_get_database,
        mock_generate,
    ):
        db = MagicMock()
        db.mock_interviews.find_one.return_value = None
        mock_get_database.return_value = db

        response = self.make_request()

        self.assertEqual(response.status_code, 404)
        mock_generate.assert_not_called()
        db.followup_questions.insert_one.assert_not_called()

        query = db.mock_interviews.find_one.call_args[0][0]
        self.assertEqual(query["user_id"], "test-user-id")

    @patch("apps.followup_questions.views.generate_followup_questions")
    @patch("apps.followup_questions.views.get_database")
    def test_question_not_belonging_to_interview_is_rejected(
        self,
        mock_get_database,
        mock_generate,
    ):
        db = MagicMock()
        db.mock_interviews.find_one.return_value = self.interview
        mock_get_database.return_value = db

        payload = self.payload.copy()
        payload["question"] = "What is Java?"

        response = self.make_request(payload)

        self.assertEqual(response.status_code, 400)
        mock_generate.assert_not_called()
        db.followup_questions.insert_one.assert_not_called()

    @patch("apps.followup_questions.views.generate_followup_questions")
    @patch("apps.followup_questions.views.get_database")
    def test_candidate_answer_mismatch_is_rejected(
        self,
        mock_get_database,
        mock_generate,
    ):
        db = MagicMock()
        db.mock_interviews.find_one.return_value = self.interview
        mock_get_database.return_value = db

        payload = self.payload.copy()
        payload["candidate_answer"] = "A different answer."

        response = self.make_request(payload)

        self.assertEqual(response.status_code, 400)
        mock_generate.assert_not_called()
        db.followup_questions.insert_one.assert_not_called()

    @patch("apps.followup_questions.views.generate_followup_questions")
    @patch("apps.followup_questions.views.get_database")
    def test_missing_saved_answer_is_rejected(
        self,
        mock_get_database,
        mock_generate,
    ):
        interview = self.interview.copy()
        interview["questions"] = [
            {
                "question": "What is Python?",
                "user_answer": "",
            }
        ]

        db = MagicMock()
        db.mock_interviews.find_one.return_value = interview
        mock_get_database.return_value = db

        response = self.make_request()

        self.assertEqual(response.status_code, 400)
        mock_generate.assert_not_called()
        db.followup_questions.insert_one.assert_not_called()


class FollowupHistoryAndDetailTests(SimpleTestCase):

    def setUp(self):
        self.factory = APIRequestFactory()

        self.user = MagicMock()
        self.user.data = {"_id": "test-user-id"}
        self.user.is_authenticated = True

        self.followup_id = "507f1f77bcf86cd799439012"
        self.interview_id = "507f1f77bcf86cd799439011"

        self.record = {
            "_id": ObjectId(self.followup_id),
            "user_id": "test-user-id",
            "interview_id": ObjectId(self.interview_id),
            "question": "What is Python?",
            "candidate_answer": "Python is a programming language.",
            "job_title": "Python Developer",
            "difficulty": "medium",
            "result": valid_ai_response(),
            "created_at": datetime.now(timezone.utc),
        }

    def test_history_returns_user_records(self):
        db = MagicMock()
        db.followup_questions.find.return_value.sort.return_value.limit.return_value = [
            self.record
        ]

        with patch(
            "apps.followup_questions.views.get_database",
            return_value=db,
        ):
            request = self.factory.get(
                "/api/followup-questions/history/"
            )
            force_authenticate(request, user=self.user)

            response = FollowupHistoryView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["history"][0]["followup_id"],
            self.followup_id,
        )

        query = db.followup_questions.find.call_args[0][0]
        self.assertEqual(query["user_id"], "test-user-id")

    def test_empty_history_returns_zero_count(self):
        db = MagicMock()
        db.followup_questions.find.return_value.sort.return_value.limit.return_value = []

        with patch(
            "apps.followup_questions.views.get_database",
            return_value=db,
        ):
            request = self.factory.get(
                "/api/followup-questions/history/"
            )
            force_authenticate(request, user=self.user)

            response = FollowupHistoryView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["history"], [])

    def test_history_database_error_returns_500(self):
        with patch(
            "apps.followup_questions.views.get_database",
            side_effect=Exception("Database unavailable"),
        ):
            request = self.factory.get(
                "/api/followup-questions/history/"
            )
            force_authenticate(request, user=self.user)

            response = FollowupHistoryView.as_view()(request)

        self.assertEqual(response.status_code, 500)

    def test_detail_returns_complete_followup_report(self):
        db = MagicMock()
        db.followup_questions.find_one.return_value = self.record

        with patch(
            "apps.followup_questions.views.get_database",
            return_value=db,
        ):
            request = self.factory.get(
                f"/api/followup-questions/{self.followup_id}/"
            )
            force_authenticate(request, user=self.user)

            response = FollowupDetailView.as_view()( 
                request,
                followup_id=self.followup_id,
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["followup_id"], self.followup_id)
        self.assertEqual(
            response.data["candidate_answer"],
            self.record["candidate_answer"],
        )
        self.assertEqual(
            response.data["result"],
            self.record["result"],
        )

        query = db.followup_questions.find_one.call_args[0][0]
        self.assertEqual(query["user_id"], "test-user-id")

    def test_invalid_detail_id_returns_400(self):
        request = self.factory.get(
            "/api/followup-questions/invalid-id/"
        )
        force_authenticate(request, user=self.user)

        response = FollowupDetailView.as_view()(
            request,
            followup_id="invalid-id",
        )

        self.assertEqual(response.status_code, 400)

    def test_other_users_detail_returns_404(self):
        db = MagicMock()
        db.followup_questions.find_one.return_value = None

        with patch(
            "apps.followup_questions.views.get_database",
            return_value=db,
        ):
            request = self.factory.get(
                f"/api/followup-questions/{self.followup_id}/"
            )
            force_authenticate(request, user=self.user)

            response = FollowupDetailView.as_view()(
                request,
                followup_id=self.followup_id,
            )

        self.assertEqual(response.status_code, 404)

        query = db.followup_questions.find_one.call_args[0][0]
        self.assertEqual(query["user_id"], "test-user-id")

    def test_detail_database_error_returns_500(self):
        with patch(
            "apps.followup_questions.views.get_database",
            side_effect=Exception("Database unavailable"),
        ):
            request = self.factory.get(
                f"/api/followup-questions/{self.followup_id}/"
            )
            force_authenticate(request, user=self.user)

            response = FollowupDetailView.as_view()(
                request,
                followup_id=self.followup_id,
            )

        self.assertEqual(response.status_code, 500)
