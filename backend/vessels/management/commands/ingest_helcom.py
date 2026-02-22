import csv
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from vessels.models import Port

class Command(BaseCommand):
    help = "Ingest Baltic Sea Port data from local CSV (HELCOM Open Data)"

    def handle(self, *args, **options):
        self.stdout.write("Starting HELCOM port ingestion from CSV...")
        
        csv_path = os.path.join(settings.BASE_DIR, 'vessels', 'data', 'ports.csv')
        
        if not os.path.exists(csv_path):
            self.stdout.write(self.style.ERROR(f"CSV file not found at {csv_path}"))
            return

        # We first group the rows by locode to compute a geographic centroid
        bounds = settings.BALTIC_BOUNDS
        grouped_ports = {}

        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=';')
            for row in reader:
                try:
                    name = row["Port name"].strip()
                    country = row["Port country"].strip()
                    locode = row["Port code"].strip()
                    
                    lat = float(row["Latitude"])
                    lng = float(row["Longitude"])
                    
                    if locode not in grouped_ports:
                        grouped_ports[locode] = {
                            "name": name,
                            "country": country,
                            "lats": [],
                            "lngs": []
                        }
                    
                    grouped_ports[locode]["lats"].append(lat)
                    grouped_ports[locode]["lngs"].append(lng)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Failed to parse row: {row} - {e}"))

        self.stdout.write(f"Parsed {len(grouped_ports)} unique ports from CSV. Proceeding to filter and save...")

        # Clear existing ports to cleanly handle the deduplication
        Port.objects.all().delete()
        
        ports_added = 0
        
        for locode, data in grouped_ports.items():
            avg_lat = sum(data["lats"]) / len(data["lats"])
            avg_lng = sum(data["lngs"]) / len(data["lngs"])
            
            # Filter out ports outside the Baltic Sea bounding box
            if not (bounds["min_lat"] <= avg_lat <= bounds["max_lat"] and bounds["min_lng"] <= avg_lng <= bounds["max_lng"]):
                continue

            helcom_id = f"HELCOM-{locode.replace(' ', '_')}"

            Port.objects.create(
                helcom_id=helcom_id,
                name=data["name"],
                country=data["country"],
                latitude=avg_lat,
                longitude=avg_lng,
                locode=locode,
            )
            ports_added += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully ingrained {ports_added} localized Baltic ports into the database."))
        self.stdout.write(self.style.SUCCESS(f"Total ports tracked: {Port.objects.count()}"))
