import os
from flask import Flask, jsonify, render_template, request
from flask_login import LoginManager
from config import Config
from models import db, User
from routes.auth import bp as auth_bp
from routes.workouts import bp as workouts_bp
from routes.progress import bp as progress_bp
from routes.camera import bp as camera_bp
from routes.commander import bp as commander_bp
from routes.martial_arts import bp as martial_arts_bp

app = Flask(__name__)
app.config.from_object(Config)
os.makedirs(os.path.join(os.path.dirname(__file__), "data"), exist_ok=True)
db.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = "home"
login_manager.session_protection = "strong"

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Sign in to access this feature."}), 401

for blueprint in (auth_bp, workouts_bp, progress_bp, camera_bp, commander_bp, martial_arts_bp):
    app.register_blueprint(blueprint)

with app.app_context():
    db.create_all()

@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
    if os.environ.get("VERCEL") == "1" or request.is_secure:
        response.headers["Strict-Transport-Security"] = "max-age=63072000"
    return response

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=False)
