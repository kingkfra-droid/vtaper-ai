from flask import Blueprint, jsonify
from flask_login import login_required

bp = Blueprint("camera", __name__)

@bp.get("/api/camera/privacy")
@login_required
def camera_privacy():
    return jsonify({"processing": "browser-only", "recording": False, "uploads": False, "permission_required": True, "message": "Camera permission is requested only by the browser after explicit user action. Frames and pose landmarks are not sent to the Flask server."})
