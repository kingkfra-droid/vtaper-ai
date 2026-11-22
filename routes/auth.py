from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from models import User

bp = Blueprint("auth", __name__)

def api_error(message, status=400):
    return jsonify({"error": message}), status

@bp.get("/api/me")
def me():
    if not current_user.is_authenticated:
        return jsonify({"authenticated": False})
    return jsonify({"authenticated": True, "user": {"name": current_user.name, "email": current_user.email, "experience": current_user.experience, "preferences": current_user.preferences or {}}})

@bp.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    name, email, password = str(data.get("name", "")).strip(), str(data.get("email", "")).strip().lower(), str(data.get("password", ""))
    if len(name) < 2 or len(name) > 80 or "@" not in email or len(email) > 180 or len(password) < 10:
        return api_error("Enter a name, valid email, and password with at least 10 characters.")
    if User.query.filter_by(email=email).first():
        return api_error("An account with that email already exists.", 409)
    user = User(name=name, email=email)
    user.set_password(password)
    from models import db
    db.session.add(user)
    db.session.commit()
    login_user(user)
    return jsonify({"authenticated": True, "user": {"name": user.name, "email": user.email}}), 201

@bp.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    user = User.query.filter_by(email=str(data.get("email", "")).strip().lower()).first()
    if not user or not user.check_password(str(data.get("password", ""))):
        return api_error("Email or password is incorrect.", 401)
    login_user(user, remember=bool(data.get("remember", False)))
    return jsonify({"authenticated": True, "user": {"name": user.name, "email": user.email}})

@bp.post("/api/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"success": True})
