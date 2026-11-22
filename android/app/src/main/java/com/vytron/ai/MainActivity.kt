package com.vytron.ai

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

private val Ink = Color(0xFF0B0B12)
private val Panel = Color(0xFF151520)
private val Violet = Color(0xFFA78BFA)
private val Muted = Color(0xFFAAA9B8)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(11, 11, 18)
        window.navigationBarColor = android.graphics.Color.rgb(11, 11, 18)
        setContent {
                MaterialTheme(colorScheme = darkColorScheme(primary = Violet, background = Ink, surface = Panel, onSurface = Color.White)) {
                    Surface(modifier = Modifier.fillMaxSize(), color = Ink) {

                    VytronApp(ApiClient(BuildConfig.API_BASE_URL))
                }
            }
        }
    }
}

@Composable
private fun VytronApp(api: ApiClient) {
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var userName by remember { mutableStateOf("") }
    var authenticated by remember { mutableStateOf(false) }
    var registerMode by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableStateOf("Overview") }
    var routine by remember { mutableStateOf<JSONObject?>(null) }
    var exercises by remember { mutableStateOf<JSONArray?>(null) }
    var progress by remember { mutableStateOf<JSONObject?>(null) }

    fun runRequest(action: suspend () -> Unit) {
        scope.launch {
            loading = true
            error = ""
            try {
                action()
            } catch (exception: Exception) {
                error = exception.message ?: "Could not connect. Check the backend URL and your connection."
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(api) {
        if (api.isConfigured()) {
            runRequest {
                val result = withContext(Dispatchers.IO) { api.me() }
                authenticated = result.optBoolean("authenticated")
                userName = result.optJSONObject("user")?.optString("name").orEmpty()
            }
        }
    }

    if (!authenticated) {
        AuthScreen(
            registerMode = registerMode,
            loading = loading,
            error = error,
            configured = api.isConfigured(),
            onSubmit = { name, email, password ->
                runRequest {
                    val result = withContext(Dispatchers.IO) {
                        if (registerMode) api.register(name, email, password) else api.signIn(email, password)
                    }
                    userName = result.optJSONObject("user")?.optString("name") ?: name
                    authenticated = true
                }
            },
            onToggleMode = { registerMode = !registerMode; error = "" }
        )
        return
    }

    Column(modifier = Modifier.fillMaxSize().background(Ink)) {
        Column(modifier = Modifier.weight(1f).fillMaxWidth()) {
            Header(userName, onSignOut = {
                runRequest {
                    withContext(Dispatchers.IO) { api.signOut() }
                    authenticated = false
                    userName = ""
                    routine = null
                }
            })
            when (selectedTab) {
                "Library" -> ExerciseLibrary(
                    exercises = exercises,
                    loading = loading,
                    onLoad = { runRequest { exercises = withContext(Dispatchers.IO) { api.exercises() } } }
                )
                "Progress" -> ProgressScreen(
                    progress = progress,
                    loading = loading,
                    onLoad = { runRequest { progress = withContext(Dispatchers.IO) { api.progress() } } }
                )
                else -> TrainingScreen(
                    routine = routine,
                    loading = loading,
                    onGenerate = { minutes, focus -> runRequest { routine = withContext(Dispatchers.IO) { api.createRoutine(minutes, focus) } } },
                    onComplete = { data -> runRequest { withContext(Dispatchers.IO) { api.completeWorkout(data) }; routine = null; selectedTab = "Progress"; progress = withContext(Dispatchers.IO) { api.progress() } } }
                )
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth().background(Panel).padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            listOf("Overview", "Library", "Progress").forEach { tab ->
                TextButton(onClick = { selectedTab = tab }) {
                    Text(tab, color = if (selectedTab == tab) Violet else Muted, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
    if (error.isNotBlank() && api.isConfigured()) ErrorBanner(error)
}

@Composable
private fun AuthScreen(
    registerMode: Boolean,
    loading: Boolean,
    error: String,
    configured: Boolean,
    onSubmit: (String, String, String) -> Unit,
    onToggleMode: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    Column(
        modifier = Modifier.fillMaxSize().background(Ink).padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text("VYTRON AI", color = Violet, fontSize = 15.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
        Spacer(Modifier.height(18.dp))
        Text(if (registerMode) "Start with a plan." else "Your strength.\nBy design.", color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Bold, lineHeight = 40.sp)
        Spacer(Modifier.height(8.dp))
        Text("Private training intelligence, at your pace.", color = Muted)
        Spacer(Modifier.height(28.dp))
        if (registerMode) {
            OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(10.dp))
        }
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), singleLine = true, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password (10+ characters)") }, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), singleLine = true, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = { onSubmit(name, email, password) },
            enabled = !loading && configured,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Violet, contentColor = Ink),
            shape = RoundedCornerShape(14.dp)
        ) {
            if (loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Ink, strokeWidth = 2.dp)
            else Text(if (registerMode) "Create account" else "Sign in", fontWeight = FontWeight.Bold)
        }
        TextButton(onClick = onToggleMode, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text(if (registerMode) "Already have an account? Sign in" else "New to VYTRON? Create an account", color = Violet)
        }
        if (!configured) {
            Text("Set your deployed HTTPS API URL when building: -PapiBaseUrl=https://your-domain", color = Muted, fontSize = 13.sp)
        }
        if (error.isNotBlank()) Text(error, color = Color(0xFFFF8A8A), modifier = Modifier.padding(top = 10.dp))
    }
}

@Composable
private fun Header(name: String, onSignOut: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column {
            Text("VYTRON AI", color = Violet, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
            Text("TRAINING COMMAND", color = Muted, fontSize = 11.sp, letterSpacing = 1.sp)
        }
        TextButton(onClick = onSignOut) { Text(name.ifBlank { "Sign out" }, color = Muted) }
    }
}

@Composable
private fun TrainingScreen(
    routine: JSONObject?,
    loading: Boolean,
    onGenerate: (Int, String) -> Unit,
    onComplete: (JSONObject) -> Unit
) {
    var minutes by remember { mutableIntStateOf(20) }
    var focus by remember { mutableStateOf("Full body") }
    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Text("OVERVIEW / 01", color = Muted, fontSize = 12.sp, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(8.dp))
        Text("Build your\nroutine.", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold, lineHeight = 37.sp)
        Spacer(Modifier.height(8.dp))
        Text("A plan built around your time and goals.", color = Muted)
        Spacer(Modifier.height(20.dp))
        CardSurface {
            Text("SESSION LENGTH", color = Muted, fontSize = 11.sp, letterSpacing = 1.2.sp)
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = { minutes = (minutes - 5).coerceAtLeast(10) }) { Text("−", color = Violet) }
                Text("$minutes min", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                OutlinedButton(onClick = { minutes = (minutes + 5).coerceAtMost(60) }) { Text("+", color = Violet) }
            }
            Spacer(Modifier.height(14.dp))
            OutlinedTextField(value = focus, onValueChange = { focus = it }, label = { Text("Focus") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = { onGenerate(minutes, focus) }, enabled = !loading,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Violet, contentColor = Ink),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (loading) CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Ink, strokeWidth = 2.dp)
                else Text("Generate routine", fontWeight = FontWeight.Bold)
            }
        }
        if (routine != null) {
            Spacer(Modifier.height(16.dp))
            Text(routine.optString("message"), color = Muted, fontSize = 13.sp)
            val plan = routine.optJSONArray("exercises") ?: JSONArray()
            LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(plan.length()) { index -> ExerciseCard(plan.optJSONObject(index) ?: JSONObject()) }
                item {
                    Button(
                        onClick = { onComplete(routine) }, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Violet, contentColor = Ink)
                    ) { Text("Save completed session", fontWeight = FontWeight.Bold) }
                }
            }
        } else {
            Spacer(Modifier.height(16.dp))
            Text("Start with one small decision. Take breaks whenever you need them.", color = Muted, fontSize = 14.sp)
        }
    }
}

