import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebOSCore } from '../webos-core';
import { AmbientMode } from './ambient-mode';

/**
 * The Ambient screen: once the Desktop has been left alone, the Menu Bar,
 * Widgets, Window and Dock fade away (see App) and this shows a large thin
 * clock with the date, the weather and the Next Event, over the Wallpaper and
 * its weather. The pointer is hidden. It is only a picture of what the Desktop
 * already says, so it is hidden from assistive technology.
 */
@Component({
  selector: 'webos-ambient',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[class.on]': 'ambient.on()' },
  template: `
    <div class="face">
      <time class="time">{{ webos.time() }}</time>
      <p class="date">{{ webos.date() }}</p>
      <p class="extras">
        @if (webos.weather(); as weather) {
          @if (weather.status === 'ready') {
            <span>{{ weather.temperature }}° {{ weather.label }}</span>
          }
        }
        @if (webos.nextEvent(); as event) {
          <span class="event">
            <span class="dot" [style.background]="event.color"></span>
            {{ event.title }} {{ event.when }}
          </span>
        }
      </p>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 60;
      display: grid;
      place-items: center;
      /* Dims the Wallpaper a little, so the clock is the only bright thing. */
      background: rgb(0 0 0 / 0.25);
      opacity: 0;
      visibility: hidden;
      cursor: none;
      transition:
        opacity 0.3s ease,
        visibility 0s linear 0.3s;
    }
    :host(.on) {
      opacity: 1;
      visibility: visible;
      transition:
        opacity 1.2s ease,
        visibility 0s;
    }
    p {
      margin: 0;
    }
    .face {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 0 1rem;
      text-align: center;
    }
    .time {
      font-size: clamp(4rem, 15vw, 12rem);
      font-weight: 200;
      line-height: 1;
      letter-spacing: var(--tracking-display);
      font-variant-numeric: tabular-nums;
    }
    .date {
      color: var(--text-secondary);
      font-size: clamp(1rem, 2.2vw, 1.5rem);
      letter-spacing: var(--tracking-caption);
    }
    .extras {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.4rem 1.5rem;
      margin-top: 1rem;
      color: var(--text-secondary);
      font-size: clamp(0.875rem, 1.4vw, 1.0625rem);
    }
    .event {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: var(--radius-pill);
    }
    @media (prefers-reduced-motion: reduce) {
      :host,
      :host(.on) {
        transition-duration: 0.15s, 0s;
      }
      :host {
        transition-delay: 0s, 0.15s;
      }
    }
  `,
})
export class Ambient {
  protected readonly webos = inject(WebOSCore);
  protected readonly ambient = inject(AmbientMode);
}
