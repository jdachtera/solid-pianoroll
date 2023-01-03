import { createEffect, createMemo, ParentProps, Ref } from "solid-js";

import { useViewPortDimension } from "./ScrollZoomViewPort";

const ScrollContainer = (props: ParentProps<{ ref?: Ref<HTMLDivElement> }>) => {
  let scrollContentRef: HTMLDivElement | undefined;

  const verticalViewPort = createMemo(() => useViewPortDimension("vertical"));
  const horizontalViewPort = createMemo(() => useViewPortDimension("horizontal"));

  const handleScroll = (event: UIEvent & { currentTarget: Element }) => {
    event.preventDefault();

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

  const handleWheel = (event: WheelEvent) => {
    if (event.altKey) {
      event.preventDefault();

      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        horizontalViewPort()?.onZoomChange?.(
          horizontalViewPort().zoom * (1 + event.deltaX / horizontalViewPort().pixelSize),
        );
        const maxPosition = horizontalViewPort().calculateMaxPosition();

        horizontalViewPort()?.onPositionChange?.(
          Math.min(maxPosition, horizontalViewPort()?.position),
        );
      } else {
        verticalViewPort()?.onZoomChange?.(
          verticalViewPort().zoom * (1 + event.deltaY / verticalViewPort().pixelSize),
        );
        const maxVerticalPosition = verticalViewPort().calculateMaxPosition();

        verticalViewPort()?.onPositionChange?.(
          Math.min(maxVerticalPosition, verticalViewPort()?.position),
        );
      }
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
      class="PianoRoll-Scroller"
      style={{
        height: "100%",
        width: "100%",
        "z-index": 4,
        overflow: "scroll",
        "pointer-events": "auto",
      }}
      onScroll={handleScroll}
      onWheel={handleWheel}
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

export default ScrollContainer;
