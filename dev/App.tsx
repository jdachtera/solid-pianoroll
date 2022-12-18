import { Suspense } from "solid-js";
import Demo from "./Demo";

export default function App() {
  return (
    <Suspense fallback={"Loading..."}>
      <Demo />
    </Suspense>
  );
}
