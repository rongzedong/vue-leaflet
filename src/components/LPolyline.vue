<script lang="ts">
import L from "leaflet";
import { defineComponent, markRaw, onMounted, ref, watch, onUnmounted } from "vue";
import { AddLayerInjection, RemoveLayerInjection } from "@src/types/injectionKeys";
import { setupPolyline, polylineProps } from "@src/functions/polyline";
import { render } from "@src/functions/layer";
import { assertInject } from "@src/utils.js";

export default defineComponent({
  name: "LPolyline",
  props: polylineProps,
  emits: ['update:latLngs'],
  setup(props, context) {
    const leafletObject = ref<L.Polyline>();
    const editLayerGroup = ref<L.LayerGroup | null>(null);
    const addLayer = assertInject(AddLayerInjection);
    const removeLayer = assertInject(RemoveLayerInjection);

    const { options, methods } = setupPolyline(props, leafletObject, context);

    function getPoints() {
      if (props.latLngs && props.latLngs.length) return props.latLngs;
      return [];
    }

    // ========== 新增编辑模式相关 ==========
    function addEditLayerGroup() {
      if (editLayerGroup.value) return;
      const latlngs = [...getPoints()];
      const group = L.layerGroup();
      latlngs.forEach((latlng, idx) => {
        const marker = L.marker(latlng, { draggable: true });
        marker.on('drag', (e) => {
          latlngs[idx] = [e.latlng.lat, e.latlng.lng];
          leafletObject.value?.setLatLngs(latlngs);
        });
        marker.on('dragend', () => {
          context.emit('update:latLngs', latlngs);
        });
        group.addLayer(marker);
      });
      editLayerGroup.value = group;
      addLayer({ leafletObject: group });
    }

    function removeEditLayerGroup() {
      if (editLayerGroup.value) {
        removeLayer({ leafletObject: editLayerGroup.value });
        editLayerGroup.value = null;
      }
    }
    // =====================================

    onMounted(() => {
      leafletObject.value = markRaw(L.polyline(getPoints(), options));
      addLayer({
        ...props,
        ...methods,
        leafletObject: leafletObject.value,
      });

      watch(
        () => props.edit,
        (val) => {
          if (val) {
            addEditLayerGroup();
          } else {
            removeEditLayerGroup();
          }
        },
        { immediate: true }
      );
      watch(
        () => getPoints(),
        () => {
          leafletObject.value?.setLatLngs(getPoints());
          if (props.edit) {
            removeEditLayerGroup();
            addEditLayerGroup();
          }
        }
      );
    });

    onUnmounted(() => {
      removeEditLayerGroup();
    });

    return { leafletObject, ready: true };
  },
  render() {
    return render(this.ready, this.$slots);
  },
});
</script>
