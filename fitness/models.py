from django.db import models
from django.utils.timezone import now
from werkzeug.security import check_password_hash, generate_password_hash


class User(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=80)
    email = models.EmailField(max_length=180, unique=True, db_index=True)
    password_hash = models.CharField(max_length=256)
    created_at = models.DateTimeField(null=True, blank=True, default=now)
    experience = models.CharField(max_length=24, null=True, blank=True, default="Beginner")
    preferences = models.JSONField(null=True, blank=True, default=dict)

    class Meta:
        managed = False
        db_table = "user"

    @property
    def is_authenticated(self):
        return True

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Workout(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.IntegerField(db_index=True)
    title = models.CharField(max_length=120)
    focus = models.CharField(max_length=60, null=True, blank=True, default="Full body")
    duration_minutes = models.IntegerField(null=True, blank=True, default=0)
    exercises = models.JSONField(null=True, blank=True, default=list)
    completed_at = models.DateTimeField(null=True, blank=True, default=now, db_index=True)
    feedback = models.CharField(max_length=500, null=True, blank=True, default="")

    class Meta:
        managed = False
        db_table = "workout"
