import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// ============================================================================
// ADVANCED AUDIO ENGINE - Realistic Firework Sounds
// ============================================================================
const AudioEngine = {
    ctx: null,
    enabled: false,
    masterVolume: 0.6,
    masterGain: null,
    convolver: null,
    reverbBuffer: null,

    init: function() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            // Master gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.masterVolume;

            // Compressor/limiter for clean output
            const limiter = this.ctx.createDynamicsCompressor();
            limiter.threshold.value = -6;
            limiter.knee.value = 30;
            limiter.ratio.value = 12;
            limiter.attack.value = 0.003;
            limiter.release.value = 0.25;

            // Create reverb for spatial depth
            this.createReverb();

            this.masterGain.connect(limiter);
            limiter.connect(this.ctx.destination);
            this.enabled = true;
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    createReverb: function() {
        // Simple algorithmic reverb using delay nodes
        this.convolver = this.ctx.createConvolver();
        const length = this.ctx.sampleRate * 2.5;
        const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
            }
        }
        this.convolver.buffer = impulse;
    },

    // Calculate sound delay based on distance (speed of sound ~343 m/s)
    getSoundDelay: function(distance) {
        const speedOfSound = 343;
        const scaleFactor = 2; // World units to meters
        return (distance * scaleFactor) / speedOfSound;
    },

    playExplosion: function(type, distance = 0) {
        if (!this.enabled || !this.ctx) return;

        const delay = this.getSoundDelay(distance);
        const t = this.ctx.currentTime + delay;
        const volume = this.masterVolume * Math.max(0.3, 1 - distance / 200);

        switch(type) {
            case 'chrysanthemum':
            case 'peony':
                this.playDeepBoom(t, volume);
                break;
            case 'willow':
                this.playDeepBoom(t, volume * 0.8);
                this.playCrackle(t + 0.5, volume * 0.4, 3);
                break;
            case 'palm':
                this.playDeepBoom(t, volume);
                this.playWhoosh(t, volume * 0.3);
                break;
            case 'ring':
                this.playSharpCrack(t, volume);
                break;
            case 'crossette':
                this.playSharpCrack(t, volume * 0.7);
                setTimeout(() => this.playCrackle(this.ctx.currentTime, volume * 0.5, 5), (delay + 0.3) * 1000);
                break;
            case 'strobe':
                this.playSharpCrack(t, volume * 0.5);
                this.playCrackle(t + 0.2, volume * 0.6, 8);
                break;
            case 'glitter':
                this.playDeepBoom(t, volume * 0.7);
                this.playCrackle(t + 0.3, volume * 0.5, 6);
                break;
            default:
                this.playDeepBoom(t, volume);
        }
    },

    playDeepBoom: function(t, volume) {
        // Sub-bass fundamental
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 2);
        oscGain.gain.setValueAtTime(volume * 1.2, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 3);
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 3);

        // Mid-frequency punch
        const punch = this.ctx.createOscillator();
        const punchGain = this.ctx.createGain();
        punch.type = 'triangle';
        punch.frequency.setValueAtTime(150, t);
        punch.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        punchGain.gain.setValueAtTime(volume * 0.8, t);
        punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        punch.connect(punchGain);
        punchGain.connect(this.masterGain);
        punch.start(t);
        punch.stop(t + 0.4);

        // Noise layer for texture
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(200, t);
        noiseFilter.frequency.exponentialRampToValueAtTime(30, t + 1.5);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.6, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 2);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(t);
    },

    playSharpCrack: function(t, volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
        gain.gain.setValueAtTime(volume * 0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
    },

    playCrackle: function(t, volume, count = 5) {
        for (let i = 0; i < count; i++) {
            const delay = Math.random() * 0.8;
            const crackTime = t + delay;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(2000 + Math.random() * 1000, crackTime);
            osc.frequency.exponentialRampToValueAtTime(200, crackTime + 0.02);
            gain.gain.setValueAtTime(volume * (0.2 + Math.random() * 0.3), crackTime);
            gain.gain.exponentialRampToValueAtTime(0.001, crackTime + 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(crackTime);
            osc.stop(crackTime + 0.05);
        }
    },

    playWhoosh: function(t, volume) {
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.8);
        filter.Q.value = 2;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(volume * 0.4, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(t);
    },

    playRocketWhistle: function(duration = 1.5) {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.linearRampToValueAtTime(1200 + Math.random() * 400, t + duration);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.15, t + 0.1);
        gain.gain.linearRampToValueAtTime(this.masterVolume * 0.08, t + duration * 0.8);
        gain.gain.linearRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + duration);
    },

    setVolume: function(v) {
        this.masterVolume = v;
        if (this.masterGain) {
            this.masterGain.gain.value = v;
        }
    }
};

