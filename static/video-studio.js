const FORMATS = {
  showcase: { title: "Meet Your 3D Fitness Coach", caption: "Meet your new training partner. Explore every muscle and find your next move with VTaper AI." },
  workout: { title: "Train Every Muscle", caption: "Train with intention. Follow a clear, focused movement and build strength at your own pace." },
  advertisement: { title: "The Future of Fitness Is Here", caption: "Personal training, reimagined. Discover workouts, progress tools, and your interactive 3D coach in VTaper AI." },
};
const PRESETS = {
  Chest: ["#ChestDay", "#PushUp", "#TrainWithPurpose"], Back: ["#BackWorkout", "#StrengthTraining", "#FitnessCoach"],
  Arms: ["#ArmWorkout", "#Biceps", "#FitnessMotivation"], Shoulders: ["#ShoulderWorkout", "#StrengthTraining", "#FitnessCoach"],
  Abs: ["#CoreWorkout", "#CoreStrength", "#TrainWithPurpose"], Legs: ["#LegDay", "#LowerBody", "#FitnessCoach"],
  "Full body": ["#FullBodyWorkout", "#DailyMovement", "#FitnessCoach"],
};
const EXERCISES_BY_CATEGORY = {
  Chest: ["Incline push-up", "Bench incline push-up", "Dumbbell floor press"], Back: ["Resistance-band row", "Bird dog", "Wall lat reach"],
  Arms: ["Self-resisted curl", "Light dumbbell curl", "Close wall press"], Shoulders: ["Arm circles", "Prone W raise", "Forearm wall press"],
  Abs: ["Dead bug", "Bent-knee side plank", "Standing cross-body march"], Legs: ["Chair squat", "Reverse lunge", "Standing calf raise"],
  "Full body": ["Chair squat", "Incline push-up", "Bird dog"],
};
let started = false;
let active;
let audioUrl;
let externalVideoAvailable = false;

const $ = (id) => document.getElementById(id);

function readOptions() {
  return {
    template: $("studioTemplate").value,
    category: $("studioCategory").value,
    exercise: $("studioExercise").value,
    ratio: $("studioPreset").value,
    duration: Number($("studioDuration").value),
    angle: $("studioAngle").value,
    appearance: $("studioAppearance").value,
    animation: $("studioAnimation").value,
    background: $("studioBackground").value,
    overlays: $("studioOverlays").checked,
  };
}

function refreshCopy() {
  const options = readOptions();
  const template = FORMATS[options.template];
  const title = options.template === "workout" ? `${template.title} · ${options.exercise}` : template.title;
  $("studioPreviewTitle").textContent = title;
  $("studioFormatLabel").textContent = options.ratio;
  const tags = PRESETS[options.category] || PRESETS["Full body"];
  $("studioHashtags").textContent = ["#VTaperAI", ...tags].join(" ");
  $("studioCaption").value = `${template.caption}\n\n${$("studioExercise").value} · ${options.duration}s\n${$("studioHashtags").textContent}`;
}

function updateExercises() {
  const select = $("studioExercise");
  const current = select.value;
  const names = EXERCISES_BY_CATEGORY[$("studioCategory").value] || EXERCISES_BY_CATEGORY["Full body"];
  select.innerHTML = names.map((name) => `<option>${name}</option>`).join("");
  if (names.includes(current)) select.value = current;
  refreshCopy();
}

function fitVideoPreview(ratio) {
  const frame = $("videoPreviewFrame");
  const [width, height] = ratio.split(":").map(Number);
  frame.style.aspectRatio = `${width} / ${height}`;
  $("studioFormatLabel").textContent = ratio;
}

