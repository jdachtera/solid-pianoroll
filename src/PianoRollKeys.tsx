import styles from "./PianoRollKeys.module.css";
import { createMemo, Index, Show } from "solid-js";
import { usePianoRollContext } from "./PianoRollContext";

const PianoRollKeys = () => {
  const context = usePianoRollContext();

  return (
    <div class={styles.PianoRollKeys}>
      <Index each={keys}>
        {(key) => {
          const virtualDimensions = createMemo(() =>
            context.verticalViewPort.getVirtualDimensions(127 - key().number, 1),
          );

          return (
            <Show when={virtualDimensions().size > 0}>
              <div
                class={styles["PianoRollKeys-Key"]}
                title={key().name}
                data-index={key().number % 12}
                style={{
                  top: `${virtualDimensions().offset}px`,
                  height: `${virtualDimensions().size}px`,
                  "background-color": key().isBlack ? "#000" : "#fff",
                  "border-width": `${
                    !key().isBlack && !blackKeys.includes((key().number + 1) % 12) ? "0.1px" : 0
                  } 1px ${
                    !key().isBlack && !blackKeys.includes((key().number - 1) % 12) ? "0.1px" : 0
                  } 0`,
                }}
              ></div>
            </Show>
          );
        }}
      </Index>
    </div>
  );
};

const blackKeys = [1, 3, 6, 8, 10];
const keyNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const keys = Array.from({ length: 128 }).map((_, index) => ({
  number: index,
  name: `${keyNames[index % 12]} ${Math.floor(index / 12) - 2}`,
  isBlack: blackKeys.includes(index % 12),
}));

export default PianoRollKeys;