// ============================================================================
// SPRITE & TEXTURE GENERATION
// ============================================================================
function createParticleSprite(size = 64, soft = true) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);

    if (soft) {
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.1, 'rgba(255,255,255,0.95)');
        gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)');
        gradient.addColorStop(0.7, 'rgba(255,255,255,0.1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(0.6, 'rgba(255,255,255,0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

function createTrailSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(16, 0, 16, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.3, 'rgba(255,200,100,0.5)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(24, 64);
    ctx.lineTo(8, 64);
    ctx.closePath();
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
}

const particleSprite = createParticleSprite(64, true);
const sparkSprite = createParticleSprite(32, false);
const trailSprite = createTrailSprite();

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    // Particle settings
    particleCount: 20000,
    particleSize: 0.9,
    trailLength: 8,

    // Physics
    explosionForce: 3.5,
    gravity: 0.004,
    airDrag: 0.015,
    windStrength: 0.3,
    windDirection: 0,
    hoverDuration: 0.8,

    // Fade & lifetime
    fadeSpeed: 0.006,
    sparkleIntensity: 0.5,

    // Rocket
    rocketSpeed: 1.2,
    rocketSize: 2.5,
    rocketTrailLength: 20,

    // Visual
    bloomStrength: 1.8,
    bloomRadius: 0.6,
    bloomThreshold: 0.1,
    trailOpacity: 0.25,
    smokeEnabled: true,

    // Timing
    autoLaunch: true,
    launchInterval: 2500,
    finaleMode: false,

    // Audio
    soundEnabled: true,
    volume: 0.6,

    // Environment
    starCount: 4000,
    groundReflection: true
};

// Wind simulation
const wind = {
    x: 0,
    z: 0,
    time: 0,
    update: function(dt) {
        this.time += dt;
        const angle = CONFIG.windDirection * Math.PI / 180 + Math.sin(this.time * 0.5) * 0.3;
        const strength = CONFIG.windStrength * (0.7 + Math.sin(this.time * 0.3) * 0.3);
        this.x = Math.cos(angle) * strength * 0.001;
        this.z = Math.sin(angle) * strength * 0.001;
    }
};

// ============================================================================
// FIREWORK TYPES - Different explosion patterns
// ============================================================================
const FireworkTypes = {
    chrysanthemum: {
        name: 'Chrysanthemum',
        particleMultiplier: 1.0,
        spreadPattern: 'sphere',
        hasTrails: true,
        trailFade: 0.85,
        colorShift: true,
        gravity: 1.0
    },
    peony: {
        name: 'Peony',
        particleMultiplier: 0.8,
        spreadPattern: 'sphere',
        hasTrails: false,
        colorShift: false,
        gravity: 1.2
    },
    willow: {
        name: 'Willow',
        particleMultiplier: 1.2,
        spreadPattern: 'weeping',
        hasTrails: true,
        trailFade: 0.92,
        colorShift: true,
        gravity: 0.6,
        longLife: true
    },
    palm: {
        name: 'Palm',
        particleMultiplier: 0.6,
        spreadPattern: 'palm',
        hasTrails: true,
        trailFade: 0.88,
        colorShift: false,
        gravity: 1.0
    },
    ring: {
        name: 'Ring',
        particleMultiplier: 0.5,
        spreadPattern: 'ring',
        hasTrails: false,
        colorShift: false,
        gravity: 1.0
    },
    crossette: {
        name: 'Crossette',
        particleMultiplier: 0.4,
        spreadPattern: 'crossette',
        hasTrails: true,
        trailFade: 0.8,
        colorShift: false,
        gravity: 1.0,
        splits: true
    },
    strobe: {
        name: 'Strobe',
        particleMultiplier: 0.7,
        spreadPattern: 'sphere',
        hasTrails: false,
        colorShift: false,
        gravity: 0.8,
        strobe: true
    },
    glitter: {
        name: 'Glitter',
        particleMultiplier: 1.3,
        spreadPattern: 'sphere',
        hasTrails: true,
        trailFade: 0.75,
        colorShift: true,
        gravity: 1.1,
        glitter: true
    }
};

// ============================================================================
// SCENE SETUP
// ============================================================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000005, 0.0015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 20, 180);
camera.lookAt(0, 30, 0);

const renderer = new THREE.WebGLRenderer({
    antialias: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.autoClearColor = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// Post-processing
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    CONFIG.bloomStrength,
    CONFIG.bloomRadius,
    CONFIG.bloomThreshold
);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ============================================================================
// ENVIRONMENT - Stars, Ground, Reflection
// ============================================================================
function createStarField() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CONFIG.starCount * 3);
    const sizes = new Float32Array(CONFIG.starCount);
    const twinklePhases = new Float32Array(CONFIG.starCount);

    for (let i = 0; i < CONFIG.starCount; i++) {
        const i3 = i * 3;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 800 + Math.random() * 600;

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = Math.abs(radius * Math.sin(phi) * Math.sin(theta)) * 0.5 + 50;
        positions[i3 + 2] = radius * Math.cos(phi);

        sizes[i] = 0.5 + Math.random() * 1.5;
        twinklePhases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.userData.twinklePhases = twinklePhases;
    geometry.userData.baseSizes = sizes.slice();

    const material = new THREE.PointsMaterial({
        size: 1.5,
        map: sparkSprite,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0xffffff,
        opacity: 0.8
    });

    return new THREE.Points(geometry, material);
}

const starField = createStarField();
scene.add(starField);

// Animate star twinkling
function updateStars(time) {
    const sizes = starField.geometry.attributes.size.array;
    const phases = starField.geometry.userData.twinklePhases;
    const baseSizes = starField.geometry.userData.baseSizes;

    for (let i = 0; i < CONFIG.starCount; i++) {
        sizes[i] = baseSizes[i] * (0.7 + 0.3 * Math.sin(time * 2 + phases[i]));
    }
    starField.geometry.attributes.size.needsUpdate = true;
}

// Trail fade overlay
const fadeMaterial = new THREE.MeshBasicMaterial({
    color: 0x000005,
    transparent: true,
    opacity: CONFIG.trailOpacity
});
const fadeQuad = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), fadeMaterial);
fadeQuad.position.z = camera.position.z - 100;
fadeQuad.lookAt(camera.position);
scene.add(fadeQuad);

