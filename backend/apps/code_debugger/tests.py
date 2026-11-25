from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from bson import ObjectId
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from config.ai_runtime import GeminiInvalidResponse, GeminiTemporaryError
from apps.code_debugger.views import DebugCodeView, CodeDebugHistoryView, CodeDebugDetailView


def debug_result():
    return {
        "summary": "Potential off-by-one issue.",
        "has_errors": True,
        "overall_severity": "medium",
        "root_cause": "Loop boundary excludes the final item.",
        "issues": [{
            "title": "Loop boundary",
            "error_type": "Logic",
            "severity": "medium",
            "line_number": 2,
            "explanation": "The final item is skipped.",
            "suggestion": "Review the end condition.",
        }],
        "corrected_code": "for item in items:\n    process(item)",
        "corrections": ["Iterate through each item."],
        "optimization_suggestions": [],
    }


class CodeDebuggerFlowTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user_id = "test-user-id"
        self.user = MagicMock()
        self.user.data = {"_id": self.user_id}
        self.user.is_authenticated = True
        self.debug_id = ObjectId("507f1f77bcf86cd799439011")
        self.record = {
            "_id": self.debug_id,
            "user_id": self.user_id,
            "programming_language": "python",
            "original_code": "for i in range(len(items) - 1): pass",
            "error_message": "",
            "expected_behavior": "Process every item.",
            "result": debug_result(),
            "created_at": datetime.now(timezone.utc),
        }

    def make_post(self):
        request = self.factory.post(
            "/api/code-debugger/analyze/",
            {
                "code": self.record["original_code"],
                "programming_language": "python",
                "expected_behavior": self.record["expected_behavior"],
            },
            format="json",
        )
        force_authenticate(request, user=self.user)
        return request

    def test_valid_debug_analysis_is_persisted_and_identifier_retrieves_same_record(self):
        db = MagicMock()
        db.code_debugger_reports.insert_one.return_value = MagicMock(
            acknowledged=True,
            inserted_id=self.debug_id,
        )
        with patch("apps.code_debugger.views.get_database", return_value=db), patch(
            "apps.code_debugger.views.debug_code",
            return_value=debug_result(),
        ):
            response = DebugCodeView.as_view()(self.make_post())

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["debug_id"], str(self.debug_id))
        self.assertIn("not executed", response.data["evaluation_type"])
        self.assertEqual(db.code_debugger_reports.insert_one.call_args.args[0]["original_code"], self.record["original_code"])

        db.code_debugger_reports.find.return_value.sort.return_value.limit.return_value = [self.record]
        db.code_debugger_reports.find_one.return_value = self.record
        with patch("apps.code_debugger.views.get_database", return_value=db):
            history_request = self.factory.get("/api/code-debugger/history/")
            force_authenticate(history_request, user=self.user)
            history = CodeDebugHistoryView.as_view()(history_request)
            detail_request = self.factory.get(f"/api/code-debugger/{self.debug_id}/")
            force_authenticate(detail_request, user=self.user)
            detail = CodeDebugDetailView.as_view()(detail_request, debug_id=str(self.debug_id))

        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data["history"][0]["debug_id"], str(self.debug_id))
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["debug_id"], str(self.debug_id))
        self.assertEqual(detail.data["result"], debug_result())
        self.assertEqual(db.code_debugger_reports.find.call_args.args[0]["user_id"], self.user_id)
        self.assertEqual(db.code_debugger_reports.find_one.call_args.args[0]["user_id"], self.user_id)

    def test_invalid_ai_output_is_502_without_database_write(self):
        db = MagicMock()
        with patch("apps.code_debugger.views.get_database", return_value=db), patch(
            "apps.code_debugger.views.debug_code",
            side_effect=GeminiInvalidResponse("bad model output"),
        ):
            response = DebugCodeView.as_view()(self.make_post())

        self.assertEqual(response.status_code, 502)
        db.code_debugger_reports.insert_one.assert_not_called()
        self.assertNotIn("bad model output", str(response.data))

    def test_provider_failure_is_503_without_database_write(self):
        db = MagicMock()
        with patch("apps.code_debugger.views.get_database", return_value=db), patch(
            "apps.code_debugger.views.debug_code",
            side_effect=GeminiTemporaryError("provider detail"),
        ):
            response = DebugCodeView.as_view()(self.make_post())

        self.assertEqual(response.status_code, 503)
        db.code_debugger_reports.insert_one.assert_not_called()
        self.assertNotIn("provider detail", str(response.data))

