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
