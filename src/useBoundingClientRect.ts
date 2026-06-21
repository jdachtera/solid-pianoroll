import { Accessor, createEffect, createSignal, onCleanup } from "solid-js";

export type ClientRect = Omit<DOMRect, "toJSON">;

const defaultRect: ClientRect = {
  left: 0,
  width: 0,
  top: 0,
  height: 0,
  bottom: 0,
  right: 0,
  x: 0,
  y: 0,
};

export default function useBoundingClientRect(containerRef: Accessor<HTMLElement | undefined>) {
  const [boundingClientRect, setBoundingClientRect] = createSignal<ClientRect>(defaultRect);

  createEffect(() => {
    const container = containerRef();
    if (!container) return;

    const updateBoundingClientRect = () => {
      setBoundingClientRect(container.getBoundingClientRect() ?? defaultRect);
    };

    const resizeObserver = new ResizeObserver(updateBoundingClientRect);
    resizeObserver.observe(container);

    // The rect's screen-space origin (left/top) also shifts when the element
    // moves *without* resizing — an ancestor scrolls, or the layout above it
    // changes height. The ResizeObserver doesn't fire for those, so the cached
    // origin went stale and pointer hit-testing (clientX/Y -> position) landed
    // offset from the cursor. Re-measure on any scroll (capture: true so
    // ancestor scroll containers count, not just window) and on window resize.
    const scrollOptions: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("scroll", updateBoundingClientRect, scrollOptions);
    window.addEventListener("resize", updateBoundingClientRect, { passive: true });

    updateBoundingClientRect();

    onCleanup(() => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", updateBoundingClientRect, scrollOptions);
      window.removeEventListener("resize", updateBoundingClientRect);
    });
  });

  return boundingClientRect;
}
