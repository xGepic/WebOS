# webOS

A personal Brave extension that replaces the new tab with a Desktop that looks and feels like an operating system. See [Spec 0001](docs/specs/0001-webos-v1.md), the [GLOSSARY](GLOSSARY.md) and [ADR-0001](docs/adr/0001-angular-over-react.md).

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Production build of the extension into `dist/webos/browser` |
| `npm start` | Dev server in a normal tab (state goes to `localStorage` instead of extension storage) |
| `npm test` | Runs the webOS core tests with Vitest |
| `npm run typecheck` | Typechecks the app and the core tests |

## Load in Brave

1. `npm run build`
2. Open `brave://extensions`, turn on Developer mode, choose **Load unpacked** and pick `dist/webos/browser`.
3. Open a new tab. After rebuilding, press the reload button on the extension card.

## Layout

- `src/core/`: the framework-free webOS core. No Angular imports. It is created with injected edges (`Storage`, `Clock`, `BrowserLookup` for the Launcher, Recent and its bookmarks and history, `Fetch` for the weather and GitHub, and `SystemMonitor` for CPU and memory), and its tests run against in-memory, controllable and stubbed versions of them from `src/core/testing.ts`. `index.ts` is its only entry point (`createWebOS` and the `WebOS` interface); the rest is grouped by area, each module next to its tests:
  - `state/`: the versioned state document, its migrations, and backups
  - `desktop/`: the snap grid, the Widget catalog and Edit Mode's moves, and the Apps
  - `launcher/`: search ranking and quick actions
  - `dev-utilities/`: JSON, Base64, text diff, UUID and timestamp tools
  - `organizer/`: Links, Todos, Notes and the greeting
  - `time/`: Calendar, Countdowns and the World Clock
  - `sky/`: Weather, Sun and Moon
  - `activity/`: Recent pages, System readings and GitHub contributions
  - `edges.ts`, `format.ts` and `testing.ts` stay at the top, shared by all of them.
- `src/edges/`: the browser-facing edges. Extension storage, the system clock, the bookmarks/history lookup and the network (`network.ts`, for the weather) are injected into the core; the favicon lookup and opening URLs in this tab or a background tab (`tabs.ts`) are used by views directly.
- `src/styles/`: design tokens (`tokens.css`), the shared translucent `.material` class, and the fixed wallpaper. Surfaces get their translucent look only from `.material`. `controls.css` holds the shared fields, buttons, segmented controls, checkboxes, section headings, hints and screen-reader-only text used inside Apps and Widgets.
- `src/motion/`: spring presets on Motion's `animate()`, with a short opacity fade under reduced motion, plus the framework-agnostic helpers built on them: the FLIP Window transition (`flip.ts`) and the grid helpers Edit Mode settles Widgets with (`grid.ts`). Everything that moves uses them; the one exception is Angular CDK drag-sorting (Todos), whose row shifts use a short CSS transition that is off under reduced motion.
- `src/app/`: the Angular layer. `WebOSCore` exposes the core's state as signals, and components are thin views over it. Each App lives in `src/app/apps/`. Note previews are rendered with `marked` and sanitised with DOMPurify (`apps/notes/markdown.ts`); that is the only HTML webOS injects.
