import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import type { Cell, PlacedWidget, Span, WebOS, WidgetId, WidgetSize } from '../../core';
import { capturePlaces, slideToNewPlaces, type GridCell, type GridItem } from '../../motion/grid';
import { springTo } from '../../motion/springs';
import { CalendarWidget } from '../calendar-widget/calendar-widget';
import { ClockWidget } from '../clock-widget/clock-widget';
import { CountdownWidget } from '../countdown-widget/countdown-widget';
import { GitHubWidget } from '../github-widget/github-widget';
import { MoonWidget } from '../moon-widget/moon-widget';
import { NewTabsWidget } from '../new-tabs-widget/new-tabs-widget';
import { RecentWidget } from '../recent-widget/recent-widget';
import { SearchWidget } from '../search-widget/search-widget';
import { SunWidget } from '../sun-widget/sun-widget';
import { SystemWidget } from '../system-widget/system-widget';
import { TodayWidget } from '../today-widget/today-widget';
import { TodosWidget } from '../todos-widget/todos-widget';
import { TopSitesWidget } from '../top-sites-widget/top-sites-widget';
import { WeatherWidget } from '../weather-widget/weather-widget';
import { WorldClockWidget } from '../world-clock-widget/world-clock-widget';
import { WebOSCore } from '../webos-core';
import { WindowState } from '../window/window-state';
import { DesktopEditor } from './desktop-editor';
import { GridDrag, type GridDrop } from './grid-drag';
import { WidgetStack } from './widget-stack';

const SIZE_OPTIONS: readonly { size: WidgetSize; name: string }[] = [
  { size: 'S', name: 'Small' },
  { size: 'M', name: 'Medium' },
  { size: 'L', name: 'Large' },
];

/** How far the menu stays from the window's edges. */
const MENU_MARGIN = 8;

/**
 * The Desktop: the snap grid between the Menu Bar and the Dock, with each
 * visible Widget at its layout position.
 *
 * Right-clicking the empty Desktop offers "Edit Desktop", the only way into
 * Edit Mode. There, Widgets lift and show an outline, their own controls are
 * paused, and they can be dragged (or moved with the arrow keys) around the
 * grid, resized and hidden. A dropped Widget settles onto the grid on a
 * spring, and Widgets pushed aside slide to their new places.
 *
 * Widgets that cover the same cells can share a place as a stack: Stack…
 * then a Widget to stack onto. A stack shows one Widget at a time; Unstack
 * takes the one shown out, and Hide hides only it.
 */
