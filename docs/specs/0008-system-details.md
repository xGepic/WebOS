# Spec 0008: System Details

Status: built (2026-11-14); Displays removed again the same day, with the `system.display` permission and the `DisplayMonitor` edge. The rest of this spec still describes them, for the record.
Related: [Spec 0002: More Widgets](0002-more-widgets.md), [GLOSSARY](../../GLOSSARY.md)

## Problem Statement

As a developer, the System Widget tells me how busy my processor and memory are, but not what I am working on: which processor this machine has, whether I am online and how good the connection is, or how my displays are set up. And it shows the same two meters to everyone, whether or not they care about them.

## Solution

The System Widget can show three more things, below the CPU and memory meters:

- **Processor**: the CPU's name, tidied ("AMD Ryzen 7 7800X3D", not "AMD Ryzen 7 7800X3D 8-Core Processor").
- **Network**: "Offline", or "Online · 10+ Mbps · 50 ms" from the browser's estimate of the connection.
- **Displays**: one line per display, the primary first: its name and "3840 × 2160 · 150% · 144 Hz".

**Settings › System** has a checkbox for each part (CPU use, Memory, Processor name, Network, Displays), so I show only what I want. Everything is shown until I hide it.

## User Stories

1. As a developer, I want to see my processor's name, so that I know which machine I'm on.
2. As a developer, I want to see whether I'm online, with the connection's speed and latency, so that I can tell a slow page from a slow network.
3. As a developer, I want to see each display's resolution, scaling and refresh rate, so that I can check my setup at a glance.
4. As a developer, I want to choose which parts the System Widget shows, so that it holds only what I look at.
5. As a developer, I want parts webOS adds later to be shown until I hide them, so that I notice them.
6. As a developer, I want the System Widget to say how to get its parts back when I've hidden them all, so that it is never a blank tile.
7. As a developer, I want the network line to follow going offline and back at once, and the displays to follow plugging one in, so that they are never stale.

## Implementation Decisions

### Platform

- **Processor**: `chrome.system.cpu`'s `modelName`, which webOS already reads for the core count.
- **Network**: `navigator.onLine` and the Network Information API (`navigator.connection`: `downlink`, `rtt`), with their change events. Chromium caps `downlink` at 10 Mbps and rounds both for privacy, so 10 shows as "10+ Mbps". Zero means unknown and is left out.
- **Displays**: `chrome.system.display` (a new permission, without an install warning) and its `onDisplayChanged` event. Outside ChromeOS it reports no display modes, so: the scale is `dpiX / 96`, the resolution in pixels is the bounds times the scale, and the refresh rate is measured from animation frames, for the display this tab is on only, snapped to a common rate when it is within 3% of one.
- Two new edges, `NetworkMonitor` and `DisplayMonitor`; `SystemSample` gains `cpuModel`.

### Core

- `SystemView` becomes `{ shown, usage, processor?, network?, displays }`: `usage` is what the view was before (unavailable, loading, or the meters).
- The System API gains `parts()` (each part with its name and whether it is shown) and `setShown(part, shown)`.
- Processor names lose "(R)", "(TM)", "CPU", "@ 3.60GHz", "N-Core Processor", "Processor" and "with Radeon Graphics".

### Persisted state

- **Schema 21** adds `systemWidget: { hidden: [] }`, the parts hidden. Storing what is hidden, not what is shown, keeps later parts shown. Unknown names are ignored when read. Backups keep it: it is a setting.

### Widget and Settings

- The meters sit side by side as before, one or two of them; the details below them as label and value rows. The Widget scrolls when its size can't hold everything.
- Settings › System sits between Apple Calendar and Backup.

## Testing Decisions

- Through the core's public API, with test edges for the network and the displays.
- Tested: processor names from Intel, AMD and Apple; the network summary online, capped, unknown and offline, and following changes; displays with scale, refresh rate, primary first, and following changes; hiding and showing parts, saved and in the next tab; migrating a version 20 document; a backup keeping the choice.
- The edges are checked by hand in the extension.

## Out of Scope

- Battery, disks, tabs and windows, GPU name.
- Temperatures, GPU load, per-process use and network throughput, which extensions can't read.
- Showing parts differently by Widget size.
