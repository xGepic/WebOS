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
- `src/edges/`: the production edges (extension storage, system clock).
- `src/app/`: the Angular layer. `WebOSCore` exposes the core's state as signals, and components are thin views over it.
