from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.utils import timezone
from channels.layers import get_channel_layer
import asyncio
import traceback
import os

from .models import Vessel, VesselPosition, Zone, ZoneAlert, DroneSimulation, Port
from .serializers import (
    VesselSerializer, VesselDetailSerializer, VesselPositionSerializer,
    ZoneSerializer, ZoneCreateSerializer, ZoneAlertSerializer,
    DroneSimulationSerializer, PortSerializer
)

@api_view(['GET'])
def test_redis(request):
    try:
        channel_layer = get_channel_layer()
        
        async def _test():
            await channel_layer.send("test_channel", {"type": "test.message"})
            
        asyncio.run(_test())
        return Response({"status": "ok"})
    except Exception as e:
        return Response({
            "status": "error", 
            "error": str(e), 
            "traceback": traceback.format_exc(),
            "redis_url": os.environ.get("REDIS_URL")
        })

class VesselViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for vessels."""
    queryset = Vessel.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return VesselDetailSerializer
        return VesselSerializer

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """Get position history for a vessel."""
        vessel = self.get_object()
        limit = int(request.query_params.get("limit", 200))
        positions = vessel.positions.all()[:limit]
        serializer = VesselPositionSerializer(positions, many=True)
        return Response(serializer.data)


class ZoneViewSet(viewsets.ModelViewSet):
    # API endpoint for zones
    queryset = Zone.objects.all()

    def get_serializer_class(self):
        if self.action == "create":
            return ZoneCreateSerializer
        return ZoneSerializer


class ZoneAlertViewSet(viewsets.ReadOnlyModelViewSet):
    # API endpoint for zone alerts
    queryset = ZoneAlert.objects.all()
    serializer_class = ZoneAlertSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        limit = int(self.request.query_params.get("limit", 50))
        return qs[:limit]


class DroneViewSet(viewsets.ReadOnlyModelViewSet):
    # API endpoint for drone simulations.
    queryset = DroneSimulation.objects.all()
    serializer_class = DroneSimulationSerializer


class PortViewSet(viewsets.ReadOnlyModelViewSet):
    # API endpoint for HELCOM ports.
    queryset = Port.objects.all()
    serializer_class = PortSerializer

    @action(detail=False, methods=["post"])
    def deploy(self, request):
        # Deploy a drone to a vessel.
        vessel_id = request.data.get("vessel_id")
        if not vessel_id:
            return Response(
                {"error": "vessel_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            vessel = Vessel.objects.get(id=vessel_id)
        except Vessel.DoesNotExist:
            return Response(
                {"error": "Vessel not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        latest_pos = vessel.positions.first()
        if not latest_pos:
            return Response(
                {"error": "Vessel has no known position"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Drone base: Island
        base_lat, base_lng = 40.6892, -74.0169

        drone = DroneSimulation.objects.create(
            vessel=vessel,
            start_latitude=base_lat,
            start_longitude=base_lng,
            current_latitude=base_lat,
            current_longitude=base_lng,
            target_latitude=latest_pos.latitude,
            target_longitude=latest_pos.longitude,
            status="in_transit",
        )

        serializer = DroneSimulationSerializer(drone)
        return Response(serializer.data, status=status.HTTP_201_CREATED)




