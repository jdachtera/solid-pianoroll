import { Accessor, createEffect, createSignal } from "solid-js";

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

    updateBoundingClientRect();

    return () => {
      resizeObserver.disconnect();
    };
  });

  return boundingClientRect;
}
