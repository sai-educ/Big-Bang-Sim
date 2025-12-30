import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

console.log("Big Bang Sim: Version 8.2 Loaded (Enhanced Galaxies)");

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
controls.maxDistance = 300; // Increased max distance
controls.target.set(0, -5, 0);

// Post-processing with subtle bloom (conservative settings to avoid flashing)
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,   // bloom strength - subtle glow
    0.3,   // radius - tight bloom
    0.92   // threshold - only brightest elements bloom
);
composer.addPass(bloomPass);

// Universe expansion parameters
const UNIVERSE_LENGTH = 80;  // Total length of the cone
const MAX_RADIUS = 25;       // Maximum radius at the end

// Store detailed galaxies for animation updates
const animatedGalaxies = [];

// Era positions along the cone (0 = singularity, 1 = present)
const ERAS = {
    singularity: { start: 0, end: 0.02, color: 0x000000 },
    inflation: { start: 0.02, end: 0.08, color: 0x000000 },
    cmb: { start: 0.08, end: 0.15, color: 0x000000 },
    darkAges: { start: 0.15, end: 0.35, color: 0x000000 },
    firstStars: { start: 0.35, end: 0.5, color: 0x000000 },
    galaxies: { start: 0.5, end: 0.75, color: 0x000000 },
    darkEnergy: { start: 0.75, end: 1.0, color: 0x000000 }
};

// Calculate radius at time t (0 to 1) based on WMAP/Condom shape
function getUniverseRadius(t) {
    // 1. Singularity to Inflation (Rapid expansion from point to tube)
    if (t < 0.05) {
        const p = t / 0.05;
        // Ease out Quartic: rapid start, slowing down
        const ease = 1 - Math.pow(1 - p, 4); 
        return ease * (MAX_RADIUS * 0.6); // Expands to 60% of max width quickly
    }
    
    // 2. The "Tube" (Dark Ages -> Early Galaxies) - Slow, steady expansion
    if (t < 0.75) {
        const p = (t - 0.05) / 0.7;
        const startR = MAX_RADIUS * 0.6;
        const endR = MAX_RADIUS * 0.75;
        return startR + p * (endR - startR);
    }
    
    // 3. Dark Energy (Accelerated Expansion) - Flaring out
    const p = (t - 0.75) / 0.25;
    const startR = MAX_RADIUS * 0.75;
    const endR = MAX_RADIUS;
    // Quadratic or Cubic flare
    return startR + (p * p) * (endR - startR);
}

// Create the expanding universe cone
function createUniverseCone() {
    const segments = 64;
    const rings = 128; // More rings for smoother inflation curve

    // Custom cone geometry that expands with acceleration at the end
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const uvs = [];
    const indices = [];

    for (let ring = 0; ring <= rings; ring++) {
        const t = ring / rings;
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;

        const radius = getUniverseRadius(t);

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
        opacity: 0.1, // Reduced main mesh opacity to let internal volumes shine
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
        opacity: 0.35 // Increased from 0.2 for better visibility
    });

    // Longitudinal lines
    const longSegments = 16;
    const rings = 128; // Increased for smoother curves

    for (let seg = 0; seg < longSegments; seg++) {
        const theta = (seg / longSegments) * Math.PI * 2;
        const points = [];

        for (let ring = 0; ring <= rings; ring++) {
            const t = ring / rings;
            const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;

            const radius = getUniverseRadius(t);

            const y = Math.cos(theta) * radius;
            const z = Math.sin(theta) * radius;
            points.push(new THREE.Vector3(x, y, z));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, gridMaterial);
        scene.add(line);
    }

    // Circular rings
    const ringCount = 20; // More rings to show shape better
    for (let i = 1; i <= ringCount; i++) {
        const t = i / ringCount;
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;

        const radius = getUniverseRadius(t);

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

// Create the Big Bang singularity (Intense bloom sphere at the origin)
function createSingularity() {
    // Create a high-resolution canvas-based glow texture for the Big Bang bloom
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Multi-layer gradient for rich bloom effect
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');      // Hot white center
    gradient.addColorStop(0.1, 'rgba(255, 250, 240, 0.95)'); // Warm white
    gradient.addColorStop(0.25, 'rgba(200, 220, 255, 0.7)'); // Blue-ish white
    gradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.3)');  // Blue fade
    gradient.addColorStop(0.75, 'rgba(50, 100, 200, 0.1)');  // Deep blue
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const glowTexture = new THREE.CanvasTexture(canvas);

    // Outer glow halo (large, soft)
    const outerGlowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xaaccff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.6
    });
    const outerGlow = new THREE.Sprite(outerGlowMaterial);
    outerGlow.position.set(-UNIVERSE_LENGTH / 2, 0, 0);
    outerGlow.scale.set(18, 18, 1); // Large outer halo
    scene.add(outerGlow);

    // Main bloom sphere
    const mainGlowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.85
    });
    const mainGlow = new THREE.Sprite(mainGlowMaterial);
    mainGlow.position.set(-UNIVERSE_LENGTH / 2, 0, 0);
    mainGlow.scale.set(10, 10, 1);
    scene.add(mainGlow);

    // Inner bright core
    const coreMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 1.0
    });
    const core = new THREE.Sprite(coreMaterial);
    core.position.set(-UNIVERSE_LENGTH / 2, 0, 0);
    core.scale.set(5, 5, 1); // Intense core
    scene.add(core);

    // Point light to illuminate nearby elements
    const light = new THREE.PointLight(0xaaddff, 4, 80);
    light.position.set(-UNIVERSE_LENGTH / 2, 0, 0);
    scene.add(light);

    return { outerGlow, mainGlow, core, light };
}

