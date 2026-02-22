import json
from django.db import models


class Vessel(models.Model):
    # Vessel model

    SHIP_TYPES = [
        ("cargo", "Cargo"),
        ("tanker", "Tanker"),
        ("passenger", "Passenger/Ferry"),
        ("tug", "Tugboat"),
        ("fishing", "Fishing"),
        ("military", "Military"),
        ("pleasure", "Pleasure Craft"),
        ("other", "Other"),
    ]

    mmsi = models.CharField(max_length=20, unique=True, help_text="Maritime Mobile Service Identity")
    name = models.CharField(max_length=200)
    ship_type = models.CharField(max_length=20, choices=SHIP_TYPES, default="other")
    weight_tonnage = models.FloatField(default=0, help_text="Gross tonnage")
    flag = models.CharField(max_length=100, blank=True, default="")
    length = models.FloatField(default=0, help_text="Length in meters")
    width = models.FloatField(default=0, help_text="Width/beam in meters")
    destination = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.mmsi})"


class VesselPosition(models.Model):
    # Vessel position model

    vessel = models.ForeignKey(Vessel, on_delete=models.CASCADE, related_name="positions")
    latitude = models.FloatField()
    longitude = models.FloatField()
    speed = models.FloatField(default=0, help_text="Speed in knots")
    heading = models.FloatField(default=0, help_text="Heading in degrees")
    course = models.FloatField(default=0, help_text="Course over ground in degrees")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["vessel", "-timestamp"]),
        ]

    def __str__(self):
        return f"{self.vessel.name} @ ({self.latitude:.4f}, {self.longitude:.4f})"


class Zone(models.Model):
    # A polygon on the map model

    name = models.CharField(max_length=200)
    polygon_json = models.TextField(help_text="GeoJSON polygon coordinates")
    color = models.CharField(max_length=7, default="#ff9500")
    created_at = models.DateTimeField(auto_now_add=True)

    def get_polygon(self):
        return json.loads(self.polygon_json)

    def __str__(self):
        return self.name


class ZoneAlert(models.Model):
    # Alert model

    ALERT_TYPES = [
        ("enter", "Entered Zone"),
        ("exit", "Exited Zone"),
    ]

    zone = models.ForeignKey(Zone, on_delete=models.CASCADE, related_name="alerts")
    vessel = models.ForeignKey(Vessel, on_delete=models.CASCADE, related_name="alerts")
    alert_type = models.CharField(max_length=10, choices=ALERT_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.vessel.name} {self.alert_type} {self.zone.name}"


class DroneSimulation(models.Model):
   # A simulated drone deployment model

    STATUS_CHOICES = [
        ("deploying", "Deploying"),
        ("in_transit", "In Transit"),
        ("observing", "Observing"),
        ("returning", "Returning"),
        ("completed", "Completed"),
    ]

    vessel = models.ForeignKey(Vessel, on_delete=models.CASCADE, related_name="drone_missions")
    start_latitude = models.FloatField()
    start_longitude = models.FloatField()
    current_latitude = models.FloatField()
    current_longitude = models.FloatField()
    target_latitude = models.FloatField()
    target_longitude = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="deploying")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Drone → {self.vessel.name} ({self.status})"


class Port(models.Model):
    # HELCOM Baltic Sea Port Data model
    name = models.CharField(max_length=200)
    country = models.CharField(max_length=100, blank=True, default="")
    latitude = models.FloatField()
    longitude = models.FloatField()
    locode = models.CharField(max_length=20, blank=True, default="", help_text="UN/LOCODE")
    helcom_id = models.CharField(max_length=50, unique=True, help_text="Unique HELCOM identifier")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.country})"

