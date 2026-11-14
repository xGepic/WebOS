import type { Store } from '../store';
import { apps } from './apps';
import * as desktop from './desktop';
import { wallpaperOf, wallpapers, type Wallpaper } from './wallpaper';

export interface DesktopApi {
  /** Every App; those `docked` have a Dock icon, in this order. */
  readonly apps: typeof apps;
  readonly desktop: {
    /** The snap grid, in cells. */
    readonly grid: typeof desktop.grid;
    /** The Widget catalog: every Widget and the cells each size spans. */
    readonly widgets: typeof desktop.widgets;
    /** The visible Widgets and where they sit, in reading order. */
    layout(): readonly desktop.PlacedWidget[];
    /** The hidden Widgets, in catalog order; Edit Mode offers to show them. */
    hidden(): readonly desktop.WidgetId[];
    /**
     * Moves a Widget so its top-left cell is `column`, `row`, kept on the grid.
     * Widgets it lands on move to the next free position, so Widgets never
     * overlap. Resolves to whether it moved: a move that would leave a pushed
     * Widget no room anywhere is refused, and nothing changes.
     */
    move(widget: desktop.WidgetId, column: number, row: number): Promise<boolean>;
    /**
     * Where a Widget of `size` with its top-left at `cell` would sit: the
     * nearest cell that keeps all of it on the grid, as `move` would place it.
     */
    fitOnGrid(widget: desktop.WidgetId, size: desktop.WidgetSize, cell: desktop.Cell): desktop.Cell;
    /** Resizes a Widget, pushing aside the Widgets it grows over as `move` does. Resolves to whether it was resized. */
    resize(widget: desktop.WidgetId, size: desktop.WidgetSize): Promise<boolean>;
    hide(widget: desktop.WidgetId): Promise<void>;
    /**
     * Shows a hidden Widget where it was, or at the next free position. Resolves
     * to whether it is shown: with no room for it, it stays hidden.
     */
    show(widget: desktop.WidgetId): Promise<boolean>;
  };
  readonly wallpaper: {
    /** Every Wallpaper, in the order Settings offers them. */
    readonly choices: typeof wallpapers;
    /** The chosen Wallpaper; Midnight until one is chosen, or for one this build doesn't know. */
    current(): Wallpaper;
    choose(wallpaper: Wallpaper): Promise<void>;
  };
}

/** The Apps, and the Desktop's Widget layout that Edit Mode changes. */
export function createDesktop(store: Store): DesktopApi {
  /** Applies a change to the layout, unless it was refused (undefined). Resolves to whether it was applied. */
  const commitLayout = async (change: (entries: readonly desktop.LayoutEntry[]) => desktop.LayoutEntry[] | undefined) => {
    const layout = change(store.state().layout);
    if (!layout) return false;
    await store.commit({ ...store.state(), layout });
    return true;
  };

  return {
    apps,
    desktop: {
      grid: desktop.grid,
      widgets: desktop.widgets,
      layout: () => desktop.placedWidgets(store.state().layout),
      hidden: () => desktop.hiddenWidgets(store.state().layout),
      fitOnGrid: desktop.fitOnGrid,
      move: (widget, column, row) => commitLayout((entries) => desktop.moveWidget(entries, widget, column, row)),
      resize: (widget, size) => commitLayout((entries) => desktop.resizeWidget(entries, widget, size)),
      hide: async (widget) => {
        await commitLayout((entries) => desktop.hideWidget(entries, widget));
      },
      show: (widget) => commitLayout((entries) => desktop.showWidget(entries, widget)),
    },
    wallpaper: {
      choices: wallpapers,
      current: () => wallpaperOf(store.state().wallpaper),
      async choose(wallpaper) {
        if (wallpaperOf(store.state().wallpaper) === wallpaper) return;
        await store.commit({ ...store.state(), wallpaper });
      },
    },
  };
}