// Create the CMB (Cosmic Microwave Background) sphere with GLSL Shader
function createCMB() {
    const t = 0.12;
    const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;
    // Match the exact radius of the universe at this time point
    const radius = getUniverseRadius(t); 

    const geometry = new THREE.CircleGeometry(radius, 64);
    
    // Custom shader for CMB noise
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            colorHot: { value: new THREE.Vector3(1.0, 0.6, 0.1) },   // Orange/Red
            colorWarm: { value: new THREE.Vector3(1.0, 0.9, 0.3) },  // Yellow
            colorCool: { value: new THREE.Vector3(0.0, 0.6, 0.8) },  // Teal/Blue
            colorCold: { value: new THREE.Vector3(0.0, 0.1, 0.3) }   // Dark Blue
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 colorHot;
            uniform vec3 colorWarm;
            uniform vec3 colorCool;
            uniform vec3 colorCold;
            varying vec2 vUv;
            varying vec3 vPosition;

            // Simplex 3D Noise function (standard implementation)
            vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
                + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                    dot(x12.zw,x12.zw)), 0.0);
                m = m*m ;
                m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                // Generate high frequency noise for granularity
                float scale = 8.0;
                float noiseVal = snoise(vUv * scale + vec2(0.0, 0.0));
                
                // Add detail layers (fractal brownian motion style)
                noiseVal += 0.5 * snoise(vUv * scale * 2.0);
                noiseVal += 0.25 * snoise(vUv * scale * 4.0);
                
                // Normalize roughly to 0-1
                float n = (noiseVal + 1.0) * 0.5;
                
                // Color mapping logic
                vec3 finalColor;
                if (n < 0.35) {
                    finalColor = mix(colorCold, colorCool, n / 0.35);
                } else if (n < 0.6) {
                    finalColor = mix(colorCool, colorWarm, (n - 0.35) / 0.25);
                } else {
                    finalColor = mix(colorWarm, colorHot, (n - 0.6) / 0.4);
                }

                // Add a soft circular fade at the edges so it blends into space
                float dist = length(vUv - 0.5) * 2.0;
                float alpha = 1.0 - smoothstep(0.8, 1.0, dist);

                gl_FragColor = vec4(finalColor, alpha * 0.95);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const cmb = new THREE.Mesh(geometry, material);
    cmb.position.set(x, 0, 0);
    // Rotate to face camera/down the timeline (it's a circle geometry which defaults to XY plane)
    cmb.rotation.y = -Math.PI / 2; 
    
    // Store reference to update uniforms
    cmb.onBeforeRender = function() {
        material.uniforms.time.value += 0.001;
    };

    scene.add(cmb);
    return cmb;
}

// Galaxy color palettes for variety
const GALAXY_PALETTES = [
    { inside: '#ff6030', outside: '#1b3984' },  // Orange/Blue (classic spiral)
    { inside: '#ffcc66', outside: '#4466aa' },  // Gold/Blue
    { inside: '#ff8866', outside: '#6633aa' },  // Coral/Purple
    { inside: '#ffaa88', outside: '#2255aa' },  // Peach/Navy
    { inside: '#ffdd99', outside: '#553388' },  // Cream/Violet
    { inside: '#ff9977', outside: '#334488' },  // Salmon/Indigo
    { inside: '#eecc88', outside: '#445599' },  // Wheat/Steel Blue
    { inside: '#ffbb77', outside: '#3344aa' },  // Apricot/Cobalt
];

