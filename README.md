# Gravity Sandbox 2D

An interactive 2D N-body gravitational simulator and celestial mechanics sandbox running entirely in modern web browsers. Built with HTML5 Canvas, Vanilla JavaScript (ES Modules), and Tailwind CSS with **zero build step**.

---

## Overview

**Gravity Sandbox 2D** lets you simulate, inspect, and interact with orbital mechanics, multi-body gravitational interactions, collisions, and speculative physics (such as negative mass and anti-gravity dipoles) in real time.

---

## Key Features

- **Accurate N-Body Gravitational Physics**:
  - Sub-step numerical integration with gravitational softening ($F = G \frac{m_1 m_2}{r^2 + \epsilon^2}$) to prevent singularity jitter.
  - Completely inelastic collisions preserving linear momentum.
  - Speculative **Negative Mass** physics ($m < 0$): anti-gravity repulsion and mutual total annihilation upon collision of opposite equal masses.
- **General & Special Relativistic Physics**:
  - Post-Newtonian corrections: 1PN orbital perihelion precession (Einstein rosette) and 2.5PN gravitational wave radiation reaction drag.
  - Relativistic Event Horizons & Black Holes: Schwarzschild radius $r_s = \frac{2GM}{c^2}$, horizon captures, binary black hole inspiral mergers, and gravitational collapse when density exceeds Schwarzschild threshold.
  - Time Dilation: Kinematic ($\gamma = \frac{1}{\sqrt{1 - v^2/c^2}}$) and gravitational ($\sqrt{1 - \frac{2\Phi}{c^2}}$) time dilation accumulated per body.
- **Gravitational Potential Field & Contours**:
  - Real-time potential scalar field heatmap and equipotential contour rendering with Lagrangian points ($L_1 \sim L_5$) visualization.
- **Built-in Astronomical Presets**:
  - **Sun - Earth - Moon System**: Accurately simulates the Moon orbiting inside Earth's Hill sphere.
  - **Sun - Jupiter - Trojans**: Demonstration of orbital stability at Lagrange points $L_4$ and $L_5$.
  - **Full Solar System Model**: All 8 planets, major moons (Galilean moons, Titan, Triton, etc.), and a 70+ asteroid main belt.
  - **Protoplanetary Disk**: Accretion and planet formation within a circumstellar gas/dust disk.
  - **Galactic Center (Sgr A* & S-Cluster)**: Relativistic stellar orbits around a supermassive black hole.
  - **Three-Body Problem**: Chaotic orbital choreography with sensitive initial conditions.
  - **Negative Mass Runaway Dipole**: Positive and negative mass pairs self-accelerating across space.
  - **Binary Galaxy Collision**: Two rotating stellar clusters colliding and tidal-stripping stars.
  - **Einstein Rosette**: Relativistic 1PN apsidal precession producing non-closing rosette orbits.
  - **Black Hole & Event Horizon**: Stellar capture and tidal disruption beyond the Schwarzschild radius.
  - **Binary Black Hole Merger**: 2.5PN gravitational wave inspiral and orbital decay leading to coalescence.
  - **Spray Playground**: High-mass central gravitational attractor for particle spraying.
- **Interactive Operation Modes**:
  - **Pan & Box-Select Mode**: Left-drag to pan the canvas view; right-drag to marquee-select multiple celestial bodies.
  - **Launch Mode**: Click and drag to draw a launch velocity vector with real-time projected trajectory prediction.
  - **Spray Mode**: Continuous particle spraying along mouse/touch drag path.
  - **Disk Placement Mode**: Interactive torus preview with Keplerian velocity calculation, radial jitter, and circular direction controls.
- **Deep Inspection & Real-Time Controls**:
  - **Body Inspector**: Inspect and adjust position, velocity vector (via interactive 2D direction pad), mass, radius, and color.
  - **Relative Coordinate Origin**: Pin the coordinate origin to any body (e.g. Earth) to observe satellite orbits (e.g. Moon) relative to the moving host.
  - **Camera Tracking**: Automatically follow and center on any moving celestial body.
  - **Batch Operations**: Edit velocity vectors or delete dozens of bodies simultaneously.
