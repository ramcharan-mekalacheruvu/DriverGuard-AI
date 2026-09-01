from rest_framework import generics
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User

from .serializers import RegisterSerializer

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import DriverProfileSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.driver_profile

        serializer = DriverProfileSerializer(profile)

        return Response(serializer.data)