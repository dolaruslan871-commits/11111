// Rendering budgets are independent of THREE and native APIs. Switching a
// profile changes an explicit budget, rather than enabling unbounded detail.
const profile = (values) => Object.freeze(values);

export const GRAPHICS_PROFILES = Object.freeze({
  low: profile({
    id: "low",
    detailFactor: 0.8,
    furDensity: 0,
    maxFur: 0,
    textureSize: 256,
    irisSize: 256,
    shadowSize: 0,
    dpr: 1,
    maxFPS: 30,
    anisotropy: 1,
    physicalMaterials: false,
    contactOpacity: 0.16,
  }),
  medium: profile({
    id: "medium",
    detailFactor: 1.1,
    furDensity: 500,
    maxFur: 2000,
    textureSize: 512,
    irisSize: 256,
    shadowSize: 512,
    dpr: 1.5,
    maxFPS: 45,
    anisotropy: 2,
    physicalMaterials: true,
    contactOpacity: 0.18,
  }),
  high: profile({
    id: "high",
    detailFactor: 1.65,
    furDensity: 1600,
    maxFur: 6500,
    textureSize: 1024,
    irisSize: 512,
    shadowSize: 1024,
    dpr: 2,
    maxFPS: 60,
    anisotropy: 4,
    physicalMaterials: true,
    contactOpacity: 0.21,
  }),
  ultra: profile({
    id: "ultra",
    detailFactor: 2,
    furDensity: 3000,
    maxFur: 12000,
    textureSize: 1024,
    irisSize: 1024,
    shadowSize: 2048,
    dpr: 2.5,
    maxFPS: 60,
    anisotropy: 8,
    physicalMaterials: true,
    contactOpacity: 0.23,
  }),
});

const objectOrEmpty = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

export function graphicsProfile(state = {}, context = {}) {
  state = objectOrEmpty(state);
  context = objectOrEmpty(context);
  const requested = state.graphicsQuality;
  const base = Object.prototype.hasOwnProperty.call(GRAPHICS_PROFILES, requested)
    ? GRAPHICS_PROFILES[requested]
    : GRAPHICS_PROFILES.high;
  const deviceRatio =
    typeof context.devicePixelRatio === "number" &&
    Number.isFinite(context.devicePixelRatio) &&
    context.devicePixelRatio > 0
      ? context.devicePixelRatio
      : 1;
  const result = { ...base, dpr: Math.min(deviceRatio, base.dpr) };

  // Only a large, explicitly chosen Ultra render earns a 2K surface. Desktop
  // pets and ordinary previews retain smaller textures even on Retina displays.
  const largeCapture =
    Number.isFinite(context.captureWidth) && context.captureWidth >= 1024;
  if (base.id === "ultra" && (state.studioQuality === true || largeCapture)) {
    result.textureSize = 2048;
  }

  if (context.batterySaving === true) {
    result.maxFPS = Math.min(result.maxFPS, 30);
    result.dpr = Math.min(result.dpr, 1.5);
  }
  if (context.reducedMotion === true) {
    result.maxFPS = Math.min(
      result.maxFPS,
      context.essentialMotion === true ? 30 : 15,
    );
  }
  if (context.hidden === true) result.maxFPS = 0;
  return result;
}
