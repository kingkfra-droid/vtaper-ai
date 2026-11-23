const MUSCLES = [
  { name: "Chest", description: "Pectorals power comfortable horizontal pressing and help stabilize the shoulder." },
  { name: "Shoulders", description: "Deltoids guide the arm through lifting and reaching movements." },
  { name: "Biceps", description: "The biceps help bend the elbow and turn the palm upward." },
  { name: "Triceps", description: "The triceps straighten the elbow and assist pressing movements." },
  { name: "Forearms", description: "Forearm muscles support grip, wrist control, and everyday carrying." },
  { name: "Abs", description: "The abdominal wall helps brace and control the trunk during movement." },
  { name: "Obliques", description: "Obliques support side-to-side trunk control and gentle rotation." },
  { name: "Back", description: "The upper and mid-back help maintain posture and move the shoulder blades." },
  { name: "Trapezius", description: "The trapezius helps position the shoulder blades and support the neck." },
  { name: "Lats", description: "The latissimus muscles bring the arms down and back toward the body." },
  { name: "Glutes", description: "The gluteal muscles extend and stabilize the hips during standing movements." },
  { name: "Quadriceps", description: "The quadriceps straighten the knee for standing, stepping, and squatting." },
  { name: "Hamstrings", description: "The hamstrings help bend the knee and extend the hip." },
  { name: "Calves", description: "The calf muscles help lift the heel during walking and standing." },
];

const TARGETS = {
  Chest: ["Chest", "Shoulders", "Triceps"], Shoulders: ["Shoulders", "Chest", "Triceps"],
  Biceps: ["Biceps", "Forearms", "Lats"], Triceps: ["Triceps", "Chest", "Shoulders"],
  Forearms: ["Forearms", "Biceps", "Triceps"], Abs: ["Abs", "Obliques", "Glutes"],
  Obliques: ["Obliques", "Abs", "Glutes"], Back: ["Back", "Lats", "Biceps"],
  Trapezius: ["Trapezius", "Back", "Shoulders"], Lats: ["Lats", "Back", "Biceps"],
  Glutes: ["Glutes", "Hamstrings", "Quadriceps"], Quadriceps: ["Quadriceps", "Glutes", "Hamstrings"],
  Hamstrings: ["Hamstrings", "Glutes", "Calves"], Calves: ["Calves", "Hamstrings", "Quadriceps"],
};

let initialized = false;
let selected = "Chest";
let sceneState;
let renderFrame;

function byId(id) { return document.getElementById(id); }

function showWebglFallback() {
  byId("webglFallback").classList.remove("hidden");
  byId("coachRenderStatus").textContent = "WebGL2 unavailable · exercise library ready";
  document.querySelectorAll("[data-model-view], #lowQualityToggle").forEach((button) => { button.disabled = true; });
  byId("coachControlsHint").textContent = "Use the muscle list to explore exercises. 3D rotation controls activate when WebGL2 is available.";
}

