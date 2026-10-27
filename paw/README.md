# Paw 0.5

Desktop pets for Windows x64 and macOS Intel / Apple Silicon, built on the user's supplied 0.3 archive and the published 0.4 release. No AI integration. See [the Russian user guide](docs/VERSION_05.md) for the complete 0.5 changes and controls.

## Download / update

Use the external GitHub release assets, not the source archive:

- `Paw-0.5.1-windows-x64-Setup.exe`: quit Paw, run Setup. A desktop shortcut is created.
- `Paw-0.5.1-mac-x64.zip`: Mac Intel.
- `Paw-0.5.1-mac-arm64.zip`: Mac Apple Silicon.

On Mac, extract with **Archive Utility**, move the **entire Paw.app** into **Applications**, replacing the previous version, then open it. A Desktop link is created on first packaged launch (subject to Desktop permissions). Never move the internal Contents folder. No terminal/npm required for installed builds.

Existing `paw-desktop-pet` preferences and progress are retained. The 0.5 welcome appears once, with all nine pets and a Continue button. Builds are unsigned / unnotarized previews; OS security prompts may appear.

## What's in 0.5

- Independent glass quick-menu window above/right of the pet, adjusted at screen edges. Inline player, timer, notes, browser-configurable Google search and up to 24 app launchers.
- Species-specific movement/rest, sit/groom/yawn/curl/ten-minute sleep/wake sequence, more gestures, mood ears/tails, original varied synthesized voices and age-dependent stylized fur.
- Nine characters: dog, cat, crocodile, kangaroo, dinosaur, owl, rabbit, fox and husky Hasya. Rename pets except Hasya, with the requested creator's-pet note.
- User-selected outfits only; retained explicit outfits migrate. Removed automatic pajama/seasonal dressing and the screen-paw pose.
- Independent static house/toy windows, configurable house visibility and toy distance. Building uses coins, wood and stone. Species-appropriate inventory feeding, bowl/ground meal and gratitude.
- Stateful fishing with bait/cast/bite/hook/steering/tension/reeling, persistent crop growing, bird forage and wood/stone resource games. Rewards and costs are validated in the main process.
- Studio: orbit/elevation/zoom/actions/backgrounds, high-resolution PNG and 1–12-second clips. Primary H.264/MP4 export uses explicit 30 fps frame timestamps; render time may exceed clip duration on slow graphics. MediaRecorder fallback uses a supported format. Formats include vertical 9:16, portrait 4:5, square and widescreen. Exports go to Desktop; no screen/microphone capture is included in pet clips.
- Five additional themes (seven total), glass and opacity controls, simple/detailed UI. Native blur is conditional on platform support.
- Visible-model edge clamping, rather than trapping transparent window margins on-screen; display work areas and scaling are respected.
- Preserved reversible native file/folder Trash feeding, actual CPU/RAM/battery, optional weather/app/window reactions, reminders and screenshots.

## Development

Node 24, Electron 45, pinned Three.js 0.186.1. All runtime art, geometry, modules and muxer code are local; no CDN dependencies.

```sh
cd paw
npm ci
npm run vendor
npm test
npm start
```

`vendor` copies pinned Three.js and the pure MP4 muxer plus licenses, and generates browser versions of tested pure CommonJS model/game modules.

```sh
npm run test:ui
bash scripts/cloud-desktop-test.sh  # Linux Xorg dummy driver harness
npm run test:desktop              # Existing desktop display, disposable test profile
npm run dist:win
npm run dist:mac
```

The browser preview supports appearance, life/game interaction and studio rendering. Native OS controls, app pickers and Desktop file writing require the installed app. No browser preview action pretends to trash local files.

Native acceptance tests pass an explicit disposable development profile and redirect export files into the fixture's Desktop. Packaged apps ignore this development-only profile flag. Tests only trash generated disposable folders, using the actual native Trash API; they do not invoke permanent deletion.

## Validation / platform limits

Tests cover age persistence, rest timing, diets/inventory, crop watering/growth/harvesting, fishing controls and rewards, resource-spam limits, settings migration/Hasya protection, gestures, visible bounds and native folder feeding. UI tests build every wardrobe combination for all nine species and exercise themes/languages, retained WebGL canvas, games, studio and requested poses. Native integration verifies first-run welcome, menu panels, real PNG/video Desktop exports, garden persistence, folder Trash drops, static habitat windows, construction costs and four-corner placement.

Mac ZIPs are cross-packaged on Ubuntu; NSIS is built on Windows. Hardware audio/Bluetooth, native OS permissions, real multi-monitor arrangements and the Mac/Windows GUI still require target-machine testing. macOS Bluetooth direct toggling uses an available blueutil helper, otherwise settings open. Temperature remains explicitly unavailable without a supported sensor interface. Indexed search is limited by the OS's index. Native media commands depend on the active player's support. Window-edge hiding remains approximate rather than full arbitrary-app occlusion.

## Credits

Original procedural pets, vector art and voices. Three.js and the pinned MP4 muxer are MIT-licensed; their license files are included in `src/vendor`. The muxer packages encoded frames only; encoding uses Chromium's on-device WebCodecs/MediaRecorder APIs. Weather is supplied by Open-Meteo / GeoNames when a city is configured.