// Generate a single detailed spiral galaxy
function createDetailedGalaxy(position, scale, options = {}) {
    const palette = options.palette || GALAXY_PALETTES[Math.floor(Math.random() * GALAXY_PALETTES.length)];
    const parameters = {
        count: options.count || 2500,       // More particles for density
        size: 0.012,
        radius: options.radius || 3.0,       // Smaller radius for tighter galaxies
        branches: options.branches || (2 + Math.floor(Math.random() * 3)),
        spin: options.spin || (1.2 + Math.random() * 0.8),  // Tighter spin
        randomness: 0.12,                    // Less scatter for tighter arms
        randomnessPower: 3.5,
        insideColor: palette.inside,
        outsideColor: palette.outside
    };

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const scales = new Float32Array(parameters.count * 1);

    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;

        // Position along the radius (0 to 1)
        const radius = Math.random() * parameters.radius;

        // Spin angle
        const spinAngle = radius * parameters.spin;
        // Branch angle
        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;

        const x = Math.cos(branchAngle + spinAngle) * radius;
        const y = Math.random() * 0.2; // Flattened disc
        const z = Math.sin(branchAngle + spinAngle) * radius;

        // Randomness (scatter)
        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

        positions[i3] = x + randomX;
        positions[i3 + 1] = y + randomY;
        positions[i3 + 2] = z + randomZ;

        // Color mixed by radius
        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, radius / parameters.radius);

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
        
        // Scale: Center is denser/brighter
        scales[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    // Material
    const material = new THREE.ShaderMaterial({
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        uniforms: {
            uTime: { value: 0 },
            uSize: { value: 20.0 * scale } // Smaller particles for denser appearance
        },
        vertexShader: `
            uniform float uTime;
            uniform float uSize;
            attribute float aScale;
            varying vec3 vColor;
            
            void main() {
                vColor = color;
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                
                // Spin animation in vertex shader (optional, or do it by rotating mesh)
                float angle = atan(modelPosition.x, modelPosition.z);
                float distanceToCenter = length(modelPosition.xz);
                float angleOffset = (1.0 / distanceToCenter) * uTime * 0.2;
                // We will rotate the whole mesh in JS for performance, 
                // but here we calculate size perspective.
                
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectedPosition = projectionMatrix * viewPosition;
                
                gl_Position = projectedPosition;
                gl_PointSize = uSize * aScale;
                gl_PointSize *= (1.0 / -viewPosition.z);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                // Light point pattern
                float strength = distance(gl_PointCoord, vec2(0.5));
                strength = 1.0 - strength;
                strength = pow(strength, 5.0); // High contrast core

                vec3 color = mix(vec3(0.0), vColor, strength);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `
    });

    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    
    // Random initial rotation
    points.rotation.x = (Math.random() - 0.5) * 1.0; 
    points.rotation.z = (Math.random() - 0.5) * 1.0;
    
    scene.add(points);
    
    // Add to animation list with unique rotation speed
    animatedGalaxies.push({
        mesh: points,
        speed: (Math.random() * 0.2 + 0.1) * (Math.random() < 0.5 ? 1 : -1)
    });

    return points;
}

// Elliptical galaxy color palettes
const ELLIPTICAL_PALETTES = [
    { inside: '#ffaa55', outside: '#cc5522' },  // Gold/Orange
    { inside: '#ffcc77', outside: '#aa4422' },  // Amber/Rust
    { inside: '#ffbb66', outside: '#993311' },  // Honey/Brown
    { inside: '#eebb88', outside: '#884422' },  // Tan/Sienna
    { inside: '#ffdd99', outside: '#bb5533' },  // Cream/Terracotta
];

