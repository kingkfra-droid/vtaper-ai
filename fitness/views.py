import json
import os
import re
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from werkzeug.security import check_password_hash, generate_password_hash

from fitness.models import User, Workout
from services.martial_arts import MARTIAL_ARTS
from services.routine_engine import EXERCISES, build_routine


COMMANDER_RESPONSES = [
    (r"recover|rest|sore|recovery", "Recovery is part of training. Try gentle movement, sleep, hydration, and an easy day when you need it. Stop and seek professional advice for persistent or concerning pain."),
    (r"routine|workout|plan", "I can build a routine around your focus, equipment, and available time. Open Generate routine to tailor your plan."),
    (r"push-up|pushup|exercise|form", "Move with control, use a comfortable range, and prioritize steady breathing. If a movement causes pain, stop and choose a gentler option."),
    (r"motivat|tired|start", "Consistency beats intensity. Choose a small session you can complete comfortably; showing up is progress."),
    (r"martial|karate|boxing|taekwondo|judo|kung fu|tai chi", "Open Martial arts to explore beginner-friendly solo movement drills across 12 traditions. The library is non-contact; learn technical skills with a qualified instructor."),
    (r"camera|pose", "Camera Coach is opt-in. Video is processed in your browser when pose detection is available; frames are not uploaded or saved."),
]


def api_error(message, status=400):
    return JsonResponse({"error": message}, status=status)


def json_body(request):
    try:
        value = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    return value if isinstance(value, dict) else None


def current_account(request):
    user_id = request.session.get("user_id")
    if user_id is None:
        return None
    try:
        return User.objects.filter(pk=user_id).first()
    except (TypeError, ValueError):
        return None


def is_video_studio_admin(user):
    admins = {email.strip().lower() for email in os.environ.get("VTAPER_ADMIN_EMAILS", "").split(",") if email.strip()}
    return bool(user and user.email.strip().lower() in admins)


def login_required_api(view):
    def wrapped(request, *args, **kwargs):
        user = current_account(request)
        if user is None:
            return api_error("Sign in to access this feature.", 401)
        request.current_user = user
        return view(request, *args, **kwargs)
    wrapped.__name__ = view.__name__
    return wrapped


def video_admin_required(view):
    @login_required_api
    def wrapped(request, *args, **kwargs):
        if not is_video_studio_admin(request.current_user):
            return api_error("Video Studio is available to authorized administrators only.", 403)
        return view(request, *args, **kwargs)
    wrapped.__name__ = view.__name__
    return wrapped


@require_GET
@ensure_csrf_cookie
def home(request):
    return render(request, "index.html")


@require_GET
def me(request):
    user = current_account(request)
    if user is None:
        return JsonResponse({"authenticated": False})
    return JsonResponse({"authenticated": True, "user": {
        "name": user.name,
        "email": user.email,
        "experience": user.experience,
        "preferences": user.preferences or {},
        "is_admin": is_video_studio_admin(user),
    }})


@require_POST
def register(request):
    data = json_body(request)
    if data is None:
        return api_error("Send a valid JSON account request.")
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if len(name) < 2 or len(name) > 80 or "@" not in email or len(email) > 180 or len(password) < 10:
        return api_error("Enter a name, valid email, and password with at least 10 characters.")
    user = User(name=name, email=email, password_hash=generate_password_hash(password), preferences={})
    try:
        with transaction.atomic():
            user.save(force_insert=True)
    except IntegrityError:
        return api_error("An account with that email already exists.", 409)
    request.session.flush()
    request.session["user_id"] = user.id
    return JsonResponse({"authenticated": True, "user": {
        "name": user.name,
        "email": user.email,
        "is_admin": is_video_studio_admin(user),
    }}, status=201)


@require_POST
def login_view(request):
    data = json_body(request)
    if data is None:
        return api_error("Send a valid JSON sign-in request.")
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    user = User.objects.filter(email=email).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return api_error("Email or password is incorrect.", 401)
    request.session.flush()
    request.session["user_id"] = user.id
    return JsonResponse({"authenticated": True, "user": {
        "name": user.name,
        "email": user.email,
        "is_admin": is_video_studio_admin(user),
    }})


@require_POST
@login_required_api
def logout_view(request):
    request.session.flush()
    return JsonResponse({"success": True})


@require_GET
@video_admin_required
def video_studio_access(request):
    return JsonResponse({
        "authorized": True,
        "external_video_available": os.environ.get("VTAPER_VIDEO_API_URL", "").strip().startswith("https://"),
    })


