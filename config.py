import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-this-before-deploying")
    if os.environ.get("VERCEL") == "1" and SECRET_KEY == "dev-only-change-this-before-deploying":
        raise RuntimeError("Set a unique SECRET_KEY in Vercel project environment variables.")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", f"sqlite:////tmp/vytron.db" if os.environ.get("VERCEL") == "1" else f"sqlite:///{os.path.join(BASE_DIR, 'data', 'vytron.db')}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.environ.get("VERCEL", "0") == "1"