@Component({
  selector: 'webos-desktop',
  imports: [
    NgTemplateOutlet,
    GridDrag,
    WidgetStack,
    ClockWidget,
    SearchWidget,
    TodosWidget,
    WeatherWidget,
    CalendarWidget,
    WorldClockWidget,
    CountdownWidget,
    MoonWidget,
    SunWidget,
    RecentWidget,
    SystemWidget,
    TodayWidget,
    TopSitesWidget,
    NewTabsWidget,
    GitHubWidget,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.editing]': 'editor.editing()',
    '[style.--grid-columns]': 'webos.grid()?.columns',
    '[style.--grid-rows]': 'webos.grid()?.rows',
    '(document:contextmenu)': 'openMenu($event)',
    '(document:pointerdown)': 'closeMenuOnOutsideClick($event)',
    '(document:keydown.escape)': 'onEscape()',
    '(window:blur)': 'closeMenu()',
  },
  template: `
    @for (placed of webos.layout(); track placed.widget) {
      <div
        #slot
        class="placement"
        [attr.data-widget]="placed.widget"
        [style.grid-column]="placed.column + 1 + ' / span ' + placed.columns"
        [style.grid-row]="placed.row + 1 + ' / span ' + placed.rows"
        webosGridDrag
        gridDragBoundary="webos-desktop"
        [gridDragDisabled]="!editor.editing() || !!editor.stacking()"
        (gridDragMoved)="showDropTarget(placed, $event)"
        (gridDropped)="drop(placed, $event)"
      >
        <!-- Slides move this; the drag moves the placement around it, so the two never fight. -->
        <div #slider class="slide">
          <div #lift class="lift">
            <div class="widget" [attr.inert]="editor.editing() ? '' : null">
              @if (placed.stack; as stack) {
                <webos-widget-stack
                  [members]="stack"
                  [shown]="placed.shown ?? placed.widget"
                  [size]="placed.size"
                  [view]="widgetView"
                  (shownChange)="showInStack($event)"
                />
              } @else {
                <ng-container *ngTemplateOutlet="widgetView; context: { $implicit: placed.widget, size: placed.size }" />
              }
            </div>
            @if (editor.editing()) {
              @let shown = placed.shown ?? placed.widget;
              @let source = editor.stacking();
              <div
                #editLayer
                class="edit-layer"
                [class.stack-target]="source && source !== placed.widget && canStack(source, placed.widget)"
                [class.unavailable]="source && source !== placed.widget && !canStack(source, placed.widget)"
                tabindex="0"
                role="group"
                [attr.data-widget]="placed.widget"
                [attr.aria-label]="describe(placed) + ' Drag it, or use the arrow keys, to move it.'"
                (keydown)="moveWithKeys(placed, $event)"
              >
                <span class="name">
                  {{ webos.widgetName(shown) }}
                  @if (placed.stack; as stack) {
                    · {{ stack.indexOf(shown) + 1 }} of {{ stack.length }}
                  }
                </span>
                @if (placed.stack; as stack) {
                  <div class="edit-dots" role="group" aria-label="Widgets in this stack">
                    @for (member of stack; track member) {
                      <button
                        type="button"
                        class="widget-stack-dot"
                        [attr.aria-label]="'Show ' + webos.widgetName(member)"
                        [attr.aria-current]="member === shown ? 'true' : null"
                        [title]="webos.widgetName(member)"
                        (click)="showInStack(member)"
                      ></button>
                    }
                  </div>
                }
                <div class="edit-controls">
                  @if (source) {
                    @if (source === placed.widget) {
                      <button type="button" class="button material" (click)="stopStacking()">Cancel</button>
                    } @else if (canStack(source, placed.widget)) {
                      <button type="button" class="button stack-here" (click)="stackOnto(source, placed)">Stack here</button>
                    }
                  } @else {
                    <div class="segmented material" role="group" aria-label="Size">
                      @for (option of sizeOptions; track option.size) {
                        <button
                          type="button"
                          class="button"
                          [attr.aria-pressed]="placed.size === option.size"
                          [attr.aria-label]="option.name"
                          [disabled]="!fitsSize(placed, option.size)"
                          [title]="fitsSize(placed, option.size) ? '' : 'Not every Widget in this stack has this size'"
                          (click)="resize(placed, option)"
                        >
                          {{ option.size }}
                        </button>
                      }
                    </div>
                    @if (hasStackTargets(placed)) {
                      <button type="button" class="button material" (click)="startStacking(placed)">Stack…</button>
                    }
                    @if (placed.stack) {
                      <button type="button" class="button material" (click)="unstack(placed)">Unstack</button>
                    }
                    <button type="button" class="button material" (click)="hide(placed)">Hide</button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    @if (dropTarget(); as target) {
      <div
        class="drop-target"
        aria-hidden="true"
        [style.grid-column]="target.column + 1 + ' / span ' + target.columns"
        [style.grid-row]="target.row + 1 + ' / span ' + target.rows"
      ></div>
    }

    @if (menu(); as at) {
      <div
        #menu
        class="context-menu material material-raised"
        role="menu"
        aria-label="Desktop"
        [style.left.px]="at.x"
        [style.top.px]="at.y"
        (focusout)="closeMenuWhenFocusLeaves($event)"
      >
        <button type="button" role="menuitem" class="menu-item" (click)="editDesktop()">Edit Desktop</button>
      </div>
    }

    <!-- Every Widget, by id at a size: for a Widget on its own and for each Widget in a stack. -->
    <ng-template #widgetView let-widget let-size="size">
      @switch (widget) {
        @case ('clock') {
          <webos-clock-widget [size]="size" />
        }
        @case ('search') {
          <webos-search-widget />
        }
        @case ('todos') {
          <webos-todos-widget />
        }
        @case ('weather') {
          <webos-weather-widget />
        }
        @case ('calendar') {
          <webos-calendar-widget />
        }
        @case ('world-clock') {
          <webos-world-clock-widget />
        }
        @case ('countdown') {
          <webos-countdown-widget />
        }
        @case ('moon') {
          <webos-moon-widget [size]="size" />
        }
        @case ('sun') {
          <webos-sun-widget />
        }
        @case ('recent') {
          <webos-recent-widget />
        }
        @case ('system') {
          <webos-system-widget />
        }
        @case ('today') {
          <webos-today-widget />
        }
        @case ('top-sites') {
          <webos-top-sites-widget [size]="size" />
        }
        @case ('new-tabs') {
          <webos-new-tabs-widget />
        }
        @case ('github') {
          <webos-github-widget />
        }
      }
    </ng-template>
  `,
  styles: `
    :host {
      position: fixed;
      inset: var(--menu-bar-height) 0 var(--dock-clearance) 0;
      display: grid;
      grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));
      grid-template-rows: repeat(var(--grid-rows), minmax(0, 1fr));
      /* Narrower gaps on smaller screens leave the 21 columns more room. */
      gap: clamp(0.75rem, 1vw, 1.25rem);
      /* Centred, never wider than --desktop-max-width. */
      padding: 1.25rem max(1.5rem, calc((100vw - var(--desktop-max-width)) / 2)) 0;
    }
    .placement,
    .slide,
    .lift,
    .widget {
      position: relative;
      display: grid;
      min-width: 0;
      min-height: 0;
    }
    /* Edit Mode: an outline and a deeper shadow. The lift itself is a spring (see the constructor). */
    .edit-layer {
      position: absolute;
      inset: 0;
      z-index: 1;
      display: flex;
      flex-direction: column;
      padding: 0.625rem;
      border-radius: var(--radius-widget);
      box-shadow:
        0 0 0 1.5px var(--edit-outline),
        var(--lift-shadow);
      cursor: grab;
      outline: none;
    }
    .edit-layer:focus-visible {
      box-shadow:
        0 0 0 2.5px var(--focus-ring),
        var(--lift-shadow);
    }
    .cdk-drag-dragging {
      z-index: 3;
    }
    .cdk-drag-dragging .edit-layer {
      cursor: grabbing;
    }
    /* The Widget's name sits on the outline's top edge, clear of the Widget's own content. */
    .name {
      position: absolute;
      top: -0.6rem;
      left: 0.9rem;
      padding: 0.1rem 0.5rem;
      border-radius: var(--radius-control);
      background: var(--accent);
      color: var(--on-accent);
      font-size: 0.6875rem;
      font-weight: 700;
    }
    .edit-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 0.375rem;
      margin-top: auto;
    }
    .edit-controls > .button {
      padding: 0.3rem 0.7rem;
      font-size: 0.75rem;
    }
    .edit-controls > .stack-here {
      background: var(--accent);
      color: var(--on-accent);
    }
    /* A stack's dots, on the edit outline's right edge: in Edit Mode they switch what it shows. */
    .edit-dots {
      position: absolute;
      top: 50%;
      right: 0.2rem;
      display: flex;
      flex-direction: column;
      transform: translateY(-50%);
    }
    /* Choosing where to stack: the Widgets that take it light up, the rest step back. */
    .edit-layer.stack-target {
      box-shadow:
        0 0 0 2px var(--accent),
        var(--lift-shadow);
    }
    .edit-layer.unavailable {
      background: color-mix(in srgb, var(--wallpaper-base) 55%, transparent);
      cursor: default;
    }
    .drop-target {
      z-index: 0;
      border: 1.5px dashed var(--edit-outline);
      border-radius: var(--radius-widget);
      pointer-events: none;
    }
    .context-menu {
      position: fixed;
      z-index: 20;
      min-width: 10rem;
      padding: 0.3rem;
      border-radius: var(--radius-control);
    }
    .menu-item {
      display: block;
      width: 100%;
      padding: 0.4rem 0.65rem;
      border: 0;
      border-radius: calc(var(--radius-control) - 2px);
      background: none;
      color: var(--text-primary);
      font: inherit;
      font-size: 0.8125rem;
      text-align: left;
      cursor: pointer;
    }
    .menu-item:hover,
    .menu-item:focus-visible {
      background: var(--selected-fill);
      outline: none;
    }
  `,
})
export class Desktop {
  protected readonly webos = inject(WebOSCore);
  protected readonly editor = inject(DesktopEditor);
  private readonly window = inject(WindowState);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly slots = viewChildren<ElementRef<HTMLElement>>('slot');
  private readonly sliders = viewChildren<ElementRef<HTMLElement>>('slider');
  private readonly lifts = viewChildren<ElementRef<HTMLElement>>('lift');
  private readonly editLayers = viewChildren<ElementRef<HTMLElement>>('editLayer');
  private readonly menuElement = viewChildren<ElementRef<HTMLElement>>('menu');

