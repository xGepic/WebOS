import type { AnimationPlaybackControls } from 'motion';
import { prefersReducedMotion, springTo } from './springs';

/**
 * FLIP-style shared-element transition between a small source element (such
 * as a Dock icon) and a large element laid out at its final place (such as the
 * Window). Framework-agnostic: it only needs the two DOM elements.
 *
 * Closing and settling spring from the element's current on-screen state, so
 * an open can be interrupted by a close and the other way round. Under reduced
 * motion the element never travels: it fades in and out where it is.
 */

const settled = { x: 0, y: 0, scaleX: 1, scaleY: 1 };

/** The transform that makes `element`, at its laid-out place, cover `source` exactly. */
function transformOnto(element: HTMLElement, source: Element) {
  // offset* give the laid-out box, ignoring any transform the element has mid-animation.
  const from = source.getBoundingClientRect();
  return {
    x: from.left - element.offsetLeft,
    y: from.top - element.offsetTop,
    scaleX: from.width / element.offsetWidth,
    scaleY: from.height / element.offsetHeight,
  };
}

/** Grows a just-rendered `element` out of `source` into its laid-out place, fading it in. */
export function expandFrom(element: HTMLElement, source: Element): AnimationPlaybackControls {
  if (prefersReducedMotion()) return springTo(element, { opacity: [0, 1] });

  element.style.transformOrigin = '0 0';
  const start = transformOnto(element, source);
  // Explicit start values: the element has just appeared, so there is no on-screen state to start from.
  return springTo(element, {
    x: [start.x, settled.x],
    y: [start.y, settled.y],
    scaleX: [start.scaleX, settled.scaleX],
    scaleY: [start.scaleY, settled.scaleY],
    opacity: [0, 1],
  });
}

/** Shrinks `element` from wherever it is now back into `source`, fading it out. */
export function collapseInto(element: HTMLElement, source: Element): AnimationPlaybackControls {
  if (prefersReducedMotion()) return springTo(element, { opacity: 0 });

  element.style.transformOrigin = '0 0';
  return springTo(element, { ...transformOnto(element, source), opacity: 0 });
}

/** Springs `element` back to its laid-out place from wherever it is now, e.g. to cancel a collapse. */
export function settle(element: HTMLElement): AnimationPlaybackControls {
  return springTo(element, { ...settled, opacity: 1 });
}
