"""Safe exception handling for unanticipated failures raised by API views."""

import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as default_exception_handler


logger = logging.getLogger(__name__)


def safe_exception_handler(exc, context):
    response = default_exception_handler(exc, context)
    if response is not None:
        return response

    logger.error("Unhandled API exception (%s).", type(exc).__name__)
    return Response(
        {"error": "An unexpected server error occurred."},
        status=500,
    )