@Composable
private fun ExerciseLibrary(exercises: JSONArray?, loading: Boolean, onLoad: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Text("MOVEMENT LIBRARY / 02", color = Muted, fontSize = 12.sp, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(8.dp))
        Text("Move with\nawareness.", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold, lineHeight = 37.sp)
        Spacer(Modifier.height(12.dp))
        if (exercises == null) {
            Button(onClick = onLoad, enabled = !loading, colors = ButtonDefaults.buttonColors(containerColor = Violet, contentColor = Ink)) {
                Text(if (loading) "Loading…" else "Load exercises")
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(exercises.length()) { index -> ExerciseCard(exercises.optJSONObject(index) ?: JSONObject()) }
            }
        }
    }
}

@Composable
private fun ProgressScreen(progress: JSONObject?, loading: Boolean, onLoad: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Text("TRAINING HISTORY / 03", color = Muted, fontSize = 12.sp, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(8.dp))
        Text("Progress,\nnot pressure.", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold, lineHeight = 37.sp)
        Spacer(Modifier.height(18.dp))
        if (progress == null) {
            Button(onClick = onLoad, enabled = !loading, colors = ButtonDefaults.buttonColors(containerColor = Violet, contentColor = Ink)) {
                Text(if (loading) "Loading…" else "Load progress")
            }
        } else {
            CardSurface {
                Metric("Sessions", progress.optInt("total_sessions").toString())
                Metric("This week", "${progress.optInt("sessions_this_week")} sessions")
                Metric("Minutes this week", progress.optInt("minutes_this_week").toString())
                Metric("Current streak", "${progress.optInt("streak")} days")
            }
            Spacer(Modifier.height(14.dp))
            Text("RECENT SESSIONS", color = Muted, fontSize = 11.sp, letterSpacing = 1.2.sp)
            Spacer(Modifier.height(8.dp))
            val sessions = progress.optJSONArray("sessions") ?: JSONArray()
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(sessions.length()) { index ->
                    val session = sessions.optJSONObject(index) ?: JSONObject()
                    CardSurface {
                        Text(session.optString("title", "Training session"), color = Color.White, fontWeight = FontWeight.SemiBold)
                        Text("${session.optString("focus")} · ${session.optInt("duration")} min", color = Muted, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ExerciseCard(exercise: JSONObject) {
    CardSurface {
        Text(exercise.optString("name", "Movement"), color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(Modifier.height(4.dp))
        Text("${exercise.optString("reps")} · ${exercise.optString("equipment")}", color = Violet, fontSize = 12.sp)
        Spacer(Modifier.height(6.dp))
        Text(exercise.optString("how"), color = Muted, fontSize = 13.sp, lineHeight = 19.sp)
        if (exercise.optString("cue").isNotBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(exercise.optString("cue"), color = Color(0xFFC8C6D5), fontSize = 12.sp)
        }
    }
}

@Composable
private fun CardSurface(content: @Composable () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(18.dp)).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) { content() }
}

@Composable
private fun Metric(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 9.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = Muted)
        Text(value, color = Color.White, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ErrorBanner(message: String) {
    Surface(color = Color(0xFF351D25), modifier = Modifier.fillMaxWidth()) {
        Text(message, color = Color(0xFFFFB2B2), modifier = Modifier.padding(14.dp), fontSize = 13.sp)
    }
}
