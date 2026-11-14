# webOS

A personal Brave extension that replaces the new tab with a Desktop that looks and feels like an operating system. What it does and why is in the specs in [docs/specs](docs/specs), read in order, each changing the ones before it:

| Spec | What it adds or changes |
|---|---|
| [0001](docs/specs/0001-webos-v1.md) | webOS v1: the Desktop, Menu Bar, Dock, Window and Edit Mode, the first Widgets, and the Notes, Dev Utilities and Settings Apps |
| [0002](docs/specs/0002-more-widgets.md) | Seven more Widgets (World Clock, Countdown, Moon, Sun, Recent, System, GitHub) on a full-width grid of 21 columns |
| [0003](docs/specs/0003-leaner-desktop.md) | A leaner Desktop: the Search Widget replaces the Launcher, Links and GitHub go, Countdowns and World Clock become Apps |
| [0004](docs/specs/0004-clipboard.md) | The Clipboard App |
| [0005](docs/specs/0005-calendar-marks.md) | Weekends, Austrian public holidays and Countdowns marked in the Calendar |
| [0006](docs/specs/0006-apple-calendar.md) | Apple Calendar, read-only from iCloud, and the Day View |
| [0007](docs/specs/0007-today-widget.md) | The Today Widget, linked to the Calendar |
| [0008](docs/specs/0008-system-details.md) | The processor and network on the System Widget, and choosing its parts |
| [0009](docs/specs/0009-notes-in-the-dock.md) | Notes back in the Dock; the Notes Widget goes |
| [0010](docs/specs/0010-weather-forecast.md) | The Forecast on the Weather Widget |
| [0011](docs/specs/0011-wallpapers.md) | Five Wallpapers to choose from |
| [0012](docs/specs/0012-top-sites.md) | The Top Sites Widget |

See also the [GLOSSARY](GLOSSARY.md) and [ADR-0001](docs/adr/0001-angular-over-react.md).

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

- `src/core/`: the framework-free webOS core. No Angular imports. It is created with injected edges (`Storage`, `Clock`, `BrowserLookup` for Recent's history and the Top Sites, `Fetch` for the weather, `SystemMonitor` for the processor and memory, `NetworkMonitor` for the network, and `CalendarServer` for Apple Calendar), and its tests run against in-memory, controllable and stubbed versions of them from `src/core/testing.ts`. `index.ts` is its only entry point (`createWebOS` and the `WebOS` interface); the rest is grouped by area, each module next to its tests:
  - `state/`: the versioned state document, its migrations, and backups
  - `desktop/`: the snap grid, the Widget catalog and Edit Mode's moves, the Apps, and the Wallpapers
  - `search/`: the Search Widget's web search
  - `dev-utilities/`: JSON, Base64, text diff, UUID and timestamp tools
  - `organizer/`: Todos, Notes and the greeting
  - `clipboard/`: the Clipboard App's Clips, and which Dev Utilities tab a Clip opens in
  - `time/`: Calendar, Countdowns, the World Clock, and Apple Calendar with the Day View
  - `sky/`: Weather with its Forecast, Sun and Moon
  - `activity/`: Recent pages, Top Sites, and the System Widget's readings and network
  - `edges.ts`, `format.ts` and `testing.ts` stay at the top, shared by all of them.
- `src/edges/`: the browser-facing edges. Extension storage, the system clock, the history and Top Sites lookup, the network (`network.ts`, for the weather), the processor and memory (`system-monitor.ts`), the network status (`network-status.ts`) and iCloud's CalDAV server (`icloud-calendar.ts`) are injected into the core; the favicon lookup and opening URLs in this tab or a background tab (`tabs.ts`) are used by views directly.
- `src/styles/`: design tokens (`tokens.css`), the shared translucent `.material` class, and the Wallpapers (`wallpaper.css`), chosen as `data-wallpaper` on `<html>`. `public/wallpaper.js` sets it before Angular starts, from a copy the App keeps in `localStorage`, so a new tab never flashes the default. Surfaces get their translucent look only from `.material`. `controls.css` holds the shared fields, buttons, segmented controls, checkboxes, section headings, hints and screen-reader-only text used inside Apps and Widgets, and `.widget-open`, the control with which a Widget opens its App.
- `src/motion/`: spring presets on Motion's `animate()`, with a short opacity fade under reduced motion, plus the framework-agnostic helpers built on them: the FLIP Window transition (`flip.ts`) and the grid helpers Edit Mode settles Widgets with (`grid.ts`). Everything that moves uses them; the one exception is Angular CDK drag-sorting (Todos), whose row shifts use a short CSS transition that is off under reduced motion.
- `src/app/`: the Angular layer. `WebOSCore` exposes the core's state as signals, and components are thin views over it. Each App lives in `src/app/apps/`. Note previews are rendered with `marked` and sanitised with DOMPurify (`apps/notes/markdown.ts`); that is the only HTML webOS injects.
