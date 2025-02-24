from django.db import models


class AttendanceState(models.TextChoices):
    PUNCHED_IN = "PUNCHED_IN"
    PUNCHED_OUT = "PUNCHED_OUT"


class Attendance(models.Model):
    employee = models.ForeignKey(
        "organization.Employee",
        on_delete=models.CASCADE,
        related_name="attendances",
    )

    date = models.DateField()
    time_in = models.TimeField()
    time_in_utc = models.TimeField()
    timezone_in = models.CharField(max_length=255)
    time_out = models.TimeField()
    time_out_utc = models.TimeField()
    timezone_out = models.CharField(max_length=255)
    state = models.CharField(choices=AttendanceState.choices)


class AttendanceLog(models.Model):
    employee = models.ForeignKey(
        "user.User",
        on_delete=models.CASCADE,
        related_name="attendance_logs",
    )

    date = models.DateField()
    time = models.TimeField()
    action = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    device = models.CharField(max_length=255)
    os = models.CharField(max_length=255)
    browser = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    accuracy = models.FloatField()
    is_mobile = models.BooleanField()
    is_tablet = models.BooleanField()
    is_desktop = models.BooleanField()
    is_bot = models.BooleanField()
    is_authenticated = models.BooleanField()
    is_superuser = models.BooleanField()
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    is_anonymous = models.BooleanField()