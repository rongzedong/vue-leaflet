import type L from "leaflet";
import type { PropType } from "vue";
import { ref } from "vue";
import { propsToLeafletOptions } from "@src/utils";
import { pathProps, setupPath } from "./path";

export const polylineProps = {
  ...pathProps,
  smoothFactor: {
    type: Number,
  },
  noClip: {
    type: Boolean,
    default: undefined,
  },
  // 保持兼容旧的 latLngs，同时支持 coordinates
  coordinates: {
    type: Array as PropType<L.LatLngExpression[]>,
    required: false,
    default: undefined,
    custom: true,
  },
  latLngs: {
    type: Array as PropType<L.LatLngExpression[]>,
    required: false,
    default: undefined,
    custom: true,
  },
  edit: {
    type: Boolean,
    default: false,
  },
} as const;

export const setupPolyline = (props, leafletRef, context) => {
  const { options: pathOptions, methods: pathMethods } = setupPath(
    props,
    leafletRef,
    context
  );

  const options = propsToLeafletOptions<L.PolylineOptions>(
    props,
    polylineProps,
    pathOptions
  );

  // --- 编辑相关 ---
  const handleMarkers = ref<L.Marker[]>([]);

  function getPoints() {
    // 优先用 coordinates，否则用 latLngs
    if (props.coordinates && props.coordinates.length) return props.coordinates;
    if (props.latLngs && props.latLngs.length) return props.latLngs;
    return [];
  }

  function emitUpdate(arr: L.LatLngExpression[]) {
    // 优先 emit coordinates
    if (props.coordinates !== undefined) {
      context.emit("update:coordinates", arr);
      context.emit("change", arr);
    } else {
      context.emit("update:latLngs", arr);
      context.emit("change", arr);
    }
  }

  function addEditHandles(map: L.Map) {
    removeEditHandles();
    const points = getPoints();
    if (!leafletRef.value || !map || !Array.isArray(points)) return;
    points.forEach((latlng, idx) => {
      const marker = L.marker(latlng, {
        draggable: true,
        icon: L.divIcon({
          className: "edit-handle",
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          html: `<div style="width:12px;height:12px;background:#fff;border:2px solid #41b782;border-radius:2px"></div>`,
        }),
        interactive: true,
      });
      marker.on("drag", (e) => {
        const newLatLng = e.target.getLatLng();
        const updated = [...points];
        updated[idx] = [newLatLng.lat, newLatLng.lng];
        emitUpdate(updated);
      });
      marker.addTo(map);
      handleMarkers.value.push(marker);
    });
  }

  function removeEditHandles() {
    handleMarkers.value.forEach((m) => m.remove());
    handleMarkers.value = [];
  }
  // --- END 编辑相关 ---

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
    addEditHandles,
    removeEditHandles,
  };

  return { options, methods, handleMarkers };
};
