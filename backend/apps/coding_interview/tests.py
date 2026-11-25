from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from bson import ObjectId
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from config.ai_runtime import GeminiTemporaryError
from apps.coding_interview.views import (
    GenerateCodingQuestionView,
    SubmitCodingSolutionView,
    CodingInterviewHistoryView,
    CodingSubmissionDetailView,
)


def coding_question():
    return {
        "title": "Pair sum",
        "description": "Find two values that sum to a target.",
        "input_format": "Array and target",
        "output_format": "Pair of indices",
        "constraints": [],
        "examples": [{"input": "[1,2], 3", "output": "[0,1]"}, {"input": "[2,4], 6", "output": "[0,1]"}],
        "starter_code": "def solve(values, target):\n    pass",
        "test_cases": [{"input": "1", "expected_output": "1"}] * 3,
        "hints": [],
    }


def code_evaluation():
    return {
        "score": 90,
        "correctness": "Static review suggests the approach is correct.",
        "logic": "Uses a lookup map.",
        "time_complexity": "O(n)",
        "space_complexity": "O(n)",
        "code_quality": "Readable.",
        "bugs": [],
        "suggestions": [],
        "overall_feedback": "Good solution.",
        "verdict": "good",
    }


class CodingInterviewFlowTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user_id = "test-user-id"
        self.user = MagicMock()
        self.user.data = {"_id": self.user_id}
        self.user.is_authenticated = True
        self.question_id = ObjectId("507f1f77bcf86cd799439011")
        self.submission_id = ObjectId("507f1f77bcf86cd799439012")
        self.question_doc = {
            "_id": self.question_id,
            "user_id": self.user_id,
            "programming_language": "python",
            "question": coding_question(),
        }

    def test_generate_question_is_saved_and_returns_the_inserted_id(self):
        db = MagicMock()
        db.coding_questions.insert_one.return_value = MagicMock(
            acknowledged=True,
            inserted_id=self.question_id,
        )
        request = self.factory.post(
            "/api/coding-interview/generate/",
            {"topic": "arrays", "difficulty": "medium", "programming_language": "python"},
            format="json",
        )
        force_authenticate(request, user=self.user)

        with patch("apps.coding_interview.views.get_database", return_value=db), patch(
            "apps.coding_interview.views.generate_coding_question",
            return_value=coding_question(),
        ) as generate:
            response = GenerateCodingQuestionView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["question_id"], str(self.question_id))
        self.assertEqual(response.data["question"], coding_question())
        self.assertEqual(db.coding_questions.insert_one.call_args.args[0]["user_id"], self.user_id)
        generate.assert_called_once_with(topic="arrays", difficulty="medium", programming_language="python")

    def test_provider_failure_does_not_create_question_record(self):
        db = MagicMock()
        request = self.factory.post("/api/coding-interview/generate/", {}, format="json")
        force_authenticate(request, user=self.user)

        with patch("apps.coding_interview.views.get_database", return_value=db), patch(
            "apps.coding_interview.views.generate_coding_question",
            side_effect=GeminiTemporaryError("temporary"),
        ):
            response = GenerateCodingQuestionView.as_view()(request)

        self.assertEqual(response.status_code, 503)
        db.coding_questions.insert_one.assert_not_called()

    def test_submission_persists_evaluation_and_history_detail_use_matching_id(self):
        db = MagicMock()
        db.coding_questions.find_one.return_value = self.question_doc
        db.coding_submissions.insert_one.return_value = MagicMock(
            acknowledged=True,
            inserted_id=self.submission_id,
        )
        request = self.factory.post(
            "/api/coding-interview/submit/",
            {
                "question_id": str(self.question_id),
                "programming_language": "python",
                "submitted_code": "def solve(values, target):\n    return []",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        with patch("apps.coding_interview.views.get_database", return_value=db), patch(
            "apps.coding_interview.views.evaluate_submitted_code",
            return_value=code_evaluation(),
        ) as evaluate:
            response = SubmitCodingSolutionView.as_view()(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["submission_id"], str(self.submission_id))
        self.assertIn("not executed", response.data["evaluation_type"])
        saved = db.coding_submissions.insert_one.call_args.args[0]
        self.assertEqual(saved["question_id"], self.question_id)
        self.assertEqual(saved["user_id"], self.user_id)
        self.assertEqual(saved["evaluation"], code_evaluation())
        evaluate.assert_called_once()

        history_record = {
            "_id": self.submission_id,
            "question_id": self.question_id,
            "user_id": self.user_id,
            "programming_language": "python",
            "submitted_code": "def solve(): pass",
            "evaluation": code_evaluation(),
            "created_at": datetime.now(timezone.utc),
        }
        db.coding_submissions.find.return_value.sort.return_value.limit.return_value = [history_record]
        db.coding_submissions.find_one.return_value = history_record

        with patch("apps.coding_interview.views.get_database", return_value=db):
            history_request = self.factory.get("/api/coding-interview/history/")
            force_authenticate(history_request, user=self.user)
            history = CodingInterviewHistoryView.as_view()(history_request)
            detail_request = self.factory.get(f"/api/coding-interview/submission/{self.submission_id}/")
            force_authenticate(detail_request, user=self.user)
            detail = CodingSubmissionDetailView.as_view()(
                detail_request,
                submission_id=str(self.submission_id),
            )

        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data["history"][0]["submission_id"], str(self.submission_id))
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["submission_id"], str(self.submission_id))
        self.assertEqual(db.coding_submissions.find.call_args.args[0]["user_id"], self.user_id)
        self.assertEqual(db.coding_submissions.find_one.call_args.args[0]["user_id"], self.user_id)

