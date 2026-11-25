
from rest_framework import serializers


class FollowupQuestionRequestSerializer(serializers.Serializer):
    interview_id = serializers.CharField(max_length=100)
    question = serializers.CharField(max_length=2000)
    candidate_answer = serializers.CharField(
        max_length=5000,
        allow_blank=False,
        trim_whitespace=True,
    )
    job_title = serializers.CharField(
        max_length=150,
        required=False,
        default="Software Developer",
    )
    difficulty = serializers.ChoiceField(
        choices=["easy", "medium", "hard"],
        default="medium",
    )
    number_of_followups = serializers.IntegerField(
        min_value=1,
        max_value=5,
        default=3,
    )
