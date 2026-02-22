"""
Management command to run the AIS ingestion service,
connecting to aisstream.io and updating vessel positions.
"""
import json
import asyncio
import websockets
from django.core.management.base import BaseCommand
from django.conf import settings
from vessels.models import Vessel, VesselPosition
from vessels.services.zone_checker import check_vessel_zones
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


AIS_WS_URL = "wss://stream.aisstream.io/v0/stream"

# Baltic Sea bounding box — aisstream.io uses [[lat, lng], [lat, lng]]
BALTIC_BBOX = [
    [settings.BALTIC_BOUNDS["min_lat"], settings.BALTIC_BOUNDS["min_lng"]],
    [settings.BALTIC_BOUNDS["max_lat"], settings.BALTIC_BOUNDS["max_lng"]],
]

# AIS Ship Type mapping
SHIP_TYPE_MAP = {
    range(70, 80): "cargo",
    range(80, 90): "tanker",
    range(60, 70): "passenger",
    range(31, 33): "tug",
    range(30, 31): "fishing",
    range(35, 36): "military",
    range(36, 38): "pleasure",
}


def get_ship_type(ais_type):
    """Convert AIS ship type number to our category."""
    for type_range, category in SHIP_TYPE_MAP.items():
        if ais_type in type_range:
            return category
    return "other"


class Command(BaseCommand):
    help = "Run the AIS data ingestion service from aisstream.io"

    def add_arguments(self, parser):
        parser.add_argument(
            "--api-key",
            type=str,
            default=settings.AIS_API_KEY,
            help="aisstream.io API key",
        )

    def handle(self, *args, **options):
        api_key = options["api_key"]
        if not api_key:
            self.stderr.write(
                self.style.ERROR(
                    "No AIS API key provided. Set AIS_API_KEY env var or pass --api-key."
                )
            )
            return

        self.stdout.write(self.style.SUCCESS("Starting AIS ingestion for the Baltic Sea..."))
        self.stdout.write(f"Baltic box: {BALTIC_BBOX}")

        try:
            asyncio.run(self.stream_ais(api_key))
        except KeyboardInterrupt:
            self.stdout.write("\nAIS ingestion stopped.")

    async def stream_ais(self, api_key):
        """Connect to aisstream.io and process messages."""
        subscribe_msg = json.dumps({
            "APIKey": api_key,
            "BoundingBoxes": [BALTIC_BBOX],
            "FilterMessageTypes": ["PositionReport", "ShipStaticData"],
        })

        while True:
            try:
                async with websockets.connect(AIS_WS_URL) as ws:
                    await ws.send(subscribe_msg)
                    self.stdout.write("Connected to aisstream.io")

                    async for raw_msg in ws:
                        try:
                            msg = json.loads(raw_msg)
                            await asyncio.to_thread(self.process_message, msg)
                        except json.JSONDecodeError:
                            continue
                        except Exception as e:
                            self.stderr.write(f"Error processing message: {e}")

            except (websockets.exceptions.ConnectionClosed, ConnectionError) as e:
                self.stderr.write(f"Connection lost: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5)
            except Exception as e:
                self.stderr.write(f"Unexpected error: {e}. Reconnecting in 10s...")
                await asyncio.sleep(10)

    def process_message(self, msg):
        """Process an AIS message and update the database."""
        msg_type = msg.get("MessageType")
        metadata = msg.get("MetaData", {})
        mmsi = str(metadata.get("MMSI", ""))

        if not mmsi:
            return

        if msg_type == "PositionReport":
            self.handle_position(msg, mmsi, metadata)
        elif msg_type == "ShipStaticData":
            self.handle_static_data(msg, mmsi, metadata)

    def handle_position(self, msg, mmsi, metadata):
        """Handle a position report message."""
        report = msg.get("Message", {}).get("PositionReport", {})
        if not report:
            return

        lat = metadata.get("latitude", report.get("Latitude"))
        lng = metadata.get("longitude", report.get("Longitude"))
        if lat is None or lng is None:
            return

        vessel, created = Vessel.objects.get_or_create(
            mmsi=mmsi,
            defaults={
                "name": metadata.get("ShipName", f"Vessel {mmsi}").strip(),
                "ship_type": get_ship_type(report.get("Type", 0)),
            }
        )

        raw_heading = report.get("TrueHeading", 511)
        cog = report.get("Cog", 0)
        # AIS heading 511 = "not available"; fall back to Course Over Ground
        heading = cog if raw_heading == 511 else raw_heading

        pos = VesselPosition.objects.create(
            vessel=vessel,
            latitude=lat,
            longitude=lng,
            speed=report.get("Sog", 0),
            heading=heading,
            course=cog,
        )

        # Check zone interactions
        check_vessel_zones(vessel, lat, lng)

        # Broadcast update via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "vessel_updates",
            {
                "type": "vessel_update",
                "vessels": [{
                    "id": vessel.id,
                    "mmsi": vessel.mmsi,
                    "name": vessel.name,
                    "ship_type": vessel.ship_type,
                    "weight_tonnage": vessel.weight_tonnage,
                    "latitude": lat,
                    "longitude": lng,
                    "speed": report.get("Sog", 0),
                    "heading": heading,
                    "course": cog,
                }],
            }
        )

    def handle_static_data(self, msg, mmsi, metadata):
        """Handle ship static data (name, type, dimensions)."""
        static = msg.get("Message", {}).get("ShipStaticData", {})
        if not static:
            return

        name = static.get("Name", metadata.get("ShipName", "")).strip()
        if not name:
            return

        dim = static.get("Dimension", {})
        length = (dim.get("A", 0) or 0) + (dim.get("B", 0) or 0)
        width = (dim.get("C", 0) or 0) + (dim.get("D", 0) or 0)

        defaults = {
            "name": name,
            "ship_type": get_ship_type(static.get("Type", 0)),
            "length": length,
            "width": width,
            "destination": static.get("Destination", "").strip(),
            "flag": metadata.get("country", ""),
        }

        Vessel.objects.update_or_create(
            mmsi=mmsi,
            defaults=defaults,
        )
        self.stdout.write(f"  Updated static data: {name}")
