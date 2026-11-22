package com.vytron.ai

import org.json.JSONArray
import org.json.JSONObject
import java.net.CookieHandler
import java.net.CookieManager as JavaCookieManager
import java.net.CookiePolicy
import java.net.HttpURLConnection
import java.net.URL

class ApiClient(private val baseUrl: String) {
    private val cookieManager = (CookieHandler.getDefault() as? JavaCookieManager)
        ?: JavaCookieManager(null, CookiePolicy.ACCEPT_ALL).also { CookieHandler.setDefault(it) }

    fun isConfigured(): Boolean = baseUrl.startsWith("https://") && !baseUrl.contains("example.com")

    fun request(method: String, path: String, body: JSONObject? = null): JSONObject {
        val connection = (URL("$baseUrl$path").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 12_000
            readTimeout = 18_000
            setRequestProperty("Accept", "application/json")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
        }

        try {
            if (body != null) connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val response = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val json = if (response.isBlank()) JSONObject() else JSONObject(response)
            if (status !in 200..299) throw ApiException(json.optString("error", "Request failed ($status)."))
            return json
        } finally {
            connection.disconnect()
        }
    }

    fun signIn(email: String, password: String) = request("POST", "/api/login", JSONObject().apply {
        put("email", email)
        put("password", password)
        put("remember", true)
    })

    fun register(name: String, email: String, password: String) = request("POST", "/api/register", JSONObject().apply {
        put("name", name)
        put("email", email)
        put("password", password)
    })

    fun me() = request("GET", "/api/me")

    fun signOut() {
        request("POST", "/api/logout", JSONObject())
        cookieManager.cookieStore.removeAll()
    }

    fun exercises(): JSONArray = request("GET", "/api/exercises").optJSONArray("exercises") ?: JSONArray()

    fun createRoutine(minutes: Int, focus: String): JSONObject = request("POST", "/api/routines", JSONObject().apply {
        put("minutes", minutes)
        put("focus", focus)
        put("experience", "Beginner")
        put("equipment", JSONArray().put("No equipment"))
    })

    fun progress(): JSONObject = request("GET", "/api/progress")

    fun completeWorkout(routine: JSONObject) = request("POST", "/api/workouts", JSONObject().apply {
        put("title", "VYTRON training session")
        put("focus", routine.optString("focus", "Full body"))
        put("duration", routine.optInt("duration", 20))
        put("exercises", routine.optJSONArray("exercises") ?: JSONArray())
    })
}

class ApiException(message: String) : Exception(message)
