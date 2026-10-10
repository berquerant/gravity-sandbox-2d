/**
 * Overlay coordinator: Hill spheres, distance lines, gravitational waves, and interaction overlays
 */

export {
  drawHillSpheres,
  drawDistanceLines,
  drawGravitationalWaves
} from './overlays/celestial-overlays.js';

export {
  VELOCITY_GIZMO_SCALE,
  drawInteractions,
  drawSelectionBox,
  drawVelocityGizmo
} from './overlays/interactive-overlays.js';

export {
  drawDiskPlacementPreview
} from './overlays/disk-preview.js';