function setSelected(name) {
  selected = name;
  const muscle = MUSCLES.find((item) => item.name === name) || MUSCLES[0];
  const targets = TARGETS[muscle.name] || [muscle.name];
  byId("selectedMuscleName").textContent = muscle.name;
  byId("selectedMuscleDescription").textContent = muscle.description;
  byId("primaryMuscles").textContent = targets[0];
  byId("secondaryMuscles").textContent = targets.slice(1).join(" · ");
  document.querySelectorAll("[data-muscle-choice]").forEach((button) => {
    const active = button.dataset.muscleChoice === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (sceneState) {
    sceneState.parts.forEach(({ mesh, muscle: partMuscle }) => {
      mesh.material.color.set(partMuscle === name ? 0xff7548 : 0xc8795d);
      mesh.material.emissive.set(partMuscle === name ? 0x55200b : 0x160807);
      mesh.material.emissiveIntensity = partMuscle === name ? 0.48 : 0.09;
    });
  }
  renderExercises();
}

function renderExercises() {
  const host = byId("coachExerciseList");
  if (!host) return;
  const matches = (window.exerciseCatalog || []).filter((exercise) =>
    exercise.muscles.some((muscle) => muscle.toLowerCase().includes(selected.toLowerCase()) || selected.toLowerCase().includes(muscle.toLowerCase())),
  ).slice(0, 3);
  if (!matches.length) {
    host.innerHTML = '<p class="empty-state">Exercise recommendations are loading. You can also explore the full exercise library in Train.</p>';
    return;
  }
  host.innerHTML = matches.map((exercise) => `<article class="coach-exercise"><div class="coach-exercise-title"><h3>${escapeHtml(exercise.name)}</h3><span class="pill">${escapeHtml(exercise.level)}</span></div><p>${escapeHtml(exercise.how)}</p><div class="meta-row"><span class="pill">${Number(exercise.sets) || 2} sets · ${escapeHtml(exercise.reps)}</span><span class="pill">${escapeHtml(exercise.equipment)}</span></div><div class="coach-target-line"><b>Primary:</b> ${escapeHtml(exercise.muscles[0] || selected)} <span>· Secondary: ${escapeHtml(exercise.muscles.slice(1).join(", ") || "stabilizers")}</span></div></article>`).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function addMuscleList() {
  const host = byId("muscleSelectionList");
  host.innerHTML = MUSCLES.map(({ name }) => `<button class="muscle-choice" type="button" data-muscle-choice="${name}" aria-pressed="false">${name}</button>`).join("");
  host.addEventListener("click", (event) => {
    const button = event.target.closest("[data-muscle-choice]");
    if (button) setSelected(button.dataset.muscleChoice);
  });
  byId("coachStartWorkout").addEventListener("click", () => window.startCoachWorkout?.(selected));
  document.querySelectorAll("[data-model-view]").forEach((button) => button.addEventListener("click", () => {
    if (!sceneState) return;
    sceneState.targetY = { front: 0, back: Math.PI, side: Math.PI / 2 }[button.dataset.modelView];
    document.querySelectorAll("[data-model-view]").forEach((item) => item.classList.toggle("active", item === button));
  }));
  const qualityButton = byId("lowQualityToggle");
  qualityButton.addEventListener("click", () => {
    sceneState.lowPower = !sceneState.lowPower;
    qualityButton.textContent = `Low power: ${sceneState.lowPower ? "on" : "off"}`;
    qualityButton.setAttribute("aria-pressed", String(sceneState.lowPower));
    sceneState.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, sceneState.lowPower ? 0.7 : 1.25));
    sceneState.renderer.setSize(sceneState.host.clientWidth, sceneState.host.clientHeight, false);
  });
  setSelected(selected);
}

function makeRenderer(THREE, host) {
  const lowPower = window.matchMedia("(max-width: 720px), (prefers-reduced-motion: reduce)").matches || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !lowPower, powerPreference: "low-power", stencil: false, depth: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 0.7 : 1.25));
  renderer.setSize(host.clientWidth, host.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.replaceChildren(renderer.domElement);
  return { renderer, lowPower };
}

function buildMannequin(THREE, scene) {
  const model = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xb98770, roughness: 0.83, metalness: 0.02 });
  const muscleMat = new THREE.MeshStandardMaterial({ color: 0xc8795d, roughness: 0.62, metalness: 0.02, emissive: 0x160807, emissiveIntensity: 0.09 });
  const parts = [];
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  function form(x, y, z, sx, sy, sz, material = skin, muscle = null, rotation = 0) {
    const mesh = new THREE.Mesh(sphere, material.clone());
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.z = rotation;
    mesh.castShadow = false;
    mesh.userData.muscle = muscle;
    model.add(mesh);
    if (muscle) parts.push({ mesh, muscle });
    return mesh;
  }
  const pair = (name, x, y, z, sx, sy, sz, angle = 0) => {
    form(-x, y, z, sx, sy, sz, muscleMat, name, -angle);
    form(x, y, z, sx, sy, sz, muscleMat, name, angle);
  };

  // Base body establishes human proportions; individually named overlays remain selectable.
  form(0, 1.18, 0, 0.48, 0.69, 0.29);
  form(0, 0.37, 0, 0.37, 0.30, 0.24);
  form(0, 2.02, 0, 0.16, 0.18, 0.16);
  form(0, 2.36, 0, 0.22, 0.31, 0.21);
  pair("Chest", 0.25, 1.54, 0.265, 0.27, 0.24, 0.14, -0.12);
  pair("Shoulders", 0.54, 1.68, 0.02, 0.20, 0.21, 0.19);
  pair("Biceps", 0.67, 1.23, 0.17, 0.145, 0.32, 0.14, -0.1);
  pair("Triceps", 0.68, 1.21, -0.14, 0.14, 0.31, 0.13, -0.1);
  pair("Forearms", 0.78, 0.76, 0.04, 0.12, 0.31, 0.12, -0.1);
  pair("Abs", 0.115, 1.12, 0.274, 0.105, 0.17, 0.065);
  pair("Obliques", 0.34, 1.10, 0.19, 0.105, 0.31, 0.09, -0.12);
  pair("Back", 0.20, 1.44, -0.265, 0.20, 0.39, 0.095);
  pair("Trapezius", 0.14, 1.80, -0.20, 0.15, 0.31, 0.11, -0.32);
  pair("Lats", 0.34, 1.19, -0.24, 0.15, 0.42, 0.10, -0.18);
  pair("Glutes", 0.19, 0.32, -0.16, 0.19, 0.27, 0.15);
  pair("Quadriceps", 0.22, -0.33, 0.14, 0.20, 0.48, 0.16, -0.04);
  pair("Hamstrings", 0.23, -0.38, -0.14, 0.17, 0.44, 0.14, -0.04);
  pair("Calves", 0.22, -1.03, -0.02, 0.14, 0.39, 0.14, 0.03);
  pair("Forearms", 0.80, 0.40, 0.035, 0.105, 0.11, 0.12);
  pair("Calves", 0.22, -1.42, 0.015, 0.16, 0.13, 0.24);
  scene.add(model);
  return { model, parts };
}