// Generate a dense Elliptical Galaxy (Older stars, gold/yellow, spherical)
function createEllipticalGalaxy(position, scale, options = {}) {
    const palette = options.palette || ELLIPTICAL_PALETTES[Math.floor(Math.random() * ELLIPTICAL_PALETTES.length)];
    const parameters = {
        count: 2000,        // More particles
        radius: 2.2,        // Smaller, denser
        randomness: 0.3,
        randomnessPower: 2.8,
        insideColor: palette.inside,
        outsideColor: palette.outside
    };

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const scales = new Float32Array(parameters.count * 1);

    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;

        // Position: Spherical distribution using Gaussian-like clustering
        const r = Math.pow(Math.random(), 2.0) * parameters.radius; // Dense core
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        // Elliptical stretch (make it look like an E3-E5 galaxy)
        positions[i3] = x * 1.2;
        positions[i3 + 1] = y * 0.8; // Flatten slightly
        positions[i3 + 2] = z * 1.0;

        // Color mixed by radius
        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, r / parameters.radius);

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
        
        scales[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    // Reuse the generic galaxy material logic but could be custom
    const material = new THREE.ShaderMaterial({
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        uniforms: {
            uTime: { value: 0 },
            uSize: { value: 25.0 * scale }  // Smaller particles
        },
        vertexShader: `
            uniform float uTime;
            uniform float uSize;
            attribute float aScale;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                gl_Position = projectionMatrix * viewPosition;
                gl_PointSize = uSize * aScale * (1.0 / -viewPosition.z);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                float strength = distance(gl_PointCoord, vec2(0.5));
                strength = 1.0 - strength;
                strength = pow(strength, 3.0); // Softer glow for ellipticals
                vec3 color = mix(vec3(0.0), vColor, strength);
                gl_FragColor = vec4(color, 1.0);
            }
        `
    });

    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    
    // Random rotation
    points.rotation.x = Math.random() * Math.PI;
    points.rotation.z = Math.random() * Math.PI;

    scene.add(points);
    
    // Slower rotation for ellipticals
    animatedGalaxies.push({
        mesh: points,
        speed: (Math.random() * 0.05 + 0.02) * (Math.random() < 0.5 ? 1 : -1)
    });

    return points;
}

// Irregular galaxy color palettes (young, active star forming)
const IRREGULAR_PALETTES = [
    { inside: '#88ccff', outside: '#ffffff' },  // White/Blue
    { inside: '#99ddff', outside: '#eeffff' },  // Cyan/White
    { inside: '#aabbff', outside: '#ddeeff' },  // Periwinkle/Ice
    { inside: '#77ccee', outside: '#bbddff' },  // Sky/Pale Blue
    { inside: '#88aaff', outside: '#ccddff' },  // Cornflower/Lavender
];

// Generate an Irregular Galaxy (Chaotic, blue/white, clumpy)
function createIrregularGalaxy(position, scale, options = {}) {
    const palette = options.palette || IRREGULAR_PALETTES[Math.floor(Math.random() * IRREGULAR_PALETTES.length)];
    const parameters = {
        count: 1400,         // More particles
        radius: 2.0,         // Smaller, denser
        insideColor: palette.inside,
        outsideColor: palette.outside
    };

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const scales = new Float32Array(parameters.count * 1);

    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    // Create a few "clumps" of star formation
    const clumpCenters = [];
    const numClumps = 3 + Math.floor(Math.random() * 3);
    for(let k=0; k<numClumps; k++) {
        clumpCenters.push({
            x: (Math.random() - 0.5) * parameters.radius,
            y: (Math.random() - 0.5) * parameters.radius,
            z: (Math.random() - 0.5) * parameters.radius
        });
    }

    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;

        // Pick a random clump to belong to
        const clump = clumpCenters[Math.floor(Math.random() * clumpCenters.length)];
        
        // Scatter around clump (tighter for denser appearance)
        const r = Math.random() * 0.9;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i3] = clump.x + r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = clump.y + r * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = clump.z + r * Math.cos(phi);

        // Distort heavily
        positions[i3] *= 1.0 + (Math.random() - 0.5); 

        // Color
        colors[i3] = colorInside.r;
        colors[i3 + 1] = colorInside.g;
        colors[i3 + 2] = colorInside.b;
        
        scales[i] = Math.random() * 1.5; // Varied sizes
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const material = new THREE.ShaderMaterial({
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        uniforms: {
            uTime: { value: 0 },
            uSize: { value: 22.0 * scale }  // Smaller particles
        },
        vertexShader: `
            uniform float uTime;
            uniform float uSize;
            attribute float aScale;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                gl_Position = projectionMatrix * viewPosition;
                gl_PointSize = uSize * aScale * (1.0 / -viewPosition.z);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                float strength = distance(gl_PointCoord, vec2(0.5));
                strength = 1.0 - strength;
                strength = pow(strength, 2.0);
                vec3 color = mix(vec3(0.0), vColor, strength);
                gl_FragColor = vec4(color, 1.0);
            }
        `
    });

    const points = new THREE.Points(geometry, material);
    points.position.copy(position);

    points.rotation.x = Math.random() * Math.PI;
    points.rotation.y = Math.random() * Math.PI;

    scene.add(points);
    
    animatedGalaxies.push({
        mesh: points,
        speed: (Math.random() * 0.1) // Slow tumble
    });

    return points;
}

