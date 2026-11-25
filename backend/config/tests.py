import os
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory
from google.genai.errors import APIError

from config.ai_runtime import (
    GeminiTemporaryError,
    create_gemini_client,
    generate_with_retry,
    get_gemini_timeout_ms,
)
from config.api_exceptions import safe_exception_handler
from config.views import health_check


class GeminiRuntimePolicyTests(SimpleTestCase):
    @patch.dict(os.environ, {}, clear=True)
    def test_timeout_defaults_and_is_bounded_when_configured(self):
        self.assertEqual(get_gemini_timeout_ms(), 40000)
        with patch.dict(os.environ, {"GEMINI_REQUEST_TIMEOUT_MS": "999999"}, clear=True):
            self.assertEqual(get_gemini_timeout_ms(), 90000)
        with patch.dict(os.environ, {"GEMINI_REQUEST_TIMEOUT_MS": "not-a-number"}, clear=True):
            self.assertEqual(get_gemini_timeout_ms(), 40000)

    @patch.dict(os.environ, {}, clear=True)
    @patch("config.ai_runtime.genai.Client")
    def test_client_has_explicit_timeout_and_sdk_retry_is_disabled(self, client_factory):
        client = create_gemini_client("test-key")
        options = client_factory.call_args.kwargs["http_options"]
        self.assertEqual(options.timeout, 40000)
        self.assertEqual(options.retry_options.attempts, 1)
        self.assertIs(client, client_factory.return_value)

    @patch("config.ai_runtime.time.sleep")
    def test_transient_503_gets_one_bounded_retry(self, sleep):
        client = MagicMock()
        client.models.generate_content.side_effect = [
            APIError(code=503, response_json={"error": {"message": "busy"}}),
            MagicMock(text="real provider response"),
        ]

        response = generate_with_retry(client, model="configured-model", contents="prompt")

        self.assertEqual(response.text, "real provider response")
        self.assertEqual(client.models.generate_content.call_count, 2)
        sleep.assert_called_once()

    @patch("config.ai_runtime.time.sleep")
    def test_transport_timeout_gets_one_bounded_retry(self, sleep):
        client = MagicMock()
        timeout_error = type(
            "ConnectTimeout",
            (Exception,),
            {"__module__": "httpx"},
        )("request timed out")
        client.models.generate_content.side_effect = [
            timeout_error,
            MagicMock(text="real provider response"),
        ]

        response = generate_with_retry(client, model="configured-model", contents="prompt")

        self.assertEqual(response.text, "real provider response")
        self.assertEqual(client.models.generate_content.call_count, 2)
        sleep.assert_called_once()

    @patch("config.ai_runtime.time.sleep")
    def test_validation_error_is_not_retried(self, sleep):
        client = MagicMock()
        client.models.generate_content.side_effect = APIError(
            code=400,
            response_json={"error": {"message": "invalid request"}},
        )

        with self.assertRaises(APIError):
            generate_with_retry(client, model="configured-model", contents="prompt")

        client.models.generate_content.assert_called_once()
        sleep.assert_not_called()

    @patch("config.ai_runtime.time.sleep")
    def test_exhausted_transient_retries_preserve_cause_and_safe_message(self, sleep):
        provider_error = APIError(
            code=429,
            response_json={"error": {"message": "provider diagnostic"}},
        )
        client = MagicMock()
        client.models.generate_content.side_effect = provider_error

        with self.assertRaises(GeminiTemporaryError) as raised:
            generate_with_retry(client, model="configured-model", contents="prompt")

        self.assertIs(raised.exception.__cause__, provider_error)
        self.assertNotIn("provider diagnostic", str(raised.exception))
        self.assertEqual(client.models.generate_content.call_count, 2)
        sleep.assert_called_once()

    def test_unhandled_api_exception_returns_safe_json(self):
        secret_like_detail = "trace detail must not be returned"
        response = safe_exception_handler(
            NotImplementedError(secret_like_detail),
            {"request": APIRequestFactory().get("/api/test/")},
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data, {"error": "An unexpected server error occurred."})
        self.assertNotIn(secret_like_detail, str(response.data))

    @patch("config.views.connect_mongodb", side_effect=NotImplementedError("private connection detail"))
    def test_health_check_returns_safe_503_when_database_probe_raises(self, _connect):
        request = APIRequestFactory().get("/api/health/")

        response = health_check(request)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.data,
            {"status": "error", "message": "MongoDB connection failed"},
        )
        self.assertNotIn("private connection detail", str(response.data))

