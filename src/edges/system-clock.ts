import type { Clock } from '../core';

const MINUTE = 60_000;
/** Fire a touch after the boundary so the new minute has definitely started. */
const SLACK_MS = 20;

/** Real time. Minute listeners fire on the minute, and again when the tab becomes visible. */
export function createSystemClock(): Clock {
  return {
    now: () => new Date(),
    onMinute(listener) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(tick, MINUTE - (Date.now() % MINUTE) + SLACK_MS);
      };
      const tick = () => {
        listener();
        schedule();
      };
      // Hidden tabs throttle timers, so catch up as soon as the tab is shown again.
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') tick();
      };

      schedule();
      document.addEventListener('visibilitychange', onVisibilityChange);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    },
  };
}
