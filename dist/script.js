import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// CSS2D Renderer for labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.getElementById('canvas-container').appendChild(labelRenderer.domElement);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 150;
controls.target.set(0, 0, 0);

// Post-processing with bloom
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // bloom strength
    0.4,  // radius
    0.85  // threshold
);
composer.addPass(bloomPass);

// Universe expansion parameters
const UNIVERSE_LENGTH = 80;  // Total length of the cone
const MAX_RADIUS = 25;       // Maximum radius at the end

// Era positions along the cone (0 = singularity, 1 = present)
const ERAS = {
    singularity: { start: 0, end: 0.02, color: 0xffffff },
    inflation: { start: 0.02, end: 0.08, color: 0x88ccff },
    cmb: { start: 0.08, end: 0.15, color: 0x44aaff },
    darkAges: { start: 0.15, end: 0.35, color: 0x223366 },
    firstStars: { start: 0.35, end: 0.5, color: 0x6688cc },
    galaxies: { start: 0.5, end: 0.75, color: 0x8899dd },
    darkEnergy: { start: 0.75, end: 1.0, color: 0xaabbff }
};

// Create the expanding universe cone
function createUniverseCone() {
    const segments = 64;
    const rings = 100;

    // Custom cone geometry that expands with acceleration at the end
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const uvs = [];
    const indices = [];

    for (let ring = 0; ring <= rings; ring++) {
        const t = ring / rings;
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;

        // Radius increases and accelerates near the end (dark energy effect)
        let radius = t * MAX_RADIUS;
        if (t > 0.7) {
            // Accelerated expansion
            const accelT = (t - 0.7) / 0.3;
            radius += accelT * accelT * MAX_RADIUS * 0.3;
        }

        // Very small at the beginning (singularity)
        if (t < 0.05) {
            radius *= t / 0.05;
        }

        for (let seg = 0; seg <= segments; seg++) {
            const theta = (seg / segments) * Math.PI * 2;
            const y = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;

            vertices.push(x, y, z);
            uvs.push(seg / segments, t);

            // Color based on era
            let color = new THREE.Color(0x334466);
            for (const [eraName, era] of Object.entries(ERAS)) {
                if (t >= era.start && t < era.end) {
                    color = new THREE.Color(era.color);
                    break;
                }
            }

            // Fade to transparent at edges
            const alpha = 0.3;
            colors.push(color.r * alpha, color.g * alpha, color.b * alpha);
        }
    }

    // Create indices for wireframe grid
    for (let ring = 0; ring < rings; ring++) {
        for (let seg = 0; seg < segments; seg++) {
            const a = ring * (segments + 1) + seg;
            const b = a + 1;
            const c = a + (segments + 1);
            const d = c + 1;

            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Transparent mesh for the cone
    const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Add grid lines
    createGridLines();

    return mesh;
}

// Create the grid lines on the cone surface
function createGridLines() {
    const gridMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2
    });

    // Longitudinal lines
    const longSegments = 16;
    const rings = 50;

    for (let seg = 0; seg < longSegments; seg++) {
        const theta = (seg / longSegments) * Math.PI * 2;
        const points = [];

        for (let ring = 0; ring <= rings; ring++) {
            const t = ring / rings;
            const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;

            let radius = t * MAX_RADIUS;
            if (t > 0.7) {
                const accelT = (t - 0.7) / 0.3;
                radius += accelT * accelT * MAX_RADIUS * 0.3;
            }
            if (t < 0.05) {
                radius *= t / 0.05;
            }

            const y = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            points.push(new THREE.Vector3(x, y, z));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, gridMaterial);
        scene.add(line);
    }

    // Circular rings
    const ringCount = 12;
    for (let i = 1; i <= ringCount; i++) {
        const t = i / ringCount;
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;

        let radius = t * MAX_RADIUS;
        if (t > 0.7) {
            const accelT = (t - 0.7) / 0.3;
            radius += accelT * accelT * MAX_RADIUS * 0.3;
        }
        if (t < 0.05) {
            radius *= t / 0.05;
        }

        const circleGeometry = new THREE.BufferGeometry();
        const circlePoints = [];
        const circleSegments = 64;

        for (let j = 0; j <= circleSegments; j++) {
            const theta = (j / circleSegments) * Math.PI * 2;
            circlePoints.push(new THREE.Vector3(
                x,
                Math.cos(theta) * radius,
                Math.sin(theta) * radius
            ));
        }

        circleGeometry.setFromPoints(circlePoints);
        const circle = new THREE.Line(circleGeometry, gridMaterial);
        scene.add(circle);
    }
}

