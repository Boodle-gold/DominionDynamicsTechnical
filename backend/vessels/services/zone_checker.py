"""
Zone checker service: detects when vessels enter or exit user-defined zones
and creates alerts accordingly.
"""
import json
from shapely.geometry import Point, shape
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from vessels.models import Zone, ZoneAlert, Vessel


# Track which vessels are currently in which zones
_vessel_zone_state = {}  # {vessel_id: set(zone_ids)}


def check_vessel_zones(vessel, latitude, longitude):
    """
    Check if a vessel is inside any defined zones.
    Creates enter/exit alerts as needed and broadcasts via WebSocket.
    """
    point = Point(longitude, latitude)
    zones = Zone.objects.all()

    if vessel.id not in _vessel_zone_state:
        _vessel_zone_state[vessel.id] = set()

    current_zones = set()
    alerts = []

    for zone in zones:
        try:
            polygon_data = zone.get_polygon()
            polygon = shape(polygon_data)

            if polygon.contains(point):
                current_zones.add(zone.id)

                # Vessel just entered this zone
                if zone.id not in _vessel_zone_state[vessel.id]:
                    alert = ZoneAlert.objects.create(
                        zone=zone,
                        vessel=vessel,
                        alert_type="enter",
                    )
                    alerts.append({
                        "id": alert.id,
                        "zone_id": zone.id,
                        "zone_name": zone.name,
                        "vessel_id": vessel.id,
                        "vessel_name": vessel.name,
                        "alert_type": "enter",
                        "timestamp": alert.timestamp.isoformat(),
                    })
        except (json.JSONDecodeError, Exception):
            continue

    # Check for vessels that exited zones
    exited_zones = _vessel_zone_state[vessel.id] - current_zones
    for zone_id in exited_zones:
        try:
            zone = Zone.objects.get(id=zone_id)
            alert = ZoneAlert.objects.create(
                zone=zone,
                vessel=vessel,
                alert_type="exit",
            )
            alerts.append({
                "id": alert.id,
                "zone_id": zone.id,
                "zone_name": zone.name,
                "vessel_id": vessel.id,
                "vessel_name": vessel.name,
                "alert_type": "exit",
                "timestamp": alert.timestamp.isoformat(),
            })
        except Zone.DoesNotExist:
            pass

    _vessel_zone_state[vessel.id] = current_zones

    # Broadcast alerts via WebSocket
    if alerts:
        channel_layer = get_channel_layer()
        for alert_data in alerts:
            async_to_sync(channel_layer.group_send)(
                "vessel_updates",
                {
                    "type": "zone_alert",
                    "alert": alert_data,
                }
            )

    return alerts

