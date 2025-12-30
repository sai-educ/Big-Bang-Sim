import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

console.log("Big Bang Sim: Version 5.0 Loaded (Smithsonian Galaxies)");

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

// Store detailed galaxies for animation updates
const animatedGalaxies = [];

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

// Create the Big Bang singularity (Intense point of light, no sphere)
function createSingularity() {
    // We remove the physical sphere ("the circle") as requested.
    // Instead, we use a Sprite with a soft glow texture to represent the "spark".
    
    // Create a canvas-based glow texture for the sprite
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Hot white center
    gradient.addColorStop(0.2, 'rgba(200, 220, 255, 0.8)'); // Blue-ish white
    gradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.2)'); // Fade
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: new THREE.CanvasTexture(canvas),
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(-UNIVERSE_LENGTH / 2, 0, 0);
    sprite.scale.set(12, 12, 1); // Large glow scale
    scene.add(sprite);
    
    // Inner brighter core
    const coreMaterial = new THREE.SpriteMaterial({ 
        map: new THREE.CanvasTexture(canvas),
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    const core = new THREE.Sprite(coreMaterial);
    core.position.set(-UNIVERSE_LENGTH / 2, 0, 0);
    core.scale.set(4, 4, 1); // Small intense core
    scene.add(core);

    // Actual Light Source
    const light = new THREE.PointLight(0xaaddff, 3, 60);
    light.position.set(-UNIVERSE_LENGTH / 2, 0, 0);
    scene.add(light);

    return { sprite, core, light };
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

// Generate a single detailed spiral galaxy
function createDetailedGalaxy(position, scale) {
    const parameters = {
        count: 2000,
        size: 0.015,
        radius: 5,
        branches: 3,
        spin: 1,
        randomness: 0.2,
        randomnessPower: 3,
        insideColor: '#ff6030',
        outsideColor: '#1b3984'
    };

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const scales = new Float32Array(parameters.count * 1);
    const randomness = new Float32Array(parameters.count * 3);

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
            uSize: { value: 30.0 * scale } // Global scale
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
        
        // VISUAL CHANGE: Drastically reduce simple "dots" in the spiral galaxy eras (t > 0.5)
        // This ensures the nice spirals aren't obscured by noise.
        if (t > 0.5) {
            if (Math.random() > 0.15) continue; // Skip 85% of dots in the spiral era
        }

        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;

        // Radius at this position
        let maxR = getUniverseRadius(t);

        // Clustering Logic:
        // Instead of random theta, pick a filament and offset from it
        const filament = filaments[Math.floor(Math.random() * filaments.length)];
        
        // Base angle follows the filament spine with some twist over time
        let theta = filament.angle + (t * filament.twist);
        
        // Add randomness (scatter) around the filament spine
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

    // --- Spawn Hero Galaxies (Detailed Spirals) ---
    // SLICE 1: Small Spiral Galaxies (Era: Galaxies Form, t=0.5 to 0.75)
    const smallGalaxyCount = 60; 
    for(let i=0; i<smallGalaxyCount; i++) {
        const t = 0.5 + Math.random() * 0.25;
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;
        const maxR = getUniverseRadius(t) * 0.85;
        
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * maxR;
        const pos = new THREE.Vector3(x, Math.cos(theta)*r, Math.sin(theta)*r);
        
        // Smaller scale for early galaxies
        const scale = 0.4 + Math.random() * 0.4; 
        createDetailedGalaxy(pos, scale);
    }

    // SLICE 2: Large Majestic Galaxies (Era: Dark Energy, t=0.75 to 1.0)
    const largeGalaxyCount = 40;
    for(let i=0; i<largeGalaxyCount; i++) {
        const t = 0.75 + Math.random() * 0.25;
        const x = t * UNIVERSE_LENGTH - UNIVERSE_LENGTH / 2;
        const maxR = getUniverseRadius(t) * 0.85;
        
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * maxR;
        const pos = new THREE.Vector3(x, Math.cos(theta)*r, Math.sin(theta)*r);
        
        // Large scale for modern galaxies
        const scale = 1.0 + Math.random() * 1.2;
        createDetailedGalaxy(pos, scale);
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
}

// Initialize the visualization
function init() {
    createUniverseCone();
    createSingularity();
    createCMB();
    createDarkAgesFog(); // Added Fog
    createGalaxies();
    // createFirstStars(); // Removed to ensure no "background dots" confusion
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

    // Render with bloom
    composer.render();

    // Render labels
    labelRenderer.render(scene, camera);
}

// Start
init();
animate();
