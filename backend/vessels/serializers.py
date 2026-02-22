from rest_framework import serializers
from .models import Vessel, VesselPosition, Zone, ZoneAlert, DroneSimulation, Port


class VesselPositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VesselPosition
        fields = ["id", "latitude", "longitude", "speed", "heading", "course", "timestamp"]


class VesselSerializer(serializers.ModelSerializer):
    latest_position = serializers.SerializerMethodField()

    class Meta:
        model = Vessel
        fields = [
            "id", "mmsi", "name", "ship_type", "weight_tonnage",
            "flag", "length", "width", "destination", "created_at",
            "latest_position",
        ]

    def get_latest_position(self, obj):
        pos = obj.positions.first()
        if pos:
            return VesselPositionSerializer(pos).data
        return None


class VesselDetailSerializer(VesselSerializer):
    recent_positions = serializers.SerializerMethodField()

    class Meta(VesselSerializer.Meta):
        fields = VesselSerializer.Meta.fields + ["recent_positions"]

    def get_recent_positions(self, obj):
        positions = obj.positions.all()[:50]
        return VesselPositionSerializer(positions, many=True).data


class ZoneSerializer(serializers.ModelSerializer):
    polygon = serializers.SerializerMethodField()

    class Meta:
        model = Zone
        fields = ["id", "name", "polygon", "color", "created_at"]

    def get_polygon(self, obj):
        return obj.get_polygon()


class ZoneCreateSerializer(serializers.ModelSerializer):
    polygon = serializers.JSONField(write_only=True)

    class Meta:
        model = Zone
        fields = ["id", "name", "polygon", "color"]

    def create(self, validated_data):
        import json
        polygon_data = validated_data.pop("polygon")
        validated_data["polygon_json"] = json.dumps(polygon_data)
        return super().create(validated_data)


class ZoneAlertSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source="vessel.name", read_only=True)
    zone_name = serializers.CharField(source="zone.name", read_only=True)

    class Meta:
        model = ZoneAlert
        fields = ["id", "zone", "zone_name", "vessel", "vessel_name", "alert_type", "timestamp"]


class DroneSimulationSerializer(serializers.ModelSerializer):
    vessel_name = serializers.CharField(source="vessel.name", read_only=True)

    class Meta:
        model = DroneSimulation
        fields = [
            "id", "vessel", "vessel_name", "status",
            "start_latitude", "start_longitude",
            "current_latitude", "current_longitude",
            "target_latitude", "target_longitude",
            "created_at",
        ]


class PortSerializer(serializers.ModelSerializer):
    class Meta:
        model = Port
        fields = [
            "id", "name", "country", "latitude", "longitude", 
            "locode", "helcom_id", "created_at"
        ]