function drawOverlay(context, canvas, options, elapsed) {
  if (!options.overlays) {
    context.fillStyle = "rgba(8,8,8,.82)";
    context.fillRect(12, canvas.height - 42, canvas.width - 24, 30);
    context.fillStyle = "#ffffff";
    context.font = "700 13px system-ui, sans-serif";
    context.fillText("VTAPER AI", 22, canvas.height - 22);
    return;
  }
  const fadeIn = Math.min(1, elapsed / 500);
  const top = context.createLinearGradient(0, 0, 0, canvas.height * 0.34);
  top.addColorStop(0, "rgba(10,10,9,.78)");
  top.addColorStop(1, "rgba(10,10,9,0)");
  context.fillStyle = top;
  context.fillRect(0, 0, canvas.width, canvas.height * 0.36);
  const title = FORMATS[options.template].title;
  const shortTitle = title.length > 27 ? `${title.slice(0, 25)}…` : title;
  context.globalAlpha = fadeIn;
  context.fillStyle = "#c4f05a";
  context.font = `700 ${Math.max(13, canvas.width * 0.037)}px system-ui, sans-serif`;
  context.fillText("VTAPER AI  /  FITNESS, REIMAGINED", canvas.width * 0.07, canvas.height * 0.11);
  context.fillStyle = "#ffffff";
  context.font = `800 ${Math.max(25, canvas.width * 0.076)}px system-ui, sans-serif`;
  context.fillText(shortTitle, canvas.width * 0.07, canvas.height * 0.18, canvas.width * 0.86);
  context.fillStyle = "#dedbd2";
  context.font = `500 ${Math.max(12, canvas.width * 0.035)}px system-ui, sans-serif`;
  context.fillText(`${options.category.toUpperCase()}  ·  ${options.exercise}`, canvas.width * 0.07, canvas.height * 0.225, canvas.width * 0.86);
  const bottom = context.createLinearGradient(0, canvas.height * 0.68, 0, canvas.height);
  bottom.addColorStop(0, "rgba(10,10,9,0)");
  bottom.addColorStop(1, "rgba(10,10,9,.86)");
  context.globalAlpha = 1;
  context.fillStyle = bottom;
  context.fillRect(0, canvas.height * 0.65, canvas.width, canvas.height * 0.35);
  context.fillStyle = "#c4f05a";
  context.font = `800 ${Math.max(15, canvas.width * 0.048)}px system-ui, sans-serif`;
  context.fillText("VTAPER AI", canvas.width * 0.07, canvas.height * 0.94);
  context.fillStyle = "#fff";
  context.font = `600 ${Math.max(10, canvas.width * 0.027)}px system-ui, sans-serif`;
  context.textAlign = "right";
  context.fillText("YOUR NEXT REP STARTS HERE", canvas.width * 0.93, canvas.height * 0.94);
  context.textAlign = "left";
}

function renderStatus(text) {
  $("studioStatus").textContent = text;
}

function revokeCurrentVideo() {
  if (active?.downloadUrl) URL.revokeObjectURL(active.downloadUrl);
  active = undefined;
  const externalPreview = $("studioExternalPreview");
  externalPreview.pause();
  externalPreview.removeAttribute("src");
  externalPreview.classList.add("hidden");
  $("studioPreviewCanvas").classList.remove("hidden");
  $("studioDownload").removeAttribute("href");
  $("studioDownload").setAttribute("aria-disabled", "true");
  $("studioDownload").classList.add("disabled");
}

