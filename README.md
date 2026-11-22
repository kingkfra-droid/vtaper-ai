# VYTRON AI

VYTRON AI is a Flask fitness-coaching application with secure accounts, routine generation, guided sessions, a movement library, local-first camera pose feedback, and private workout history.

## Run locally

1. Install Python 3.10+.
2. Create and activate a virtual environment, then install dependencies from `requirements.txt`.
3. Set a unique `SECRET_KEY` in your environment before running the app.
4. Run `python app.py` and open `http://localhost:5000`.

Local workout history is stored in `data/vytron.db`. Do not commit that database or secrets. The application creates its tables automatically.

## Deploy to Vercel

1. Import the repository into Vercel and select the Python runtime. The included `vercel.json` routes requests to the Flask application in `app.py`.
2. Add a strong, random `SECRET_KEY` to the Vercel project settings for Production, Preview, and Development. Do not use the development fallback.
3. Deploy. Camera access is available only in secure contexts (HTTPS or localhost); users must explicitly enable it in Camera Coach.
4. For an account or workout database that must persist across serverless invocations, configure `DATABASE_URL` to a persistent SQLAlchemy-compatible database. SQLite is the default for local development and a temporary `/tmp/vytron.db` is used on Vercel when no database URL is configured.

**Vercel storage caveat:** Vercel Functions are stateless. A SQLite file on `/tmp` is temporary, instance-local, and may disappear between invocations; it is not a durable multi-user production database. The default keeps the SQLite-based app runnable on Vercel but is suitable only for preview/demo use. Configure a persistent database URL before real user accounts or progress data are used in production. Do not point `DATABASE_URL` at the checked-out repository: deployed function filesystems are not writable for persistent data.

## Privacy and safety

- Passwords are stored as Werkzeug-generated salted password hashes, never as plaintext.
- Workout records and preferences are scoped to the authenticated account.
- Camera permission is requested only after the user selects **Enable camera** or **Scan surroundings**. Pose landmarks and optional common-object detection run in the browser; camera frames are not uploaded to Flask, the model hosts, or recorded. The MediaPipe runtime and models download on demand. Environment labels (such as a confidently detected chair or bench) are approximate; users confirm equipment before routine generation.
- The demo mode is explicitly labeled synthetic and does not claim to analyze live movement. Pose availability depends on browser support, GPU, and network access.
- Guided sessions use a photorealistic 3D coach render in a perspective training studio, with idle motion, drag-to-rotate, and keyboard-accessible rotate controls. It is an instructional illustration, not a live biomechanics assessment.
- The martial arts library covers 12 traditions with beginner-friendly, solo, non-contact movement drills; it omits partner work, sparring, throws, and strikes. Learn technical skills with a qualified instructor.
- Movement guidance is general education, not medical advice. Stop for pain or feeling unwell; consult a qualified professional about limitations.

## Android APK

The Android project in `android/` is a lightweight WebView wrapper for the live `https://vtaper-ai.vercel.app` app. It requires an internet connection; authentication and workout storage remain on the server. Camera access is requested by Android only when the in-app user chooses to enable or scan with the camera.

A GitHub Actions workflow builds a debug-signed installable APK on pushes to the Android build branch or when manually dispatched. Download `vytron-ai-android-apk` from the workflow run's Artifacts section, then install it on Android (the device may ask you to allow this APK source). This debug APK is for direct testing and is not a Play Store release. The APK opens the production site and needs a reachable deployment plus internet access.

## Vercel environment variables

- `SECRET_KEY` — required, unique and secret.
- `DATABASE_URL` — optional persistent SQLAlchemy database URL for durable production data.
- `VERCEL=1` — automatically provided by Vercel; enables secure cookies and the temporary SQLite fallback.
