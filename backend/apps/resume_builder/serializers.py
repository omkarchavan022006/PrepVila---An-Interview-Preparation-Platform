
from rest_framework import serializers


class ResumeGenerateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=30)
    location = serializers.CharField(max_length=150)

    professional_title = serializers.CharField(max_length=150)
    professional_summary = serializers.CharField(max_length=2000)

    skills = serializers.ListField(
        child=serializers.CharField(max_length=100),
        allow_empty=False,
        max_length=40,
    )

    education = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        max_length=10,
    )

    experience = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        max_length=15,
    )

    projects = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        max_length=15,
    )

    certifications = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False,
        default=list,
        max_length=20,
    )

    achievements = serializers.ListField(
        child=serializers.CharField(max_length=300),
        required=False,
        default=list,
        max_length=20,
    )
