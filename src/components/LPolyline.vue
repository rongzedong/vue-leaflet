<script lang="ts">
// ...原有 import
import L from "leaflet";
import { ref, watch, onUnmounted, onMounted, defineComponent } from "vue";
import { polylineProps } from "@src/functions/polyline";
// ...原有代码
export default defineComponent({
  name: "LPolyline",
  props: {
    ...polylineProps,
    edit: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, context) {
    // ...原有代码
    const handleMarkers = ref<L.Marker[]>([]);
    const map = ref<L.Map>();

    function addHandles() {
      removeHandles();
      if (!leafletObject.value || !leafletObject.value._map) return;
      map.value = leafletObject.value._map;
      props.latLngs.forEach((latlng, idx) => {
        const marker = L.marker(latlng, {
          draggable: true,
          icon: L.divIcon({
            className: "edit-handle",
            iconSize: [12, 12],
            iconAnchor: [6, 6],
            html: `<div style="width:12px;height:12px;background:#fff;border:2px solid #3388ff;border-radius:2px"></div>`,
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
        marker.addTo(map.value);
        handleMarkers.value.push(marker);
      });
    }

    function removeHandles() {
      handleMarkers.value.forEach((m) => m.remove());
      handleMarkers.value = [];
    }

    onMounted(() => {
      // ...原有 onMounted 代码
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
    // ...原有 return
  },
  // ...原有 render
});
</script>
<style>
.edit-handle {
  z-index: 1000;
}
</style>
