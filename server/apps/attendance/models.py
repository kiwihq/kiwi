from django.db import models


def get_default_attendance_metadata():
    return {
        "ip_address": None, # ip address of the user/device
        "channel": None, # web, mobile, tablet, biometric, etc.
        "user_agent": None, # user agent of the user/device
        "device": None, # device of the user/device
        "os": None, # os of the user/device
        "browser": None, # browser of the user/device
        "location": None, # location of the user/device
    }

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
    metadata = models.JSONField(default=get_default_attendance_metadata)