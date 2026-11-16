/**
 * The Clock Widget's face: the time in digits, or an analog clock. Clicking the
 * time switches it, and the choice is kept for every new tab.
 */
export type ClockFace = 'digital' | 'analog';

/** Digits, until the user clicks the time. */
export const DEFAULT_CLOCK_FACE: ClockFace = 'digital';

/** The stored face, or the default for one this build doesn't know, such as a newer build's. */
export const clockFaceOf = (stored: unknown): ClockFace => (stored === 'analog' || stored === 'digital' ? stored : DEFAULT_CLOCK_FACE);

/** Where an analog clock's hands point, in degrees clockwise from 12. */
export interface ClockHands {
  /** Moves on with the minutes, as on a real clock: halfway between 3 and 4 at 3:30. */
  hour: number;
  /** On the minute: it steps once a minute, as the second hand passes 12. */
  minute: number;
  /** To the millisecond, so the Widget can start its sweep where the second hand is. */
  second: number;
}

export function clockHands(now: Date): ClockHands {
  const minutes = now.getMinutes();
  return {
    hour: ((now.getHours() % 12) + minutes / 60) * 30,
    minute: minutes * 6,
    second: (now.getSeconds() + now.getMilliseconds() / 1000) * 6,
  };
}
