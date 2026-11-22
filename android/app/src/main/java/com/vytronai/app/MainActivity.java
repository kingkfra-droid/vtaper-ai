package ai.vytron.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.Arrays;

public final class MainActivity extends Activity {
    private static final String APP_URL = "https://vtaper-ai.vercel.app";
    private static final String APP_HOST = "vtaper-ai.vercel.app";
    private static final int CAMERA_PERMISSION_REQUEST = 3207;

    private WebView webView;
    private PermissionRequest pendingCameraRequest;
    private ValueCallback<Uri[]> pendingFileChooser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(9, 9, 15));
        getWindow().setNavigationBarColor(Color.rgb(9, 9, 15));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9, 9, 15));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equalsIgnoreCase(uri.getScheme()) && APP_HOST.equalsIgnoreCase(uri.getHost())) {
                    return false;
                }
                openExternal(uri);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    view.loadDataWithBaseURL(APP_URL,
                        "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
                        "<body style='background:#09090f;color:#f3f0fa;font:16px sans-serif;padding:32px'>" +
                        "<h2>VYTRON AI is temporarily unavailable</h2>" +
                        "<p>Check your internet connection and try again.</p>" +
                        "<button onclick='location.href=\"" + APP_URL + "\"'>Retry</button></body>",
                        "text/html", "UTF-8", null);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                pendingFileChooser = callback;
                Intent picker = new Intent(Intent.ACTION_GET_CONTENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("image/*");
                try {
                    startActivityForResult(Intent.createChooser(picker, "Choose a private image preview"), 3208);
                    return true;
                } catch (Exception error) {
                    pendingFileChooser = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> grantCameraOnlyForApp(request));
            }
        });

        setContentView(webView, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        webView.loadUrl(APP_URL);
    }

    private void grantCameraOnlyForApp(PermissionRequest request) {
        String host = request.getOrigin().getHost();
        String[] resources = request.getResources();
        boolean requestsCamera = Arrays.asList(resources).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
        boolean requestsUnsupportedResource = Arrays.stream(resources)
            .anyMatch(resource -> !PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource));
        if (!APP_HOST.equalsIgnoreCase(host) || !requestsCamera || requestsUnsupportedResource) {
            request.deny();
            return;
        }

        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            return;
        }

        pendingCameraRequest = request;
        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != CAMERA_PERMISSION_REQUEST || pendingCameraRequest == null) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            pendingCameraRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else {
            pendingCameraRequest.deny();
        }
        pendingCameraRequest = null;
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            // Leave unsupported links inside the app's error flow rather than crashing the WebView.
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 3208 && pendingFileChooser != null) {
            Uri[] result = resultCode == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(resultCode, data) : null;
            pendingFileChooser.onReceiveValue(result);
            pendingFileChooser = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        pendingCameraRequest = null;
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