  protected readonly sizeOptions = SIZE_OPTIONS;
  /** Where the context menu is open, if it is. */
  protected readonly menu = signal<{ x: number; y: number } | undefined>(undefined);
  /** Where a dragged Widget would land, outlined while dragging. */
  protected readonly dropTarget = signal<(Cell & Span) | undefined>(undefined);
  /** What had focus before the menu opened, to give it back when the menu or Edit Mode closes. */
  private focusBefore: HTMLElement | undefined;

  constructor() {
    // Entering Edit Mode: Widgets lift a little on a spring and their outline fades in
    // (all that remains of it under reduced motion). Leaving: they settle back.
    effect(() => {
      const editing = this.editor.editing();
      for (const { nativeElement } of this.lifts()) springTo(nativeElement, editing ? { y: -3, scale: 1.012 } : { y: 0, scale: 1 });
    });
    effect(() => {
      for (const { nativeElement } of this.editLayers()) springTo(nativeElement, { opacity: [0, 1] });
    });
    // Leaving Edit Mode returns focus to where it was before, if it would otherwise be lost.
    effect(() => {
      if (this.editor.editing()) return;
      const lost = !document.activeElement || document.activeElement === document.body || this.host.contains(document.activeElement);
      if (lost) this.restoreFocus();
    });
  }

