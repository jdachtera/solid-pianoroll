import { Midi } from "@tonejs/midi";

export type Note = Pick<
  ReturnType<Midi["tracks"][number]["notes"][number]["toJSON"]>,
  "durationTicks" | "midi" | "ticks" | "velocity"
>;

export type Track = {
  name: string;
  notes: Note[];
  color: string;
};