// Ground plane with reflection
let groundMirror = null;
function createGround() {
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshBasicMaterial({
        color: 0x000008,
        transparent: true,
        opacity: 0.3
    });
    groundMirror = new THREE.Mesh(groundGeo, groundMat);
    groundMirror.rotation.x = -Math.PI / 2;
    groundMirror.position.y = -80;
    scene.add(groundMirror);
}
createGround();

// ============================================================================
// GUI CONTROLS
// ============================================================================
const gui = new GUI({ title: 'Big Bang Simulator' });

const fDisplay = gui.addFolder('Display');
fDisplay.add(CONFIG, 'particleCount', 5000, 40000, 1000).name('Particles');
fDisplay.add(CONFIG, 'particleSize', 0.3, 2.0).name('Particle Size');
fDisplay.add(CONFIG, 'bloomStrength', 0.5, 3.0).name('Bloom').onChange(v => bloomPass.strength = v);
fDisplay.add(CONFIG, 'trailOpacity', 0.1, 0.5).name('Trail Opacity').onChange(v => fadeMaterial.opacity = v);

const fPhysics = gui.addFolder('Physics');
fPhysics.add(CONFIG, 'explosionForce', 1.0, 6.0).name('Explosion Force');
fPhysics.add(CONFIG, 'gravity', 0.001, 0.015).name('Gravity');
fPhysics.add(CONFIG, 'windStrength', 0, 1.0).name('Wind Strength');
fPhysics.add(CONFIG, 'windDirection', 0, 360).name('Wind Direction');
fPhysics.add(CONFIG, 'hoverDuration', 0, 2.0).name('Hover Time');

