"""
Management command to move seeded vessels around the harbor for live demo
when no AIS feed is available.
"""
import time
import math
import random
from django.core.management.base import BaseCommand
from vessels.models import Vessel, VesselPosition
from vessels.services.zone_checker import check_vessel_zones
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class Command(BaseCommand):
    help = "Move seeded vessels around NYC Harbor (for demo without AIS feed)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--interval",
            type=float,
            default=2.0,
            help="Update interval in seconds",
        )

    def handle(self, *args, **options):
        interval = options["interval"]
        self.stdout.write(self.style.SUCCESS("Starting vessel movement simulation..."))

        vessels = list(Vessel.objects.all())
        if not vessels:
            self.stderr.write("No vessels in database. Run 'seed_vessels' first.")
            return

        # Initialize movement state for each vessel
        states = {}
        for v in vessels:
            pos = v.positions.first()
            if pos:
                states[v.id] = {
                    "lat": pos.latitude,
                    "lng": pos.longitude,
                    "heading": random.uniform(0, 360),
                    "speed": random.uniform(1, 8),
                    "turn_rate": random.uniform(-0.5, 0.5),
                }

        channel_layer = get_channel_layer()

        self.stdout.write(f"Moving {len(states)} vessels every {interval}s. Press Ctrl+C to stop.")

        try:
            while True:
                all_updates = []
                for v in vessels:
                    if v.id not in states:
                        continue

                    s = states[v.id]

                    # Update heading with some randomness
                    s["heading"] += s["turn_rate"] + random.uniform(-2, 2)
                    s["heading"] %= 360

                    # Occasionally change turn rate and speed
                    if random.random() < 0.05:
                        s["turn_rate"] = random.uniform(-1.5, 1.5)
                    if random.random() < 0.03:
                        s["speed"] = max(0, min(15, s["speed"] + random.uniform(-2, 2)))

                    # Convert speed (knots) to degree offset
                    speed_deg = s["speed"] * 0.00005 * interval
                    heading_rad = math.radians(s["heading"])
                    s["lat"] += speed_deg * math.cos(heading_rad)
                    s["lng"] += speed_deg * math.sin(heading_rad)

                    # Keep vessels within Arctic bounds
                    if s["lat"] < 55.0 or s["lat"] > 85.0:
                        s["heading"] = (180 - s["heading"]) % 360
                        s["lat"] = max(55.0, min(85.0, s["lat"]))
                    if s["lng"] < -180.0 or s["lng"] > 180.0:
                        s["heading"] = (360 - s["heading"]) % 360
                        s["lng"] = max(-180.0, min(180.0, s["lng"]))

                    # Save position
                    VesselPosition.objects.create(
                        vessel=v,
                        latitude=s["lat"],
                        longitude=s["lng"],
                        speed=s["speed"],
                        heading=s["heading"],
                        course=s["heading"],
                    )

                    # Check zones
                    check_vessel_zones(v, s["lat"], s["lng"])

                    all_updates.append({
                        "id": v.id,
                        "mmsi": v.mmsi,
                        "name": v.name,
                        "ship_type": v.ship_type,
                        "weight_tonnage": v.weight_tonnage,
                        "latitude": s["lat"],
                        "longitude": s["lng"],
                        "speed": s["speed"],
                        "heading": s["heading"],
                        "course": s["heading"],
                    })

                # Broadcast all updates at once
                if all_updates:
                    async_to_sync(channel_layer.group_send)(
                        "vessel_updates",
                        {
                            "type": "vessel_update",
                            "vessels": all_updates,
                        }
                    )

                time.sleep(interval)

        except KeyboardInterrupt:
            self.stdout.write("\nSimulation stopped.")

