import { createContext, ParentProps, useContext } from "solid-js";
import createViewPortDimension, {
  ViewPortDimension,
  ViewPortDimensionName,
  ViewPortDimensionState,
} from "./createViewPortDimension";

export const ScrollZoomViewPort = (
  props: ParentProps<{
    dimensions: Record<ViewPortDimensionName, () => Omit<ViewPortDimensionState, "name">>;
  }>,
) => {
  const viewPorts = Object.entries(props.dimensions).map(([name, viewPortProps]) =>
    createViewPortDimension(() => ({ name: name as ViewPortDimensionName, ...viewPortProps() })),
  );

  const parentViewPorts = useContext(ScrollZoomViewPortContext);

  return (
    <ScrollZoomViewPortContext.Provider value={[...parentViewPorts, ...viewPorts]}>
      {props.children}
    </ScrollZoomViewPortContext.Provider>
  );
};

const ScrollZoomViewPortContext = createContext<ViewPortDimension[]>([]);

export const useViewPortDimension = (name: ViewPortDimensionName) => {
  const viewPorts = useContext(ScrollZoomViewPortContext);

  const viewPort = name
    ? viewPorts.find((viewPort) => viewPort.name === name)
    : viewPorts[viewPorts.length - 1];

  if (!viewPort) throw new Error(`ViewPort dimension "${name}" not found.`);

  return viewPort;
};
