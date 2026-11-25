from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from bson import ObjectId
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.interview_feedback.views import (
    GenerateInterviewFeedbackView,
    InterviewFeedbackHistoryView,
    InterviewFeedbackDetailView,
)


def report_result():
    return {
        "overall_summary": "Clear answers with room to improve detail.",
        "overall_rating": "Good",
        "overall_score": 80,
        "strengths": ["Clear communication"],
        "weaknesses": ["Needs more examples"],
        "topic_wise_performance": [],
        "improvement_plan": [],
        "recommendations": [],
    }


class InterviewFeedbackFlowTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user_id = "test-user-id"
        self.user = MagicMock()
        self.user.data = {"_id": self.user_id}
        self.user.is_authenticated = True
        self.interview_id = "507f1f77bcf86cd799439011"
        self.feedback_id = ObjectId("507f1f77bcf86cd799439012")
        self.interview = {
            "_id": ObjectId(self.interview_id),
            "user_id": self.user_id,
            "job_title": "Backend Developer",
            "status": "completed",
            "total_score": 80,
            "questions": [{
                "question": "Explain an API.",
                "user_answer": "An API connects software systems.",
                "evaluation": {"score": 80, "feedback": "Good."},
            }],
        }

    def request_generate(self):
        request = self.factory.post(
            "/api/interview-feedback/generate/",
            {"interview_id": self.interview_id},
            format="json",
        )
        force_authenticate(request, user=self.user)
        return GenerateInterviewFeedbackView.as_view()(request)

    @patch("apps.interview_feedback.views.generate_interview_feedback", return_value=report_result())
    @patch("apps.interview_feedback.views.get_database")
    def test_generation_returns_acknowledged_inserted_id(self, get_database, generate):
        db = MagicMock()
        db.mock_interviews.find_one.return_value = self.interview
        db.interview_feedback.find_one.return_value = None
        db.interview_feedback.insert_one.return_value = MagicMock(
            acknowledged=True,
            inserted_id=self.feedback_id,
        )
        get_database.return_value = db

        response = self.request_generate()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["feedback_id"], str(self.feedback_id))
        generate.assert_called_once_with(self.interview)
        saved = db.interview_feedback.insert_one.call_args.args[0]
        self.assertEqual(saved["user_id"], self.user_id)
        self.assertEqual(saved["interview_id"], ObjectId(self.interview_id))

    @patch("apps.interview_feedback.views.generate_interview_feedback")
    @patch("apps.interview_feedback.views.get_database")
    def test_existing_report_is_returned_without_duplicate_generation(self, get_database, generate):
        existing = {
            "_id": self.feedback_id,
            "user_id": self.user_id,
            "interview_id": ObjectId(self.interview_id),
            "result": report_result(),
        }
        db = MagicMock()
        db.mock_interviews.find_one.return_value = self.interview
        db.interview_feedback.find_one.return_value = existing
        get_database.return_value = db

        response = self.request_generate()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["feedback_id"], str(self.feedback_id))
        generate.assert_not_called()
        db.interview_feedback.insert_one.assert_not_called()

    def test_history_and_detail_return_the_same_string_identifier(self):
        record = {
            "_id": self.feedback_id,
            "user_id": self.user_id,
            "interview_id": ObjectId(self.interview_id),
            "job_title": "Backend Developer",
            "overall_score": 80,
            "overall_rating": "Good",
            "result": report_result(),
            "created_at": datetime.now(timezone.utc),
        }
        db = MagicMock()
        db.interview_feedback.find.return_value.sort.return_value.limit.return_value = [record]
        db.interview_feedback.find_one.return_value = record

        with patch("apps.interview_feedback.views.get_database", return_value=db):
            history_request = self.factory.get("/api/interview-feedback/history/")
            force_authenticate(history_request, user=self.user)
            history = InterviewFeedbackHistoryView.as_view()(history_request)

            detail_request = self.factory.get(f"/api/interview-feedback/{self.feedback_id}/")
            force_authenticate(detail_request, user=self.user)
            detail = InterviewFeedbackDetailView.as_view()(
                detail_request,
                feedback_id=str(self.feedback_id),
            )

        self.assertEqual(history.status_code, 200)
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(history.data["history"][0]["feedback_id"], str(self.feedback_id))
        self.assertEqual(detail.data["feedback_id"], str(self.feedback_id))
        self.assertEqual(detail.data["result"], report_result())
        self.assertEqual(db.interview_feedback.find.call_args.args[0]["user_id"], self.user_id)
        self.assertEqual(db.interview_feedback.find_one.call_args.args[0]["user_id"], self.user_id)

