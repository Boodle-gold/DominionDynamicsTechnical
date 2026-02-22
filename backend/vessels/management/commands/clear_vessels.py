from django.core.management.base import BaseCommand
from vessels.models import Vessel, VesselPosition

class Command(BaseCommand):
    help = "Clear all vessels and positions from the database"

    def handle(self, *args, **options):
        vessel_count = Vessel.objects.count()
        position_count = VesselPosition.objects.count()
        
        VesselPosition.objects.all().delete()
        Vessel.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS(f"Deleted {vessel_count} vessels and {position_count} positions."))