function setupCanvasRenderer(THREE, outputCanvas, ratio) {
  const lowPower = Boolean(navigator.deviceMemory && navigator.deviceMemory <= 2) || window.matchMedia("(max-width: 720px), (prefers-reduced-motion: reduce)").matches;
  const dimensions = ratio === "9:16" ? [360, 640] : ratio === "4:5" ? [360, 450] : [480, 480];
  const [width, height] = dimensions;
  outputCanvas.width = width;
  outputCanvas.height = height;
  const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: false, powerPreference: "low-power", stencil: false, preserveDrawingBuffer: false });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x151512, 1);
  const scene = new THREE.Scene();
  const background = {
    studio: 0x171714,
    ember: 0x2d1913,
    lime: 0x192016,
    black: 0x080808,
  };
  scene.background = new THREE.Color(background[readOptions().background]);
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 30);
  camera.position.set(0, 0.32, 6.0);
  scene.add(new THREE.HemisphereLight(0xffe7d1, 0x211912, 2.1));
  const keyLight = new THREE.DirectionalLight(0xfff1e1, 2.6);
  keyLight.position.set(-3, 5, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xff7548, 1.6);
  rimLight.position.set(3, 2, -4);
  scene.add(rimLight);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshBasicMaterial({ color: 0x3b2a20, transparent: true, opacity: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.58;
  scene.add(floor);
  return { renderer, scene, camera, width, height, lowPower };
}

async function renderVideo() {
  revokeCurrentVideo();
  const options = readOptions();
  const canvas = $("studioPreviewCanvas");
  fitVideoPreview(options.ratio);
  $("studioPlaceholder").classList.add("hidden");
  $("studioGenerate").disabled = true;
  renderStatus("Preparing 3D scene…");
  let renderer;
  let audioElement;
  let audioContext;
  try {
    const probeCanvas = document.createElement("canvas");
    const probeContext = probeCanvas.getContext("webgl2", { powerPreference: "low-power" });
    if (!probeContext) throw new Error("WebGL2 is unavailable in this browser; no video was generated.");
    probeContext.getExtension("WEBGL_lose_context")?.loseContext();
    const [THREE, mannequinModule] = await Promise.all([
      import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"),
      import("/static/muscle-coach.js"),
    ]);
    const { scene, camera, width, height, lowPower, renderer: webglRenderer } = setupCanvasRenderer(THREE, canvas, options.ratio);
    renderer = webglRenderer;
    const { model, parts } = mannequinModule.buildMannequin(THREE, scene);
    model.position.y = -0.08;
    const materialColors = {
      athletic: { skin: 0xb98770, muscle: 0xc8795d },
      cool: { skin: 0x8296a1, muscle: 0x657e8b },
      mono: { skin: 0xc5c5c2, muscle: 0x8b8b88 },
    }[options.appearance];
    parts.forEach(({ mesh, muscle }) => {
      const isTarget = (EXERCISES_BY_CATEGORY[options.category] || []).some((exercise) => exercise.toLowerCase() === options.exercise.toLowerCase()) && (EXERCISES_BY_CATEGORY[options.category] || []).includes(options.exercise);
      const groupTargets = {
        Chest: ["Chest", "Shoulders", "Triceps"], Back: ["Back", "Lats", "Trapezius", "Biceps"], Arms: ["Biceps", "Triceps", "Forearms"],
        Shoulders: ["Shoulders", "Trapezius", "Triceps"], Abs: ["Abs", "Obliques"], Legs: ["Glutes", "Quadriceps", "Hamstrings", "Calves"],
        "Full body": [muscle],
      };
      const isHighlighted = (groupTargets[options.category] || []).includes(muscle);
      mesh.material.color.set(isHighlighted ? materialColors.muscle : materialColors.skin);
      mesh.material.emissive.set(isHighlighted ? 0x55200b : 0x080707);
      mesh.material.emissiveIntensity = isHighlighted ? 0.38 : 0.03;
      mesh.userData.highlighted = isHighlighted;
      mesh.userData.groupName = muscle;
      mesh.userData.exerciseTarget = isTarget;
    });
    const outputContext = canvas.getContext("2d");
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = width;
    captureCanvas.height = height;
    const captureContext = captureCanvas.getContext("2d", { alpha: false });
    let targetAngle = { front: 0, side: Math.PI / 2, back: Math.PI, orbit: 0 }[options.angle];
    const selectedAudio = $("studioAudio").files[0];
    let recordingStream;
    let recorder;
    let chunks = [];
    if (typeof MediaRecorder !== "undefined" && captureCanvas.captureStream) {
      recordingStream = captureCanvas.captureStream(lowPower ? 20 : 24);
      if (selectedAudio) {
        audioUrl = URL.createObjectURL(selectedAudio);
        audioElement = new Audio(audioUrl);
        audioElement.loop = true;
        audioContext = new AudioContext();
        const audioSource = audioContext.createMediaElementSource(audioElement);
        const audioOutput = audioContext.createMediaStreamDestination();
        audioSource.connect(audioOutput);
        audioSource.connect(audioContext.destination);
        audioOutput.stream.getAudioTracks().forEach((track) => recordingStream.addTrack(track));
      }
      const mimeTypes = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("This browser does not support a downloadable video format.");
      recorder = new MediaRecorder(recordingStream, { mimeType, videoBitsPerSecond: lowPower ? 900_000 : 1_800_000 });
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    }
    if (!recorder) throw new Error("Video recording is unavailable. Try a newer browser with MediaRecorder support.");
    const fileExtension = recorder.mimeType.includes("mp4") ? "mp4" : "webm";
    const title = options.template === "workout" ? options.exercise : FORMATS[options.template].title;
    renderStatus(`${lowPower ? "Low-power" : "Standard"} render · ${options.ratio} · recording…`);
    if (audioContext?.state === "suspended") await audioContext.resume();
    if (audioElement) await audioElement.play().catch(() => {});
    recorder.start(250);
    const startTime = performance.now();
    let animationFrame;
    await new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = () => reject(new Error("The browser stopped recording before the video was complete."));
      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / (options.duration * 1000), 1);
        scene.background.setHex({ studio: 0x171714, ember: 0x2d1913, lime: 0x192016, black: 0x080808 }[options.background]);
        const orbitAmount = options.angle === "orbit" ? Math.PI * 2 * progress : targetAngle;
        model.rotation.y = orbitAmount;
        const pace = options.animation === "dynamic" ? 4.3 : options.animation === "calm" ? 1.2 : 2.2;
        const movement = Math.sin(elapsed / 1000 * pace);
        const exerciseName = options.exercise.toLowerCase();
        model.position.y = -0.08 + (exerciseName.includes("squat") || exerciseName.includes("lunge") ? Math.max(0, movement) * -0.14 : Math.abs(movement) * (options.animation === "dynamic" ? 0.045 : 0.018));
        model.rotation.z = exerciseName.includes("push") || exerciseName.includes("press") ? movement * 0.045 : 0;
        parts.forEach(({ mesh, muscle }) => {
          const baseY = mesh.userData.originalY ?? mesh.position.y;
          const baseZ = mesh.userData.originalZ ?? mesh.position.z;
          const baseRotation = mesh.userData.originalRotation ?? mesh.rotation.z;
          mesh.userData.originalY = baseY;
          mesh.userData.originalZ = baseZ;
          mesh.userData.originalRotation = baseRotation;
          const armMuscles = ["Biceps", "Triceps", "Forearms", "Shoulders"];
          const legMuscles = ["Glutes", "Quadriceps", "Hamstrings", "Calves"];
          if (exerciseName.includes("curl") || exerciseName.includes("row") || exerciseName.includes("raise")) {
            const reach = armMuscles.includes(muscle);
            mesh.rotation.z = baseRotation + (reach ? movement * 0.36 : 0);
            mesh.position.y = baseY + (reach ? movement * 0.08 : 0);
          } else if (exerciseName.includes("squat") || exerciseName.includes("lunge") || exerciseName.includes("bridge") || exerciseName.includes("calf")) {
            const lower = legMuscles.includes(muscle);
            mesh.position.y = baseY + (lower ? Math.max(0, movement) * -0.09 : 0);
            mesh.rotation.z = baseRotation + (muscle === "Quadriceps" ? movement * 0.08 : 0);
          } else if (exerciseName.includes("push") || exerciseName.includes("press")) {
            const upper = ["Chest", "Shoulders", "Triceps", "Forearms"].includes(muscle);
            mesh.position.z = baseZ + (upper ? movement * 0.065 : 0);
            mesh.rotation.z = baseRotation + (muscle === "Triceps" || muscle === "Forearms" ? movement * 0.14 : 0);
          } else {
            mesh.position.y = baseY + (mesh.userData.highlighted ? movement * 0.035 : 0);
          }
        });
        if (options.template === "advertisement") {
          camera.position.x = Math.sin(progress * Math.PI * 2) * 0.32;
          camera.position.z = 6 - Math.sin(progress * Math.PI * 2) * 0.18;
          camera.lookAt(0, 0.32, 0);
        } else if (options.angle === "side") {
          camera.position.set(6, 0.35, 0.2);
          camera.lookAt(0, 0.32, 0);
        } else {
          camera.position.set(0, 0.32, 6);
          camera.lookAt(0, 0.32, 0);
        }
        renderer.render(scene, camera);
        outputContext.clearRect(0, 0, width, height);
        outputContext.drawImage(renderer.domElement, 0, 0, width, height);
        drawOverlay(outputContext, canvas, options, elapsed);
        captureContext.drawImage(canvas, 0, 0, width, height);
        if (elapsed >= options.duration * 1000) {
          recorder.stop();
          renderStatus("Finishing video export…");
          return;
        }
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    });
    cancelAnimationFrame(animationFrame);
    audioElement?.pause();
    const blob = new Blob(chunks, { type: recorder.mimeType });
    const downloadUrl = URL.createObjectURL(blob);
    const download = $("studioDownload");
    download.href = downloadUrl;
    download.download = `vtaper-${options.template}-${options.category.toLowerCase().replace(/\s+/g, "-")}.${fileExtension}`;
    download.removeAttribute("aria-disabled");
    download.classList.remove("disabled");
    active = { downloadUrl, blob };
    renderStatus(`Video ready · ${fileExtension.toUpperCase()} · ${Math.max(1, Math.round(blob.size / 1024))} KB`);
    $("studioCaption").focus({ preventScroll: true });
  } catch (error) {
    console.error("[VTaper] Marketing video render failed", error);
    $("studioPlaceholder").classList.remove("hidden");
    renderStatus(error.message || "Video creation failed. Try again.");
  } finally {
    $("studioGenerate").disabled = false;
    renderer?.dispose();
    if (audioContext && audioContext.state !== "closed") await audioContext.close();
    if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = undefined; }
  }
}

