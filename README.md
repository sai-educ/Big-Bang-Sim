# Big Bang Simulator

A realistic 3D fireworks simulation built with Three.js featuring multiple explosion patterns, realistic physics, and immersive audio.

![Big Bang Simulator](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## Features

### 8 Firework Types
- **Chrysanthemum** - Classic spherical burst with trailing sparks
- **Peony** - Dense spherical explosion without trails
- **Willow** - Weeping, long-lasting trails that cascade down
- **Palm** - Upward-spreading pattern like a palm tree
- **Ring** - Circular horizontal ring explosion
- **Crossette** - Particles that split mid-air into secondary bursts
- **Strobe** - Flashing on/off effect
- **Glitter** - Sparkling, twinkling particles

### Realistic Physics
- Quadratic air drag for natural deceleration
- Dynamic wind simulation that affects particles
- Realistic gravity with configurable hover time
- Smoke particle system at launch and explosion points

### Immersive Audio
- Distance-based sound delay (speed of sound simulation)
- Different sounds per firework type
- Deep bass explosions with layered audio
- Crackle effects for certain types
- Rocket whistle during ascent

### Interactive Controls
- **Click** anywhere to launch fireworks at that position
- **Spacebar** for random launch
- **F key** for finale mode (rapid multi-launch)
- Full GUI controls for customization

## Live Demo

Deploy to Vercel or open `src/index.html` in a local server.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/sai-educ/Big-Bang-Sim.git

# Open in browser (requires a local server for ES modules)
cd Big-Bang-Sim
npx serve src
```

Or simply open `src/index.html` with a local development server.

## Configuration

All settings are adjustable via the in-app GUI:

| Category | Settings |
|----------|----------|
| Display | Particle count, size, bloom, trail opacity |
| Physics | Explosion force, gravity, wind, hover time |
| Launch | Auto-launch toggle, interval, finale mode |
| Audio | Sound on/off, volume |

## Tech Stack

- **Three.js** - 3D rendering engine
- **Web Audio API** - Procedural sound synthesis
- **ES Modules** - Modern JavaScript modules

## Browser Support

Works in all modern browsers that support:
- WebGL 2.0
- Web Audio API
- ES Modules

## License

MIT License - feel free to use and modify!

---

*Click to start and enjoy the show!*
