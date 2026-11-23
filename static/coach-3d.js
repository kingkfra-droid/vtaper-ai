(() => {
    let stopCurrent = null;
    let voiceEnabled = true;
    let threePromise = null;

    function loadThree() {
        if (window.THREE) return Promise.resolve(window.THREE);
        if (threePromise) return threePromise;

        threePromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
            script.integrity = 'sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                if (window.THREE) resolve(window.THREE);
                else {
                    threePromise = null;
                    reject(new Error('Three.js loaded but did not initialize.'));
                }
            };
            script.onerror = () => {
                threePromise = null;
                reject(new Error('Could not load the 3D renderer. Check your connection and retry.'));
            };
            document.head.append(script);
        });
        return threePromise;
    }

    function addSphere(THREE, root, material, position, scale) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 28), material);
        mesh.position.set(...position);
        mesh.scale.set(...scale);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
        return mesh;
    }

    function addLimb(THREE, root, material, start, end, startRadius, middleRadius, endRadius) {
        const from = new THREE.Vector3(...start);
        const to = new THREE.Vector3(...end);
        const direction = to.clone().sub(from);
        const length = direction.length();
        const half = length / 2;
        const profile = [
            new THREE.Vector2(0, -half),
            new THREE.Vector2(startRadius * 0.72, -half * 0.94),
            new THREE.Vector2(startRadius, -half * 0.62),
            new THREE.Vector2(middleRadius, -half * 0.08),
            new THREE.Vector2(middleRadius * 0.92, half * 0.24),
            new THREE.Vector2(endRadius, half * 0.78),
            new THREE.Vector2(endRadius * 0.7, half * 0.96),
            new THREE.Vector2(0, half)
        ];
        const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), material);
        mesh.position.copy(from).add(to).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        root.add(mesh);
        return mesh;
    }

    function createHumanoid(THREE, gender = 'male') {
        const root = new THREE.Group();
        const isFemale = gender === 'female';
        const shell = new THREE.MeshPhysicalMaterial({
            color: isFemale ? 0xdda88f : 0xe8c0a2,
            metalness: 0.05,
            roughness: 0.42,
            clearcoat: 0.18,
            clearcoatRoughness: 0.28
        });
        const joint = new THREE.MeshPhysicalMaterial({
            color: 0xdab18f,
            metalness: 0.05,
            roughness: 0.38,
            clearcoat: 0.2
        });
        const shorts = new THREE.MeshPhysicalMaterial({
            color: 0x27202f,
            metalness: 0.16,
            roughness: 0.34,
            clearcoat: 0.5,
            clearcoatRoughness: 0.14
        });
        const brand = new THREE.MeshPhysicalMaterial({
            color: 0xbda5ff,
            emissive: 0x38275f,
            emissiveIntensity: 0.35,
            metalness: 0.32,
            roughness: 0.24
        });

        const torsoProfile = [
            [0, 0], [0.14, 0], [0.18, 0.06], [0.19, 0.15],
            [0.2, 0.23],
            isFemale ? [0.22, 0.33] : [0.25, 0.33],
            isFemale ? [0.31, 0.45] : [0.34, 0.45],
            [isFemale ? 0.33 : 0.36, 0.51],
            [isFemale ? 0.24 : 0.27, 0.56],
            [0, 0.56]
        ].map(([radius, height]) => new THREE.Vector2(radius, height));
        const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 48), shell);
        torso.position.y = 1.02;
        torso.scale.z = 0.67;
        torso.castShadow = true;
        torso.receiveShadow = true;
        root.add(torso);

        for (const side of [-1, 1]) {
            addSphere(THREE, root, shell, [side * 0.105, 1.4, 0.145], [0.155, 0.11, 0.082]);
        }

        for (let row = 0; row < 3; row += 1) {
            for (const side of [-1, 1]) {
                addSphere(
                    THREE,
                    root,
                    shell,
                    [side * 0.075, 1.28 - row * 0.075, 0.155],
                    [0.067, 0.058, 0.045]
                );
            }
        }

        addSphere(THREE, root, shell, [0, 0.98, 0], [0.22, 0.15, 0.13]);
        addSphere(THREE, root, shell, [0, 1.43, 0.105], [0.14, 0.09, 0.055]);
        addSphere(THREE, root, shell, [0, 1.43, -0.105], [0.14, 0.09, 0.055]);

        const shortsWaist = new THREE.Mesh(
            new THREE.CylinderGeometry(0.255, 0.235, 0.18, 48, 1, false),
            shorts
        );
        shortsWaist.position.set(0, 0.91, 0);
        shortsWaist.scale.z = 0.72;
        shortsWaist.castShadow = true;
        shortsWaist.receiveShadow = true;
        root.add(shortsWaist);

        for (const side of [-1, 1]) {
            const shortsLeg = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.115, 0.22, 8, 24),
                shorts
            );
            shortsLeg.position.set(side * 0.125, 0.78, 0);
            shortsLeg.scale.set(1.08, 1, 0.82);
            shortsLeg.castShadow = true;
            shortsLeg.receiveShadow = true;
            root.add(shortsLeg);
        }

        const waistband = new THREE.Mesh(
            new THREE.TorusGeometry(0.25, 0.012, 8, 48),
            brand
        );
        waistband.rotation.x = Math.PI / 2;
        waistband.position.set(0, 1.005, 0);
        waistband.scale.z = 0.72;
        root.add( waistband);

        const leftBrand = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.125, 0.012), brand);
        leftBrand.position.set(-0.028, 0.88, 0.205);
        leftBrand.rotation.z = -0.55;
        root.add(leftBrand);

        const rightBrand = leftBrand.clone();
        rightBrand.position.x = 0.028;
        rightBrand.rotation.z = 0.55;
        root.add(rightBrand);

        addLimb(THREE, root, shell, [0, 1.54, 0], [0, 1.66, 0], 0.075, 0.073, 0.07);
        addSphere(THREE, root, shell, [0, 1.82, 0], [0.135, 0.17, 0.12]);

        if (isFemale) {
            addSphere(THREE, root, shell, [0, 1.72, -0.02], [0.15, 0.12, 0.14]);
            const hair = new THREE.MeshPhysicalMaterial({
                color: 0x241817,
                roughness: 0.7,
                metalness: 0.02
            });
            addSphere(THREE, root, hair, [0, 1.91, -0.035], [0.145, 0.15, 0.13]);
            addSphere(THREE, root, hair, [0.12, 1.68, -0.09], [0.09, 0.15, 0.09]);
            addSphere(THREE, root, hair, [-0.12, 1.68, -0.09], [0.09, 0.15, 0.09]);
        } else {
            const hair = new THREE.MeshPhysicalMaterial({
                color: 0x17131b,
                roughness: 0.58,
                metalness: 0.02
            });
            addSphere(THREE, root, hair, [0, 1.93, -0.02], [0.14, 0.06, 0.12]);
        }

        for (const side of [-1, 1]) {
            const shoulder = [side * 0.29, 1.49, 0];
            const elbow = [side * 0.37, 1.12, 0.015];
            const wrist = [side * 0.41, 0.79, 0.035];
            addSphere(THREE, root, shell, shoulder, [0.12, 0.12, 0.115]);
            addLimb(THREE, root, shell, [side * 0.3, 1.45, 0], elbow, 0.105, 0.092, 0.073);
            addSphere(THREE, root, joint, elbow, [0.075, 0.075, 0.075]);
            addLimb(THREE, root, shell, elbow, wrist, 0.074, 0.07, 0.053);
            addSphere(THREE, root, joint, [side * 0.41, 0.79, 0.035], [0.056, 0.045, 0.056]);
            addSphere(THREE, root, shell, [side * 0.425, 0.7, 0.045], [0.066, 0.085, 0.043]);

            for (let finger = 0; finger < 4; finger += 1) {
                const offset = (finger - 1.5) * 0.026;
                addLimb(
                    THREE, root, shell,
                    [side * 0.425 + offset, 0.65, 0.05],
                    [side * 0.425 + offset, 0.585 + Math.abs(offset) * 0.25, 0.05],
                    0.013, 0.012, 0.008
                );
            }
            addLimb(
                THREE, root, shell,
                [side * 0.37, 0.71, 0.05],
                [side * 0.34, 0.645, 0.055],
                0.022, 0.018, 0.012
            );

            const hip = [side * 0.12, 0.98, 0];
            const knee = [side * 0.13, 0.53, 0.005];
            const ankle = [side * 0.13, 0.105, 0.015];
            addLimb(THREE, root, shell, hip, knee, 0.145, 0.13, 0.087);
            addSphere(THREE, root, joint, knee, [0.088, 0.085, 0.086]);
            addLimb(THREE, root, shell, knee, ankle, 0.085, 0.073, 0.052);
            addSphere(THREE, root, joint, ankle, [0.058, 0.05, 0.06]);
            addSphere(THREE, root, shell, [side * 0.13, 0.065, 0.075], [0.083, 0.06, 0.16]);
        }

        return root;
    }

    function createCoachScene(THREE, canvas, stage, gender = 'male') {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x030406);

        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
        camera.position.set(0, 1.03, 4.55);
        camera.lookAt(0, 1.02, 0);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        scene.add(new THREE.HemisphereLight(0xe9efff, 0x171820, 1.8));
        const key = new THREE.DirectionalLight(0xffffff, 3.6);
        key.position.set(-2.8, 4.5, 3.5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -2;
        key.shadow.camera.right = 2;
        key.shadow.camera.top = 2.5;
        key.shadow.camera.bottom = -0.5;
        scene.add(key);

        const fill = new THREE.DirectionalLight(0xc8d7ff, 1.4);
        fill.position.set(3.2, 2.8, 2);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xb8a0ff, 3.2);
        rim.position.set(-2, 2.8, -3);
        scene.add(rim);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: 0x07080b, roughness: 0.72, metalness: 0.12 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        const plinth = new THREE.Mesh(
            new THREE.TorusGeometry(0.62, 0.009, 10, 72),
            new THREE.MeshBasicMaterial({ color: 0x8e78bd, transparent: true, opacity: 0.8 })
        );
        plinth.rotation.x = Math.PI / 2;
        plinth.position.y = 0.018;
        scene.add(plinth);

        const figure = createHumanoid(THREE, gender);
        figure.rotation.y = -5 * Math.PI / 180;
        scene.add(figure);

        function resize() {
            const width = Math.max(1, stage.clientWidth);
            const height = Math.max(1, stage.clientHeight);
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
        resize();

        return { camera, figure, renderer, resize, scene };
    }

    function movementType(name) {
        const value = name.toLowerCase();
        if (/bridge|dead bug|bird dog|plank|clam|floor|supine/.test(value)) return 'floor';
        if (/squat|lunge|sit-to-stand|wall sit|calf|march|stance|step|footwork|weight-shift|ginga|balance|wrestling|judo|karate|taekwondo|kickboxing|capoeira/.test(value)) return 'lower';
        if (/press|push|row|curl|arm|shoulder|wrist|w raise|open-hand|hand|boxing|muay/.test(value)) return 'upper';
        return 'flow';
    }

    async function init(exercise) {
        if (stopCurrent) stopCurrent();

        const host = document.getElementById('coach3d');
        if (!host) return;
        let coachGender = 'male';
        try {
            coachGender = localStorage.getItem('vytron-coach-gender') === 'female' ? 'female' : 'male';
        } catch (_) {}

        const type = movementType(exercise.name || '');
        host.setAttribute('role', 'group');
        host.setAttribute('aria-label', `3D humanoid android mannequin providing guidance for ${exercise.name || 'the exercise'}`);
        const stage = document.createElement('div');
        stage.className = 'coach-stage';
        stage.id = 'coachStage';
        stage.setAttribute('role', 'group');
        stage.setAttribute('aria-label', `3D humanoid android mannequin providing guidance for ${exercise.name || 'the exercise'}`);
        stage.innerHTML = `
            <canvas class="coach-webgl" id="coachCanvas" aria-hidden="true"></canvas>
            <span class="coach-v-mark" aria-label="VYTRON">V</span>
            <div class="coach-speech-bubble" id="coachSpeechBubble" role="status" aria-live="polite">
                <span class="coach-speech-label">COACH / GUIDANCE</span>
                <p id="coachNarrationText"></p>
            </div>
            <span class="coach-scene-label">VYTRON / TRAINING COACH</span>
            <span class="coach-scene-coords">${type.toUpperCase()} SESSION</span>`;
        host.replaceChildren(stage);

        const controls = host.nextElementSibling;
        const rotationControls = controls?.querySelector('.coach-rotation-controls');
        const genderSelect = document.createElement('select');
        genderSelect.className = 'coach-voice-select coach-gender-select';
        genderSelect.setAttribute('aria-label', 'Choose coach appearance');
        genderSelect.append(
            new Option('Male coach', 'male'),
            new Option('Female coach', 'female')
        );
        genderSelect.value = coachGender;
        controls?.append(genderSelect);
        genderSelect.addEventListener('change', () => {
            try {
                localStorage.setItem('vytron-coach-gender', genderSelect.value);
            } catch (_) {}
            init(exercise);
        });
        const status = document.getElementById('coachPoseStatus');
        const speechText = document.getElementById('coachNarrationText');
        const speechSupported = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
        let figure = null;
        let renderer = null;
        let scene = null;
        let animationFrame = null;
        let resizeObserver = null;
        let disposed = false;
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
                setStatus('Android coach · drag to rotate');
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
            if (figure) figure.rotation.y = angle * Math.PI / 180;
        }

        function onDown(event) {
            if (event.target.closest('button, select')) return;
            if (!figure) return;
            dragging = true;
            lastX = event.clientX;
            stage.setPointerCapture(event.pointerId);
        }

        function onMove(event) {
            if (!dragging) return;
            angle += (event.clientX - lastX) * 0.55;
            lastX = event.clientX;
            if (figure) figure.rotation.y = angle * Math.PI / 180;
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
            motionToggle.textContent = paused ? 'Resume coach motion' : 'Pause coach motion';
            setStatus(paused ? 'Coach motion paused' : '3D mannequin · drag to rotate');
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
        if (motionToggle) motionToggle.textContent = 'Pause coach motion';
        motionToggle?.addEventListener('click', toggleMotion);
        workoutPause?.addEventListener('click', syncWorkoutPause);
        replayButton.addEventListener('click', speak);
        voiceToggle.addEventListener('click', toggleVoice);
        stage.addEventListener('pointerdown', onDown);
        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerup', onUp);
        stage.addEventListener('pointercancel', onUp);

        stopCurrent = () => {
            if (disposed) return;
            disposed = true;
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
            if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
            resizeObserver?.disconnect();
            window.removeEventListener('resize', resize);
            const disposedMaterials = new Set();
            scene?.traverse(object => {
                object.geometry?.dispose();
                for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                    if (material && !disposedMaterials.has(material)) {
                        disposedMaterials.add(material);
                        material.dispose();
                    }
                }
            });
            renderer?.dispose();
            host.replaceChildren();
            stopCurrent = null;
        };

        function resize() {
            if (renderer) {
                const width = Math.max(1, stage.clientWidth);
                const height = Math.max(1, stage.clientHeight);
                renderer.setSize(width, height, false);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }
        }

        let camera = null;
        setStatus('Loading 3D android mannequin…');
        try {
            const THREE = await loadThree();
            if (disposed) return stopCurrent;
            const canvas = stage.querySelector('#coachCanvas');
            const coachScene = createCoachScene(THREE, canvas, stage, coachGender);
            camera = coachScene.camera;
            figure = coachScene.figure;
            renderer = coachScene.renderer;
            scene = coachScene.scene;
            figure.rotation.y = angle * Math.PI / 180;

            if (window.ResizeObserver) {
                resizeObserver = new window.ResizeObserver(resize);
                resizeObserver.observe(stage);
            } else {
                window.addEventListener('resize', resize);
            }

            const render = time => {
                if (disposed) return;
                if (!stage.classList.contains('paused')) {
                    const motion = (time * 0.0012) % (Math.PI * 2);
                    if (type === 'lower') {
                        figure.position.y = -0.035 + Math.abs(Math.sin(motion)) * 0.11;
                        figure.scale.y = 0.96 + Math.sin(motion) * 0.018;
                        figure.rotation.z = Math.sin(motion * 0.5) * 0.018;
                    } else if (type === 'upper') {
                        figure.position.y = Math.sin(motion) * 0.012;
                        figure.rotation.z = Math.sin(motion) * 0.028;
                    } else if (type === 'floor') {
                        figure.position.y = Math.sin(motion) * 0.006;
                        figure.rotation.z = Math.sin(motion * 0.5) * 0.012;
                    } else {
                        figure.position.y = Math.sin(motion) * 0.009;
                        figure.rotation.y = angle * Math.PI / 180 + Math.sin(motion * 0.5) * 0.035;
                    }
                }
                renderer.render(coachScene.scene, camera);
                animationFrame = window.requestAnimationFrame(render);
            };
            animationFrame = window.requestAnimationFrame(render);
            if (speechSupported) {
                setStatus('3D mannequin · drag to rotate');
                speak();
            } else {
                setStatus('3D mannequin · drag to rotate · voice unavailable');
            }
        } catch (error) {
            if (disposed) return stopCurrent;
            stage.classList.add('has-error');
            setStatus(`3D mannequin unavailable: ${error.message || 'WebGL initialization failed'}`);
            console.error('Unable to initialize the 3D coach:', error);
        }

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