async function generateExternalVideo() {
  if (!externalVideoAvailable) return;
  revokeCurrentVideo();
  $("studioExternalGenerate").disabled = true;
  renderStatus("Sending the configured request to the external AI video provider…");
  const options = readOptions();
  try {
    const response = await fetch("/api/admin/video-studio/generate", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRFToken": window.csrfToken?.() || "" },
      body: JSON.stringify({ template: options.template, category: options.category, exercise: options.exercise, duration_seconds: options.duration, aspect_ratio: options.ratio }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The external video provider could not complete the request.");
    const providerResult = result.provider_response || {};
    const videoUrl = providerResult.video_url;
    if (typeof videoUrl === "string" && new URL(videoUrl, window.location.href).protocol === "https:") {
      const preview = $("studioExternalPreview");
      preview.src = videoUrl;
      preview.classList.remove("hidden");
      $("studioPreviewCanvas").classList.add("hidden");
      $("studioPlaceholder").classList.add("hidden");
      $("studioPreviewTitle").textContent = options.template === "workout" ? `${FORMATS.workout.title} · ${options.exercise}` : FORMATS[options.template].title;
      renderStatus("External AI provider returned a video preview.");
    } else if (providerResult.job_id) {
      renderStatus(`External provider accepted the request · job ${String(providerResult.job_id).slice(0, 64)}. Check provider status for completion.`);
    } else {
      renderStatus("The external AI provider responded but did not include a video URL or job ID.");
    }
  } catch (error) {
    renderStatus(error.message || "External video generation is unavailable.");
  } finally {
    $("studioExternalGenerate").disabled = false;
  }
}

export async function start() {
  if (started) return;
  const response = await fetch("/api/admin/video-studio-access", { credentials: "same-origin" });
  const access = await response.json().catch(() => ({}));
  if (!response.ok || !access.authorized) throw new Error(access.error || "Video Studio is available to authorized administrators only.");
  externalVideoAvailable = access.external_video_available === true;
  $("studioExternalGenerate").classList.toggle("hidden", !externalVideoAvailable);
  started = true;
  ["studioCategory", "studioExercise", "studioPreset", "studioDuration", "studioAngle", "studioAppearance", "studioAnimation", "studioBackground", "studioOverlays"].forEach((id) => $(id).addEventListener("change", () => {
    if (id === "studioCategory") updateExercises();
    else refreshCopy();
    if (id === "studioPreset") fitVideoPreview($("studioPreset").value);
    if (id === "studioBackground") $("studioPreviewCanvas").style.background = { studio: "#171714", ember: "#2d1913", lime: "#192016", black: "#080808" }[$("studioBackground").value];
    revokeCurrentVideo();
  }));
  $("studioGenerate").addEventListener("click", renderVideo);
  $("studioRegenerate").addEventListener("click", renderVideo);
  $("studioExternalGenerate").addEventListener("click", generateExternalVideo);
  $("studioCaptionRefresh").addEventListener("click", () => {
    const caption = FORMATS[readOptions().template].caption;
    $("studioCaption").value = `${caption}\n\n${$("studioExercise").value} · ${readOptions().duration}s\n${$("studioHashtags").textContent}`;
  });
  $("studioCopyCaption").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("studioCaption").value);
      $("studioStatus").textContent = "Caption copied to clipboard.";
    } catch {
      $("studioCaption").select();
      document.execCommand("copy");
      $("studioStatus").textContent = "Caption selected for copying.";
    }
  });
  $("studioTemplate").addEventListener("change", refreshCopy);
  $("studioAudio").addEventListener("change", () => {
    const file = $("studioAudio").files[0];
    renderStatus(file ? `Licensed audio selected · ${file.name}` : "Ready · local browser rendering");
    revokeCurrentVideo();
  });
  updateExercises();
  fitVideoPreview($("studioPreset").value);
  $("studioPreviewCanvas").style.background = "#171714";
  refreshCopy();
}
