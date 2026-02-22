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

        ports_added = 0
        ports_updated = 0
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=';')
            for row in reader:
                # CSV Headers: Port country;Port name;Port code;Port location;Latitude;Longitude;Port salinity min;Port salinity max;Target category
                try:
                    name = row["Port name"].strip()
                    country = row["Port country"].strip()
                    locode = row["Port code"].strip()
                    # create a unique HELCOM string from locode + site
                    helcom_id = f"{locode}-{row['Port location'].strip()}".replace(' ', '_')
                    
                    lat = float(row["Latitude"])
                    lng = float(row["Longitude"])
                    
                    port, created = Port.objects.update_or_create(
                        helcom_id=helcom_id,
                        defaults={
                            "name": name,
                            "country": country,
                            "latitude": lat,
                            "longitude": lng,
                            "locode": locode,
                        }
                    )
                    if created:
                        ports_added += 1
                    else:
                        ports_updated += 1
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Failed to parse row: {row} - {e}"))
                
        self.stdout.write(self.style.SUCCESS(f"Successfully ingrained {ports_added} new ports into the database."))
        self.stdout.write(self.style.SUCCESS(f"Updated {ports_updated} existing ports."))
        self.stdout.write(self.style.SUCCESS(f"Total ports tracked: {Port.objects.count()}"))