  /** Right-clicking the empty Desktop or the wallpaper opens the Desktop menu. Anywhere else keeps the browser's own menu. */
  protected openMenu(event: MouseEvent): void {
    const target = event.target;
    const onDesktop = target === this.host || (target instanceof Element && target.matches('webos-root, body, html'));
    if (!onDesktop || this.editor.editing() || this.window.app()) return;
    event.preventDefault();
    this.focusBefore = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    // The keyboard's menu key reports no position: open it near the top left of the Desktop.
    const fromKeyboard = event.clientX === 0 && event.clientY === 0;
    this.menu.set(fromKeyboard ? { x: 32, y: 48 } : { x: event.clientX, y: event.clientY });
    afterNextRender(
      () => {
        // Keep the whole menu on screen, now that its size is known.
        const element = this.menuElement()[0]?.nativeElement;
        const at = this.menu();
        if (!element || !at) return;
        const { width, height } = element.getBoundingClientRect();
        this.menu.set({
          x: Math.min(at.x, innerWidth - width - MENU_MARGIN),
          y: Math.min(at.y, innerHeight - height - MENU_MARGIN),
        });
        element.querySelector<HTMLElement>('[role=menuitem]')?.focus();
      },
      { injector: this.injector },
    );
  }

  protected closeMenu({ restoreFocus = false } = {}): void {
    if (!this.menu()) return;
    this.menu.set(undefined);
    if (restoreFocus) this.restoreFocus();
  }

  protected closeMenuOnOutsideClick(event: PointerEvent): void {
    if (!(event.target as Element | null)?.closest('.context-menu')) this.closeMenu();
  }

  /** Tabbing out of the menu closes it, as clicking elsewhere does. */
  protected closeMenuWhenFocusLeaves(event: FocusEvent): void {
    if (!(event.currentTarget as Element).contains(event.relatedTarget as Node | null)) this.closeMenu();
  }

  /** Esc closes the menu, stops choosing where to stack, or leaves Edit Mode. */
  protected onEscape(): void {
    if (this.menu()) this.closeMenu({ restoreFocus: true });
    else if (this.editor.stacking()) this.stopStacking();
    else if (this.editor.editing()) this.editor.exit();
  }

  protected editDesktop(): void {
    this.closeMenu();
    this.editor.enter();
    afterNextRender(() => this.editLayers()[0]?.nativeElement.focus(), { injector: this.injector });
  }

  protected showDropTarget(placed: PlacedWidget, cell: GridCell): void {
    const fitted = this.webos.fitOnGrid(placed.widget, placed.size, cell);
    this.dropTarget.set(fitted && { ...fitted, columns: placed.columns, rows: placed.rows });
  }

  /** A dropped Widget moves to the cell under its top-left corner, springing there from where it was let go. */
  protected drop(placed: PlacedWidget, { cell, release }: GridDrop): void {
    this.dropTarget.set(undefined);
    this.changeLayout((core) => core.desktop.move(placed.widget, cell.column, cell.row), {
      moving: placed.widget,
      afterCapture: release,
      refused: `No room to move ${this.webos.widgetName(placed.widget)} there: a Widget it would push aside has nowhere to go.`,
    });
  }

