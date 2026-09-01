from django.contrib.auth.models import User
from rest_framework import serializers
from .models import DriverProfile


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        return user
class DriverProfileSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = DriverProfile
        fields = [
            "display_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
        ]