- **Diagnostics & Catalog**:
  - **Celestial Catalog & Leaderboard**: Comprehensive table sorting bodies by mass, speed, age, or absorption kill count.
  - **Event History Log**: Real-time record of body births, mergers, and annihilations.
  - **Headless Fast-Forward Time Skip**: Skip rendering and execute high-speed physics integration to advance thousands of seconds in milliseconds.
  - **State Persistence**: 3 local storage quick-slots and full JSON export/import.

---

## Coordinate Systems & Physical Units

- **World Coordinates**: Floating-point $(x, y)$ in pixels. $(0, 0)$ is the universe origin.
- **Scales**:
  - **Distance**: `300 px` = Earth-Moon distance (`384,400 km`).
  - **1 AU (Astronomical Unit)** ≈ `116,751 px`.
  - **Mass**: `1.0` mass unit = $5.9722 \times 10^{23}\text{ kg}$ (Earth mass = `10.0`).
  - **Speed**: `1 px/s` = `5.5772 km/s` (Earth orbital speed = `5.34 px/s` = `29.78 km/s`).
- **Angular Measurement**:
  - $0^\circ$ points Right ($+x$).
  - Angles increase **counter-clockwise** from $0^\circ$ to $360^\circ$.

---

## Quick Start

Because native ES Modules require standard HTTP origins (CORS restrictions prevent loading ES Modules via `file://`), run a local HTTP server:

```bash
# Using Makefile (starts on http://localhost:8000 via native Node.js)
make serve

# Or using pnpm / npm
pnpm serve

# Or specify a custom port
make serve PORT=8080

# Or run directly with Node
node scripts/serve.js 8000
```

Then open `http://localhost:8000` in your web browser.

---

## Keyboard & Mouse Shortcuts

| Control | Action |
| :--- | :--- |
| **Left Click & Drag** | Pan canvas view (Pan mode) / Launch body (Launch mode) / Spray particles (Spray mode) / Torus ring placement (Disk mode) |
| **Right Click & Drag** | Marquee box-select bodies (Pan mode) / Pan canvas view (Other modes) |
| **Alt + Left Drag** / **Middle Drag** | Pan canvas view (any mode) |
| **Mouse Wheel** | Zoom in / Zoom out at cursor position |
| **W, A, S, D** or **Arrow Keys** | Pan view up, left, down, right |
| **Q** / **-** | Zoom out |
| **E** / **+** | Zoom in |
| **0** | Reset camera zoom and position to center |
| **Space** | Pause / Resume simulation |
| **Click on Body** | Open Body Inspector |
| **Escape** | Close inspector / modals / clear selection |

---

## Development & Testing

All JavaScript source files use pure native ES Modules without any bundler or build step.

### Verify Syntax & Run Tests
```bash
make test         # Runs syntax linting and unit tests via Node.js native test runner (or `pnpm test`)
make lint         # Checks syntax of all JavaScript files with `node -c` (or `pnpm lint`)
make stats        # Shows lines of code and file composition
make clean        # Removes OS artifacts (.DS_Store, temporary files)
```

To see all available Makefile tasks:
```bash
make help
```

---

## Project Structure

