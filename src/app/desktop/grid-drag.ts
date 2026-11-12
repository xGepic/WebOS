import { CdkDrag } from '@angular/cdk/drag-drop';
import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { cellUnder, type GridCell } from '../../motion/grid';

/** A drop: the cell under the dropped element's top-left corner. */
export interface GridDrop {
  cell: GridCell;
  /**
   * Lets go of the drag's own offset, so the element is back at its slot.
   * Capture where things are first, so it can spring from where it was let go.
   */
  release(): void;
}

/**
 * Drags a grid item around its grid (the parent element) and reports the cell
 * under its top-left corner, while dragging and on drop. Built on Angular CDK
 * drag-drop for the pointer handling; settling onto the cell on a spring is
 * the caller's, with `capturePlaces` and `slideToNewPlaces` from `motion/grid`.
 */
@Directive({
  selector: '[webosGridDrag]',
  hostDirectives: [{ directive: CdkDrag, inputs: ['cdkDragDisabled: gridDragDisabled', 'cdkDragBoundary: gridDragBoundary'] }],
})
export class GridDrag {
  /** The cell under the dragged element's top-left corner, as it moves. */
  readonly gridDragMoved = output<GridCell>();
  /** The element was dropped. */
  readonly gridDropped = output<GridDrop>();

  constructor() {
    const drag = inject(CdkDrag);
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    const cell = () => cellUnder(element.parentElement ?? element, element);

    drag.moved.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.gridDragMoved.emit(cell()));
    drag.ended
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((event) => this.gridDropped.emit({ cell: cell(), release: () => event.source.reset() }));
  }
}