const fLaunch = gui.addFolder('Launch');
fLaunch.add(CONFIG, 'autoLaunch').name('Auto Launch');
fLaunch.add(CONFIG, 'launchInterval', 500, 6000).name('Interval (ms)');
fLaunch.add(CONFIG, 'finaleMode').name('Finale Mode');
fLaunch.add({ launch: () => launchFirework() }, 'launch').name('Launch Now!');

const fAudio = gui.addFolder('Audio');
fAudio.add(CONFIG, 'soundEnabled').name('Sound');
fAudio.add(CONFIG, 'volume', 0, 1).name('Volume').onChange(v => AudioEngine.setVolume(v));

gui.close();

// ============================================================================
// SMOKE PARTICLE SYSTEM
// ============================================================================
class SmokeSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxParticles * 3);
        const opacities = new Float32Array(this.maxParticles);
        const sizes = new Float32Array(this.maxParticles);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 15,
            map: particleSprite,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
            color: 0x444444,
            opacity: 0.3
        });

        this.mesh = new THREE.Points(geometry, material);
        scene.add(this.mesh);
    }

    emit(x, y, z, count = 10) {
        if (!CONFIG.smokeEnabled) return;

        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 5,
                y: y + (Math.random() - 0.5) * 5,
                z: z + (Math.random() - 0.5) * 5,
                vx: (Math.random() - 0.5) * 0.2,
                vy: Math.random() * 0.3 + 0.1,
                vz: (Math.random() - 0.5) * 0.2,
                life: 1.0,
                size: 10 + Math.random() * 20
            });
        }
    }

    update(dt) {
        const positions = this.mesh.geometry.attributes.position.array;
        const opacities = this.mesh.geometry.attributes.opacity.array;
        const sizes = this.mesh.geometry.attributes.size.array;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx + wind.x * 10;
            p.y += p.vy;
            p.z += p.vz + wind.z * 10;
            p.vy *= 0.98;
            p.life -= dt * 0.3;
            p.size += dt * 5;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update buffers
        for (let i = 0; i < this.maxParticles; i++) {
            const i3 = i * 3;
            if (i < this.particles.length) {
                const p = this.particles[i];
                positions[i3] = p.x;
                positions[i3 + 1] = p.y;
                positions[i3 + 2] = p.z;
                opacities[i] = p.life * 0.2;
                sizes[i] = p.size;
            } else {
                positions[i3] = 0;
                positions[i3 + 1] = -1000;
                positions[i3 + 2] = 0;
                opacities[i] = 0;
            }
        }

        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.geometry.attributes.opacity.needsUpdate = true;
        this.mesh.geometry.attributes.size.needsUpdate = true;
    }
}

const smokeSystem = new SmokeSystem();

// ============================================================================
// FIREWORK CLASS - Advanced Realistic Fireworks
// ============================================================================
class Firework {
    constructor(startX, startZ = null, type = null) {
        this.isDead = false;
        this.phase = 'rocket';
        this.timer = 0;
        this.explosionTime = 0;

        // Random type if not specified
        const types = Object.keys(FireworkTypes);
        this.typeName = type || types[Math.floor(Math.random() * types.length)];
        this.type = FireworkTypes[this.typeName];

        // Color generation
        this.generateColors();

        // Initial position
        this.pos = new THREE.Vector3(
            startX,
            -85,
            startZ !== null ? startZ : (Math.random() - 0.5) * 80
        );

        // Calculate distance for sound delay
        this.distance = this.pos.distanceTo(camera.position);

        // Rocket velocity
        this.vel = new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            CONFIG.rocketSpeed * (0.9 + Math.random() * 0.2),
            (Math.random() - 0.5) * 0.2
        );

        // Target height
        this.targetY = 10 + Math.random() * 50;

        // Create rocket
        this.createRocket();