  /** The arrow keys move the focused Widget one cell. */
  protected moveWithKeys(placed: PlacedWidget, event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!step) return;
    event.preventDefault();
    this.changeLayout((core) => core.desktop.move(placed.widget, placed.column + step[0], placed.row + step[1]), {
      moving: placed.widget,
      // Widgets are kept in reading order, so a move can move it in the page and lose focus.
      refocus: placed.widget,
      refused: `No room to move ${this.webos.widgetName(placed.widget)} there: a Widget it would push aside has nowhere to go.`,
    });
  }

  protected resize(placed: PlacedWidget, option: (typeof SIZE_OPTIONS)[number]): void {
    this.changeLayout((core) => core.desktop.resize(placed.widget, option.size), {
      refocus: placed.widget,
      refused: `No room to make ${this.webos.widgetName(placed.widget)} ${option.name.toLowerCase()}: a Widget it would push aside has nowhere to go.`,
    });
  }

  /** Hides the Widget, or the one a stack shows. */
  protected hide(placed: PlacedWidget): void {
    const widget = placed.shown ?? placed.widget;
    this.changeLayout((core) => core.desktop.hide(widget), { refocusFirst: true });
  }

  /** The edit outline's name for a Widget or a stack, for screen readers. */
  protected describe(placed: PlacedWidget): string {
    const name = this.webos.widgetName(placed.shown ?? placed.widget);
    return placed.stack ? `Stack of ${placed.stack.length} Widgets, showing ${name}.` : `${name} Widget.`;
  }

  /** Whether stacking `widget` onto `onto` would be accepted. */
  protected canStack(widget: WidgetId, onto: WidgetId): boolean {
    return this.webos.canStack(widget, onto);
  }

  /** Whether there is a Widget on the Desktop this one could be stacked onto. */
  protected hasStackTargets(placed: PlacedWidget): boolean {
    return (this.webos.layout() ?? []).some((other) => other.widget !== placed.widget && this.canStack(placed.widget, other.widget));
  }

  /** Whether every Widget in a stack covers the same cells at `size`; always for a Widget on its own. */
  protected fitsSize(placed: PlacedWidget, size: WidgetSize): boolean {
    const widgets = this.webos.widgets();
    if (!placed.stack || !widgets) return true;
    const [first, ...rest] = placed.stack.map((widget) => widgets[widget].sizes[size]);
    return rest.every((span) => span.columns === first.columns && span.rows === first.rows);
  }

  /** Starts choosing where to stack a Widget: the Widgets that take it offer "Stack here". */
  protected startStacking(placed: PlacedWidget): void {
    this.editor.startStacking(placed.widget);
    this.focusEditLayer(placed.widget);
  }

  protected stopStacking(): void {
    const source = this.editor.stacking();
    this.editor.stopStacking();
    if (source) this.focusEditLayer(source);
  }

  protected stackOnto(source: WidgetId, onto: PlacedWidget): void {
    this.editor.stopStacking();
    this.changeLayout((core) => core.desktop.stack(source, onto.widget), {
      refocus: onto.widget,
      refused: `${this.webos.widgetName(source)} can't be stacked on ${this.webos.widgetName(onto.widget)}.`,
    });
  }

  /** Takes the Widget a stack shows out of it, to the next free place. */
  protected unstack(placed: PlacedWidget): void {
    const widget = placed.shown ?? placed.widget;
    this.changeLayout((core) => core.desktop.unstack(widget), {
      refocus: widget,
      refused: `No room to take ${this.webos.widgetName(widget)} out of the stack. Make some space first.`,
    });
  }

  protected showInStack(widget: WidgetId): void {
    this.webos.send((core) => core.desktop.showInStack(widget));
  }

  private focusEditLayer(widget: WidgetId): void {
    afterNextRender(
      () => this.editLayers().find(({ nativeElement }) => nativeElement.dataset['widget'] === widget)?.nativeElement.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }

  private restoreFocus(): void {
    if (this.focusBefore?.isConnected) this.focusBefore.focus({ preventScroll: true });
    this.focusBefore = undefined;
  }

  /** The Widgets on screen, for capturing and animating their places. */
  private gridItems(): GridItem[] {
    const sliders = this.sliders();
    return this.slots().map(({ nativeElement }, i) => ({
      key: nativeElement.dataset['widget'] ?? '',
      slot: nativeElement,
      slider: sliders[i].nativeElement,
    }));
  }

  /**
   * Applies a layout change and animates it: every Widget whose place changed
   * slides there from where it was, the moved one with a little momentum. A
   * refused change leaves the layout as it was (a dropped Widget springs back)
   * and the Menu Bar says why.
   */
  private changeLayout(
    change: (core: WebOS) => Promise<boolean | void>,
    options: { moving?: WidgetId; afterCapture?: () => void; refocus?: WidgetId; refocusFirst?: boolean; refused?: string },
  ): void {
    const before = capturePlaces(this.gridItems());
    options.afterCapture?.();
    this.webos.send(change).then((applied) => this.editor.say(applied === false ? options.refused : undefined));
    afterNextRender(
      () => {
        slideToNewPlaces(before, this.gridItems(), { moving: options.moving });
        const layers = this.editLayers().map(({ nativeElement }) => nativeElement);
        const focus = options.refocusFirst ? layers[0] : layers.find((layer) => layer.dataset['widget'] === options.refocus);
        focus?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}
