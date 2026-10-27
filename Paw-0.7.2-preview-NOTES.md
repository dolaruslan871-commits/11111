# Paw World handoff — DEVELOPMENT RESUMED

Base: Paw 0.7.1. Working version: 0.7.2, UNFINISHED DRAFT.
Source: /workspace/paw-072. User received the stopped draft on 2026-10-27, then explicitly authorized continuing development. Current task: complete and verify the first lake and deliver installers plus ASAR.

## Implemented in the draft
- Full long-term roadmap and stage boundaries saved in PAW_WORLD_PLAN.md and src/world/ROADMAP.md.
- Separate World window, restricted preload/IPC, lazy 3D loading, main-process session host, pause reasons, close/dispose paths.
- Native authoritative world engine: mouse-driven cast parameters, float/bite/hook/fight phases, six lake species, weights, records, assistance, free bread and worms.
- Shared coins, creel, sale, pet-food allocation, reserved fish, rods/reels/lines/bait shop, idempotent durable operations.
- Procedural 3D lake, shoreline, forest, dock, reused pet rig, rod/line/float, weather/time and independent quality options.
- World UI in RU/UK/EN: HUD, shop, creel, collection, settings, instructions, mouse and keyboard input.
- Optional procedural ambient audio and context-recovery pause support.
- World progress preserved as life.world through the existing atomic progress store. Legacy games retained behind the original-mini-games link; their sessions now close when their view is disposed.

## Evidence and limits
- 23 Node tests passed: 12 existing activity/age tests + 11 world engine tests (allocation, duplicate operations, purchases, pause/close, casts, migration and invalid reward commands).
- Source syntax check passed before the last scene/context-pause refinements.
- Native Electron launched the entry screen and medium-quality 3D lake. Screenshots: /tmp/paw-072-qa. Reported scene: 150 trees, 263 draw calls, about 147k triangles, 5 textures, 75 geometries.
- The first mouse test cast successfully and reached the bite. Its asynchronous readiness predicates were incorrect, so its apparent fight/catch screenshots did NOT prove a catch. The test script was corrected.
- The corrected native test was stopped at the user's request, after opening the lake. Complete mouse fishing, UI sales/feeding, long-run performance, pause/context-loss/close cycles and restart persistence are NOT verified.
- The last scene changes (irregular shore, camera/foliage/water adjustments) and context-pause refinements have NOT completed visual/regression validation.
- No 0.7.2 Windows or macOS installer was built. This ASAR is a source/app snapshot for continuation, NOT a tested release.

## Next work, in order
1. Start /tmp/paw-xvfb/usr/bin/Xvfb :88 if native tests are needed; do not assume it is running.
2. Read ROADMAP.md and this handoff, inspect current source. Re-run syntax and existing tests.
3. Complete an actual mouse cast → bite → upward hook → hold/release/steer → catch. Use synchronous pawWorldInspect().phase predicates or await IPC in a Node polling loop.
4. Test the creel and shop through the UI: reserve, sell, allocate food, buy/equip, close/reopen and restart; confirm existing coins/age/outfit/house remain intact.
5. Test focus/minimize/manual pause, graphics rebuild and WebGL loss; repeat open/close cycles and verify no active World renderer/timer/audio remains.
6. Polish the scene and interaction cues; tune bite/landing times and independent graphics budgets. Verify all three languages and supported window sizes.
7. Build and validate Windows x64 Setup.exe, Mac arm64 ZIP, Mac x64 ZIP and the final ASAR, then publish externally.
8. Only after the lake stage is accepted, begin Farm and Forest, then the later waters/aquarium/trophies described in ROADMAP.md.

## Packaging context
- Build dependencies live in /workspace/paw-071/node_modules, symlinked by this project. They are NOT part of the ASAR.
- Electron 45.0.0 and electron-builder 26.18.0.
- Previous external download repo: dolaruslan871-commits/11111, downloads branch. Large installers use Git LFS; source ASAR files fit ordinary Git.
- Do not touch the unrelated untracked website in /workspace/11111. Use a temporary Git index for publishing snapshots.

## Recovery checkpoint — 2026-10-27
- Environment reconnected. Source changes and all files survived. Latest unit suite: 33 passed.
- Added atomic-operation rollback on failed World saves, a paused retry state and a queued reopen during close.
- Fixed desktop native integer conversion: reproduced Electron rejecting negative zero with the exact error from the user screenshot. All pet positions now normalize negative zero and reject invalid int32 coordinates.
- Fixed context menu placement: anchor to bodyRect, align card bottom with feet, measure content height and choose flyout side by actual available space.
- Current corrected native run has passed actual mouse catch, reserve protection, pet-food transfer, collection retention and real tackle purchase. Further graphics/context/lifecycle checks still running.
- Native QA script: /workspace/paw-tools/world-072-smoke.mjs.
- Installer builds started; do not assume completed or verified until release evidence is written.
