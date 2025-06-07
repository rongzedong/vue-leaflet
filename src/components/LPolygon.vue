<script lang="ts">
import L from "leaflet";
import { defineComponent, inject, markRaw, onMounted, ref, watch, onUnmounted } from "vue";
import { LMapInjectionKey, AddLayerInjection } from "@src/types/injectionKeys";
import { setupPolygon, polygonProps } from "@src/functions/polygon";
import { render } from "@src/functions/layer";
import { assertInject } from "@src/utils.js";

/**
 * Polygon component, lets you add polygons to the map
 */
export default defineComponent({
  name: "LPolygon",
  props: polygonProps,
  setup(props, context) {
    const leafletObject = ref<L.Polygon>();
    const map = inject<any>(LMapInjectionKey);
    const addLayer = assertInject(AddLayerInjection);

    const { options, methods } = setupPolygon(props, leafletObject, context);

    function getPoints() {
      if (props.coordinates && props.coordinates.length) return props.coordinates;
      if (props.latLngs && props.latLngs.length) return props.latLngs;
      return [];
    }

    onMounted(() => {
      leafletObject.value = markRaw(L.polygon(getPoints(), options));
      addLayer({
        ...props,
        ...methods,
        leafletObject: leafletObject.value,
      });

      // Watch for editing state
      watch(
        () => props.edit,
        (val) => {
          if (val && map?.value) methods.addEditHandles(map.value);
          else methods.removeEditHandles();
        },
        { immediate: true }
      );
      // Watch for points changes
      watch(
        () => getPoints(),
        () => {
          if (props.edit && map?.value) {
            methods.removeEditHandles();
            methods.addEditHandles(map.value);
          }
        }
      );
    });

    onUnmounted(() => {
      methods.removeEditHandles();
    });

    return { leafletObject, ready: true };
  },
  render() {
    // 这里直接参考 LMarker 的 render模式
    return render(this.ready, this.$slots);
  },
});
</script>
