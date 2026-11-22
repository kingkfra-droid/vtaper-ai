from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify
from flask_login import current_user, login_required
from models import Workout

bp = Blueprint("progress", __name__)

@bp.get("/api/progress")
@login_required
def progress():
    rows = Workout.query.filter_by(user_id=current_user.id).order_by(Workout.completed_at.desc()).limit(100).all()
    now = datetime.now(timezone.utc)
    week = [w for w in rows if (w.completed_at.replace(tzinfo=timezone.utc) if w.completed_at.tzinfo is None else w.completed_at) >= now - timedelta(days=7)]
    training_dates = {w.completed_at.date() for w in rows}
    today = now.date()
    streak = 0
    cursor = today if today in training_dates else today - timedelta(days=1)
    while cursor in training_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return jsonify({"sessions": [{"id": w.id, "title": w.title, "focus": w.focus, "duration": w.duration_minutes, "exercises": w.exercises or [], "completed_at": w.completed_at.isoformat()} for w in rows], "total_sessions": Workout.query.filter_by(user_id=current_user.id).count(), "minutes_this_week": sum(w.duration_minutes for w in week), "sessions_this_week": len(week), "streak": streak})
