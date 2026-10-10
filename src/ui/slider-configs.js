import { registerBodySliderConfigs } from './slider-configs/body-configs.js';
import { registerPhysicsSliderConfigs } from './slider-configs/physics-configs.js';
import { registerDiskSliderConfigs } from './slider-configs/disk-configs.js';

/**
 * Registry of direct numerical adjustment configurations for all sliders across the application.
 */
export function registerAllSliderConfigs(state, openModal, attachSliderClick) {
  registerPhysicsSliderConfigs(state, openModal, attachSliderClick);
  registerBodySliderConfigs(state, openModal, attachSliderClick);
  registerDiskSliderConfigs(state, openModal, attachSliderClick);
}
