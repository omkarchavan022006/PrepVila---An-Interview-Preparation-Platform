
from rest_framework import serializers


class InterviewFeedbackRequestSerializer(serializers.Serializer):
    interview_id = serializers.CharField(max_length=100)
