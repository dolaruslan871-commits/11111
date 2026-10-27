# Paw 0.7.2 — first playable Paw World lake

Status: release candidate, 2026-10-27. Base: Paw 0.7.1. Keep this document and ROADMAP.md in the ASAR for continuation.

## Implemented
- Separate lazy World window with a procedural 3D forest lake, dock, selected pet, water, weather, dawn/day/sunset and optional local ambient water/birds.
- Real mouse aiming/power, release to cast, upward hook and hold/release/steer landing; keyboard alternative. Six species, weights, rarity, persistent records and optional assistance.
- Shared Paw coins, creel, reserved catch, sale and explicit allocation to the existing pet-food inventory; real rods/reels/lines/bait shop. Free bread prevents a soft lock.
- RU/UK/EN, independent Low/Medium/High graphics. World pauses on focus loss, minimize, user pause and context loss. Closing destroys its renderer; no World simulation in the background.
- Main-process authoritative rewards, duplicate-operation protection and atomic save queue. Failed writes roll back the World operation and pause for retry. Reopening during close queues a fresh window.
- Fixed the user's recurring native exception in advanceTransport: Electron rejects JavaScript negative zero as an integer coordinate. Reproduced the exact conversion error in Electron 45. All pet moves normalize negative zero and reject invalid native int32 coordinates.
- Fixed the user's screenshot menu gap: visible body bounds instead of transparent padding; card bottom aligns with the feet; actual card height is measured; flyout chooses the roomier side.

## Validation
- 33 Node tests pass: existing pose/personality/calendar/migration tests plus fishing, economy, saves, rollback, lifecycle, IPC trust, coordinates and menu geometry.
- Actual Electron 45 + software WebGL: mouse cast -> bite -> upward hook -> held reel -> caught fish. Reserve blocks bulk sale; catch transfers to ordinary pet food; collection remains; buying birch rod debits 140 shared coins and equips it.
- Low/High/Medium graphics rebuilds, sound after gesture, manual pause/audio suspension and forced WebGL context loss/recovery passed.
- Restart retained coins, food, age, gear, collection, weather and sound. World closed renderer PID disappears. Desktop pet visibility, walking, held pose and feeding passed after returning.
- RU/UK/EN opened on repeated close/reopen cycles, with no renderer errors. Native menu height measured 474 px and fit all main rows.
- Xvfb has no window manager. Minimize/focus handlers were verified with explicit Electron events; actual OS minimize behavior and real hardware FPS require target-device checks.
- Windows and macOS packages are cross-built and unsigned. Do not describe them as tested on real Windows/macOS. No online services or server are required by World.

## Build and continuation
- Main source: /workspace/paw-072. Electron 45.0.0, electron-builder 26.18.0. Existing dependencies are a symlink to /workspace/paw-071/node_modules; do not include node_modules in ASAR.
- npm test. Native QA: /workspace/paw-tools/world-072-smoke.mjs and world-072-lifecycle.mjs. Last evidence lives in /tmp/paw-072-qa (copy out when needed; /tmp can vanish after reconnect).
- Use explicit cache directories under /tmp for electron-builder. Build mac ZIP x64/arm64 and Windows x64 NSIS with signExecutable=false. The local Linux builder dependency extracts the exact compiler-generated NSIS uninstaller PE using 7zz instead of Wine. This workaround is build tooling only.
- Distribution filenames: Paw-0.7.2-windows-x64-Setup.exe, Paw-0.7.2-mac-arm64.zip, Paw-0.7.2-mac-x64.zip, Paw-0.7.2-app.asar. Publish checksums and release notes alongside them.
- External downloads: repository dolaruslan871-commits/11111, branch downloads. Keep all previous downloads. Use a temporary Git index so the unrelated untracked website checkout remains untouched. Installers use Git LFS, ASAR ordinary Git.

## Next stages — not implemented
1. Let the user try this first lake and address feedback or target-device bugs.
2. Farm: crops, fruit trees, watering, fertilizer, greenhouse; timestamp-based offline growth; explicit pet-food allocation.
3. Forest: wood/stone gathering, tools, resource regrowth, crafting feeders/workshop/dock/decorations, shared economy.
4. River, mountain lake, coast, expanded tackle, aquarium/trophy display, optional quests and achievements.
Read ROADMAP.md / PAW_WORLD_PLAN.md for the full accepted plan. Do not claim Farm, Forest, additional waters, an aquarium or online competitions are already included.

## User-supplied 0.7.2 merge
The final base is the ASAR uploaded later by the user from another account (SHA256 902285fdc0a478ac6d17c3e15d41487df131569b420bbcc0aba130c92fdc8d3c). Its premium surfaces, collapsible sidebar, preview camera, selection/window animations, radial menu changes and installer source are preserved. This session adds the lake and fixes. Sidebar logo/navigation whitespace was reduced as requested. The unchanged World engine keeps the validation above. Repeat the full mouse, native lifecycle, incoming UI and archive checks after this merge; final evidence is distributed separately as Paw-0.7.2-VALIDATION.json. See MERGE_NOTES.json for exact provenance.

## Final pause navigation fix
Focused integration testing found the pause curtain could cover the Back button after a focus change. Header navigation now stays above the pause curtain, while modal tools/loading stay above the header. Targeted exit-while-paused and repeated-language checks must pass in the packaged archive.
