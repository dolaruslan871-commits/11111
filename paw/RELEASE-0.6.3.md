# Paw 0.6.3 — implementation and verification checklist

Baseline: user-provided Paw 0.6.2 ASAR, 64 entries; every ASAR SHA256 integrity hash verified before extraction. The original archive is retained unchanged. The website project is separate.

## Desktop interaction

- [x] Deliberate hold-to-pick-up without breaking tap, double tap, context menu or native file drops.
- [x] Release from height enters a controlled fall and deploys a visible parachute.
- [x] Slow descent, stable feet alignment, gentle landing.
- [x] Drop onto an external window seats the pet on its upper edge.
- [x] Follow target identity and position; closing, minimizing or removing it releases the pet safely.
- [x] Screen boundaries, scale, multiple displays and negative screen origins.
- [x] Native macOS and Windows adapters; explicit unsupported/permission states.

## Life and expressions

- [x] Autonomous rest, sleep, play, boredom and return greeting.
- [x] Gradual mood and behavior with state dwell and transition hysteresis.
- [x] Rich expression targets blended smoothly, independently of state broadcast frequency.
- [x] Old progress, inventory, tasks, coins, age, outfits and settings preserved.

## 3D rendering

- [x] Smooth geometry for all nine existing pets; recognisable silhouettes and proportions retained.
- [x] PBR fur/skin, nose, paws, clothing and accessories.
- [x] Expressive eyes with depth, cornea, reflections and catchlights.
- [x] Soft studio lighting, contact shadows and ambient occlusion cues.
- [x] Procedural texture resolution scaled to real display needs; 2K only where justified.
- [x] Correct colour space, antialiasing and HiDPI scaling.
- [x] Transparent desktop background retained.
- [x] Low / Medium / High / Ultra settings persist and affect rendering.
- [x] Bounded geometry, textures, render rate and resource disposal; no empty frame on outfit changes.
- [x] Held, falling, parachuting, landing and perching poses.

## Interface and animation

- [x] Cohesive typography, hierarchy, spacing, surfaces and controls throughout existing windows.
- [x] Dashboard, Wardrobe, Settings and remaining sections visibly polished.
- [x] Interruptible window/section/category transitions; no stale completion after rapid actions.
- [x] Wardrobe choice/save feedback and stable pet preview.
- [x] Loading, errors and empty states remain usable.
- [x] Reduce Motion respected in CSS and JavaScript.
- [x] GPU-friendly animation; no continuous expensive interface effects.

## Validation and packaging

- [x] Meaningful deterministic tests for physics, mood, quality and save compatibility.
- [x] Browser WebGL renders all nine pets; motion, outfits, quality and UI regressions checked.
- [x] Before/after captures at matching poses and camera positions.
- [x] Electron startup, native IPC and persistence smoke using a clean temporary profile.
- [x] Repacked ASAR re-extracted and verified; version and entrypoints match 0.6.3.
- [x] Release notes distinguish verified functionality from platform-specific checks requiring real macOS/Windows.

Performance measurements from software-rendered cloud graphics do not establish GPU performance or battery life on a physical device. Native desktop overlays must also be verified on the target operating systems.

## Validation evidence

- 51 deterministic Node tests passed (physics, window-observer lifecycle, life/save compatibility and graphics budgets).
- Source application passed 27 Electron 45 checks under a Linux virtual display, including real native walking, IPC actions, settings persistence, parachute deployment and landing.
- UI verification covered existing sections, rapid category/navigation changes, retained canvas, quality persistence and Reduce Motion.
- Native macOS/Windows observer scripts were tested through parsers and injected observers, not on their target operating systems.
- AO is procedural micro-cavity material AO plus contact shadows; no costly full-screen SSAO pass is used.

## Target-system validation still required

- [ ] Native window perching/close detection on actual macOS and Windows.
- [ ] Hardware GPU frame rate, battery usage, signing and installation in the owner’s original application bundle.

Final packaged source: 71 files, all re-extracted and byte-verified. No runtime/development dependencies, caches or test profiles included.
