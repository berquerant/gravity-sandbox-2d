# AGENTS.md

This document provides architectural context, codebase structure, and operational guidelines for AI agents working on **Gravity Sandbox 2D**.

---

## 1. Project Overview

- **Name**: Gravity Sandbox 2D
- **Description**: An interactive 2D celestial mechanics and N-body gravitational simulator running entirely in modern web browsers.
- **Tech Stack**:
  - HTML5 Canvas (2D rendering)
  - Vanilla JavaScript (Pure ES Modules, `type="module"`)
  - Tailwind CSS (via CDN)
  - Font Awesome 6 (via CDN)
  - Google Fonts (Inter, JetBrains Mono)
- **Zero Build Step**: No bundler (Webpack, Vite, Rollup) or compilation step is used or required. Files are directly imported via native browser ES Modules.

---

## 2. Quick Start & Execution

Because native ES Modules require standard HTTP/HTTPS origins (CORS restrictions prevent `file://` execution), run a local HTTP server:

```bash
# Using Makefile (runs native Node.js HTTP server, zero external dependencies)
make serve        # Runs on http://localhost:8000 (override with PORT=8080)

# Or with pnpm
pnpm serve

# Or directly with Node
node scripts/serve.js 8000
```

Then navigate to `http://localhost:8000` in the browser.

### Syntax Validation & Testing
To run unit tests and verify all JavaScript modules:
```bash
make test         # Runs syntax lint + unit tests (node --test) (or `pnpm test`)
make check        # or `make lint` for syntax validation only
```

To see all available development tasks:
```bash
make help
```

---

## 3. Directory Structure & Responsibilities

