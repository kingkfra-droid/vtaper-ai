import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from routes.auth import api_error, is_video_studio_admin

bp = Blueprint("video_studio", __name__)

CATEGORIES = {"Chest", "Back", "Arms", "Shoulders", "Abs", "Legs", "Full body"}
TEMPLATES = {"showcase", "workout", "advertisement"}
ASPECT_RATIOS = {"9:16", "4:5", "1:1"}


def provider_url():
    value = os.environ.get("VTAPER_VIDEO_API_URL", "").strip()
    if not value:
        return None
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment:
        return None
    return value


@bp.post("/api/admin/video-studio/generate")
@login_required
def generate_external_video():
    if not is_video_studio_admin(current_user):
        return api_error("Video Studio is available to authorized administrators only.", 403)

    endpoint = provider_url()
    if not endpoint:
        return api_error("Advanced AI video generation is not configured. Use local browser rendering instead.", 503)

    data = request.get_json(silent=True) or {}
    category = str(data.get("category", ""))
    exercise = str(data.get("exercise", "")).strip()
    template = str(data.get("template", ""))
    aspect_ratio = str(data.get("aspect_ratio", ""))
    try:
        duration = int(data.get("duration_seconds", 0))
    except (TypeError, ValueError):
        return api_error("Choose a valid video duration.")
    if category not in CATEGORIES or template not in TEMPLATES or aspect_ratio not in ASPECT_RATIOS or not exercise or len(exercise) > 120 or not 1 <= duration <= 60:
        return api_error("Choose a valid exercise, template, category, format, and duration.")

    payload = {
        "template": template,
        "category": category,
        "exercise": exercise,
        "duration_seconds": duration,
        "aspect_ratio": aspect_ratio,
        "prompt": f"Create an exercise demonstration featuring an athletic 3D muscular mannequin performing {exercise}. Highlight {category} muscles, use smooth camera movement, readable VTaper AI branding, and a polished fitness studio aesthetic. Do not claim medical or biomechanical analysis.",
    }
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    api_key = os.environ.get("VTAPER_VIDEO_API_KEY", "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    outbound = Request(endpoint, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with urlopen(outbound, timeout=30) as response:
            response_body = response.read(2_000_001)
            if len(response_body) > 2_000_000:
                return api_error("The video provider returned an oversized response.", 502)
            provider_response = json.loads(response_body.decode("utf-8"))
    except HTTPError as error:
        return api_error(f"The configured video provider returned HTTP {error.code}.", 502)
    except (URLError, TimeoutError, OSError, json.JSONDecodeError, UnicodeDecodeError):
        return api_error("The configured video provider could not complete this request.", 502)

    if not isinstance(provider_response, dict):
        return api_error("The configured video provider returned an invalid response.", 502)
    return jsonify({"success": True, "provider_response": provider_response})
