import type L from "leaflet";
import { propsToLeafletOptions } from "@src/utils";
import { polylineProps, setupPolyline } from "./polyline";
import { ref } from "vue";

export const polygonProps = {
  ...polylineProps,
} as const;

export const setupPolygon = (props, leafletRef, context) => {
  const { options: polylineOptions, methods: polylineMethods } = setupPolyline(
    props,
    leafletRef,
    context
  );

  const options = propsToLeafletOptions<L.PolylineOptions>(
    props,
    polygonProps,
    polylineOptions
  );

  // 编辑相关
  const handleMarkers = ref<L.Marker[]>([]);

  function getPoints() {
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

  const methods = {
    ...polylineMethods,
    addEditHandles,
    removeEditHandles,
    toGeoJSON(precision?: number) {
      return leafletRef.value.toGeoJSON(precision);
    },
  };

  return { options, methods, handleMarkers };
};
