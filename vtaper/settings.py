import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
IS_VERCEL = os.environ.get("VERCEL") == "1"
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-this-before-deploying")
if IS_VERCEL and SECRET_KEY == "dev-only-change-this-before-deploying":
    raise RuntimeError("Set a unique SECRET_KEY in Vercel project environment variables.")

DEBUG = os.environ.get("DJANGO_DEBUG", "0" if IS_VERCEL else "1") == "1"
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver", ".vercel.app", ".v0.build"]
if os.environ.get("VERCEL_URL"):
    ALLOWED_HOSTS.append(os.environ["VERCEL_URL"].split(":")[0])
ALLOWED_HOSTS.extend(host.strip() for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if host.strip())

INSTALLED_APPS = [
    "django.contrib.staticfiles",
    "fitness.apps.FitnessConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "fitness.middleware.SecurityHeadersMiddleware",
]

ROOT_URLCONF = "vtaper.urls"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.template.context_processors.static",
    ]},
}]
WSGI_APPLICATION = "vtaper.wsgi.application"

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if DATABASE_URL:
    if DATABASE_URL.startswith("postgresql+psycopg://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://", 1)
    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600, ssl_require=IS_VERCEL)}
else:
    database_path = Path("/tmp/vytron.db") if IS_VERCEL else BASE_DIR / "data" / "vytron.db"
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": database_path}}

SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"
SESSION_COOKIE_NAME = "session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = IS_VERCEL
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = IS_VERCEL
CSRF_TRUSTED_ORIGINS = ["https://*.vercel.app", "https://*.v0.build"]
if os.environ.get("VERCEL_URL"):
    CSRF_TRUSTED_ORIGINS.append(f"https://{os.environ['VERCEL_URL'].split(':')[0]}")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_HSTS_SECONDS = 63072000 if IS_VERCEL else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
X_FRAME_OPTIONS = "SAMEORIGIN"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = False

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
WHITENOISE_USE_FINDERS = True
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"
