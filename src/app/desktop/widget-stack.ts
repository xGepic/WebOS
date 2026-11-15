import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  afterRenderEffect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { WidgetId, WidgetSize } from '../../core';
import { prefersReducedMotion } from '../../motion/springs';
import { WebOSCore } from '../webos-core';

/** What a stack renders each of its Widgets with: the Desktop's own Widget view. */
export interface WidgetViewContext {
  $implicit: WidgetId;
  size: WidgetSize;
}

/**
 * A Widget stack: several Widgets sharing one place, one shown at a time.
 * Scrolling or swiping over it moves to the next, snapping to each, and the
 * dots along its right edge show where it is and go straight to a Widget.
 * Whichever Widget it settles on is saved, so a new tab opens the stack on it.
 *
 * All its Widgets stay alive, so moving between them is instant. A list inside
 * a Widget scrolls itself and never moves the stack on: only scrolling over
 * the rest of the Widget does.
 */
@Component({
  selector: 'webos-widget-stack',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Not encapsulated: the rule that keeps a Widget's own lists from moving the
  // stack has to reach inside the Widgets. Every selector starts with .widget-stack.
  encapsulation: ViewEncapsulation.None,
  host: { class: 'widget-stack' },
  template: `
    <div #pages class="widget-stack-pages" (scrollend)="settle()">
      @for (member of members(); track member) {
        <div class="widget-stack-page" [attr.inert]="member === shown() ? null : ''">
          <ng-container *ngTemplateOutlet="view(); context: { $implicit: member, size: size() }" />
        </div>
      }
    </div>
    <div class="widget-stack-dots" role="group" aria-label="Widgets in this stack">
      @for (member of members(); track member) {
        <button
          type="button"
          class="widget-stack-dot"
          [attr.aria-label]="'Show ' + webos.widgetName(member)"
          [attr.aria-current]="member === shown() ? 'true' : null"
          [title]="webos.widgetName(member)"
          (click)="shownChange.emit(member)"
        ></button>
      }
    </div>
  `,
  styles: `
    .widget-stack {
      position: relative;
      display: grid;
      min-width: 0;
      min-height: 0;
    }
    .widget-stack-pages {
      display: grid;
      grid-auto-rows: 100%;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scroll-snap-type: y mandatory;
      scrollbar-width: none;
    }
    .widget-stack-page {
      position: relative;
      display: grid;
      min-width: 0;
      min-height: 0;
      scroll-snap-align: start;
      scroll-snap-stop: always;
    }
    /* A list inside a Widget scrolls on its own and never hands its scrolling on to the stack. */
    .widget-stack-page * {
      overscroll-behavior: contain;
    }
    .widget-stack-dots {
      position: absolute;
      top: 50%;
      right: 0.2rem;
      display: flex;
      flex-direction: column;
      transform: translateY(-50%);
      opacity: 0.55;
      transition: opacity 0.2s;
    }
    .widget-stack:hover .widget-stack-dots,
    .widget-stack-dots:focus-within {
      opacity: 1;
    }
    /* A 14px target around a 5px dot. */
    .widget-stack-dot {
      display: grid;
      place-items: center;
      width: 14px;
      height: 14px;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
    }
    .widget-stack-dot::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: var(--radius-pill);
      background: var(--text-secondary);
    }
    .widget-stack-dot[aria-current='true']::before {
      background: var(--text-primary);
    }
    .widget-stack-dot:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: -1px;
      border-radius: var(--radius-pill);
    }
  `,
})
export class WidgetStack {
  protected readonly webos = inject(WebOSCore);
  /** The stack's Widgets, in order. */
  readonly members = input.required<readonly WidgetId[]>();
  /** The Widget shown. */
  readonly shown = input.required<WidgetId>();
  /** The stack's size, which all its Widgets share. */
  readonly size = input.required<WidgetSize>();
  /** How to render a Widget. */
  readonly view = input.required<TemplateRef<WidgetViewContext>>();
  /** The stack was moved to another Widget, by scrolling or a dot. */
  readonly shownChange = output<WidgetId>();

  private readonly pages = viewChild.required<ElementRef<HTMLElement>>('pages');
  /** Whether the stack has been put on its Widget yet: the first time it jumps there. */
  private placed = false;

  constructor() {
    // Keeps the stack on the Widget shown, however that changed: a dot, Edit Mode, or another tab.
    afterRenderEffect(() => {
      const pages = this.pages().nativeElement;
      const top = this.members().indexOf(this.shown()) * pages.clientHeight;
      if (Math.abs(pages.scrollTop - top) < 2) {
        this.placed = true;
        return;
      }
      pages.scrollTo({ top, behavior: this.placed && !prefersReducedMotion() ? 'smooth' : 'instant' });
      this.placed = true;
    });
  }

  /** The stack came to rest after scrolling: the Widget it rests on is now the one shown. */
  protected settle(): void {
    const pages = this.pages().nativeElement;
    if (!pages.clientHeight) return;
    const member = this.members()[Math.round(pages.scrollTop / pages.clientHeight)];
    if (member && member !== this.shown()) this.shownChange.emit(member);
  }
}
