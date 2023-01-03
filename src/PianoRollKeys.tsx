import styles from "./PianoRollKeys.module.css";
import { createMemo, Index, Show } from "solid-js";
import { useViewPortDimension } from "./viewport/ScrollZoomViewPort";

const PianoRollKeys = () => {
  const viewPort = createMemo(() => useViewPortDimension("vertical"));

  return (
    <div class={styles.PianoRollKeys}>
      <Index each={keys}>
        {(key) => {
          const virtualDimensions = createMemo(() =>
            viewPort().calculatePixelDimensions(127 - key().number, 1),
          );

          return (
            <Show when={virtualDimensions().size > 0}>
              <div
                classList={{
                  [styles["Key"]]: true,
                  [styles["black"]]: key().isBlack,
                  [styles["white"]]: !key().isBlack,
                  [styles["whiteAndNextIsWhite"]]:
                    !key().isBlack && !blackKeys.includes((key().number + 1) % 12),
                  [styles["whiteAndPreviousIsWhite"]]:
                    !key().isBlack && !blackKeys.includes((key().number - 1) % 12),
                }}
                title={key().name}
                data-index={key().number % 12}
                style={{
                  top: `${virtualDimensions().offset}px`,
                  height: `${virtualDimensions().size}px`,
                }}
              ></div>
            </Show>
          );
        }}
      </Index>
    </div>
  );
};

export const blackKeys = [1, 3, 6, 8, 10];
export const keyNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const keys = Array.from({ length: 128 }).map((_, index) => ({
  number: index,
  name: `${keyNames[index % 12]} ${Math.floor(index / 12) - 2}`,
  isBlack: blackKeys.includes(index % 12),
}));

export default PianoRollKeys;