// Generate a cocooned spiral galaxy (bright core + thin wrapping arms)
// Cocoon spiral color palettes
const COCOON_PALETTES = [
    { inside: '#ffe0b3', outside: '#7fb3ff' },  // Cream/Sky Blue
    { inside: '#ffcc99', outside: '#6699dd' },  // Peach/Cornflower
    { inside: '#ffd699', outside: '#8877cc' },  // Apricot/Lavender
    { inside: '#ffddaa', outside: '#5588bb' },  // Vanilla/Steel Blue
    { inside: '#eeddbb', outside: '#7799cc' },  // Wheat/Slate Blue
    { inside: '#ffeecc', outside: '#6688aa' },  // Ivory/Cadet Blue
];

function createCocoonSpiralGalaxy(position, scale, options = {}) {
    const palette = options.palette || COCOON_PALETTES[Math.floor(Math.random() * COCOON_PALETTES.length)];
    const parameters = {
        coreCount: options.coreCount ?? 900,      // More core particles
        armCount: options.armCount ?? 2200,       // More arm particles
        radius: options.radius ?? 2.8,            // Smaller radius
        coreRadius: options.coreRadius ?? 0.8,    // Tighter core
        arms: options.arms ?? (2 + Math.floor(Math.random() * 3)),
        spin: options.spin ?? (1.4 + Math.random() * 1.2),  // Tighter spin
        armSpread: options.armSpread ?? 0.18,     // Less spread for tighter arms
        thickness: options.thickness ?? 0.12,
        insideColor: options.insideColor ?? palette.inside,
        outsideColor: options.outsideColor ?? palette.outside
    };

    const totalCount = parameters.coreCount + parameters.armCount;
    const positions = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const scales = new Float32Array(totalCount * 1);

    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    let index = 0;

    // Dense core
    for (let i = 0; i < parameters.coreCount; i++) {
        const i3 = index * 3;
        const r = Math.pow(Math.random(), 2.3) * parameters.coreRadius;
        const theta = Math.random() * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = (Math.random() - 0.5) * parameters.thickness * 1.5;

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        const coreColor = colorInside.clone().lerp(colorOutside, r / parameters.radius);
        coreColor.multiplyScalar(1.0 + Math.random() * 0.35);
        colors[i3] = coreColor.r;
        colors[i3 + 1] = coreColor.g;
        colors[i3 + 2] = coreColor.b;

        scales[index] = 0.6 + Math.random() * 0.7;
        index++;
    }

    // Spiral arms wrapping the core (thin, cocooned)
    for (let i = 0; i < parameters.armCount; i++) {
        const i3 = index * 3;
        const r = Math.pow(Math.random(), 0.65) * parameters.radius;
        const branchAngle = (i % parameters.arms) / parameters.arms * Math.PI * 2;
        const spinAngle = r * parameters.spin;
        const armJitter = (Math.random() - 0.5) * parameters.armSpread;
        const angle = branchAngle + spinAngle + armJitter;

        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = (Math.random() - 0.5) * parameters.thickness * (0.8 + r / parameters.radius);

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        const t = r / parameters.radius;
        const armColor = colorInside.clone().lerp(colorOutside, t);
        armColor.multiplyScalar(0.7 + Math.random() * 0.4);
        colors[i3] = armColor.r;
        colors[i3 + 1] = armColor.g;
        colors[i3 + 2] = armColor.b;

        scales[index] = 0.25 + Math.random() * 0.55;
        index++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const material = new THREE.ShaderMaterial({
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        uniforms: {
            uTime: { value: 0 },
            uSize: { value: 22.0 * scale }  // Smaller particles
        },
        vertexShader: `
            uniform float uTime;
            uniform float uSize;
            attribute float aScale;
            varying vec3 vColor;
            void main() {
                vColor = color;
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                gl_Position = projectionMatrix * viewPosition;
                gl_PointSize = uSize * aScale * (1.0 / -viewPosition.z);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;

                float strength = 1.0 - (dist * 2.0);
                strength = pow(strength, 4.0);

                gl_FragColor = vec4(vColor, strength);
            }
        `
    });

    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    points.rotation.x = (Math.random() - 0.5) * 0.8;  // More varied rotation
    points.rotation.y = (Math.random() - 0.5) * 0.6;
    points.rotation.z = (Math.random() - 0.5) * 0.6;

    scene.add(points);

    animatedGalaxies.push({
        mesh: points,
        speed: (Math.random() * 0.08 + 0.04) * (Math.random() < 0.5 ? 1 : -1)
    });

    return points;
}

// Generate colorful Galactic Nebulae (Clouds)
function createNebulae() {
    const nebulaCount = 15; // Number of distinct cloud clusters
    const particleCountPerNebula = 40;
    
    // Create a soft cloud texture programmatically
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Core
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)'); // Soft body
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fade
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);

    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const sizes = [];
    const opacities = [];

    // Nebula palettes (standard colors, avoiding HDR overflow)
    const palettes = [
        [new THREE.Color(0.8, 0.2, 0.5), new THREE.Color(0.4, 0.1, 0.7)], // Pink/Purple
        [new THREE.Color(0.1, 0.6, 0.8), new THREE.Color(0.0, 0.4, 0.7)], // Cyan/Blue
        [new THREE.Color(0.7, 0.5, 0.1), new THREE.Color(0.6, 0.3, 0.0)], // Gold/Orange
        [new THREE.Color(0.2, 0.7, 0.4), new THREE.Color(0.0, 0.5, 0.4)], // Green/Teal
    ];

    for (let n = 0; n < nebulaCount; n++) {
        // Random position in the universe (mostly later eras)
        const t = 0.4 + Math.random() * 0.55;
        const centerT = t;
        const centerX = centerT * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;
        const maxR = getUniverseRadius(t) * 0.7; // Stay well inside
        
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * maxR;
        
        const centerY = Math.cos(theta) * r;
        const centerZ = Math.sin(theta) * r;

        // Choose a color palette
        const palette = palettes[Math.floor(Math.random() * palettes.length)];
        const colorA = palette[0];
        const colorB = palette[1];

        // Create particles for this nebula
        for (let i = 0; i < particleCountPerNebula; i++) {
            // Scatter around center
            const spread = 2.0 + Math.random() * 2.0;
            const px = centerX + (Math.random() - 0.5) * spread;
            const py = centerY + (Math.random() - 0.5) * spread;
            const pz = centerZ + (Math.random() - 0.5) * spread;

            positions.push(px, py, pz);

            // Mix colors
            const mixRatio = Math.random();
            const col = colorA.clone().lerp(colorB, mixRatio);
            
            // Randomize brightness (keep values reasonable)
            col.multiplyScalar(0.4 + Math.random() * 0.5);
            
            colors.push(col.r, col.g, col.b);

            // Varied sizes
            sizes.push(4.0 + Math.random() * 4.0);
            
            // Varied opacity (some dense, some whispy)
            opacities.push(0.05 + Math.random() * 0.1);
        }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { value: texture },
            uTime: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute float opacity;
            varying vec3 vColor;
            varying float vOpacity;
            void main() {
                vColor = color;
                vOpacity = opacity;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            varying vec3 vColor;
            varying float vOpacity;
            void main() {
                vec4 texColor = texture2D(uTexture, gl_PointCoord);
                if (texColor.a < 0.1) discard;
                
                // Multiply color by texture alpha for soft edges
                gl_FragColor = vec4(vColor, vOpacity * texColor.a);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending // Glow effect
    });

    const nebula = new THREE.Points(geometry, material);
    scene.add(nebula);
    
    // Animate the nebula slowly
    animatedGalaxies.push({
        mesh: nebula,
        speed: 0.05 // Slow drift
    });

    return nebula;
}

