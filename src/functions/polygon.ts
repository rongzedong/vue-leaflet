import type L from "leaflet";
import { pathProps, setupPath } from "./path";
import { propsToLeafletOptions } from "@src/utils";

export const polygonProps = {
  ...pathProps,
  smoothFactor: {
    type: Number,
    default: undefined,
  },
  noClip: {
    type: Boolean,
    default: undefined,
  },
  latLngs: {
    type: Array as () => L.LatLngExpression[] | L.LatLngExpression[][],
    default: undefined,
  },
  edit: {
    type: Boolean,
    default: false,
  },
} as const;

export const setupPolygon = (props, leafletRef, context) => {
  const { options: pathOptions, methods: pathMethods } = setupPath(props, leafletRef, context);

  const options = propsToLeafletOptions<L.PolylineOptions>(
    props,
    polygonProps,
    pathOptions
  );

  const methods = {
    ...pathMethods,
    setSmoothFactor(smoothFactor) {
      leafletRef.value.setStyle({ smoothFactor });
    },
    setNoClip(noClip) {
      leafletRef.value.setStyle({ noClip });
    },
    addLatLng(latLng) {
      leafletRef.value.addLatLng(latLng);
    },
    // （如有原addEditHandles/removeEditHandles等方法，可安全移除，仅保留与本次需求相关方法）
  };

  return { options, methods };
};
