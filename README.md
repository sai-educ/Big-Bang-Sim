# Big Bang Expansion 3D
### A Volumetric Simulation of Cosmic Evolution

![Screenshot 2025-12-30 at 1 25 31 PM](https://github.com/user-attachments/assets/d34aac9e-7940-42be-94b5-4587f2011345)

https://github.com/user-attachments/assets/587326e5-2cba-4700-baa9-e916e4c32296

# Big Bang Expansion 3D
### A Volumetric Simulation of Cosmic Evolution

**Live Demo:** [https://big-bang-sim-idii.vercel.app/](https://big-bang-sim-idii.vercel.app/)

## Overview

This project is a high-fidelity, interactive 3D visualization of the evolution of the universe, from the initial Singularity to the present day (13.77 billion years). Built using **Three.js** and **GLSL** (OpenGL Shading Language), it simulates the volumetric expansion of space-time, the formation of the Cosmic Microwave Background (CMB), and the emergence of the Cosmic Web.

The simulation renders the universe as a dynamic time-cone, geometrically accurately representing the phases of:
1.  **Inflation:** The initial rapid expansion from a singularity.
2.  **The Dark Ages:** A period of volumetric fog before the ignition of the first stars.
3.  **Galactic Evolution:** The formation of the first spiral and elliptical structures.
4.  **Dark Energy:** The accelerated expansion of the universe in the modern era, visualized by a flaring mesh and redshifted galaxy distributions.

## Scientific Visualization Features

*   **Volumetric Rendering:** Custom shaders simulate the density of the Cosmic Microwave Background (CMB) using procedural Simplex noise to mimic WMAP/Planck data temperature fluctuations.
*   **Particle Systems:** Tens of thousands of particles represent the "Cosmic Web," with distinct algorithms for clustering and filament formation.
*   **Procedural Galaxy Generation:** The simulation does not use static sprites. Instead, it procedurally generates 3D volumetric galaxies (Spirals, Barred Spirals, Ellipticals, and Irregulars) with individual stellar distributions, dust lanes, and accretion disks.
*   **Post-Processing:** A NASA-grade rendering pipeline includes HDR Tone Mapping and Unreal-style Bloom to simulate the blinding luminosity of the Big Bang and the soft glow of galactic cores.

## Technical Stack

*   **Engine:** Three.js (WebGL)
*   **Shaders:** Custom GLSL Fragment & Vertex Shaders
*   **Post-Processing:** EffectComposer (UnrealBloomPass, RenderPass)
*   **Physics:** Custom JavaScript animation loop for expansion dynamics

## Usage

This simulation is optimized for modern web browsers supporting WebGL 2.0.
Simply visit the [Live Demo](https://big-bang-sim-idii.vercel.app/) to interact.

*   **Drag:** Rotate the camera around the timeline.
*   **Scroll:** Zoom in/out to inspect individual eras or galaxies.

---
*Developed for educational and scientific visualization purposes.*
