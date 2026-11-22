from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from models import db, Workout
from services.routine_engine import build_routine, EXERCISES

bp = Blueprint("workouts", __name__)

def api_error(message, status=400):
    return jsonify({"error": message}), status

@bp.get("/api/exercises")
def exercises():
    return jsonify({"exercises": EXERCISES})

@bp.post("/api/routines")
@login_required
def routine():
    data = request.get_json(silent=True) or {}
    try:
        result = build_routine(data)
    except (ValueError, TypeError):
        return api_error("Please provide a valid training duration.")
    if not result["needs_guidance"]:
        current_user.experience = str(data.get("experience", "Beginner"))[:24]
        current_user.preferences = {"muscles": data.get("muscles", []), "equipment": data.get("equipment", []), "focus": data.get("focus", "Full body")}
        db.session.commit()
    return jsonify(result)

@bp.post("/api/workouts")
@login_required
def complete_workout():
    data = request.get_json(silent=True) or {}
    exercises = data.get("exercises", [])
    if not isinstance(exercises, list) or not exercises or len(exercises) > 20:
        return api_error("A workout with 1–20 exercises is required.")
    try:
        duration = max(1, min(int(data.get("duration", 1)), 240))
    except (ValueError, TypeError):
        return api_error("Enter a valid workout duration.")
    workout = Workout(user_id=current_user.id, title=str(data.get("title", "Training session"))[:120], focus=str(data.get("focus", "Full body"))[:60], duration_minutes=duration, exercises=exercises, feedback=str(data.get("feedback", ""))[:500])
    db.session.add(workout)
    db.session.commit()
    return jsonify({"success": True, "id": workout.id}), 201
