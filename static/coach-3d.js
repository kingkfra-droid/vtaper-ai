(() => {
    let stopCurrent = null;
    let voiceEnabled = true;

    function movementType(name) {
        const value = name.toLowerCase();
        if (/bridge|dead bug|bird dog|plank|clam|floor|supine/.test(value)) return 'floor';
        if (/squat|lunge|sit-to-stand|wall sit|calf|march|stance|step|footwork|weight-shift|ginga|balance|wrestling|judo|karate|taekwondo|kickboxing|capoeira/.test(value)) return 'lower';
        if (/press|push|row|curl|arm|shoulder|wrist|w raise|open-hand|hand|boxing|muay/.test(value)) return 'upper';
        return 'flow';
    }

    function init(exercise) {
        if (stopCurrent) stopCurrent();

        const host = document.getElementById('coach3d');
        if (!host) return;

        const type = movementType(exercise.name || '');
        host.setAttribute('role', 'group');
        host.setAttribute('aria-label', `Animated 3D-style coach demonstrating ${exercise.name || 'the exercise'}`);
        const stage = document.createElement('div');
        stage.className = 'coach-stage';
        stage.id = 'coachStage';
        stage.setAttribute('role', 'group');
        stage.setAttribute('aria-label', `Animated 3D-style coach demonstrating ${exercise.name || 'the exercise'}`);
        stage.innerHTML = `
            <div class="coach-grid-glow"></div>
            <div class="coach-plinth"></div>
            <div class="coach-figure coach-${type}" id="coachFigure" aria-hidden="true">
                <div class="coach-head"></div>
                <div class="coach-neck"></div>
                <div class="coach-torso"></div>
                <div class="coach-pelvis"><span class="coach-shorts-brand">VYTRON</span></div>
                <div class="coach-limb coach-arm coach-left">
                    <span class="coach-upper-arm"></span><span class="coach-joint"></span>
                    <span class="coach-forearm"></span><span class="coach-hand"></span>
                </div>
                <div class="coach-limb coach-arm coach-right">
                    <span class="coach-upper-arm"></span><span class="coach-joint"></span>
                    <span class="coach-forearm"></span><span class="coach-hand"></span>
                </div>
                <div class="coach-limb coach-leg coach-left">
                    <span class="coach-upper-leg"></span><span class="coach-joint"></span>
                    <span class="coach-lower-leg"></span><span class="coach-foot"></span>
                </div>
                <div class="coach-limb coach-leg coach-right">
                    <span class="coach-upper-leg"></span><span class="coach-joint"></span>
                    <span class="coach-lower-leg"></span><span class="coach-foot"></span>
                </div>
                <span class="coach-chest-light"></span>
            </div>
            <div class="coach-speech-bubble" id="coachSpeechBubble" role="status" aria-live="polite">
                <span class="coach-speech-label">COACH / GUIDANCE</span>
                <p id="coachNarrationText"></p>
            </div>
            <span class="coach-scene-label">VYTRON / 3D MOVEMENT GUIDE</span>
            <span class="coach-scene-coords">${type.toUpperCase()} SESSION</span>`;
        host.replaceChildren(stage);

        const controls = host.nextElementSibling;
        const rotationControls = controls?.querySelector('.coach-rotation-controls');
        const status = document.getElementById('coachPoseStatus');
        const speechText = document.getElementById('coachNarrationText');
        const figure = document.getElementById('coachFigure');
        const speechSupported = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
        let dragging = false;
        let lastX = 0;
        let angle = -5;
        let activeUtterance = null;
        let selectedVoice = null;
        let voiceSelect = null;
        let loadVoices = null;

        const narration = [
            `Let's work on ${exercise.name}.`,
            exercise.how,
            `Coach's cue: ${exercise.cue}.`,
            `Complete ${exercise.sets} ${Number(exercise.sets) === 1 ? 'set' : 'sets'} of ${exercise.reps}.`,
            `Rest for ${exercise.rest} seconds between sets. Move at a comfortable pace and stop if anything feels painful.`
        ].filter(Boolean).join(' ');

        speechText.textContent = narration;

        function setStatus(message) {
            if (status) status.textContent = message;
        }

        function stopSpeech() {
            if (speechSupported) window.speechSynthesis.cancel();
            activeUtterance = null;
            stage.classList.remove('is-speaking');
        }

        function speak() {
            if (!speechSupported) {
                setStatus('Spoken guidance is not available in this browser');
                return;
            }
            if (!voiceEnabled) {
                setStatus('Voice guidance muted · read the coaching cue above');
                return;
            }

            stopSpeech();
            const utterance = new SpeechSynthesisUtterance(narration);
            utterance.rate = 0.94;
            utterance.pitch = 1;
            utterance.lang = document.documentElement.lang || 'en';
            if (selectedVoice) utterance.voice = selectedVoice;
            activeUtterance = utterance;
            utterance.onstart = () => {
                if (activeUtterance !== utterance) return;
                stage.classList.add('is-speaking');
                setStatus(`Coach speaking · ${exercise.name}`);
            };
            utterance.onend = () => {
                if (activeUtterance !== utterance) return;
                activeUtterance = null;
                stage.classList.remove('is-speaking');
                setStatus('3D movement guide · drag to rotate');
            };
            utterance.onerror = event => {
                if (activeUtterance !== utterance) return;
                activeUtterance = null;
                stage.classList.remove('is-speaking');
                setStatus(`Voice guidance unavailable: ${event.error || 'speech error'}`);
            };

            try {
                window.speechSynthesis.speak(utterance);
            } catch (error) {
                activeUtterance = null;
                stage.classList.remove('is-speaking');
                setStatus(`Could not start voice guidance: ${error.message || 'speech error'}`);
            }
        }

        function rotateBy(amount) {
            angle += amount;
            figure.style.setProperty('--turn', `${angle}deg`);
        }

        function onDown(event) {
            if (event.target.closest('button, select')) return;
            dragging = true;
            lastX = event.clientX;
            stage.setPointerCapture(event.pointerId);
        }

        function onMove(event) {
            if (!dragging) return;
            angle += (event.clientX - lastX) * 0.55;
            lastX = event.clientX;
            figure.style.setProperty('--turn', `${angle}deg`);
        }

        function onUp() {
            dragging = false;
        }

        const rotateLeft = document.getElementById('coachRotateLeft');
        const rotateRight = document.getElementById('coachRotateRight');
        const motionToggle = document.getElementById('coachMotionToggle');
        const workoutPause = document.getElementById('pauseWorkout');
        const replayButton = document.createElement('button');
        replayButton.className = 'text-link';
        replayButton.type = 'button';
        replayButton.textContent = 'Replay coach guidance';
        replayButton.setAttribute('aria-label', `Replay spoken guidance for ${exercise.name}`);
        rotationControls?.append(replayButton);

        const voiceToggle = document.createElement('button');
        voiceToggle.className = 'text-link';
        voiceToggle.type = 'button';
        voiceToggle.textContent = speechSupported ? 'Mute voice' : 'Voice unavailable';
        voiceToggle.disabled = !speechSupported;
        voiceToggle.setAttribute('aria-pressed', 'false');
        rotationControls?.append(voiceToggle);

        if (speechSupported) {
            voiceSelect = document.createElement('select');
            voiceSelect.className = 'coach-voice-select';
            voiceSelect.setAttribute('aria-label', 'Choose coach voice');
            controls?.append(voiceSelect);

            loadVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                const previousVoiceName = selectedVoice?.name;
                voiceSelect.replaceChildren(new Option('Device voice', ''));
                voices.forEach((voice, index) => {
                    if (!voice.lang.toLowerCase().startsWith('en')) return;
                    const option = new Option(`${voice.name} · ${voice.lang}`, String(index));
                    voiceSelect.add(option);
                });
                selectedVoice = voices.find(voice => voice.name === previousVoiceName) || null;
                if (selectedVoice) {
                    const selectedIndex = voices.indexOf(selectedVoice);
                    voiceSelect.value = String(selectedIndex);
                }
            };

            loadVoices();
            window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
            voiceSelect.addEventListener('change', () => {
                const voices = window.speechSynthesis.getVoices();
                selectedVoice = voiceSelect.value === '' ? null : voices[Number(voiceSelect.value)] || null;
            });
        } else {
            setStatus('Voice guidance is not supported in this browser');
        }

        function toggleMotion() {
            const paused = stage.classList.toggle('paused');
            motionToggle.textContent = paused ? 'Resume demonstration' : 'Pause demonstration';
            setStatus(paused ? 'Coach demonstration paused' : '3D movement guide · drag to rotate');
        }

        function toggleVoice() {
            voiceEnabled = !voiceEnabled;
            voiceToggle.textContent = voiceEnabled ? 'Mute voice' : 'Turn voice on';
            voiceToggle.setAttribute('aria-pressed', String(!voiceEnabled));
            if (voiceEnabled) speak();
            else {
                stopSpeech();
                setStatus('Voice guidance muted · read the coaching cue above');
            }
        }

        const turnLeft = () => rotateBy(-12);
        const turnRight = () => rotateBy(12);
        const syncWorkoutPause = () => {
            window.setCoachSpeechPaused?.(workoutPause?.dataset.paused === 'true');
        };
        rotateLeft?.addEventListener('click', turnLeft);
        rotateRight?.addEventListener('click', turnRight);
        motionToggle?.addEventListener('click', toggleMotion);
        workoutPause?.addEventListener('click', syncWorkoutPause);
        replayButton.addEventListener('click', speak);
        voiceToggle.addEventListener('click', toggleVoice);
        stage.addEventListener('pointerdown', onDown);
        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerup', onUp);
        stage.addEventListener('pointercancel', onUp);

        setStatus(speechSupported ? '3D movement guide · drag to rotate' : 'Spoken guidance is not available in this browser');
        speak();

        stopCurrent = () => {
            stopSpeech();
            if (speechSupported) window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
            rotateLeft?.removeEventListener('click', turnLeft);
            rotateRight?.removeEventListener('click', turnRight);
            motionToggle?.removeEventListener('click', toggleMotion);
            workoutPause?.removeEventListener('click', syncWorkoutPause);
            replayButton.removeEventListener('click', speak);
            voiceToggle.removeEventListener('click', toggleVoice);
            stage.removeEventListener('pointerdown', onDown);
            stage.removeEventListener('pointermove', onMove);
            stage.removeEventListener('pointerup', onUp);
            stage.removeEventListener('pointercancel', onUp);
            host.replaceChildren();
            stopCurrent = null;
        };
        return stopCurrent;
    }

    window.init3DCoach = init;
    window.stop3DCoach = () => stopCurrent?.();
    window.setCoachSpeechPaused = paused => {
        if (!('speechSynthesis' in window)) return;
        if (paused) window.speechSynthesis.pause();
        else window.speechSynthesis.resume();
    };
})();
