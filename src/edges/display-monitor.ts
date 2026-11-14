import type { DisplayMonitor, DisplayReading } from '../core';

/** Refresh rates displays commonly run at; a measured rate within 3% of one is taken as it. */
const COMMON_RATES = [24, 30, 48, 50, 60, 75, 90, 100, 120, 144, 165, 170, 175, 180, 200, 240, 280, 360];
/** Frames timed to measure the refresh rate, after a few to let the page settle. */
const FRAMES_TIMED = 40;
const FRAMES_SKIPPED = 5;

/**
 * The displays, through the extension `system.display` permission. Outside
 * ChromeOS it reports no display modes, so the scale is `dpiX / 96`, the
 * resolution the bounds times the scale, and the refresh rate is measured from
 * animation frames, for the display this tab is on only. Outside the extension
 * (`ng serve`) there is none.
 */
export function createDisplayMonitor(): DisplayMonitor | undefined {
  const display = globalThis.chrome?.system?.display;
  if (!display) return undefined;
  /** The refresh rate of the display this tab is on, measured once per tab. */
  let measured: Promise<number | undefined> | undefined;

  return {
    async displays() {
      const [units, rate] = await Promise.all([display.getInfo(), (measured ??= measureRefreshRate())]);
      return units.map((unit): DisplayReading => {
        const mode = unit.modes?.find((candidate) => candidate.isSelected);
        const scale = mode?.deviceScaleFactor || unit.dpiX / 96 || 1;
        const { left, top, width, height } = unit.bounds;
        const here = screenX >= left && screenX < left + width && screenY >= top && screenY < top + height;
        return {
          name: unit.name,
          width: mode?.widthInNativePixels || Math.round(width * scale),
          height: mode?.heightInNativePixels || Math.round(height * scale),
          scale,
          primary: unit.isPrimary,
          ...(mode?.refreshRate ? { refreshRate: mode.refreshRate } : here && rate ? { refreshRate: rate } : {}),
        };
      });
    },
    onChange(listener) {
      display.onDisplayChanged.addListener(listener);
      return () => display.onDisplayChanged.removeListener(listener);
    },
  };
}

/** How often the screen this tab is on refreshes, from the time between animation frames. Undefined while the tab is hidden. */
function measureRefreshRate(): Promise<number | undefined> {
  if (document.visibilityState !== 'visible') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const times: number[] = [];
    const frame = (time: number) => {
      times.push(time);
      if (times.length < FRAMES_SKIPPED + FRAMES_TIMED) {
        requestAnimationFrame(frame);
        return;
      }
      const gaps = times
        .slice(FRAMES_SKIPPED)
        .map((at, i, all) => (i ? at - all[i - 1] : 0))
        .slice(1)
        .sort((a, b) => a - b);
      const median = gaps[Math.floor(gaps.length / 2)];
      const rate = median > 0 ? 1000 / median : 0;
      const common = COMMON_RATES.find((candidate) => Math.abs(candidate - rate) / candidate < 0.03);
      resolve(common ?? (rate ? Math.round(rate) : undefined));
    };
    requestAnimationFrame(frame);
  });
}
