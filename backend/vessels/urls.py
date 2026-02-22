from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"vessels", views.VesselViewSet)
router.register(r"zones", views.ZoneViewSet)
router.register(r"alerts", views.ZoneAlertViewSet)
router.register(r"drone", views.DroneViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