        // Play whistle
        if (CONFIG.soundEnabled && Math.random() > 0.5) {
            AudioEngine.playRocketWhistle(this.targetY / CONFIG.rocketSpeed / 60);
        }
    }

    generateColors() {
        const rand = Math.random();
        const baseHue = Math.random();
        this.colors = [];
        this.colorTransitions = [];

        if (rand < 0.25) {
            // Single color
            this.colors.push(new THREE.Color().setHSL(baseHue, 0.9, 0.6));
            if (this.type.colorShift) {
                this.colorTransitions.push(new THREE.Color().setHSL(baseHue, 0.7, 0.3));
            }
        } else if (rand < 0.5) {
            // Complementary
            this.colors.push(new THREE.Color().setHSL(baseHue, 0.95, 0.6));
            this.colors.push(new THREE.Color().setHSL((baseHue + 0.5) % 1, 0.95, 0.55));
        } else if (rand < 0.75) {
            // Triadic
            this.colors.push(new THREE.Color().setHSL(baseHue, 0.9, 0.6));
            this.colors.push(new THREE.Color().setHSL((baseHue + 0.33) % 1, 0.9, 0.55));
            this.colors.push(new THREE.Color().setHSL((baseHue + 0.66) % 1, 0.9, 0.55));
        } else {
            // Gold/Silver special
            if (Math.random() > 0.5) {
                this.colors.push(new THREE.Color(1, 0.85, 0.4)); // Gold
                this.colorTransitions.push(new THREE.Color(1, 0.3, 0.1)); // Red fade
            } else {
                this.colors.push(new THREE.Color(0.9, 0.95, 1)); // Silver
                this.colorTransitions.push(new THREE.Color(0.4, 0.6, 1)); // Blue fade
            }
        }
    }

    createRocket() {
        // Rocket head
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute([...this.pos.toArray()], 3));

        this.rocketMesh = new THREE.Points(geo, new THREE.PointsMaterial({
            size: CONFIG.rocketSize,
            color: this.colors[0],
            map: sparkSprite,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }));
        scene.add(this.rocketMesh);

        // Rocket trail
        this.trailPositions = [];
        for (let i = 0; i < CONFIG.rocketTrailLength; i++) {
            this.trailPositions.push(this.pos.clone());
        }

        const trailGeo = new THREE.BufferGeometry();
        const trailPosArray = new Float32Array(CONFIG.rocketTrailLength * 3);
        const trailColors = new Float32Array(CONFIG.rocketTrailLength * 3);
        const trailSizes = new Float32Array(CONFIG.rocketTrailLength);

        for (let i = 0; i < CONFIG.rocketTrailLength; i++) {
            const alpha = 1 - i / CONFIG.rocketTrailLength;
            trailColors[i * 3] = 1;
            trailColors[i * 3 + 1] = 0.6 * alpha;
            trailColors[i * 3 + 2] = 0.2 * alpha;
            trailSizes[i] = CONFIG.rocketSize * 0.8 * alpha;
        }

        trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPosArray, 3));
        trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
        trailGeo.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

        this.rocketTrail = new THREE.Points(trailGeo, new THREE.PointsMaterial({
            size: CONFIG.rocketSize * 0.6,
            map: particleSprite,
            transparent: true,
            depthWrite: false,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        }));
        scene.add(this.rocketTrail);
    }

    updateRocket() {
        // Apply physics
        this.vel.y *= 0.995;
        this.vel.x += wind.x;
        this.vel.z += wind.z;
        this.pos.add(this.vel);

        // Update trail
        this.trailPositions.unshift(this.pos.clone());
        this.trailPositions.pop();

        const positions = this.rocketTrail.geometry.attributes.position.array;
        for (let i = 0; i < CONFIG.rocketTrailLength; i++) {
            const p = this.trailPositions[i];
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
        }
        this.rocketTrail.geometry.attributes.position.needsUpdate = true;

        // Update head
        this.rocketMesh.geometry.attributes.position.setXYZ(0, this.pos.x, this.pos.y, this.pos.z);
        this.rocketMesh.geometry.attributes.position.needsUpdate = true;

        // Emit smoke
        if (Math.random() > 0.7) {
            smokeSystem.emit(this.pos.x, this.pos.y, this.pos.z, 2);
        }

        // Check for explosion
        if (this.vel.y < 0.15 || this.pos.y >= this.targetY) {
            this.explode();
        }
    }

    explode() {
        // Remove rocket
        scene.remove(this.rocketMesh);
        scene.remove(this.rocketTrail);
        this.rocketMesh.geometry.dispose();
        this.rocketMesh.material.dispose();
        this.rocketTrail.geometry.dispose();
        this.rocketTrail.material.dispose();

        this.phase = 'explode';
        this.explosionTime = 0;

        // Calculate particle count based on type
        this.currentParticleCount = Math.floor(CONFIG.particleCount * this.type.particleMultiplier);

        // Play explosion sound
        if (CONFIG.soundEnabled) {
            AudioEngine.playExplosion(this.typeName, this.distance);
        }

        // Emit smoke at explosion point
        smokeSystem.emit(this.pos.x, this.pos.y, this.pos.z, 30);

        // Create explosion particles
        this.createExplosion();
    }

    createExplosion() {
        const count = this.currentParticleCount;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const lifetimes = new Float32Array(count);
        const particleTypes = new Float32Array(count); // For special effects

        this.velocities = velocities;
        this.lifetimes = lifetimes;
        this.baseColors = new Float32Array(count * 3);
        this.particleTypes = particleTypes;

        const baseSpeed = CONFIG.explosionForce * (0.8 + Math.random() * 0.4);

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            positions[i3] = this.pos.x;
            positions[i3 + 1] = this.pos.y;
            positions[i3 + 2] = this.pos.z;

            // Generate velocity based on pattern
            const vel = this.generatePatternVelocity(i, count, baseSpeed);
            velocities[i3] = vel.x;
            velocities[i3 + 1] = vel.y;
            velocities[i3 + 2] = vel.z;

            // Color selection
            const colorIndex = Math.floor(Math.random() * this.colors.length);
            const color = this.colors[colorIndex];
            const brightness = 0.6 + Math.random() * 0.4;

            this.baseColors[i3] = color.r * brightness;
            this.baseColors[i3 + 1] = color.g * brightness;
            this.baseColors[i3 + 2] = color.b * brightness;

            colors[i3] = this.baseColors[i3];
            colors[i3 + 1] = this.baseColors[i3 + 1];
            colors[i3 + 2] = this.baseColors[i3 + 2];

            // Lifetime variation
            lifetimes[i] = 0.8 + Math.random() * 0.4;
            if (this.type.longLife) lifetimes[i] *= 1.5;

            // Special particle types
            if (this.type.glitter && Math.random() > 0.7) {
                particleTypes[i] = 1; // Glitter
            } else if (this.type.strobe && Math.random() > 0.5) {
                particleTypes[i] = 2; // Strobe
            } else {
                particleTypes[i] = 0; // Normal
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.sparkSystem = new THREE.Points(geometry, new THREE.PointsMaterial({
            size: CONFIG.particleSize,
            map: particleSprite,
            transparent: true,
            depthWrite: false,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        }));

        scene.add(this.sparkSystem);

        // Setup crossette splits if applicable
        if (this.type.splits) {
            this.splitTimers = new Float32Array(count);
            for (let i = 0; i < count; i++) {
                this.splitTimers[i] = 0.3 + Math.random() * 0.3;
            }
            this.hasSplit = new Array(count).fill(false);
        }
    }

    generatePatternVelocity(index, total, baseSpeed) {
        const pattern = this.type.spreadPattern;
        let x, y, z;

        switch (pattern) {
            case 'sphere':
            default: {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const speed = baseSpeed * (0.7 + Math.random() * 0.6);
                x = speed * Math.sin(phi) * Math.cos(theta);
                y = speed * Math.sin(phi) * Math.sin(theta);
                z = speed * Math.cos(phi);
                break;
            }
            case 'weeping': {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const speed = baseSpeed * (0.5 + Math.random() * 0.5);
                x = speed * Math.sin(phi) * Math.cos(theta) * 0.7;
                y = speed * Math.sin(phi) * Math.sin(theta) * 0.5 + baseSpeed * 0.3;
                z = speed * Math.cos(phi) * 0.7;
                break;
            }
            case 'palm': {
                const theta = Math.random() * Math.PI * 2;
                const spread = Math.random();
                const speed = baseSpeed * (0.8 + Math.random() * 0.4);
                x = speed * spread * Math.cos(theta);
                y = speed * (0.8 + spread * 0.5);
                z = speed * spread * Math.sin(theta);
                break;
            }
            case 'ring': {
                const theta = (index / total) * Math.PI * 2 + Math.random() * 0.2;
                const speed = baseSpeed * (0.9 + Math.random() * 0.2);
                const ringTilt = Math.random() * 0.3;
                x = speed * Math.cos(theta);
                y = speed * ringTilt * Math.sin(theta * 2);
                z = speed * Math.sin(theta);
                break;
            }
            case 'crossette': {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const speed = baseSpeed * 0.6 * (0.8 + Math.random() * 0.4);
                x = speed * Math.sin(phi) * Math.cos(theta);
                y = speed * Math.sin(phi) * Math.sin(theta);
                z = speed * Math.cos(phi);
                break;
            }
        }

        return { x, y, z };
    }

    updateExplosion(dt) {
        this.timer += dt;
        this.explosionTime += dt;

        const positions = this.sparkSystem.geometry.attributes.position.array;
        const colors = this.sparkSystem.geometry.attributes.color.array;
        let aliveCount = 0;

        const isHovering = this.timer < CONFIG.hoverDuration;
        const gravityFactor = THREE.MathUtils.smoothstep(
            this.timer,
            CONFIG.hoverDuration,
            CONFIG.hoverDuration + 0.5
        );

        const effectiveGravity = CONFIG.gravity * this.type.gravity;

        for (let i = 0; i < this.currentParticleCount; i++) {
            if (this.lifetimes[i] <= 0) continue;

            aliveCount++;
            const i3 = i * 3;

            // Get current velocity magnitude for drag calculation
            const vx = this.velocities[i3];
            const vy = this.velocities[i3 + 1];
            const vz = this.velocities[i3 + 2];
            const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

            // Quadratic air drag
            const dragFactor = 1 - CONFIG.airDrag * speed * dt;

            // Update velocities
            this.velocities[i3] *= dragFactor;
            this.velocities[i3 + 1] *= dragFactor;
            this.velocities[i3 + 2] *= dragFactor;

            // Apply wind
            this.velocities[i3] += wind.x;
            this.velocities[i3 + 2] += wind.z;

            // Apply gravity after hover
            if (!isHovering) {
                this.velocities[i3 + 1] -= effectiveGravity * gravityFactor;
                this.lifetimes[i] -= CONFIG.fadeSpeed;
            }

            // Update positions
            positions[i3] += this.velocities[i3];
            positions[i3 + 1] += this.velocities[i3 + 1];
            positions[i3 + 2] += this.velocities[i3 + 2];

            // Handle crossette splits
            if (this.type.splits && !this.hasSplit[i] && this.explosionTime > this.splitTimers[i]) {
                this.hasSplit[i] = true;
                // Randomize velocity for split effect
                const splitSpeed = 0.5 + Math.random() * 0.5;
                const theta = Math.random() * Math.PI * 2;
                this.velocities[i3] = Math.cos(theta) * splitSpeed;
                this.velocities[i3 + 1] = Math.random() * splitSpeed;
                this.velocities[i3 + 2] = Math.sin(theta) * splitSpeed;
            }

            // Color calculation
            let alpha = Math.max(0, this.lifetimes[i]);

            // Special effects
            if (this.particleTypes[i] === 1) {
                // Glitter - random flashing
                alpha *= 0.3 + Math.random() * 0.7;
            } else if (this.particleTypes[i] === 2) {
                // Strobe - on/off flashing
                alpha *= Math.sin(this.explosionTime * 30) > 0 ? 1 : 0.1;
            }

            // Apply sparkle
            const sparkle = 1 + Math.sin(this.explosionTime * 20 + i) * CONFIG.sparkleIntensity * 0.2;

            // Color transition
            if (this.colorTransitions && this.colorTransitions.length > 0 && this.lifetimes[i] < 0.5) {
                const transitionAlpha = 1 - this.lifetimes[i] * 2;
                const transColor = this.colorTransitions[0];
                colors[i3] = THREE.MathUtils.lerp(this.baseColors[i3], transColor.r, transitionAlpha) * alpha * sparkle;
                colors[i3 + 1] = THREE.MathUtils.lerp(this.baseColors[i3 + 1], transColor.g, transitionAlpha) * alpha * sparkle;
                colors[i3 + 2] = THREE.MathUtils.lerp(this.baseColors[i3 + 2], transColor.b, transitionAlpha) * alpha * sparkle;
            } else {
                colors[i3] = this.baseColors[i3] * alpha * sparkle;
                colors[i3 + 1] = this.baseColors[i3 + 1] * alpha * sparkle;
                colors[i3 + 2] = this.baseColors[i3 + 2] * alpha * sparkle;
            }
        }

        this.sparkSystem.geometry.attributes.position.needsUpdate = true;
        this.sparkSystem.geometry.attributes.color.needsUpdate = true;

        if (aliveCount === 0) {
            this.cleanup();
        }
    }

    update(dt) {
        if (this.phase === 'rocket') {
            this.updateRocket();
        } else {
            this.updateExplosion(dt);
        }
    }

    cleanup() {
        this.isDead = true;
        if (this.sparkSystem) {
            scene.remove(this.sparkSystem);
            this.sparkSystem.geometry.dispose();
            this.sparkSystem.material.dispose();
        }
        if (this.rocketMesh) {
            scene.remove(this.rocketMesh);
            this.rocketMesh.geometry.dispose();
            this.rocketMesh.material.dispose();
        }
        if (this.rocketTrail) {
            scene.remove(this.rocketTrail);
            this.rocketTrail.geometry.dispose();
            this.rocketTrail.material.dispose();
        }
    }
}

