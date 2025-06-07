<script lang="ts">
import L from "leaflet";
import {
  defineComponent,
  inject,
  markRaw,
  nextTick,
  onMounted,
  ref,
  watch,
  onUnmounted
} from "vue";
import { AddLayerInjection, UseGlobalLeafletInjection, LMapInjectionKey } from "@src/types/injectionKeys";

export default defineComponent({
  name: "LPolyline",
  props: {
    latLngs: { type: Array, required: true },
    edit: { type: Boolean, default: false }
  },
  setup(props, context) {
    const leafletObject = ref<L.Polyline>();
    const map = inject<any>(LMapInjectionKey);
    const handleMarkers = ref<L.Marker[]>([]);

    function addHandles() {
      removeHandles();
      if (!leafletObject.value || !map?.value) return;
      (props.latLngs || []).forEach((latlng, idx) => {
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
          const updated = [...props.latLngs];
          updated[idx] = [newLatLng.lat, newLatLng.lng];
          context.emit("update:latLngs", updated);
          context.emit("change", updated);
        });
        if (map.value) {
          marker.addTo(map.value);
        }
        handleMarkers.value.push(marker);
      });
    }

    function removeHandles() {
      handleMarkers.value.forEach((m) => m.remove());
      handleMarkers.value = [];
    }

    onMounted(() => {
      leafletObject.value = markRaw(L.polyline(props.latLngs));
      // 你可在这里绑定事件等
      watch(
        () => props.edit,
        (val) => {
          if (val) addHandles();
          else removeHandles();
        },
        { immediate: true }
      );
      watch(
        () => props.latLngs,
        () => {
          if (props.edit) {
            removeHandles();
            addHandles();
          }
        }
      );
    });

    onUnmounted(removeHandles);

    return { leafletObject };
  }
});
</script>

<style>
.edit-handle {
  z-index: 1000;
}
</style>