// Create galaxies as glowing points with bloom, clustered in filaments
function createGalaxies() {
    const galaxies = [];
    const galaxyCount = 5000; // Increased count

    // Create point geometry for galaxies
    const positions = [];
    const colors = [];
    const sizes = [];

    // Helper to generate a "filament" spine
    const filaments = [];
    const filamentCount = 20;
    for(let i=0; i<filamentCount; i++) {
        filaments.push({
            angle: Math.random() * Math.PI * 2,
            twist: (Math.random() - 0.5) * 5,
            spread: 0.5 + Math.random() * 2
        });
    }

    for (let i = 0; i < galaxyCount; i++) {
        // Position along the cone, more galaxies in later eras
        // Bias heavily towards later eras (0.5 -> 1.0)
        let t = Math.pow(Math.random(), 0.4) * 0.7 + 0.3; 
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;

        // Radius at this position
        let maxR = getUniverseRadius(t);

        // Clustering Logic:
        // Instead of random theta, pick a filament and offset from it
        const filament = filaments[Math.floor(Math.random() * filaments.length)];
        
        // Base angle follows the filament spine with some twist over time
        let theta = filament.angle + (t * filament.twist);
        
        // Add randomness (scatter) around the filament spine
        // As time goes on (t increases), gravity pulls things tighter? 
        // Actually, Dark Energy pulls them apart, so scatter might increase or voids get bigger.
        // Let's make filaments tighter in middle, looser at end.
        let scatter = Math.random() * filament.spread * (1.0 + t);
        theta += (Math.random() - 0.5) * scatter;

        // Radius from center: Don't fill the center completely (voids)
        let rNorm = 0.2 + Math.random() * 0.8; // Avoid dead center
        let r = rNorm * maxR;

        // Convert to Cartesian
        const y = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;

        positions.push(x, y, z);

        // Galaxy colors - Spectrum from young blue to old red/gold
        const colorChoice = Math.random();
        let color;
        if (colorChoice < 0.3) {
             color = new THREE.Color(0.6, 0.8, 1.0); // Young Blue
        } else if (colorChoice < 0.7) {
             color = new THREE.Color(0.9, 0.9, 1.0); // White
        } else {
             color = new THREE.Color(1.0, 0.8, 0.5); // Old Gold/Red
        }
        
        // Randomize brightness slightly
        color.multiplyScalar(0.8 + Math.random() * 0.4);
        
        colors.push(color.r, color.g, color.b);

        // Random sizes 
        sizes.push(0.5 + Math.random() * 1.5);
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
                // Scale size by distance to camera for perspective
                gl_PointSize = size * (400.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                // Soft circle particle
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;

                // Radial gradient for soft glow
                float strength = 1.0 - (dist * 2.0);
                strength = pow(strength, 2.0); // Sharpen the core

                gl_FragColor = vec4(vColor, strength);
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

    // --- Spawn Hero Galaxies (Detailed Spirals) - Progressive density towards present ---
    const heroCount = 60;
    for(let i=0; i<heroCount; i++) {
        // Use squared random to bias towards higher t values (more galaxies near present)
        const rawT = Math.random();
        const t = 0.45 + Math.pow(rawT, 0.6) * 0.53; // Biased towards end
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;
        const maxR = getUniverseRadius(t) * 0.85;

        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * maxR;

        const pos = new THREE.Vector3(x, Math.cos(theta)*r, Math.sin(theta)*r);

        // Smaller scales for denser appearance
        const scale = 0.4 + Math.random() * 0.6;

        createDetailedGalaxy(pos, scale, {
            palette: GALAXY_PALETTES[i % GALAXY_PALETTES.length]
        });
    }

    // --- Spawn Elliptical Galaxies - Progressive density ---
    const ellipticalCount = 40;
    for(let i=0; i<ellipticalCount; i++) {
        // Bias towards later era
        const rawT = Math.random();
        const t = 0.5 + Math.pow(rawT, 0.5) * 0.48;
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;
        const maxR = getUniverseRadius(t) * 0.85;

        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * maxR;
        const pos = new THREE.Vector3(x, Math.cos(theta)*r, Math.sin(theta)*r);

        // Smaller scales
        const scale = 0.5 + Math.random() * 0.7;
        createEllipticalGalaxy(pos, scale);
    }

    // --- Spawn Irregular Galaxies - Progressive density ---
    const irregularCount = 45;
    for(let i=0; i<irregularCount; i++) {
        // Bias towards later era
        const rawT = Math.random();
        const t = 0.45 + Math.pow(rawT, 0.55) * 0.52;
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;
        const maxR = getUniverseRadius(t) * 0.85;

        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * maxR;
        const pos = new THREE.Vector3(x, Math.cos(theta)*r, Math.sin(theta)*r);

        // Smaller scales
        const scale = 0.35 + Math.random() * 0.5;
        createIrregularGalaxy(pos, scale);
    }

    // --- Dense Cocoon Spiral Clusters - Progressive density towards present ---
    const cocoonClusterCount = 22;
    for (let i = 0; i < cocoonClusterCount; i++) {
        // Strong bias towards late era
        const rawT = Math.random();
        const t = 0.6 + Math.pow(rawT, 0.4) * 0.38;
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2 + (Math.random() - 0.5) * 3;
        const maxR = getUniverseRadius(t);
        const r = maxR * (0.75 + Math.random() * 0.2);
        const theta = Math.random() * Math.PI * 2;
        const pos = new THREE.Vector3(x, Math.cos(theta) * r, Math.sin(theta) * r);

        // Smaller scales
        const scale = 0.4 + Math.random() * 0.6;
        createCocoonSpiralGalaxy(pos, scale, {
            arms: 2 + Math.floor(Math.random() * 3),
            spin: 1.2 + Math.random() * 1.4,
            armSpread: 0.15 + Math.random() * 0.12
        });

        // Create interacting pairs (galaxies at different angles near each other)
        if (i % 2 === 0) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5
            );
            createCocoonSpiralGalaxy(pos.clone().add(offset), scale * 0.7, {
                arms: 2 + Math.floor(Math.random() * 2),
                spin: 1.3 + Math.random() * 1.2,
                armSpread: 0.12 + Math.random() * 0.1
            });
        }
    }

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

        let maxR = getUniverseRadius(t);

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

// Create Dark Ages Fog (Volumetric effect)
function createDarkAgesFog() {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const opacities = [];
    
    // Dark Ages is roughly t = 0.15 to 0.35
    for(let i=0; i<particleCount; i++) {
        const t = 0.15 + Math.random() * 0.20;
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;
        
        let radius = getUniverseRadius(t) * 0.9;
        
        // Random position in cylinder slice
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        
        positions.push(x, Math.cos(theta) * r, Math.sin(theta) * r);
        
        // Opacity fades out at edges of the era
        // Peak opacity in the middle of Dark Ages
        const mid = 0.25;
        const dist = Math.abs(t - mid);
        const alpha = Math.max(0, 0.15 - (dist * 1.0)); // subtle fog
        opacities.push(alpha);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1));
    
    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x111122) } // Dark Blue/Black fog
        },
        vertexShader: `
            attribute float opacity;
            varying float vOpacity;
            void main() {
                vOpacity = opacity;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 150.0; // Large particles
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying float vOpacity;
            void main() {
                // Soft diffuse puff
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                
                float strength = 1.0 - smoothstep(0.0, 0.5, dist);
                gl_FragColor = vec4(color, vOpacity * strength * 0.5);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending // Normal blending for obscuring fog, not additive
    });
    
    const fog = new THREE.Points(geometry, material);
    scene.add(fog);
    return fog;
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
        { text: 'Dark Energy\nAccelerated Expansion', position: [35, -30, 0], era: 'darkEnergy' }
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

    // Add "Universe age" label
    const ageDiv = document.createElement('div');
    ageDiv.className = 'timeline-label';
    ageDiv.textContent = 'Universe age';
    ageDiv.style.color = 'rgba(255, 255, 255, 0.5)';
    ageDiv.style.fontSize = '10px';
    const ageLabel = new CSS2DObject(ageDiv);
    ageLabel.position.set(-UNIVERSE_LENGTH / 2 - 5, -MAX_RADIUS - 12, 0);
    scene.add(ageLabel);

    // Add "now" label under arrow
    const nowDiv = document.createElement('div');
    nowDiv.className = 'timeline-label';
    nowDiv.textContent = 'now';
    nowDiv.style.color = 'rgba(255, 255, 255, 0.8)';
    nowDiv.style.fontSize = '12px';
    nowDiv.style.fontWeight = 'bold';
    const nowLabel = new CSS2DObject(nowDiv);
    nowLabel.position.set(UNIVERSE_LENGTH / 2 + 5, -MAX_RADIUS - 12, 0);
    scene.add(nowLabel);
}

// Initialize the visualization
function init() {
    createUniverseCone();
    createSingularity();  // Big Bang bloom at the vertex
    createCMB();
    createDarkAgesFog();
    createGalaxies();
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

    // Rotate Detailed Galaxies
    animatedGalaxies.forEach(galaxy => {
        galaxy.mesh.rotation.y += galaxy.speed * 0.005;
        // Also update uniform time for shader sparkles if any
        galaxy.mesh.material.uniforms.uTime.value = time;
    });

    // Render with subtle bloom
    composer.render();

    // Render labels
    labelRenderer.render(scene, camera);
}

// Start
init();
animate();
