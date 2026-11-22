from datetime import datetime, timezone
from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    experience = db.Column(db.String(24), default="Beginner")
    preferences = db.Column(db.JSON, default=dict)
    workouts = db.relationship("Workout", backref="user", lazy=True, cascade="all, delete-orphan")
    def set_password(self, password): self.password_hash = generate_password_hash(password)
    def check_password(self, password): return check_password_hash(self.password_hash, password)

class Workout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    title = db.Column(db.String(120), nullable=False)
    focus = db.Column(db.String(60), default="Full body")
    duration_minutes = db.Column(db.Integer, default=0)
    exercises = db.Column(db.JSON, default=list)
    completed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    feedback = db.Column(db.String(500), default="")
