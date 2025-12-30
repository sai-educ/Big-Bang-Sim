# Big Bang Expansion Visualization

An interactive 3D visualization of the universe's expansion from the Big Bang to the present day, spanning 13.77 billion years. Built with Three.js featuring bloom effects, interactive camera controls, and cosmic era labels.

![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## Features

### 3D Universe Expansion Cone
- Expanding trumpet/cone shape showing the universe's growth over time
- Accelerated expansion near the end (dark energy effect)
- Grid lines showing the fabric of spacetime
- Full 360° rotation with mouse drag controls

### Cosmic Eras Visualized
- **Singularity** - The initial Big Bang point with bright glow effect
- **Inflation** - Rapid early expansion period
- **CMB (Cosmic Microwave Background)** - The afterglow at 375,000 years with temperature fluctuation texture
- **Dark Ages** - The period before first stars
- **First Stars** - Formation of first stars around 400 million years
- **Galaxy Formation** - Development of galaxies and planets
- **Dark Energy Era** - Accelerated expansion we observe today

### Visual Effects
- **Bloom/Glow Effects** - Galaxies and stars have realistic glowing appearance
- **2000+ Galaxies** - Distributed throughout the cone with varying colors and sizes
- **Background Starfield** - 5000 background stars for depth
- **3D Labels** - Era labels that follow camera perspective

### Interactive Controls
- **Click and Drag** - Rotate the visualization in 3D
- **Scroll** - Zoom in and out
- **Era Buttons** - Click to focus camera on specific cosmic eras
- **Full Screen** - Fills entire browser window

## Live Demo

Deploy to Vercel or open `src/index.html` with a local server.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/sai-educ/Big-Bang-Sim.git

# Open in browser (requires a local server for ES modules)
cd Big-Bang-Sim
npx serve src
```

Or use any local development server:

```bash
# Python
python -m http.server 8000

# Then open http://localhost:8000/src/
```

## Tech Stack

- **Three.js** - 3D rendering engine with WebGL
- **OrbitControls** - Mouse-based camera navigation
- **EffectComposer** - Post-processing pipeline
- **UnrealBloomPass** - Bloom/glow effects for galaxies
- **CSS2DRenderer** - 3D-positioned HTML labels
- **Custom Shaders** - GLSL shaders for galaxy particles

## Browser Support

Works in all modern browsers that support:
- WebGL 2.0
- ES Modules

## Controls

| Action | Control |
|--------|---------|
| Rotate | Click + Drag |
| Zoom | Mouse Scroll |
| Focus Era | Click era buttons in top-left panel |

## License

MIT License - feel free to use and modify!

---

*Drag to explore 13.77 billion years of cosmic history!*