```
.
├── .github/
│   ├── dependabot.yml          # Dependabot configuration (github-actions, npm)
│   └── workflows/
│       └── ci.yml              # CI workflow using pnpm/setup
├── .npmrc                      # pnpm node runtime pinning configuration
├── package.json                # Project metadata & node/pnpm runtime version definitions
├── AGENTS.md                   # This guideline for AI agents
├── index.html                  # Main HTML markup (Canvas, UI modals, panels, HUD)
├── Makefile                    # Development tasks
├── css/
│   └── style.css               # Glassmorphism, scrollbars, fonts, custom styling
└── src/
    ├── main.js                 # Application bootstrap & dependency wiring
    ├── core/
    │   ├── vec2.js             # 2D Vector math class (Vec2)
    │   ├── constants.js        # Physical conversion factors (KM_PER_PX, KG_PER_MASS, KMS_PER_PXS)
    │   ├── formatters.js       # Formatter functions (formatKm, formatKg, formatSimTime, computeCCWAngleDeg)
    │   ├── event-bus.js        # Lightweight Pub/Sub event bus for decoupling physics & UI
    │   └── loop.js             # Simulation loop (RAF, adaptive delta time, FPS calculation)
    ├── models/
    │   └── body.js             # Celestial Body class (position, velocity, mass, trail, toJSON)
    ├── state/
    │   └── store.js            # Central reactive-like state store (bodies, camera, mode, settings)
    ├── physics/
    │   ├── forces.js           # N-body gravitational force computation with softening
    │   ├── collision.js        # Completely inelastic collision, momentum conservation, annihilation
    │   ├── celestial.js        # Primary star selection, Hill Sphere radius, host/satellite capture
    │   ├── trajectory.js       # Real-time RK/Euler trajectory projection for launch mode
    │   └── engine.js           # Sub-step physics integration coordinator
    ├── renderer/
    │   ├── camera.js           # World <-> Screen coordinates, panning, zooming, body tracking
    │   ├── scene.js            # Dynamic background grid and primary star atmospheric glow
    │   ├── gravity-field.js    # Gravitational potential scalar field & equipotential contour rendering
    │   ├── body-renderer.js    # Celestial body cores, trails, glows, name tags, anchors
    │   ├── overlay.js          # Overlay coordinator (re-exports celestial and interactive overlays)
    │   ├── overlays/           # Modular overlay renderers (< 500 lines)
    │   │   ├── celestial-overlays.js   # Hill spheres, distance lines, gravitational waves
    │   │   ├── interactive-overlays.js # Velocity gizmo, launch trajectory prediction, selection box
    │   │   └── disk-preview.js         # Protoplanetary disk placement torus preview
    │   └── index.js            # Canvas rendering pipeline coordinator
    ├── presets/
    │   ├── index.js            # Scenario loader dispatcher (< 50 lines)
    │   ├── solar-system.js     # Sun-Earth-Moon, Trojans, and full Solar System scenarios
    │   ├── n-body.js           # Three-body chaotic orbit, negative mass dipole, galaxy collision
    │   └── relativistic.js     # Sgr A* S-cluster, Einstein rosette, black hole capture, protoplanetary disk
    ├── storage/
    │   └── index.js            # LocalStorage slots (1-3) & JSON import/export serialization
    └── ui/
        ├── hud.js              # Simulation time, body count, FPS, primary star name, D-Pad
        ├── toast.js            # Floating transient notification toast
        ├── tooltip.js          # Hover tooltip showing celestial metrics (speed, angle, Hill radius)
        ├── inspector.js        # Body inspector drawer coordinator
        ├── inspector/          # Inspector view submodules (< 500 lines)
        │   ├── vector-pad.js           # Canvas directional joystick / velocity vector pad
        │   ├── single-view.js          # Single body editing controller and event listeners
        │   ├── multi-view.js           # Multi-body batch selection and aggregated stats
        │   └── metrics-renderer.js     # Celestial hierarchy, Hill radius, and GR dilation rendering
        ├── body-catalog.js     # Body catalog & absorption count leaderboard table with sorting
        ├── history-drawer.js   # Event history log drawer (creation, collision, annihilation)
        ├── time-skip-modal.js  # High-speed time skip modal (headless numerical integration)
        ├── save-modal.js       # Save & load modal with slot management & JSON copy/paste
        ├── side-panel.js       # Right drawer coordinator
        ├── side-panel/         # Side panel section controllers (< 500 lines)
        │   ├── mode-controller.js      # Placement mode switcher (launch, spray, disk, pan)
        │   ├── body-controls.js        # Body mass, radius, anchor, and color pickers
        │   ├── physics-controls.js     # G, collisions, trails, relativity, speed of light, contours
        │   └── disk-controls.js        # Disk count, radius, speed, jitter, and direction controls
        ├── slider-modal.js     # Precision parameter adjustment modal controller
        ├── slider-configs.js   # Direct adjustment configuration registrar
        ├── slider-configs/     # Parameter definitions & conversion presets (< 500 lines)
        │   ├── body-configs.js         # Mass, radius, and spray dispersion speed configs
        │   ├── physics-configs.js      # Simulation timeScale, G, trail length, speed of light configs
        │   └── disk-configs.js         # Disk count, radius, jitter, and speed slider configs
        ├── input-controller.js # Mouse, touch, & keyboard interaction dispatcher coordinator
        └── input/              # Interaction handlers (< 500 lines)
            ├── spawner.js              # Body creation, disk spawning, spray velocity generation
            ├── hit-test.js             # Body hover and box selection hit testing
            ├── mouse-handler.js        # Mouse drag, pan, zoom, and placement events
            ├── touch-handler.js        # Single touch and pinch-to-zoom multi-touch events
            └── keyboard-handler.js     # WASD navigation, zoom, and playback hotkeys
├── scripts/
│   └── serve.js                # Zero-dependency native Node.js static HTTP server
└── tests/                      # Unit test suites (node --test)
    ├── core/                   # Vec2, EventBus, Formatter unit tests
    ├── models/                 # Celestial body model & relativistic dynamics tests
    ├── physics/                # N-body gravity, GR (1PN/2.5PN), Hill sphere, collisions
    ├── presets/                # Preset scenario loading & accretion integration
    ├── server/                 # Native static HTTP server unit tests
    └── ui/                     # DOM element integrity, regression & interaction tests
```

---

## 4. Key Architectural Patterns & Conventions

### 1. Pure ES Modules Policy
- **DO NOT** introduce bundlers, TypeScript compilers, or external runtime npm dependencies unless explicitly requested by the user.
- `package.json` and `.npmrc` are used exclusively for pinning the Node.js runtime version and executing development scripts (`make test`, `pnpm test`, `make serve`, `pnpm serve`). No external libraries are installed.
- Always include the file extension `.js` in import statements (e.g., `import { Vec2 } from './core/vec2.js';`).

