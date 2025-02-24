import uuid_utils.compat as uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(
        default=uuid.uuid7,
        unique=True,
        editable=False,
        db_index=True,
        primary_key=True,
    )
