import { Body } from '../models/body.js';
import { eventBus } from '../core/event-bus.js';
import { Camera } from '../renderer/camera.js';

/**
 * Loads relativistic astrophysical presets (Sagittarius A* S-stars, Einstein Rosette, Black hole capture, Binary merger, Protoplanetary disk).
 * @param {string} name - Preset scenario key
 * @param {Object} state - Global state store
 * @param {Camera} camera - Viewport camera coordinator
 */
export function loadRelativisticPreset(name, state, camera) {
  if (name === 'galactic_center') {
    state.enableRelativity = true;
    state.speedOfLight = 120;
    state.trailLength = 6000;
    state.timeScale = 1.0;
    state.G = 1.0;

    const M_bh = 100000;
    // Schwarzschild radius rs = 2*G*M / c^2 = 2 * 100000 / 14400 = 13.89 px
    state.bodies.push(new Body({
      name: 'Sagittarius A*',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: M_bh,
      radius: 14,
      color: '#020617',
      fixed: true
    }));

    // Helper to spawn a star on an eccentric Keplerian orbit around Sgr A*
    const addSStar = (sName, semiMajorA, eccentricity, argPeriapsis, mass, radius, color, trueAnomaly = Math.PI) => {
      const e = Math.min(0.96, Math.max(0.0, eccentricity));
      const a = semiMajorA;
      const p = a * (1 - e * e);
      const r = p / (1 + e * Math.cos(trueAnomaly));
      const factor = Math.sqrt((state.G * M_bh) / p);
      const vRadial = factor * e * Math.sin(trueAnomaly);
      const vAzi = factor * (1 + e * Math.cos(trueAnomaly));
      const phi = argPeriapsis + trueAnomaly;

      const px = Math.cos(phi) * r;
      const py = Math.sin(phi) * r;
      const vx = vRadial * Math.cos(phi) - vAzi * Math.sin(phi);
      const vy = vRadial * Math.sin(phi) + vAzi * Math.cos(phi);

      state.bodies.push(new Body({
        name: sName,
        x: px,
        y: py,
        vx,
        vy,
        mass,
        radius,
        color
      }));
    };

    // Empirical S-Cluster stars (scaled to sandbox space):
    // 1. S2 (S0-2): famous 16-year period benchmark star with relativistic precession
    addSStar('S2 (S0-2)', 520, 0.88, Math.PI * 0.25, 14, 5.5, '#67e8f9', Math.PI * 0.82);
    // 2. S4714: extreme near-grazing high-eccentricity companion
    addSStar('S4714', 360, 0.92, -Math.PI * 0.4, 8, 3.8, '#f43f5e', Math.PI);
    // 3. S62: rapid tight elliptic orbiter
    addSStar('S62', 320, 0.89, Math.PI * 0.7, 7, 3.6, '#a855f7', Math.PI * 0.9);
    // 4. S55 (S0-102): tight inner short-period orbit
    addSStar('S55 (S0-102)', 260, 0.72, -Math.PI * 0.8, 6, 4.0, '#38bdf8', Math.PI * 0.65);
    // 5. S38: moderate-distance high-eccentricity star
    addSStar('S38', 640, 0.82, Math.PI * 0.1, 10, 4.8, '#34d399', Math.PI * 0.75);
    // 6. S1: wide eccentric orbit
    addSStar('S1', 820, 0.55, -Math.PI * 0.2, 12, 5.2, '#fbbf24', Math.PI * 0.85);
    // 7. S9: outer inclined orbit
    addSStar('S9', 980, 0.70, Math.PI * 0.55, 9, 4.6, '#f472b6', Math.PI);
    // 8. S12: highly elongated outer ellipse
    addSStar('S12', 1150, 0.85, -Math.PI * 0.65, 8, 4.2, '#e2e8f0', Math.PI * 0.95);
    // 9. S13: distant circulating star
    addSStar('S13', 1350, 0.48, Math.PI * 0.85, 11, 5.0, '#818cf8', Math.PI * 0.7);
    // 10. S14: high velocity outer orbiter
    addSStar('S14', 1550, 0.78, -Math.PI * 0.15, 10, 4.8, '#fdba74', Math.PI * 0.85);

    // Surrounding S-Cluster background field stars (24 dispersed stars)
    const starColors = ['#93c5fd', '#a5b4fc', '#c4b5fd', '#fbcfe8', '#fed7aa', '#fef08a'];
    for (let i = 1; i <= 24; i++) {
      const a = 350 + Math.random() * 1400;
      const e = 0.25 + Math.random() * 0.60;
      const omega = Math.random() * Math.PI * 2;
      const nu = Math.PI * (0.4 + Math.random() * 0.6);
      const m = 2 + Math.random() * 6;
      const rad = 2.4 + Math.random() * 1.8;
      const col = starColors[i % starColors.length];
      addSStar(`S-Star #${i}`, a, e, omega, m, rad, col, nu);
    }

    state.camera.zoom = 0.42;
    eventBus.emit('camera:zoom', 0.42);
    eventBus.emit('settings:updated');
    eventBus.emit('toast:show', 'Loaded Galactic Center: Sagittarius A* and S-cluster stars (1PN GR precession)');
  } else if (name === 'einstein_rosette') {
    state.enableRelativity = true;
    state.speedOfLight = 80;
    state.trailLength = 4000;
    state.timeScale = 1.0;
    state.G = 1.0;

    const M_core = 30000;
    state.bodies.push(new Body({
      name: 'Compact Star',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: M_core,
      radius: 20,
      color: '#f59e0b',
      fixed: true
    }));

    // Eccentric relativistic orbit (periapsis ~80px, apoapsis ~320px)
    const rApo = 320;
    const vApo = 6.12;

    state.bodies.push(new Body({
      name: 'Relativistic Planet',
      x: rApo,
      y: 0,
      vx: 0,
      vy: vApo,
      mass: 10,
      radius: 7,
      color: '#06b6d4'
    }));

    state.camera.zoom = 0.95;
    eventBus.emit('camera:zoom', 0.95);
    eventBus.emit('settings:updated');
    eventBus.emit('toast:show', 'Einstein Rosette: General Relativity 1PN perihelion precession');
  } else if (name === 'black_hole_capture') {
    state.enableRelativity = true;
    state.speedOfLight = 80;
    state.trailLength = 4000;
    state.timeScale = 1.0;
    state.G = 1.0;

    const M_bh = 64000;
    // Schwarzschild radius rs = 2*G*M / c^2 = 2 * 64000 / 6400 = 20 px
    state.bodies.push(new Body({
      name: 'Sagittarius A*',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: M_bh,
      radius: 20,
      color: '#020617',
      fixed: true
    }));

    // Inner orbiting star (r = 160 px, v = sqrt(GM/r) = 20 px/s = 25% c)
    state.bodies.push(new Body({
      name: 'Accretion Star Alpha',
      x: 160,
      y: 0,
      vx: 0,
      vy: 20,
      mass: 25,
      radius: 5,
      color: '#fb923c'
    }));

    // Outer companion star (r = 360 px, v = 13.33 px/s)
    state.bodies.push(new Body({
      name: 'Companion Beta',
      x: 0,
      y: -360,
      vx: 13.33,
      vy: 0,
      mass: 15,
      radius: 6,
      color: '#38bdf8'
    }));

    // Infalling probe plunging into the event horizon
    state.bodies.push(new Body({
      name: 'Infalling Probe',
      x: -240,
      y: 80,
      vx: 12.5,
      vy: 1.5,
      mass: 5,
      radius: 3.5,
      color: '#ec4899'
    }));

    state.camera.zoom = 0.85;
    eventBus.emit('camera:zoom', 0.85);
    eventBus.emit('settings:updated');
    eventBus.emit('toast:show', 'Black Hole & Event Horizon: Observe photon rings and horizon capture');
  } else if (name === 'binary_merger') {
    state.enableRelativity = true;
    state.enableGravitationalWaves = true;
    state.speedOfLight = 80;
    state.trailLength = 4000;
    state.timeScale = 1.0;
    state.G = 1.0;

    // Binary Black Holes: separation R = 100 px (x1 = -50, x2 = +50)
    // Mass: M1 = 28000, M2 = 28000 (rs = 2*G*M / c^2 = 2 * 28000 / 6400 = 8.75 px)
    // Gravitational wave radiation reaction (2.5PN) drives orbital decay, chirp, and final horizon merger
    const m = 28000;
    const sep = 50;
    const vOrbit = Math.sqrt((state.G * m * sep) / (4 * sep * sep)); // circular orbit in barycenter frame

    state.bodies.push(new Body({
      name: 'Black Hole Alpha',
      x: -sep,
      y: 0,
      vx: 0,
      vy: -vOrbit,
      mass: m,
      radius: 9,
      color: '#020617',
      fixed: false
    }));

    state.bodies.push(new Body({
      name: 'Black Hole Beta',
      x: sep,
      y: 0,
      vx: 0,
      vy: vOrbit,
      mass: m,
      radius: 9,
      color: '#020617',
      fixed: false
    }));

    state.camera.zoom = 1.35;
    eventBus.emit('camera:zoom', 1.35);
    eventBus.emit('settings:updated');
    eventBus.emit('toast:show', 'Binary Merger: Gravitational waves (2.5PN) drive orbital decay and horizon merger');
  } else if (name === 'protoplanetary_disk') {
    state.G = 1.0;
    state.timeScale = 1.0;
    state.trailLength = 800;
    state.showTrails = true;
    state.enableRelativity = false;
    state.enableGravitationalWaves = false;

    // Central Protostar
    const M0 = 3600;
    const centralStar = new Body({
      name: 'Proto-Sun',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      mass: M0,
      radius: 22,
      color: '#fbbf24',
      fixed: false
    });
    state.bodies.push(centralStar);

    // Accretion disk planetesimals with procedural variation
    const clumpCount = 95;
    const rMin = 65;
    const rMax = 520;

    // Color palettes by disk temperature / composition zone
    const innerColors = ['#fb923c', '#fdba74', '#f97316', '#ea580c']; // Warm rocky silicate zone
    const midColors = ['#38bdf8', '#22d3ee', '#06b6d4', '#67e8f9'];   // Ice-line volatile zone
    const outerColors = ['#a855f7', '#c084fc', '#818cf8', '#e879f9']; // Outer gas/Kuiper zone

    let totalPx = 0;
    let totalPy = 0;

    for (let i = 0; i < clumpCount; i++) {
      // Power-law radial distribution (denser toward the inner disk)
      const u = Math.random();
      const r = rMin + (rMax - rMin) * Math.pow(u, 1.25);
      const theta = Math.random() * Math.PI * 2;
      const vK = Math.sqrt((state.G * M0) / r);

      // Controlled velocity dispersion and slight radial jitter to induce orbit crossing
      const speedJitter = 1.0 + (Math.random() - 0.5) * 0.06;
      const vRad = (Math.random() - 0.5) * 0.04 * vK;
      const vTan = vK * speedJitter;

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const px = r * cosT;
      const py = r * sinT;
      const vx = -sinT * vTan + cosT * vRad;
      const vy = cosT * vTan + sinT * vRad;

      const mass = 0.8 + Math.random() * 1.8;
      const radius = Math.max(2.2, Math.cbrt(mass) * 1.8);

      let color;
      if (r < 160) {
        color = innerColors[Math.floor(Math.random() * innerColors.length)];
      } else if (r < 330) {
        color = midColors[Math.floor(Math.random() * midColors.length)];
      } else {
        color = outerColors[Math.floor(Math.random() * outerColors.length)];
      }

      state.bodies.push(new Body({
        name: `Planetesimal #${i + 1}`,
        x: px,
        y: py,
        vx,
        vy,
        mass,
        radius,
        color
      }));

      totalPx += mass * vx;
      totalPy += mass * vy;
    }

    // Offset central star velocity to preserve center-of-mass barycentric rest frame
    centralStar.vel.x = -totalPx / M0;
    centralStar.vel.y = -totalPy / M0;

    state.camera.zoom = 0.8;
    eventBus.emit('camera:zoom', 0.8);
    eventBus.emit('settings:updated');
    eventBus.emit('toast:show', 'Protoplanetary Disk: Watch planetesimals accrete and merge into planets');
  }
}
