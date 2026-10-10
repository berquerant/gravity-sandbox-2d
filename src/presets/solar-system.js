import { Body } from '../models/body.js';
import { eventBus } from '../core/event-bus.js';
import { Camera } from '../renderer/camera.js';

/**
 * Loads Solar System scenarios (Sun-Earth-Moon true scale, Jupiter Trojans at L4/L5, Full Solar System).
 * @param {string} name - Scenario name ('earth_moon', 'trojans', 'solar')
 * @param {Object} state - Global state store
 * @param {Camera} camera - Viewport camera coordinator
 */
export function loadSolarSystemPreset(name, state, camera) {
  if (name === 'earth_moon') {
    const AU = 116751;
    const M_earth = 10.0;
    const M_sun = M_earth * 332946;
    const M_moon = M_earth * 0.0123;
    const rEarth = AU;
    const vEarth = Math.sqrt((state.G * M_sun) / rEarth);
    const rMoon = 300; // 300 px = 384,400 km
    const vMoonRel = Math.sqrt((state.G * M_earth) / rMoon);

    state.bodies.push(new Body({
      name: 'Sun', x: 0, y: 0, vx: 0, vy: 0, mass: M_sun, radius: 120, color: '#fbbf24', fixed: true
    }));
    state.bodies.push(new Body({
      name: 'Earth', x: rEarth, y: 0, vx: 0, vy: vEarth, mass: M_earth, radius: 8.0, color: '#38bdf8'
    }));
    state.bodies.push(new Body({
      name: 'Moon', x: rEarth + rMoon, y: 0, vx: 0, vy: vEarth + vMoonRel, mass: M_moon, radius: 2.2, color: '#f1f5f9'
    }));

    state.camera.zoom = 0.0016;
    state.trailLength = 4000;
    eventBus.emit('camera:zoom', 0.0016);
    eventBus.emit('toast:show', 'Loaded Sun-Earth-Moon system (true scale ratio)');
  } else if (name === 'trojans') {
    const AU = 116751;
    const M_earth = 10.0;
    const M_sun = M_earth * 332946;
    const M_jup = M_earth * 317.8;
    const R_jup = 5.2044 * AU;
    const vJup = Math.sqrt((state.G * M_sun) / R_jup);

    state.bodies.push(new Body({
      name: 'Sun', x: 0, y: 0, vx: 0, vy: 0, mass: M_sun, radius: 120, color: '#fbbf24', fixed: true
    }));

    state.bodies.push(new Body({
      name: 'Jupiter', x: R_jup, y: 0, vx: 0, vy: vJup, mass: M_jup, radius: 55, color: '#fb923c'
    }));

    const lagrangePoints = [
      { centerAngle: Math.PI / 3, count: 28, color: '#38bdf8' },  // L4 Greek camp
      { centerAngle: -Math.PI / 3, count: 28, color: '#a78bfa' } // L5 Trojan camp
    ];

    lagrangePoints.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        const dAngle = (Math.random() - 0.5) * 0.28;
        const dRadius = (Math.random() - 0.5) * (0.35 * AU);
        const angle = group.centerAngle + dAngle;
        const r = R_jup + dRadius;

        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;

        const vOrb = Math.sqrt((state.G * M_sun) / r);
        const speedJitter = 0.995 + Math.random() * 0.01;
        const angleJitter = (Math.random() - 0.5) * 0.02;

        const tanAngle = angle + Math.PI / 2 + angleJitter;
        const vx = Math.cos(tanAngle) * vOrb * speedJitter;
        const vy = Math.sin(tanAngle) * vOrb * speedJitter;

        state.bodies.push(new Body({
          x: px,
          y: py,
          vx: vx,
          vy: vy,
          mass: 0.0001 + Math.random() * 0.0005,
          radius: Math.max(1.8, 1.8 + Math.random() * 0.8),
          color: group.color
        }));
      }
    });

    state.camera.zoom = 0.00045;
    state.trailLength = 4000;
    state.effectivePotentialMode = true;
    state.showGravityContours = true;
    eventBus.emit('camera:zoom', 0.00045);
    eventBus.emit('settings:updated');
    eventBus.emit('toast:show', 'Loaded Sun-Jupiter-Trojans system (L1-L5 Rotating Frame Potential active)');
  } else if (name === 'solar') {
    const AU = 116751;
    const M_earth = 10.0;
    const M_sun = M_earth * 332946;

    state.bodies.push(new Body({
      name: 'Sun', x: 0, y: 0, vx: 0, vy: 0, mass: M_sun, radius: 120, color: '#fbbf24', fixed: true
    }));

    const vOrbit = (r) => Math.sqrt((state.G * M_sun) / r);

    const placePlanet = (pName, distAU, mass, radius, color) => {
      const r = distAU * AU;
      const angle = Math.random() * Math.PI * 2;
      const v = vOrbit(r);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      const vx = -Math.sin(angle) * v;
      const vy = Math.cos(angle) * v;
      const body = new Body({
        name: pName, x: px, y: py, vx, vy, mass, radius, color
      });
      state.bodies.push(body);
      return { body, px, py, vx, vy };
    };

    const placeSatellite = (parent, sName, distPx, mass, radius, color) => {
      const satAngle = Math.random() * Math.PI * 2;
      const vSatRel = Math.sqrt((state.G * parent.body.mass) / distPx);
      const sx = parent.px + Math.cos(satAngle) * distPx;
      const sy = parent.py + Math.sin(satAngle) * distPx;
      const svx = parent.vx - Math.sin(satAngle) * vSatRel;
      const svy = parent.vy + Math.cos(satAngle) * vSatRel;
      state.bodies.push(new Body({
        name: sName, x: sx, y: sy, vx: svx, vy: svy, mass, radius, color
      }));
    };

    // 1. Mercury
    placePlanet('Mercury', 0.3871, M_earth * 0.0553, 3.1, '#94a3b8');

    // 2. Venus
    placePlanet('Venus', 0.7233, M_earth * 0.815, 7.6, '#fde047');

    // 3. Earth & Moon
    const earthData = placePlanet('Earth', 1.0000, M_earth, 8.0, '#38bdf8');
    placeSatellite(earthData, 'Moon', 300, M_earth * 0.0123, 2.2, '#e2e8f0');

    // 4. Mars
    placePlanet('Mars', 1.5237, M_earth * 0.107, 4.3, '#f87171');

    // Asteroid Belt (2.1 AU ~ 3.3 AU)
    // Dwarf planets & major asteroids: Ceres, Vesta, Pallas, Hygiea
    placePlanet('Ceres', 2.767, M_earth * 0.000157, 2.5, '#cbd5e1');
    placePlanet('Vesta', 2.362, M_earth * 0.000043, 2.0, '#e2e8f0');
    placePlanet('Pallas', 2.772, M_earth * 0.000035, 1.9, '#94a3b8');
    placePlanet('Hygiea', 3.138, M_earth * 0.000014, 1.8, '#a1a1aa');

    // Background asteroids (70 dispersed asteroids)
    const asteroidColors = ['#94a3b8', '#a1a1aa', '#cbd5e1', '#64748b', '#78716c'];
    for (let i = 0; i < 70; i++) {
      // Semi-major axis 2.15 AU ~ 3.25 AU main belt distribution
      const distAU = 2.15 + Math.random() * 1.1;
      const r = distAU * AU;
      const angle = Math.random() * Math.PI * 2;
      const v = vOrbit(r);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      // Velocity fluctuation due to eccentricity / inclination
      const speedJitter = 0.992 + Math.random() * 0.016;
      const angleJitter = (Math.random() - 0.5) * 0.03;
      const tanAngle = angle + Math.PI / 2 + angleJitter;
      const vx = Math.cos(tanAngle) * v * speedJitter;
      const vy = Math.sin(tanAngle) * v * speedJitter;
      const col = asteroidColors[i % asteroidColors.length];

      state.bodies.push(new Body({
        name: `Asteroid #${i + 1}`,
        x: px,
        y: py,
        vx,
        vy,
        mass: 0.000005 + Math.random() * 0.00002,
        radius: Math.max(1.5, 1.5 + Math.random() * 0.6),
        color: col
      }));
    }

    // 5. Jupiter & Galilean Moons
    const jupData = placePlanet('Jupiter', 5.2044, M_earth * 317.8, 55, '#fb923c');
    const galileanMoons = [
      { name: 'Io', dist: 329, mass: 0.149, radius: 2.3, color: '#fef08a' },
      { name: 'Europa', dist: 524, mass: 0.080, radius: 2.0, color: '#bae6fd' },
      { name: 'Ganymede', dist: 835, mass: 0.248, radius: 3.3, color: '#d6d3d1' },
      { name: 'Callisto', dist: 1469, mass: 0.179, radius: 3.0, color: '#9ca3af' }
    ];
    galileanMoons.forEach(sat => {
      placeSatellite(jupData, sat.name, sat.dist, sat.mass, sat.radius, sat.color);
    });

    // 6. Saturn & Major Moons
    const saturnData = placePlanet('Saturn', 9.5824, M_earth * 95.16, 45, '#fde68a');
    const saturnMoons = [
      { name: 'Rhea', dist: 411, mass: 0.004, radius: 2.0, color: '#e2e8f0' },
      { name: 'Titan', dist: 954, mass: M_earth * 0.0225, radius: 3.2, color: '#f59e0b' },
      { name: 'Iapetus', dist: 2779, mass: 0.003, radius: 1.8, color: '#cbd5e1' }
    ];
    saturnMoons.forEach(sat => {
      placeSatellite(saturnData, sat.name, sat.dist, sat.mass, sat.radius, sat.color);
    });

    // 7. Uranus & Major Moons
    const uranusData = placePlanet('Uranus', 19.201, M_earth * 14.54, 32, '#67e8f9');
    const uranusMoons = [
      { name: 'Titania', dist: 340, mass: 0.0057, radius: 2.0, color: '#e2e8f0' },
      { name: 'Oberon', dist: 455, mass: 0.0050, radius: 2.0, color: '#cbd5e1' }
    ];
    uranusMoons.forEach(sat => {
      placeSatellite(uranusData, sat.name, sat.dist, sat.mass, sat.radius, sat.color);
    });

    // 8. Neptune & Triton
    const neptuneData = placePlanet('Neptune', 30.047, M_earth * 17.15, 31, '#38bdf8');
    placeSatellite(neptuneData, 'Triton', 277, M_earth * 0.0036, 2.2, '#93c5fd');

    state.camera.zoom = 0.00025;
    state.trailLength = 8000;
    eventBus.emit('camera:zoom', 0.00025);
    eventBus.emit('toast:show', 'Loaded Solar System: 8 planets, major moons & asteroid belt');
  }
}
