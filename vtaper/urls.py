from django.urls import path

from fitness import views

urlpatterns = [
    path("", views.home, name="home"),
    path("api/me", views.me, name="me"),
    path("api/register", views.register, name="register"),
    path("api/login", views.login_view, name="login"),
    path("api/logout", views.logout_view, name="logout"),
    path("api/admin/video-studio-access", views.video_studio_access, name="video-studio-access"),
    path("api/admin/video-studio/generate", views.generate_external_video, name="video-studio-generate"),
    path("api/exercises", views.exercises, name="exercises"),
    path("api/routines", views.routine, name="routine"),
    path("api/workouts", views.complete_workout, name="complete-workout"),
    path("api/progress", views.progress, name="progress"),
    path("api/camera/privacy", views.camera_privacy, name="camera-privacy"),
    path("api/commander", views.commander, name="commander"),
    path("api/martial-arts", views.martial_arts, name="martial-arts"),
]
