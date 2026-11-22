import re
from flask import Blueprint, jsonify, request
from flask_login import login_required

bp = Blueprint("commander", __name__)
RESPONSES = [
    (r"recover|rest|sore|recovery", "Recovery is part of training. Try gentle movement, sleep, hydration, and an easy day when you need it. Stop and seek professional advice for persistent or concerning pain."),
    (r"routine|workout|plan", "I can build a routine around your focus, equipment, and available time. Open Generate routine to tailor your plan."),
    (r"push-up|pushup|exercise|form", "Move with control, use a comfortable range, and prioritize steady breathing. If a movement causes pain, stop and choose a gentler option."),
    (r"motivat|tired|start", "Consistency beats intensity. Choose a small session you can complete comfortably; showing up is progress."),
    (r"martial|karate|boxing|taekwondo|judo|kung fu|tai chi", "Open Martial arts to explore beginner-friendly solo movement drills across 12 traditions. The library is non-contact; learn technical skills with a qualified instructor."),
    (r"camera|pose", "Camera Coach is opt-in. Video is processed in your browser when pose detection is available; frames are not uploaded or saved."),
]

@bp.post("/api/commander")
@login_required
def commander():
    text = str((request.get_json(silent=True) or {}).get("message", "")).strip()[:500].lower()
    if not text:
        return jsonify({"error": "Write a message for COMMANDER."}), 400
    reply = next((answer for pattern, answer in RESPONSES if re.search(pattern, text)), "I’m here to support thoughtful, sustainable training. Ask about movement, recovery, or your routine—or open the generator to build a personal session.")
    return jsonify({"reply": reply})