@require_POST
@video_admin_required
def generate_external_video(request):
    endpoint = os.environ.get("VTAPER_VIDEO_API_URL", "").strip()
    parsed = urlsplit(endpoint)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment:
        return api_error("Advanced AI video generation is not configured. Use local browser rendering instead.", 503)

    data = json_body(request)
    if data is None:
        return api_error("Send a valid JSON video request.")
    categories = {"Chest", "Back", "Arms", "Shoulders", "Abs", "Legs", "Full body"}
    templates = {"showcase", "workout", "advertisement"}
    aspect_ratios = {"9:16", "4:5", "1:1"}
    category = str(data.get("category", ""))
    exercise = str(data.get("exercise", "")).strip()
    template = str(data.get("template", ""))
    aspect_ratio = str(data.get("aspect_ratio", ""))
    try:
        duration = int(data.get("duration_seconds", 0))
    except (TypeError, ValueError):
        return api_error("Choose a valid video duration.")
    if category not in categories or template not in templates or aspect_ratio not in aspect_ratios or not exercise or len(exercise) > 120 or not 1 <= duration <= 60:
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
    return JsonResponse({"success": True, "provider_response": provider_response})


@require_GET
def exercises(request):
    return JsonResponse({"exercises": EXERCISES})


@require_POST
@login_required_api
def routine(request):
    data = json_body(request)
    if data is None:
        return api_error("Send a valid routine request.")
    try:
        result = build_routine(data)
    except (ValueError, TypeError):
        return api_error("Please provide a valid training duration.")
    if not result["needs_guidance"]:
        user = request.current_user
        user.experience = str(data.get("experience", "Beginner"))[:24]
        user.preferences = {
            "muscles": data.get("muscles", []),
            "equipment": data.get("equipment", []),
            "focus": data.get("focus", "Full body"),
        }
        user.save(update_fields=["experience", "preferences"])
    return JsonResponse(result)


@require_POST
@login_required_api
def complete_workout(request):
    data = json_body(request)
    if data is None:
        return api_error("Send a valid workout request.")
    workout_exercises = data.get("exercises", [])
    if not isinstance(workout_exercises, list) or not workout_exercises or len(workout_exercises) > 20:
        return api_error("A workout with 1–20 exercises is required.")
    try:
        duration = max(1, min(int(data.get("duration", 1)), 240))
    except (ValueError, TypeError):
        return api_error("Enter a valid workout duration.")
    workout = Workout.objects.create(
        user_id=request.current_user.id,
        title=str(data.get("title", "Training session"))[:120],
        focus=str(data.get("focus", "Full body"))[:60],
        duration_minutes=duration,
        exercises=workout_exercises,
        feedback=str(data.get("feedback", ""))[:500],
    )
    return JsonResponse({"success": True, "id": workout.id}, status=201)


@require_GET
@login_required_api
def progress(request):
    user = request.current_user
    rows = list(Workout.objects.filter(user_id=user.id).order_by("-completed_at")[:100])
    now = timezone.now()
    week = [workout for workout in rows if workout.completed_at and workout.completed_at >= now - timedelta(days=7)]
    training_dates = {workout.completed_at.date() for workout in rows if workout.completed_at}
    cursor = now.date() if now.date() in training_dates else now.date() - timedelta(days=1)
    streak = 0
    while cursor in training_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return JsonResponse({
        "sessions": [{
            "id": workout.id,
            "title": workout.title,
            "focus": workout.focus,
            "duration": workout.duration_minutes,
            "exercises": workout.exercises or [],
            "completed_at": workout.completed_at.isoformat() if workout.completed_at else None,
        } for workout in rows],
        "total_sessions": Workout.objects.filter(user_id=user.id).count(),
        "minutes_this_week": sum(workout.duration_minutes or 0 for workout in week),
        "sessions_this_week": len(week),
        "streak": streak,
    })


@require_GET
@login_required_api
def camera_privacy(request):
    return JsonResponse({
        "processing": "browser-only",
        "recording": False,
        "uploads": False,
        "permission_required": True,
        "message": "Camera permission is requested only after explicit user action. Frames and pose landmarks are not sent to the Django server.",
    })


@require_POST
@login_required_api
def commander(request):
    data = json_body(request)
    if data is None:
        return api_error("Send a valid message for COMMANDER.")
    text = str(data.get("message", "")).strip()[:500].lower()
    if not text:
        return api_error("Write a message for COMMANDER.")
    reply = next((answer for pattern, answer in COMMANDER_RESPONSES if re.search(pattern, text)), "I’m here to support thoughtful, sustainable training. Ask about movement, recovery, or your routine—or open the generator to build a personal session.")
    return JsonResponse({"reply": reply})


@require_GET
def martial_arts(request):
    return JsonResponse({
        "disciplines": MARTIAL_ARTS,
        "safety": "These are solo, non-contact movement and fitness drills. Learn martial arts techniques with a qualified instructor in a supervised setting. No partner drills, sparring, throws, or strikes are included.",
    })
