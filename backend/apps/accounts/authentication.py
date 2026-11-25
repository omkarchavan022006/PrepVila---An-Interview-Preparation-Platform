
import hashlib

import jwt
from bson import ObjectId
from bson.errors import InvalidId

from django.conf import settings

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from config.mongodb import get_database


class MongoUser:
    def __init__(self, data):
        self.data = data
        self.is_authenticated = True
        self.is_anonymous = False


class MongoJWTAuthentication(BaseAuthentication):

    def authenticate(self, request):
        header = request.headers.get("Authorization")

        if not header:
            return None

        parts = header.split()

        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise AuthenticationFailed("Invalid authorization header")

        token = parts[1]

        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"]
            )

            user_id = ObjectId(payload["sub"])

            token_hash = hashlib.sha256(
                token.encode("utf-8")
            ).hexdigest()

        except (jwt.InvalidTokenError, KeyError, InvalidId):
            raise AuthenticationFailed("Invalid or expired token")

        db = get_database()

        revoked_token = db["revoked_tokens"].find_one({
            "token_hash": token_hash
        })

        if revoked_token:
            raise AuthenticationFailed(
                "This token has been logged out. Please login again."
            )

        user = db["users"].find_one({"_id": user_id})

        if not user:
            raise AuthenticationFailed("User not found")

        return MongoUser(user), token