function addInteractions(THREE, state) {
  const { host, renderer, camera, model, parts } = state;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  let moved = false;
  let previousX = 0;
  let previousY = 0;
  let pinchDistance = 0;
  const canvas = renderer.domElement;
  const setZoom = (delta) => { camera.position.z = THREE.MathUtils.clamp(camera.position.z + delta, 4, 9); };
  canvas.addEventListener("pointerdown", (event) => {
    dragging = true; moved = false; previousX = event.clientX; previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - previousX;
    const dy = event.clientY - previousY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    model.rotation.y += dx * 0.009;
    camera.position.y = THREE.MathUtils.clamp(camera.position.y + dy * 0.004, 0.7, 2.8);
    previousX = event.clientX; previousY = event.clientY;
  });
  canvas.addEventListener("pointerup", (event) => {
    if (dragging && !moved) {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(parts.map((item) => item.mesh), false)[0];
      if (hit?.object.userData.muscle) setSelected(hit.object.userData.muscle);
    }
    dragging = false;
  });
  canvas.addEventListener("wheel", (event) => { event.preventDefault(); setZoom(event.deltaY * 0.008); }, { passive: false });
  canvas.addEventListener("touchstart", (event) => {
    if (event.touches.length === 2) pinchDistance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
  }, { passive: true });
  canvas.addEventListener("touchmove", (event) => {
    if (event.touches.length !== 2 || !pinchDistance) return;
    const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
    setZoom((pinchDistance - distance) * 0.018);
    pinchDistance = distance;
  }, { passive: true });
  const resizeObserver = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  });
  resizeObserver.observe(host);
  state.resizeObserver = resizeObserver;
}

async function start() {
  if (initialized) return;
  initialized = true;
  const host = byId("muscleCanvasHost");
  if (!host || !host.clientWidth) { initialized = false; return; }
  addMuscleList();
  byId("coachRenderStatus").textContent = "Preparing lightweight anatomy model…";
  const probeCanvas = document.createElement("canvas");
  const probeContext = probeCanvas.getContext("webgl2", { powerPreference: "low-power" });
  if (!probeContext) {
    showWebglFallback();
    return;
  }
  probeContext.getExtension("WEBGL_lose_context")?.loseContext();
  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js");
    const { renderer, lowPower } = makeRenderer(THREE, host);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, 0.1, 40);
    camera.position.set(0, 0.45, 6.1);
    scene.add(new THREE.HemisphereLight(0xffe5d4, 0x211711, 2.1));
    const keyLight = new THREE.DirectionalLight(0xfff1e5, 2.5);
    keyLight.position.set(-3, 5, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xff7548, 1.2);
    rimLight.position.set(3, 2, -4);
    scene.add(rimLight);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: 0x211b19, transparent: true, opacity: 0.5 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.57;
    scene.add(floor);
    const { model, parts } = buildMannequin(THREE, scene);
    sceneState = { host, renderer, scene, camera, model, parts, lowPower, targetY: 0 };
    byId("lowQualityToggle").textContent = `Low power: ${lowPower ? "on" : "off"}`;
    byId("lowQualityToggle").setAttribute("aria-pressed", String(lowPower));
    addInteractions(THREE, sceneState);
    setSelected(selected);
    byId("coachRenderStatus").textContent = lowPower ? "3D anatomy · low-power rendering" : "3D anatomy · drag to rotate";
    let lastFrame = 0;
    const frame = (timestamp) => {
      renderFrame = requestAnimationFrame(frame);
      if (sceneState?.lowPower && timestamp - lastFrame < 50) return;
      lastFrame = timestamp;
      const difference = Math.atan2(Math.sin(sceneState.targetY - model.rotation.y), Math.cos(sceneState.targetY - model.rotation.y));
      if (Math.abs(difference) > 0.008) model.rotation.y += difference * 0.08;
      renderer.render(scene, camera);
    };
    renderFrame = requestAnimationFrame(frame);
  } catch (error) {
    console.error("[VYTRON] 3D coach could not initialize", error);
    showWebglFallback();
    setSelected(selected);
  }
}

export { start };