```
.
├── .github/
│   ├── dependabot.yml          # Dependabot configuration (github-actions, npm)
│   └── workflows/
│       └── ci.yml              # CI workflow (pnpm/setup, make test)
├── .npmrc                      # pnpm node runtime pinning configuration
├── package.json                # Project metadata & node/pnpm runtime version definitions
├── index.html                  # Main markup (Canvas, HUD, drawers, modals)
├── Makefile                    # Development, test, and server tasks
├── css/
│   └── style.css               # Glassmorphism, animations, custom theme
├── src/
│   ├── main.js                 # App bootstrap & event wiring
│   ├── core/
│   │   ├── vec2.js             # 2D vector math helper class
│   │   ├── constants.js        # Physical unit conversion factors
│   │   ├── formatters.js       # Unit formatting & CCW angle calculation
│   │   ├── event-bus.js        # Lightweight decoupled Pub/Sub bus
│   │   └── loop.js             # Simulation loop with adaptive delta time
│   ├── models/
│   │   └── body.js             # Celestial body class (state, trail, JSON)
│   ├── state/
│   │   └── store.js            # Central state store (bodies, camera, mode, settings)
│   ├── physics/
│   │   ├── forces.js           # N-body gravitational force computation (1PN/2.5PN)
│   │   ├── collision.js        # Momentum conservation, horizon capture, annihilation
│   │   ├── celestial.js        # Primary star selection, Hill sphere, black hole metrics
│   │   ├── trajectory.js       # Real-time RK/Euler trajectory projection
│   │   └── engine.js           # Sub-step physics integration coordinator
│   ├── renderer/
│   │   ├── camera.js           # Coordinate transformation, pan/zoom, tracking
│   │   ├── scene.js            # Background dynamic grid & star glow
│   │   ├── gravity-field.js    # Potential scalar field & equipotential contour rendering
│   │   ├── body-renderer.js    # Body cores, orbital trails, and name tags
│   │   ├── overlay.js          # Overlay coordinator (re-exports celestial & interactive overlays)
│   │   ├── overlays/           # Submodules for celestial, interactive, and disk overlays
│   │   └── index.js            # Main rendering pipeline coordinator
│   ├── presets/
│   │   ├── index.js            # Scenario loader dispatcher (< 50 lines)
│   │   ├── solar-system.js     # Sun-Earth-Moon, Trojans, and Solar System presets
│   │   ├── n-body.js           # Three-body, negative mass dipole, galaxy collision
│   │   └── relativistic.js     # Sgr A*, Einstein rosette, black hole merger, protoplanetary disk
│   ├── storage/
│   │   └── index.js            # LocalStorage slots & JSON state serialization
│   └── ui/
│       ├── hud.js              # HUD bar & D-pad navigation
│       ├── side-panel.js       # Right drawer coordinator
│       ├── side-panel/         # Mode switcher, body, physics, and disk section submodules
│       ├── inspector.js        # Single & multi-body inspector drawer coordinator
│       ├── inspector/          # Vector pad, single view, multi view, and metrics submodules
│       ├── body-catalog.js     # Body catalog table & leaderboard
│       ├── history-drawer.js   # Event log drawer
│       ├── time-skip-modal.js  # Headless high-speed numerical integration
│       ├── save-modal.js       # Save & load modal
│       ├── slider-modal.js     # Precision parameter adjustment modal controller
│       ├── slider-configs.js   # Direct adjustment configuration registrar
│       ├── slider-configs/     # Parameter definitions & conversion presets
│       ├── tooltip.js          # Hover metric tooltip (speed, angle, Hill sphere, GR dilation)
│       ├── toast.js            # Floating notification toast
│       ├── input-controller.js # Mouse, touch, & keyboard interaction coordinator
│       └── input/              # Spawner, hit test, mouse, touch, and keyboard submodules
├── scripts/
│   └── serve.js                # Zero-dependency native Node.js static HTTP server
└── tests/                      # Unit tests using Node.js built-in test runner
    ├── core/                   # Vector math, event bus, and formatter tests
    ├── models/                 # Celestial body model and relativistic mechanics tests
    ├── physics/                # N-body gravity, GR (1PN/2.5PN), Hill sphere, and collision tests
    ├── presets/                # Preset scenario loading and accretion integration tests
    ├── server/                 # Native static HTTP server unit tests
    └── ui/                     # DOM element integrity, regression, and interaction tests
```

---

## License

This project is open source and available under the [MIT License](LICENSE).
