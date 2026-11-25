from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import logging

from .mongodb import connect_mongodb

logger = logging.getLogger(__name__)


@api_view(["GET"])
def health_check(request):
    try:
        db_connected = connect_mongodb()
    except Exception as error:
        logger.error("Health check database failure (%s).", type(error).__name__)
        return Response(
            {
                "status": "error",
                "message": "MongoDB connection failed",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if not db_connected:
        return Response(
            {
                "status": "error",
                "message": "MongoDB connection failed"
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    return Response({
        "status": "success",
        "message": "PrepVela API is running",
        "database": "MongoDB connected"
    })
