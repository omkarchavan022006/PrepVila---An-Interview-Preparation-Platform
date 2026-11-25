
from rest_framework import serializers


class CodingQuestionRequestSerializer(serializers.Serializer):
    topic = serializers.CharField(
        max_length=100,
        required=False,
        default="Python"
    )

    difficulty = serializers.ChoiceField(
        choices=["easy", "medium", "hard"],
        default="medium"
    )

    programming_language = serializers.ChoiceField(
        choices=[
            "python",
            "javascript",
            "java",
            "cpp",
            "c",
            "csharp",
            "go",
            "php",
        ],
        default="python"
    )


class CodeSubmissionSerializer(serializers.Serializer):
    question_id = serializers.CharField(max_length=100)

    submitted_code = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True
    )

    programming_language = serializers.ChoiceField(
        choices=[
            "python",
            "javascript",
            "java",
            "cpp",
            "c",
            "csharp",
            "go",
            "php",
        ]
    )
