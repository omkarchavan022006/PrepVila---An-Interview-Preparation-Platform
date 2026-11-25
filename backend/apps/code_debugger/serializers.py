
from rest_framework import serializers


class CodeDebugRequestSerializer(serializers.Serializer):
    code = serializers.CharField(
        max_length=20000,
        allow_blank=False,
        trim_whitespace=True
    )

    programming_language = serializers.ChoiceField(
        choices=[
            "python",
            "javascript",
            "typescript",
            "java",
            "cpp",
            "c",
            "csharp",
            "go",
            "php",
        ]
    )

    error_message = serializers.CharField(
        max_length=5000,
        required=False,
        allow_blank=True,
        default=""
    )

    expected_behavior = serializers.CharField(
        max_length=5000,
        required=False,
        allow_blank=True,
        default=""
    )