### 2. Decoupled Communication via EventBus
To prevent the physics simulation from having direct references to DOM elements:
- Physics modules emit events via `eventBus.emit(eventName, payload)`.
- UI modules subscribe using `eventBus.on(eventName, callback)`.
- Key events:
  - `history:event`: Emitted when bodies are created, absorbed, or annihilated.
  - `bodies:updated` / `bodies:collided`: Emitted to trigger table and inspector refreshes.
  - `toast:show`: Triggers a non-blocking toast message.
  - `camera:track` / `camera:untrack`: Updates camera tracking banners.
  - `preset:select`: Loads a predefined astronomical scenario.

### 3. Coordinate Systems & Units
- **World Coordinates**: Floating point `(x, y)` in pixels. The origin `(0, 0)` is the center of the universe.
- **Screen Coordinates**: `(sx, sy)` relative to canvas DOM dimensions.
- **Scale Factor**:
  - Distance: `300 px` = Earth-Moon distance (`384,400 km`).
  - Mass: `1.0` mass unit = `5.9722 × 10^23 kg` (Earth mass is `10.0`).
  - Speed: `1 px/s` = `5.5772 km/s` (Earth orbital speed = `5.34 px/s` = `29.78 km/s`).
  - 1 AU (Astronomical Unit) ≈ `116,751 px`.

### 4. Mathematical Conventions
- Angular measurements for velocity vectors:
  - Right (`+x`) is `0°`.
  - Direction increases **counter-clockwise** from `0°` to `360°`.
  - In canvas screen space where `+y` points downward, `vy` is inverted (`-vy`) when calculating angles.

### 5. Negative Mass (Anti-gravity)
- Bodies with `mass < 0` exert gravitational repulsion on other bodies while reacting to external forces according to Newton's second law ($a = F / m$).
- Collision between equal positive and negative masses results in total mutual annihilation (`Math.abs(m1 + m2) < 0.001`).

### 6. Relativistic Mechanics & Black Holes
- **Event Horizons**: Bodies with mass $M$ have a Schwarzschild radius $r_s = \frac{2GM}{c^2}$. Crossing this radius results in horizon capture.
- **Gravitational Collapse**: When colliding bodies produce a dense remnant whose Schwarzschild radius exceeds its physical volume radius ($r_s \ge R_{vol}$), it collapses into a black hole (`color = '#020617'`).
- **Post-Newtonian Corrections**:
  - 1PN: Adds force $\propto \frac{L^2}{r^4}$ to produce apsidal perihelion precession.
  - 2.5PN: Gravitational radiation reaction exerts a damping drag force opposing orbital velocity when `enableGravitationalWaves` is active.
- **Time Dilation**: Kinematic time dilation ($\tau = t / \gamma$) and gravitational time dilation ($\tau = t \sqrt{1 - 2\Phi/c^2}$) are tracked on each body.

### 7. Interactive Operation Modes
- `pan`: Canvas view navigation (left-drag or WASD/arrow keys) and multi-body selection (right-drag marquee).
- `launch`: Click-and-drag launch vector with predicted trajectory overlay.
- `spray`: High-density continuous particle emission along cursor trajectory.
- `disk`: Protoplanetary accretion disk placement with real-time torus preview and Keplerian circular orbit velocity calculation.

---

## 5. Instructions for Adding Features or Modifying Code

1. **Adding a New Preset**:
   - Open `src/presets/index.js`.
   - Add a branch in `loadPreset(name, state, camera)` with appropriate body initializations.
   - Add an `<option value="preset_key">Label</option>` to `#presetSelect` in `index.html`.

2. **Adding Physics Modifiers**:
   - Modify `src/physics/forces.js` or `src/physics/engine.js`.
   - Keep calculations pure and self-contained; do not touch UI or DOM elements in `src/physics/`.

3. **Modifying UI Elements**:
   - If adding markup, modify `index.html` within the relevant section.
   - If styling, use Tailwind utility classes or add scoped rules to `css/style.css`.
   - Connect listeners inside the respective controller in `src/ui/`.

4. **Testing Changes**:
   - Run the syntax validation command:
     ```bash
     node -c src/main.js src/core/*.js src/models/*.js src/physics/*.js src/renderer/*.js src/presets/*.js src/storage/*.js src/ui/*.js
     ```
   - Verify visually in a browser using a local HTTP server.
