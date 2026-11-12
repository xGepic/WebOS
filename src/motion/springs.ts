import {
  animate,
  type AnimationPlaybackControls,
  type DOMKeyframesDefinition,
  type Transition,
} from 'motion';

/**
 * webOS spring presets. Springs start from the element's current value, so
 * every animation can be interrupted and retargeted mid-flight. They are only
 * reachable through `springTo`, so reduced motion is always respected.
 */
const springs = {
  /** The default for anything that moves or appears. Critically damped: no overshoot. */
  smooth: { type: 'spring', bounce: 0, visualDuration: 0.4 },
  /** Small, quick responses such as hover and press feedback. */
  snappy: { type: 'spring', bounce: 0, visualDuration: 0.25 },
  /** Only after a gesture that carried momentum, such as a drag release. A little overshoot. */
  momentum: { type: 'spring', bounce: 0.2, visualDuration: 0.35 },
} as const satisfies Record<string, Transition>;

export type SpringPreset = keyof typeof springs;

/** Under reduced motion, opacity changes become this short fade. */
const reducedMotionFade = { duration: 0.15, ease: 'easeOut' } as const;
const instant = { duration: 0 } as const;

export function prefersReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animates `element` to `keyframes` on a spring preset.
 *
 * Under `prefers-reduced-motion` nothing moves or scales: every value except
 * opacity is applied at once, and opacity fades over a short tween. To get a
 * fade under reduced motion (opening or closing something, settling into
 * place), include opacity in the keyframes.
 */
export function springTo(
  element: Element,
  keyframes: DOMKeyframesDefinition,
  preset: SpringPreset = 'smooth',
): AnimationPlaybackControls {
  if (!prefersReducedMotion()) return animate(element, keyframes, springs[preset]);

  const snapEverythingButOpacity = Object.fromEntries(
    Object.keys(keyframes)
      .filter((key) => key !== 'opacity')
      .map((key) => [key, instant]),
  );
  return animate(element, keyframes, { ...reducedMotionFade, ...snapEverythingButOpacity });
}
