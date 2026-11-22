from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")
DB = os.path.join(DATA, "progress.json")

os.makedirs(DATA, exist_ok=True)


def load_data():
    if not os.path.exists(DB):
        return {"sessions": [], "completed": 0}

    try:
        with open(DB, "r") as file:
            data = json.load(file)

        data.setdefault("sessions", [])
        data.setdefault("completed", 0)
        return data

    except (json.JSONDecodeError, OSError):
        return {"sessions": [], "completed": 0}


def save_data(data):
    with open(DB, "w") as file:
        json.dump(data, file, indent=2)


WORKOUTS = {
    "full": [
        {"name": "Easy Marching in Place", "sets": 1, "reps": "30 seconds"},
        {"name": "Chair Squats", "sets": 1, "reps": "6-8 comfortable repetitions"},
        {"name": "Wall Push-ups", "sets": 1, "reps": "5-8 comfortable repetitions"}
    ],
    "posture": [
        {"name": "Shoulder Rolls", "sets": 1, "reps": "8 repetitions"},
        {"name": "Gentle Wall Slides", "sets": 1, "reps": "5 repetitions"},
        {"name": "Bird Dogs", "sets": 1, "reps": "5 each side"}
    ],
    "core": [
        {"name": "Dead Bugs", "sets": 1, "reps": "5 each side"},
        {"name": "Bird Dogs", "sets": 1, "reps": "5 each side"},
        {"name": "Gentle Marching in Place", "sets": 1, "reps": "30 seconds"}
    ],
    "upper": [
        {"name": "Arm Circles", "sets": 1, "reps": "15 seconds"},
        {"name": "Wall Push-ups", "sets": 1, "reps": "5-8 comfortable repetitions"},
        {"name": "Shoulder Rolls", "sets": 1, "reps": "8 repetitions"}
    ]
}


@app.route("/")
def home():
    return render_template("index.html", data=load_data())


@app.route("/api/plan", methods=["POST"])
def plan():
    body = request.get_json(silent=True) or {}

    goal = body.get("goal", "full")
    experience = body.get("experience", "beginner")
    equipment = body.get("equipment", "none")
    duration = body.get("duration", "10")
    limitations = body.get("limitations", "none")

    if goal not in WORKOUTS:
        goal = "full"

    if experience not in ("beginner", "some"):
        experience = "beginner"

    if equipment not in ("none", "basic"):
        equipment = "none"

    if duration not in ("10", "15", "20"):
        duration = "10"

    # Do not prescribe exercises when the user reports limitations.
    if limitations != "none":
        return jsonify({
            "goal": goal,
            "exercises": [],
            "needs_guidance": True,
            "message": (
                "Commander, you reported a movement limitation. "
                "Pause routine generation and check with a trusted adult "
                "or qualified health professional about suitable activities."
            )
        })

    exercises = [dict(item) for item in WORKOUTS[goal]]

    # Keep sessions short and manageable.
    if duration == "10":
        exercises = exercises[:2]

    if experience == "some":
        for exercise in exercises:
            exercise["sets"] = 2

    return jsonify({
        "goal": goal,
        "experience": experience,
        "equipment": equipment,
        "duration": int(duration),
        "exercises": exercises,
        "needs_guidance": False,
        "message": (
            "Protocol ready, Commander. Move at a comfortable pace, "
            "take breaks when needed, and stop if anything hurts."
        )
    })


@app.route("/api/complete", methods=["POST"])
def complete():
    data = load_data()
    body = request.get_json(silent=True) or {}

    data["completed"] += 1
    data["sessions"].append({
        "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "goal": body.get("goal", "general")
    })

    save_data(data)

    return jsonify({
        "success": True,
        "completed": data["completed"]
    })


@app.route("/api/progress")
def progress():
    return jsonify(load_data())


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
