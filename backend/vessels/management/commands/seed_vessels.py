"""
Management command to seed the database with sample NYC Harbor vessels.
"""
import random
from django.core.management.base import BaseCommand
from vessels.models import Vessel, VesselPosition


# Realistic NYC Harbor vessel data
SAMPLE_VESSELS = [
    {
        "mmsi": "367000001",
        "name": "Staten Island Ferry - Spirit of America",
        "ship_type": "passenger",
        "weight_tonnage": 3335,
        "flag": "US",
        "length": 94,
        "width": 21,
        "destination": "St. George Terminal",
        "lat": 40.6437,
        "lng": -74.0712,
    },
    {
        "mmsi": "367000002",
        "name": "NYC Ferry - Hornblower",
        "ship_type": "passenger",
        "weight_tonnage": 399,
        "flag": "US",
        "length": 26,
        "width": 8,
        "destination": "Wall St/Pier 11",
        "lat": 40.7013,
        "lng": -74.0367,
    },
    {
        "mmsi": "367000003",
        "name": "MSC Gianna",
        "ship_type": "cargo",
        "weight_tonnage": 108000,
        "flag": "PA",
        "length": 366,
        "width": 51,
        "destination": "Port Newark",
        "lat": 40.6650,
        "lng": -74.1450,
    },
    {
        "mmsi": "367000004",
        "name": "Maersk Hartford",
        "ship_type": "cargo",
        "weight_tonnage": 46000,
        "flag": "DK",
        "length": 294,
        "width": 32,
        "destination": "Global Container Terminal",
        "lat": 40.6380,
        "lng": -74.1780,
    },
    {
        "mmsi": "367000005",
        "name": "Tugboat McAllister Girls",
        "ship_type": "tug",
        "weight_tonnage": 195,
        "flag": "US",
        "length": 29,
        "width": 10,
        "destination": "Harbor Ops",
        "lat": 40.6725,
        "lng": -74.0350,
    },
    {
        "mmsi": "367000006",
        "name": "Bouchard B-255",
        "ship_type": "tanker",
        "weight_tonnage": 16750,
        "flag": "US",
        "length": 177,
        "width": 25,
        "destination": "Kill Van Kull",
        "lat": 40.6430,
        "lng": -74.0940,
    },
    {
        "mmsi": "367000007",
        "name": "NYPD Harbor Launch",
        "ship_type": "military",
        "weight_tonnage": 45,
        "flag": "US",
        "length": 16,
        "width": 4,
        "destination": "Patrol",
        "lat": 40.6890,
        "lng": -74.0180,
    },
    {
        "mmsi": "367000008",
        "name": "Circle Line Sightseeing",
        "ship_type": "passenger",
        "weight_tonnage": 550,
        "flag": "US",
        "length": 58,
        "width": 12,
        "destination": "Pier 83",
        "lat": 40.7630,
        "lng": -73.9990,
    },
    {
        "mmsi": "367000009",
        "name": "Atlantic Salvor",
        "ship_type": "tug",
        "weight_tonnage": 2200,
        "flag": "US",
        "length": 65,
        "width": 13,
        "destination": "Anchorage",
        "lat": 40.6200,
        "lng": -74.0530,
    },
    {
        "mmsi": "367000010",
        "name": "USCGC Katherine Walker",
        "ship_type": "military",
        "weight_tonnage": 840,
        "flag": "US",
        "length": 53,
        "width": 10,
        "destination": "USCG Station NY",
        "lat": 40.6920,
        "lng": -74.0130,
    },
    {
        "mmsi": "367000011",
        "name": "Fishing Vessel Blue Horizon",
        "ship_type": "fishing",
        "weight_tonnage": 85,
        "flag": "US",
        "length": 18,
        "width": 5,
        "destination": "Sheepshead Bay",
        "lat": 40.5850,
        "lng": -73.9300,
    },
    {
        "mmsi": "367000012",
        "name": "CMA CGM Figaro",
        "ship_type": "cargo",
        "weight_tonnage": 75600,
        "flag": "FR",
        "length": 299,
        "width": 40,
        "destination": "Red Hook Terminal",
        "lat": 40.6770,
        "lng": -74.0200,
    },
    {
        "mmsi": "367000013",
        "name": "Yacht Sea Breeze",
        "ship_type": "pleasure",
        "weight_tonnage": 120,
        "flag": "US",
        "length": 25,
        "width": 6,
        "destination": "Liberty Landing Marina",
        "lat": 40.7100,
        "lng": -74.0250,
    },
    {
        "mmsi": "367000014",
        "name": "Governor's Island Ferry",
        "ship_type": "passenger",
        "weight_tonnage": 278,
        "flag": "US",
        "length": 22,
        "width": 9,
        "destination": "Governors Island",
        "lat": 40.6895,
        "lng": -74.0195,
    },
    {
        "mmsi": "367000015",
        "name": "Evergreen Ever Ace",
        "ship_type": "cargo",
        "weight_tonnage": 235579,
        "flag": "PA",
        "length": 400,
        "width": 62,
        "destination": "Port Elizabeth",
        "lat": 40.6580,
        "lng": -74.1620,
    },
]


class Command(BaseCommand):
    help = "Seed the database with sample NYC Harbor vessels"

    def handle(self, *args, **options):
        self.stdout.write("Seeding vessels...")

        for data in SAMPLE_VESSELS:
            vessel, created = Vessel.objects.get_or_create(
                mmsi=data["mmsi"],
                defaults={
                    "name": data["name"],
                    "ship_type": data["ship_type"],
                    "weight_tonnage": data["weight_tonnage"],
                    "flag": data["flag"],
                    "length": data["length"],
                    "width": data["width"],
                    "destination": data["destination"],
                }
            )

            if created:
                # Create initial position with some randomness
                VesselPosition.objects.create(
                    vessel=vessel,
                    latitude=data["lat"] + random.uniform(-0.002, 0.002),
                    longitude=data["lng"] + random.uniform(-0.002, 0.002),
                    speed=random.uniform(0, 15),
                    heading=random.uniform(0, 360),
                    course=random.uniform(0, 360),
                )
                self.stdout.write(f"  Created: {vessel.name}")
            else:
                self.stdout.write(f"  Exists:  {vessel.name}")

        self.stdout.write(self.style.SUCCESS(f"Done! {Vessel.objects.count()} vessels in database."))

