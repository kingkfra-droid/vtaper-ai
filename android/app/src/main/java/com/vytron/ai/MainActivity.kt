package com.vytron.ai

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {
    private var webView: WebView? = null
    private var appUrl: String? = null
    private var pendingCameraRequest: PermissionRequest? = null

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val request = pendingCameraRequest
            pendingCameraRequest = null
            if (granted && request != null && isSameOrigin(request.origin.toString(), appUrl)) {
                request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
            } else {
                request?.deny()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(9, 9, 15)
        window.navigationBarColor = Color.rgb(9, 9, 15)

        val savedUrl = getSharedPreferences(PREFERENCES, MODE_PRIVATE)
            .getString(APP_URL_KEY, null)
        val configuredUrl = normalizeUrl(savedUrl ?: BuildConfig.WEB_APP_URL)
        if (configuredUrl == null) {
            showUrlSetup(savedUrl.orEmpty())
        } else {
            openApp(configuredUrl)
        }
    }

    private fun showUrlSetup(value: String, error: String? = null) {
        appUrl = null
        val screen = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(24), dp(28), dp(24), dp(28))
            setBackgroundColor(Color.rgb(9, 9, 15))
        }
        screen.addView(TextView(this).apply {
            text = "VYTRON AI"
            setTextColor(Color.rgb(183, 154, 255))
            textSize = 14f
            letterSpacing = 0.12f
        })
        screen.addView(TextView(this).apply {
            text = "Connect your training space"
            setTextColor(Color.WHITE)
            textSize = 26f
            setPadding(0, dp(18), 0, dp(8))
        })
        screen.addView(TextView(this).apply {
            text = "Enter the HTTPS address where your VYTRON web app is running. Local development on this device may use http://localhost."
            setTextColor(Color.rgb(168, 164, 183))
            textSize = 14f
        })
        val address = EditText(this).apply {
            setSingleLine(true)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_URI
            hint = "https://your-vytron-site.example"
            setText(value)
            setTextColor(Color.WHITE)
            setHintTextColor(Color.rgb(130, 126, 145))
            setPadding(dp(12), dp(12), dp(12), dp(12))
            setBackgroundColor(Color.rgb(24, 22, 33))
        }
        screen.addView(address, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(20) })
        val message = TextView(this).apply {
            text = error.orEmpty()
            setTextColor(Color.rgb(255, 143, 143))
            textSize = 13f
            setPadding(0, dp(8), 0, 0)
        }
        screen.addView(message)
        screen.addView(Button(this).apply {
            text = "Open VYTRON"
            setOnClickListener {
                val url = normalizeUrl(address.text.toString())
                if (url == null) {
                    message.text = "Enter a valid HTTPS address, or a localhost address for local development."
                } else {
                    getSharedPreferences(PREFERENCES, MODE_PRIVATE)
                        .edit()
                        .putString(APP_URL_KEY, url)
                        .apply()
                    openApp(url)
                }
            }
        }, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(16) })
        setContentView(screen)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun openApp(url: String) {
        appUrl = url
        val page = webView ?: WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                    if (url != "about:blank" && !isSameOrigin(url, appUrl)) {
                        view.stopLoading()
                        Toast.makeText(
                            this@MainActivity,
                            "Blocked navigation outside the configured VYTRON site.",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }

                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean {
                    val target = request.url.toString()
                    if (isSameOrigin(target, appUrl)) return false
                    if (request.isForMainFrame && request.url.scheme == "https") {
                        val intent = Intent(Intent.ACTION_VIEW, request.url)
                        if (intent.resolveActivity(packageManager) != null) {
                            startActivity(intent)
                        } else {
                            Toast.makeText(
                                this@MainActivity,
                                "No browser is available to open this link.",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                    return true
                }

                override fun onReceivedError(
                    view: WebView,
                    request: WebResourceRequest,
                    error: WebResourceError
                ) {
                    if (request.isForMainFrame) {
                        Toast.makeText(
                            this@MainActivity,
                            "Could not load VYTRON: ${error.description}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    runOnUiThread {
                        val canUseCamera = request.resources.contains(
                            PermissionRequest.RESOURCE_VIDEO_CAPTURE
                        ) && isSameOrigin(request.origin.toString(), appUrl)
                        if (!canUseCamera) {
                            request.deny()
                        } else if (ContextCompat.checkSelfPermission(
                                this@MainActivity,
                                Manifest.permission.CAMERA
                            ) == PackageManager.PERMISSION_GRANTED
                        ) {
                            request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
                        } else {
                            pendingCameraRequest?.deny()
                            pendingCameraRequest = request
                            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                        }
                    }
                }

                override fun onPermissionRequestCanceled(request: PermissionRequest) {
                    if (pendingCameraRequest === request) pendingCameraRequest = null
                }
            }
        }.also {
            webView = it
            android.webkit.CookieManager.getInstance().setAcceptCookie(true)
        }

        val screen = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(9, 9, 15))
        }
        val toolbar = LinearLayout(this).apply {
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), dp(4), dp(8), dp(4))
        }
        toolbar.addView(TextView(this).apply {
            text = "VYTRON AI"
            setTextColor(Color.rgb(183, 154, 255))
            textSize = 14f
            letterSpacing = 0.08f
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        toolbar.addView(Button(this).apply {
            text = "Change address"
            setOnClickListener { showUrlSetup(appUrl.orEmpty()) }
        })
        screen.addView(toolbar)
        screen.addView(page, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f
        ))
        setContentView(screen)
        page.loadUrl(url)
    }

    private fun normalizeUrl(value: String): String? {
        val uri = Uri.parse(value.trim())
        val host = uri.host?.lowercase() ?: return null
        val isHttps = uri.scheme.equals("https", ignoreCase = true)
        val isLocalDevelopment = uri.scheme.equals("http", ignoreCase = true) &&
            host in setOf("localhost", "127.0.0.1")
        if ((!isHttps && !isLocalDevelopment) || uri.userInfo != null) return null
        return uri.buildUpon().fragment(null).build().toString().trimEnd('/')
            .takeIf { it.isNotBlank() }
    }

    private fun isSameOrigin(first: String, second: String?): Boolean {
        val firstUri = Uri.parse(first)
        val secondUri = Uri.parse(second ?: return false)
        return firstUri.scheme.equals(secondUri.scheme, ignoreCase = true) &&
            firstUri.host.equals(secondUri.host, ignoreCase = true) &&
            firstUri.port == secondUri.port
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onBackPressed() {
        val page = webView
        if (appUrl != null && page?.canGoBack() == true) {
            page.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onPause() {
        webView?.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView?.onResume()
    }

    override fun onDestroy() {
        pendingCameraRequest?.deny()
        pendingCameraRequest = null
        webView?.apply {
            stopLoading()
            loadUrl("about:blank")
            clearHistory()
            removeAllViews()
            destroy()
        }
        webView = null
        super.onDestroy()
    }

    private companion object {
        const val PREFERENCES = "vytron_webview"
        const val APP_URL_KEY = "web_app_url"
    }
}
