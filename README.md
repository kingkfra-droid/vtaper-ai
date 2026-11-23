# VTaper AI

VTaper AI is a Django fitness-coaching application with secure accounts, routine generation, guided sessions, an interactive 3D muscle coach, a browser-based marketing video studio, a movement library, local-first camera pose feedback, and private workout history.

## Run locally

1. Install Python 3.10+.
2. Create and activate a virtual environment, then install dependencies from `requirements.txt`.
3. Set a unique `SECRET_KEY` in your environment before running the app.
4. Run `python manage.py runserver` and open `http://localhost:8000`.

Local workout history is stored in `data/vytron.db`. Django maps the existing `user` and `workout` tables without changing their schema; legacy accounts and workout history remain available. On a brand-new empty database, the WSGI entrypoint creates either missing table without migrations. Do not commit that database or secrets.

## Deploy to Vercel

1. Import the repository into Vercel and select the Python runtime. Vercel detects the Django project from `manage.py`, uses `vtaper.wsgi`, and collects static files for its CDN.
2. Add a strong, random `SECRET_KEY` to the Vercel project settings for Production, Preview, and Development. Do not use the development fallback.
3. Deploy. Camera access is available only in secure contexts (HTTPS or localhost); users must explicitly enable it in Camera Coach.
4. For an account or workout database that must persist across serverless invocations, configure `DATABASE_URL` to a persistent PostgreSQL database. Django uses SQLite at `data/vytron.db` locally and a temporary `/tmp/vytron.db` on Vercel when no database URL is configured.

**Vercel storage caveat:** Vercel Functions are stateless. A SQLite file on `/tmp` is temporary, instance-local, and may disappear between invocations; it is not a durable multi-user production database. The default keeps the SQLite-based app runnable on Vercel but is suitable only for preview/demo use. Configure a persistent database URL before real user accounts or progress data are used in production. Do not point `DATABASE_URL` at the checked-out repository: deployed function filesystems are not writable for persistent data.

## Privacy and safety

- Passwords are stored as Werkzeug-generated salted password hashes, never as plaintext.
- Workout records and preferences are scoped to the authenticated account.
- Camera permission is requested only after the user selects **Enable camera** or **Scan surroundings**. Pose landmarks and optional common-object detection run in the browser; camera frames are not uploaded to Django, the model hosts, or recorded. The MediaPipe runtime and models download on demand. Environment labels (such as a confidently detected chair or bench) are approximate; users confirm equipment before routine generation.
- The demo mode is explicitly labeled synthetic and does not claim to analyze live movement. Pose availability depends on browser support, GPU, and network access.
- The interactive 3D Coach is an educational Three.js muscle explorer. It supports muscle selection, recommendations, view controls, drag rotation, and zoom where WebGL2 is available; the exercise library remains available as a fallback. It is not a live biomechanics assessment.
- The martial arts library covers 12 traditions with beginner-friendly, solo, non-contact movement drills; it omits partner work, sparring, throws, and strikes. Learn technical skills with a qualified instructor.
- Movement guidance is general education, not medical advice. Stop for pain or feeling unwell; consult a qualified professional about limitations.

## Vercel environment variables

- `SECRET_KEY` — required, unique and secret.
- `DATABASE_URL` — optional persistent PostgreSQL URL for durable production data.
- `VTAPER_ADMIN_EMAILS` — comma-separated, normalized email allowlist for Video Studio administrators. Access is denied to everyone when unset; configure only trusted admin accounts.
- `VTAPER_VIDEO_API_URL` — optional HTTPS endpoint for an external JSON video-generation adapter; the endpoint receives the selected template, exercise, aspect ratio, duration, and a scene prompt. Provider responses may include `video_url` or `job_id`.
- `VTAPER_VIDEO_API_KEY` — optional bearer credential for the configured video endpoint. Keep it in server environment variables, never in browser code.
- `VERCEL=1` — automatically provided by Vercel; enables secure cookies and the temporary SQLite fallback.

The Marketing Studio renders Three.js scenes locally and exports MP4 when the browser supports it, otherwise WebM. It does not claim to use an external AI video provider. Promotional caption suggestions are editable templates, not AI-generated text. Admin access is checked by Django using `VTAPER_ADMIN_EMAILS`; hiding the client controls is not the security boundary.
