# Paw 0.4 — desktop pet

Paw is an offline-first Electron desktop pet for Windows x64 and macOS Intel / Apple Silicon. Version 0.4 is based on the user's supplied `Paw-0.3.0-app.asar`; the upload was extracted without executing it. AI integration is deliberately excluded.

## Install / update

Download the native build from the GitHub release linked in `RELEASE_NOTES.md`.

- **Windows:** close Paw from its tray menu, run `Paw-0.4.0-windows-x64-Setup.exe`, and finish installation. The installer creates a desktop shortcut.
- **Mac Intel:** download `Paw-0.4.0-mac-x64.zip`.
- **Mac M1/M2/M3/M4 and later Apple Silicon:** download `Paw-0.4.0-mac-arm64.zip`.
- **Mac:** quit Paw, extract with macOS **Archive Utility**, and drag the whole **Paw.app** into **Applications**, replacing the previous app. Open Paw from Applications. Do not open or move its internal `Contents` directory. ZIP archives for Mac contain the complete `.app`; they are not Windows installers.

Installed builds need no Node.js, terminal, or npm. The existing settings directory remains `paw-desktop-pet`, so 0.3 outfits and settings migrate. New life progress lives separately in `progress.json` beside `preferences.json`. Builds are unsigned and not notarized; operating system security prompts may appear.

## Life and behavior

The **Personality / Характер** page shows age, mood, energy, hunger, friendship, level, coins, and house progress. Adoption starts on the first 0.4 launch. Age continues while Paw is closed. Growth is tied to real elapsed days, not XP or time spent clicking: a visible small increase each week, young stage after two weeks, adult size after eight weeks. Babies also have proportionally larger heads. Size in Settings remains an independent display scale.

The pet walks, sleeps after computer inactivity, greets the returning user, follows a nearby cursor, seeks attention, and reacts to mood, energy, weather and local time. Personality controls include activity, curiosity, laziness, walk/attention frequency, quiet hours, night sleep, reminder intervals, movement mode, optional app/window reactions, seasons and zero gravity.

Select a city in **Settings** for Open-Meteo weather. Rain produces an umbrella/raincoat; snow adds a scarf; heat produces a fan. Night sleep uses pajamas when no outfit overrides that slot. Seasons add optional snowflakes, leaves or flowers. Christmas and Halloween use temporary seasonal hats in empty outfit slots; saved outfits are retained. Enter your birthday for the annual cake animation.

Two pets can share the desktop: select a companion in Personality. They meet, play, chase, briefly quarrel and rest together. A house grows from a box to a cabin by spending earned coins. The pet can rest in it and peek out.

## Pets and graphics

Nine characters: dog, cat, crocodile, kangaroo, dinosaur, owl, rabbit, fox, and the husky **Хася / Hasya**. The husky has a separate gray-white palette, facial mask, blue irises, upright ears, cheek/neck tufts, white paws and a curled fluffy tail. The owl, kangaroo and dinosaur have slimmer silhouettes. The inappropriate shared front collar is removed from those species. Faces, eyes and silhouettes have additional detail; clothes follow the body and limbs. Rendering uses locally packaged Three.js, capped pixel ratio, 30 fps and pauses when hidden/detached.

Dark theme is neutral black/graphite with muted lavender accents and glass panels. Light theme and Russian/Ukrainian/English remain available. The same WebGL canvas is retained when switching pages, languages and themes.

## Play, rewards and gestures

- Double click: pet the animal. Repeated paw taps: anger. Tail tap: chase tail.
- Five quick ear taps: detective animation. Fast 360° rotation: dance.
- Four 30-second click games: fishing (wait for the bite), butterflies, ball, and hide-and-seek. Each successful catch awards game coins when the round completes, with a bounded reward. Game IDs and target transitions are checked in the main process.
- One gift per local calendar day: accessory or coins. New reward items cost coins; the existing 0.3 wardrobe stays accessible.
- Carrot, cookie and berries affect hunger, mood and favorite food. Food is virtual and separate from file feeding.
- Skateboard, scooter, jetpack, zero gravity, painting, books, gamepad, umbrella, fan, gifts and birthday cake have procedural 3D props and animations.
- Drag the preview or use its rotation slider to inspect clothes through 360°.

## Desktop tools

The right-click glass menu opens audio/Bluetooth controls, weather, one app shortcut, music, timer, notes, screenshot, search, computer indicators, games and Personality.

- Timer and dated alarm; saved across restarts. Due notes and timers are processed even while the menu is open. Pet gestures and icons signal reminders; task text is shown in the dashboard.
- Notes with optional due times, completion and deletion.
- Play/pause, next/previous and volume-step media commands through the OS.
- Screenshots through Electron desktop capture: whole display or a dragged rectangle, saved as a local PNG through a Save dialog. Capture occurs only after the user requests it.
- File/app search uses macOS Spotlight or Windows Search's system index plus local app directories. Only returned search results can be launched. A separate button opens a web search in the default browser.
- CPU utilization and RAM use actual OS counters; battery uses native tools. Temperature is explicitly unavailable when there is no supported standard sensor interface. Indicators do not invent values.
- Optional window reactions use foreground-window bounds to approach edges and upper borders. Hiding is represented by clipping the pet; this is not full occlusion/compositing behind every arbitrary app. macOS may require Automation / Accessibility permission; unsupported window services fail quietly.
- Optional app reactions recognize common code editors, games and music apps by process name. They do not inspect document text or upload app activity.
- Device sound mute uses macOS volume settings / Windows Core Audio, not the pet's own mute switch. Bluetooth on macOS uses an installed `blueutil` helper when available; otherwise Paw opens Bluetooth settings. Windows uses WinRT radios. These features depend on OS permissions and hardware.

## File feeding

Explicitly dropped files **and folders** go through the native system Trash / Recycle Bin, following an eating or carrying animation. There is no delete confirmation on a drop and no permanent-delete fallback. Selecting parent and child together trashes the parent once. Links and protected roots / running app ancestors are rejected. Real source disappearance is checked; errors are not displayed as success. Virtual treats do not touch files.

## Development

```sh
cd paw
npm ci
npm run vendor
npm test
npm start
```

Node 24 is used in CI. All Three.js modules and original vector art are local, without CDN runtime dependencies. Synthesized voices are original animal-inspired sounds, not recordings. `npm run vendor` also regenerates the browser preview copy of the tested pure life engine.

```sh
npm run test:ui
bash scripts/cloud-desktop-test.sh
npm run dist:win
npm run dist:mac
```

The browser preview supports appearance/personality and illustrative virtual life, notes and timer state. OS controls, native screenshots, native game reward persistence and file trashing require the desktop app. It is not an installer.

## Validation and limits

Unit tests cover calendar growth, rest/return, quiet hours, weather responses, daily gift limits, food, reminders, birthdays, preference migration, gestures, OS command validation, weather request/cache behavior and reversible folder feeding. Browser tests construct all catalog options across all species using real WebGL. Native Linux integration checks sandboxed preload IPC, menu, timers/tasks, gifts, game reward boundaries, a real folder+child Trash drop, and restart persistence.

Mac ZIPs are cross-packaged on Ubuntu; Windows NSIS is built on Windows. Real Mac/Windows GUI, Bluetooth hardware, system media dispatch and OS permission dialogs cannot be fully verified on the Linux development machine. Check these on target hardware. The application is a procedural desktop pet, not a biological simulator; movement and game modes are deliberately lightweight.
