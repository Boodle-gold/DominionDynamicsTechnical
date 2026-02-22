import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async


class VesselConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer that broadcasts vessel position updates
    and zone alerts to connected frontend clients.
    """

    async def connect(self):
        self.group_name = "vessel_updates"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        # Send initial vessel data on connect
        vessels = await self.get_all_vessels()
        await self.send(text_data=json.dumps({
            "type": "initial_data",
            "vessels": vessels,
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle messages from frontend (e.g., zone creation)."""
        data = json.loads(text_data)
        msg_type = data.get("type")

        if msg_type == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))

    async def vessel_update(self, event):
        """Broadcast vessel position update to all clients."""
        await self.send(text_data=json.dumps({
            "type": "vessel_update",
            "vessels": event["vessels"],
        }))

    async def zone_alert(self, event):
        """Broadcast zone alert to all clients."""
        await self.send(text_data=json.dumps({
            "type": "zone_alert",
            "alert": event["alert"],
        }))

    async def drone_update(self, event):
        """Broadcast drone position update."""
        await self.send(text_data=json.dumps({
            "type": "drone_update",
            "drone": event["drone"],
        }))

    @database_sync_to_async
    def get_all_vessels(self):
        from .models import Vessel
        vessels = []
        for v in Vessel.objects.all():
            pos = v.positions.first()
            vessel_data = {
                "id": v.id,
                "mmsi": v.mmsi,
                "name": v.name,
                "ship_type": v.ship_type,
                "weight_tonnage": v.weight_tonnage,
                "flag": v.flag,
                "length": v.length,
                "width": v.width,
                "destination": v.destination,
            }
            if pos:
                vessel_data["latitude"] = pos.latitude
                vessel_data["longitude"] = pos.longitude
                vessel_data["speed"] = pos.speed
                vessel_data["heading"] = pos.heading
                vessel_data["course"] = pos.course
            vessels.append(vessel_data)
        return vessels
