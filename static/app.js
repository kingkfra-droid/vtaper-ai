let activePlan = null;
let seconds = 60;
let interval = null;

const $ = id => document.getElementById(id);

function commander(message) {
  $("assistantMessage").textContent = message;
  $("commanderMessage").textContent = message;
}

function speakMessage() {
  if (!window.speechSynthesis) {
    commander("Voice unavailable on this browser.");
    return;
  }

  speechSynthesis.cancel();

  const voice = new SpeechSynthesisUtterance(
    $("assistantMessage").textContent
  );

  voice.rate = 0.85;
  voice.pitch = 0.7;
  speechSynthesis.speak(voice);
}

async function generatePlan() {
  const response = await fetch("/api/plan", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      goal:$("goal").value,
      experience:$("experience").value
    })
  });

  const data = await response.json();
  activePlan = data;

  const list = $("exerciseList");
  list.replaceChildren();

  data.exercises.forEach((item,index) => {
    const card = document.createElement("div");
    card.className = "exercise";

    const name = document.createElement("strong");
    name.textContent = `${index+1}. ${item.name}`;

    const reps = document.createElement("span");
    reps.textContent = `${item.sets} sets | ${item.reps}`;

    card.append(name,reps);
    list.appendChild(card);
  });

  commander(data.message);
}

function startProtocol() {
  generatePlan();
  $("goal").scrollIntoView({behavior:"smooth"});
  commander("Training protocol initializing, Commander.");
}


function updateTimer() {
  $("timer").textContent =
    String(Math.floor(seconds/60)).padStart(2,"0") +
    ":" +
    String(seconds%60).padStart(2,"0");
}

function startTimer() {
  if(interval) return;

  if(seconds <= 0) seconds = 60;

  interval = setInterval(() => {
    seconds--;
    updateTimer();

    if(seconds <= 0) {
      pauseTimer();
      commander("Rest interval complete. Resume when ready.");
      speakMessage();
    }
  },1000);
}

function pauseTimer() {
  clearInterval(interval);
  interval = null;
}

function resetTimer() {
  pauseTimer();
  seconds = 60;
  updateTimer();
}

async function completeSession() {
  if(!activePlan) {
    commander("No active protocol. Generate a workout first.");
    return;
  }

  pauseTimer();

  const response = await fetch("/api/complete", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({goal:activePlan.goal})
  });

  const result = await response.json();

  $("completed").textContent = result.completed;

  commander("Session recorded. Recover and prepare for your next mission.");
  speakMessage();
}


$("photo").addEventListener("change",function() {
  const file = this.files[0];

  if(!file) return;

  if(!file.type.startsWith("image/")) {
    commander("Invalid image format.");
    return;
  }

  if(file.size > 8*1024*1024) {
    commander("Image exceeds the 8 MB limit.");
    return;
  }

  const image = document.createElement("img");
  const url = URL.createObjectURL(file);

  image.src = url;
  image.alt = "Local image preview";

  const visual = $("scanVisual");
  visual.replaceChildren(image);

  commander("Visual input received. Local preview ready.");
});

updateTimer();

commander("All systems operational. Awaiting your command.");
