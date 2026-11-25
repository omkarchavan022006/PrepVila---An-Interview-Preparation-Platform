
from datetime import datetime, timedelta, timezone
import hashlib

import jwt
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from config.mongodb import get_database


def generate_token(user_id):
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=1),
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm="HS256"
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get("name", "").strip()
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not name or not email or not password:
            return Response(
                {"error": "Name, email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password) < 8:
            return Response(
                {"error": "Password must contain at least 8 characters"},
                status=status.HTTP_400_BAD_REQUEST
            )

        db = get_database()
        users = db["users"]

        try:
            users.create_index("email", unique=True)

            user = {
                "name": name,
                "email": email,
                "password": make_password(password),
                "created_at": datetime.now(timezone.utc),
            }

            result = users.insert_one(user)

        except DuplicateKeyError:
            return Response(
                {"error": "Email is already registered"},
                status=status.HTTP_409_CONFLICT
            )

        token = generate_token(result.inserted_id)

        return Response(
            {
                "message": "Registration successful",
                "token": token,
                "user": {
                    "id": str(result.inserted_id),
                    "name": name,
                    "email": email,
                }
            },
            status=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"error": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        db = get_database()
        user = db["users"].find_one({"email": email})

        if not user or not check_password(password, user["password"]):
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token = generate_token(user["_id"])

        return Response({
            "message": "Login successful",
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
            }
        })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user.data

        return Response({
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
        })




class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.auth

        if not token:
            return Response(
                {"error": "Authentication token not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token_hash = hashlib.sha256(
            token.encode("utf-8")
        ).hexdigest()

        try:
            db = get_database()

            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
            )

            expires_at = datetime.fromtimestamp(
                payload["exp"],
                tz=timezone.utc,
            )

            db["revoked_tokens"].insert_one({
                "token_hash": token_hash,
                "expires_at": expires_at,
                "revoked_at": datetime.now(timezone.utc),
            })

            return Response(
                {"message": "Logout successful."},
                status=status.HTTP_200_OK,
            )

        except Exception:
            return Response(
                {"error": "Unable to logout. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