// Create the Big Bang singularity (bright glowing sphere)
function createSingularity() {
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(-UNIVERSE_LENGTH / 2, 0, 0);
    scene.add(sphere);

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(4, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffaa,
        transparent: true,
        opacity: 0.5
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(sphere.position);
    scene.add(glow);

    // Larger outer glow
    const outerGlowGeometry = new THREE.SphereGeometry(8, 32, 32);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffeedd,
        transparent: true,
        opacity: 0.2
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    outerGlow.position.copy(sphere.position);
    scene.add(outerGlow);

    return { sphere, glow, outerGlow };
}

// Create the CMB (Cosmic Microwave Background) sphere
function createCMB() {
    const t = 0.12;
    const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;
    let radius = t * MAX_RADIUS;

    // Create CMB texture procedurally
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // CMB-like temperature fluctuation pattern
    const imageData = ctx.createImageData(512, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const px = (i / 4) % 512;
        const py = Math.floor((i / 4) / 512);

        // Simplex-like noise for temperature fluctuations
        const noise = Math.sin(px * 0.05) * Math.cos(py * 0.08) +
                      Math.sin(px * 0.02 + py * 0.03) * 0.5 +
                      Math.random() * 0.3;

        const normalized = (noise + 1.5) / 3;

        // Color map: blue (cold) -> cyan -> yellow -> red (hot)
        let r, g, b;
        if (normalized < 0.33) {
            // Blue to cyan
            const t = normalized / 0.33;
            r = 0;
            g = Math.floor(t * 200);
            b = Math.floor(150 + t * 50);
        } else if (normalized < 0.66) {
            // Cyan to yellow
            const t = (normalized - 0.33) / 0.33;
            r = Math.floor(t * 255);
            g = Math.floor(200 + t * 55);
            b = Math.floor(200 - t * 200);
        } else {
            // Yellow to red
            const t = (normalized - 0.66) / 0.34;
            r = 255;
            g = Math.floor(255 - t * 155);
            b = 0;
        }

        imageData.data[i] = r;
        imageData.data[i + 1] = g;
        imageData.data[i + 2] = b;
        imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);

    const geometry = new THREE.SphereGeometry(radius, 64, 32);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    const cmb = new THREE.Mesh(geometry, material);
    cmb.position.set(x, 0, 0);
    cmb.rotation.y = Math.PI / 2;
    scene.add(cmb);

    return cmb;
}

// Create galaxies as glowing points with bloom
function createGalaxies() {
    const galaxies = [];
    const galaxyCount = 2000;

    // Create point geometry for galaxies
    const positions = [];
    const colors = [];
    const sizes = [];

    for (let i = 0; i < galaxyCount; i++) {
        // Position along the cone, more galaxies in later eras
        const t = Math.pow(Math.random(), 0.5) * 0.65 + 0.35; // Bias toward later epochs
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;

        // Radius at this position
        let maxR = t * MAX_RADIUS;
        if (t > 0.7) {
            const accelT = (t - 0.7) / 0.3;
            maxR += accelT * accelT * MAX_RADIUS * 0.3;
        }

        // Random position within the cone's cross-section
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * maxR * 0.95;

        const y = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;

        positions.push(x, y, z);

        // Galaxy colors - mostly white/blue with some yellow
        const colorChoice = Math.random();
        let color;
        if (colorChoice < 0.5) {
            color = new THREE.Color(0.9, 0.95, 1.0); // Blueish white
        } else if (colorChoice < 0.8) {
            color = new THREE.Color(1.0, 0.95, 0.85); // Warm white
        } else {
            color = new THREE.Color(0.85, 0.9, 1.0); // Blue
        }
        colors.push(color.r, color.g, color.b);

        // Random sizes for variety
        sizes.push(0.3 + Math.random() * 0.7);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    // Custom shader for glowing points
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;

                float intensity = 1.0 - smoothstep(0.0, 0.5, d);
                intensity = pow(intensity, 1.5);

                gl_FragColor = vec4(vColor * intensity * 1.5, intensity);
            }
        `,
        transparent: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    galaxies.push(points);

    return galaxies;
}

// Create early universe stars (smaller, dimmer)
function createFirstStars() {
    const starCount = 500;
    const positions = [];
    const colors = [];
    const sizes = [];

    for (let i = 0; i < starCount; i++) {
        const t = 0.35 + Math.random() * 0.25; // First stars era
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;

        let maxR = t * MAX_RADIUS;

        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * maxR * 0.9;

        positions.push(x, Math.cos(theta) * r, Math.sin(theta) * r);

        // Blue-ish colors for first stars
        const color = new THREE.Color(0.7 + Math.random() * 0.3, 0.8 + Math.random() * 0.2, 1.0);
        colors.push(color.r, color.g, color.b);

        sizes.push(0.2 + Math.random() * 0.3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `
            attribute float size;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (200.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float intensity = 1.0 - smoothstep(0.0, 0.5, d);
                gl_FragColor = vec4(vColor * intensity, intensity * 0.8);
            }
        `,
        transparent: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    return points;
}

// Create background stars
function createBackgroundStars() {
    const starCount = 5000;
    const positions = [];
    const colors = [];

    for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 150 + Math.random() * 50;

        positions.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );

        const brightness = 0.3 + Math.random() * 0.7;
        colors.push(brightness, brightness, brightness);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    return stars;
}

// Create 3D labels for different eras
function createLabels() {
    const labels = [
        { text: 'Quantum\nFluctuations', position: [-38, -8, 0], era: 'singularity' },
        { text: 'Inflation', position: [-34, 8, 0], era: 'inflation' },
        { text: 'Afterglow Light\nPattern\n375,000 yrs', position: [-28, -12, 0], era: 'cmb' },
        { text: 'Dark Ages', position: [-15, 10, 0], era: 'darkAges' },
        { text: '1st Stars\nabout 400 million yrs', position: [0, -15, 0], era: 'firstStars' },
        { text: 'Development of\nGalaxies, Planets, etc.', position: [15, 12, 0], era: 'galaxies' },
        { text: 'Dark Energy\nAccelerated Expansion', position: [32, -18, 0], era: 'darkEnergy' }
    ];

    labels.forEach(labelData => {
        const div = document.createElement('div');
        div.className = 'label-3d';
        div.textContent = labelData.text;
        div.style.color = 'white';
        div.style.fontSize = '12px';
        div.style.fontWeight = '300';
        div.style.textAlign = 'center';
        div.style.whiteSpace = 'pre-line';
        div.style.textShadow = '0 0 10px black, 0 0 20px black';

        const label = new CSS2DObject(div);
        label.position.set(...labelData.position);
        scene.add(label);
    });
}

// Create timeline arrow at the bottom
function createTimelineArrow() {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });

    // Main line
    const linePoints = [
        new THREE.Vector3(-UNIVERSE_LENGTH / 2 - 5, -MAX_RADIUS - 8, 0),
        new THREE.Vector3(UNIVERSE_LENGTH / 2 + 5, -MAX_RADIUS - 8, 0)
    ];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const line = new THREE.Line(lineGeometry, material);
    scene.add(line);

    // Arrow head
    const arrowPoints = [
        new THREE.Vector3(UNIVERSE_LENGTH / 2 + 2, -MAX_RADIUS - 6, 0),
        new THREE.Vector3(UNIVERSE_LENGTH / 2 + 5, -MAX_RADIUS - 8, 0),
        new THREE.Vector3(UNIVERSE_LENGTH / 2 + 2, -MAX_RADIUS - 10, 0)
    ];
    const arrowGeometry = new THREE.BufferGeometry().setFromPoints(arrowPoints);
    const arrow = new THREE.Line(arrowGeometry, material);
    scene.add(arrow);

    // Start bracket
    const startPoints = [
        new THREE.Vector3(-UNIVERSE_LENGTH / 2 - 5, -MAX_RADIUS - 6, 0),
        new THREE.Vector3(-UNIVERSE_LENGTH / 2 - 5, -MAX_RADIUS - 10, 0)
    ];
    const startGeometry = new THREE.BufferGeometry().setFromPoints(startPoints);
    const startBracket = new THREE.Line(startGeometry, material);
    scene.add(startBracket);
}

// Initialize the visualization
function init() {
    createUniverseCone();
    createSingularity();
    createCMB();
    createGalaxies();
    createFirstStars();
    createBackgroundStars();
    createLabels();
    createTimelineArrow();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Era buttons interactivity
    document.querySelectorAll('.era').forEach(button => {
        button.addEventListener('click', (e) => {
            const era = e.target.dataset.era;
            focusOnEra(era);
        });
    });
}

// Focus camera on specific era
function focusOnEra(era) {
    const positions = {
        singularity: { x: -35, y: 5, z: 20 },
        inflation: { x: -30, y: 5, z: 25 },
        cmb: { x: -20, y: 5, z: 20 },
        darkages: { x: -5, y: 5, z: 30 },
        firststars: { x: 5, y: 8, z: 25 },
        galaxies: { x: 20, y: 10, z: 35 },
        darkenergy: { x: 35, y: 12, z: 40 }
    };

    const pos = positions[era];
    if (pos) {
        // Animate camera to position
        const startPos = camera.position.clone();
        const endPos = new THREE.Vector3(pos.x, pos.y, pos.z);
        const duration = 1000;
        const startTime = Date.now();

        function animateCamera() {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            camera.position.lerpVectors(startPos, endPos, easeT);

            if (t < 1) {
                requestAnimationFrame(animateCamera);
            }
        }

        animateCamera();

        // Update active button
        document.querySelectorAll('.era').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-era="${era}"]`)?.classList.add('active');
    }
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);

    time += 0.01;

    // Update controls
    controls.update();

    // Render with bloom
    composer.render();

    // Render labels
    labelRenderer.render(scene, camera);
}

// Start
init();
animate();
