from flask import Blueprint, jsonify
from services.martial_arts import MARTIAL_ARTS

bp = Blueprint("martial_arts", __name__)

@bp.get("/api/martial-arts")
def martial_arts():
    return jsonify({"disciplines": MARTIAL_ARTS, "safety": "These are solo, non-contact movement and fitness drills. Learn martial arts techniques with a qualified instructor in a supervised setting. No partner drills, sparring, throws, or strikes are included."})
