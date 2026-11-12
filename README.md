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

- `src/core/`: the framework-free webOS core. No Angular imports. It is created with injected edges (`Storage`, `Clock`), and its tests run against in-memory and controllable versions of them from `src/core/testing.ts`.
- `src/edges/`: the browser-facing edges. Extension storage and the system clock are injected into the core; the favicon lookup is used by views directly.
- `src/styles/`: design tokens (`tokens.css`), the shared translucent `.material` class, and the fixed wallpaper. Surfaces get their translucent look only from `.material`. `controls.css` holds the shared fields, buttons, section headings and hints used inside Apps and Widgets.
- `src/motion/`: spring presets on Motion's `animate()`, with a short opacity fade under reduced motion. Everything that moves uses them; the one exception is Angular CDK drag-sorting (Todos), whose row shifts use a short CSS transition that is off under reduced motion.
- `src/app/`: the Angular layer. `WebOSCore` exposes the core's state as signals, and components are thin views over it. Each App lives in `src/app/apps/`. Note previews are rendered with `marked` and sanitised with DOMPurify (`apps/notes/markdown.ts`); that is the only HTML webOS injects.