// ============================================================================
// MAIN LOOP
// ============================================================================
const fireworks = [];
let lastLaunchTime = 0;
let nextLaunchDelay = CONFIG.launchInterval;
const clock = new THREE.Clock();

function launchFirework(x = null, z = null, type = null) {
    const posX = x !== null ? x : (Math.random() - 0.5) * 180;
    const posZ = z !== null ? z : (Math.random() - 0.5) * 60;
    fireworks.push(new Firework(posX, posZ, type));
}

function launchFinale() {
    const count = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            launchFirework(
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 80
            );
        }, i * 100);
    }
}

function updateLaunchQueue(time) {
    if (!CONFIG.autoLaunch) return;

    if (time - lastLaunchTime > nextLaunchDelay) {
        lastLaunchTime = time;

        if (CONFIG.finaleMode) {
            launchFinale();
            nextLaunchDelay = CONFIG.launchInterval * 2 + Math.random() * 2000;
        } else {
            launchFirework();
            // Occasionally launch multiple
            if (Math.random() > 0.7) {
                setTimeout(() => launchFirework(), 200 + Math.random() * 300);
            }
            nextLaunchDelay = CONFIG.launchInterval * (0.8 + Math.random() * 0.4);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1); // Cap delta time
    const elapsed = clock.getElapsedTime();

    // Update systems
    wind.update(dt);
    smokeSystem.update(dt);
    updateStars(elapsed);
    updateLaunchQueue(performance.now());

    // Update fireworks
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update(dt);
        if (fireworks[i].isDead) {
            fireworks.splice(i, 1);
        }
    }

    // Render
    composer.render();
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Click to launch
container.addEventListener('click', (e) => {
    if (document.getElementById('overlay').style.display !== 'none') return;

    // Convert click to world coordinates
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Project to world space
    const worldX = x * 100;
    const worldZ = (Math.random() - 0.5) * 40;

    launchFirework(worldX, worldZ);
});

// Keyboard controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        launchFirework();
    } else if (e.code === 'KeyF') {
        launchFinale();
    }
});

// Start overlay
const overlay = document.getElementById('overlay');
overlay.addEventListener('click', () => {
    AudioEngine.init();
    overlay.style.display = 'none';
    launchFirework();
});

// Start animation
animate();
