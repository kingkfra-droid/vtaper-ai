import os


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["X-Content-Type-Options"] = "nosniff"
        response["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()"
        if os.environ.get("VERCEL") == "1" or request.is_secure():
            response["Strict-Transport-Security"] = "max-age=63072000"
        return response
