import { createEffect, createMemo, JSX, mergeProps, ParentProps, Ref, splitProps } from "solid-js";

import { useViewPortDimension } from "./ScrollZoomViewPort";

import styles from "./ScrollZoomContainer.module.css";

const ScrollZoomContainer = (
  props: ParentProps<
    {
      ref?: Ref<HTMLDivElement>;
      verticalDimensionName?: string;
      horizontalDimensionName?: string;
      showScrollbar?: boolean;
    } & JSX.IntrinsicElements["div"]
  >,
) => {
  let scrollContentRef: HTMLDivElement | undefined;

  const [ownProps, divProps] = splitProps(props, [
    "ref",
    "verticalDimensionName",
    "horizontalDimensionName",
    "showScrollbar",
  ]);

  const propsWithDefaults = mergeProps(
    {
      verticalDimensionName: "vertical",
      horizontalDimensionName: "horizontal",
      showScrollbar: true,
    },
    ownProps,
  );

  const verticalViewPort = createMemo(() =>
    useViewPortDimension(propsWithDefaults.verticalDimensionName),
  );
  const horizontalViewPort = createMemo(() =>
    useViewPortDimension(propsWithDefaults.horizontalDimensionName),
  );

  const handleScroll = (event: { currentTarget: HTMLElement }) => {
    if (didUpdateScroll) {
      didUpdateScroll = false;
      return;
    }

    const maxVerticalPosition = verticalViewPort().calculateMaxPosition();
    const maxPosition = horizontalViewPort().calculateMaxPosition();

    const height = verticalViewPort().pixelSize;
    const width = horizontalViewPort().pixelSize;
    const { scrollTop, scrollLeft, scrollWidth, scrollHeight } = event.currentTarget;

    const scrollTopAmount = scrollTop / (scrollHeight - height);
    const scrollLeftAmount = scrollLeft / (scrollWidth - width);

    verticalViewPort().onPositionChange?.(maxVerticalPosition * scrollTopAmount);
    horizontalViewPort().onPositionChange?.(maxPosition * scrollLeftAmount);
  };

  const handleWheel = (event: WheelEvent & { currentTarget: Element }) => {
    if (event.altKey) {
      // Modifier zooms the axis under the dominant delta, anchored on the pointer:
      // the value under the cursor stays put (matching the waveform). Plain wheel
      // (no modifier) falls through to native scroll, which pans time (X) + pitch
      // (Y) at once.
      event.preventDefault();
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      const viewPort = horizontal ? horizontalViewPort() : verticalViewPort();
      const delta = horizontal ? event.deltaX : event.deltaY;
      const pointer = horizontal ? event.clientX : event.clientY;

      const valueAtPointer = viewPort.calculatePosition(pointer);
      const newZoom = viewPort.zoom / (1 + delta / viewPort.pixelSize);
      const newVisibleRange = viewPort.range / newZoom;
      const fraction = (pointer - viewPort.pixelOffset) / viewPort.pixelSize;

      viewPort.onZoomChange?.(newZoom);
      viewPort.onPositionChange?.(valueAtPointer - fraction * newVisibleRange);
    } else if (!props.showScrollbar) {
      event.preventDefault();
      event.currentTarget.scrollLeft += event.deltaX;
      event.currentTarget.scrollTop += event.deltaY;
    }
  };

  /** Pinch to zoom — the touch counterpart of the modifier-wheel gesture above.
   *
   * A wheel has a scalar delta and a modifier key to say which gesture it is. A
   * touchscreen has neither, so the gesture is identified by arity: one finger
   * is a pan, which the browser's own scrolling already does well, and two are
   * a zoom, which nothing else was going to do at all.
   *
   * Both axes scale independently, from the spread of the fingers along each
   * one. That falls out of the roll having two unrelated axes — time and pitch
   * — rather than one picture: fingers drawn apart sideways ask for more bars,
   * drawn apart vertically for more octaves, and a diagonal pinch does both by
   * the amount it actually moved in each direction. Scaling both by one
   * distance instead would make every horizontal pinch quietly change the pitch
   * range too.
   *
   * Anchored on the midpoint between the fingers, so whatever is being pinched
   * stays under them — the same rule the wheel path uses for the cursor. Zoom
   * is computed against the spread at the START of the gesture rather than the
   * previous move, so a slow pinch cannot accumulate rounding drift. */
  const activePointers = new Map<number, { x: number; y: number }>();

  type PinchStart = { horizontalSpread: number; verticalSpread: number; horizontalZoom: number; verticalZoom: number };
  let pinchStart: PinchStart | undefined;

  // Below this the fingers are close enough that the spread ratio is mostly
  // noise, and a pinch that starts there would jump the zoom by a wild factor.
  const minimumSpreadPx = 20;

  const pointerSpread = () => {
    const [first, second] = [...activePointers.values()];
    if (!first || !second) return undefined;

    return {
      horizontalSpread: Math.abs(first.x - second.x),
      verticalSpread: Math.abs(first.y - second.y),
      midX: (first.x + second.x) / 2,
      midY: (first.y + second.y) / 2,
    };
  };

  const beginPinch = () => {
    const spread = pointerSpread();
    if (!spread) return;

    pinchStart = {
      horizontalSpread: Math.max(spread.horizontalSpread, minimumSpreadPx),
      verticalSpread: Math.max(spread.verticalSpread, minimumSpreadPx),
      horizontalZoom: horizontalViewPort().zoom,
      verticalZoom: verticalViewPort().zoom,
    };
  };

  /** Zoom one axis to `newZoom`, keeping the value currently under `pixel`
      under it afterwards. */
  const zoomAnchored = (
    viewPort: ReturnType<typeof useViewPortDimension>,
    newZoom: number,
    pixel: number,
  ) => {
    if (!Number.isFinite(newZoom) || newZoom <= 0) return;

    const valueAtPointer = viewPort.calculatePosition(pixel);
    const fraction = (pixel - viewPort.pixelOffset) / viewPort.pixelSize;

    viewPort.onZoomChange?.(newZoom);
    viewPort.onPositionChange?.(valueAtPointer - fraction * (viewPort.range / newZoom));
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") return;

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 2) beginPinch();
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!activePointers.has(event.pointerId)) return;

    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointers.size !== 2 || !pinchStart) return;

    const spread = pointerSpread();
    if (!spread) return;

    // The browser would otherwise still be scrolling underneath the pinch.
    event.preventDefault();

    zoomAnchored(
      horizontalViewPort(),
      (pinchStart.horizontalZoom * Math.max(spread.horizontalSpread, minimumSpreadPx)) /
        pinchStart.horizontalSpread,
      spread.midX,
    );
    zoomAnchored(
      verticalViewPort(),
      (pinchStart.verticalZoom * Math.max(spread.verticalSpread, minimumSpreadPx)) /
        pinchStart.verticalSpread,
      spread.midY,
    );
  };

  const handlePointerUp = (event: PointerEvent) => {
    activePointers.delete(event.pointerId);
    // Lifting one finger of two ends the pinch rather than re-baselining it, so
    // the remaining finger goes back to panning instead of dragging the zoom.
    if (activePointers.size < 2) pinchStart = undefined;
  };

  let didUpdateScroll = false;

  createEffect(() => {
    const maxVerticalPosition = verticalViewPort().calculateMaxPosition();
    const maxPosition = horizontalViewPort().calculateMaxPosition();

    const scrollTopAmount =
      maxVerticalPosition > 0 ? verticalViewPort().position / maxVerticalPosition : 0;
    const scrollLeftAmount = maxPosition > 0 ? horizontalViewPort().position / maxPosition : 0;

    const height = verticalViewPort().pixelSize;
    const width = horizontalViewPort().pixelSize;

    if (!scrollContentRef?.parentElement) return;

    const scrollDivHeight = verticalViewPort().zoom * verticalViewPort().pixelSize;
    const scrollTop = scrollTopAmount * (scrollDivHeight - height);

    const scrollDivWidth = horizontalViewPort().zoom * horizontalViewPort().pixelSize;
    const scrollLeft = scrollLeftAmount * (scrollDivWidth - width);

    didUpdateScroll = true;

    scrollContentRef.style.height = `${scrollDivHeight}px`;
    scrollContentRef.style.width = `${scrollDivWidth}px`;

    scrollContentRef.parentElement.scrollTo({
      left: scrollLeft,
      top: scrollTop,
    });
  });

  return (
    <div
      ref={props.ref}
      onScroll={handleScroll}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      {...divProps}
      style={{
        overflow: propsWithDefaults.showScrollbar ? "scroll" : "hidden",
        ...(typeof divProps.style === "object" && divProps.style),
      }}
      classList={{
        [styles.ScrollZoomContainer]: true,
        ...divProps.classList,
      }}
    >
      <div ref={scrollContentRef}>
        <div
          style={{
            top: 0,
            left: 0,
            height: `${verticalViewPort().pixelSize}px`,
            width: `${horizontalViewPort().pixelSize}px`,
            position: "sticky",
            display: "flex",
          }}
        >
          <div
            style={{
              position: "relative",
              height: `${verticalViewPort().pixelSize}px`,
              width: `${horizontalViewPort().pixelSize}px`,
            }}
          >
            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollZoomContainer;
