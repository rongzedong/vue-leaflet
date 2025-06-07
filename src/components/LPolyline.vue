<script lang="ts">
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import {
  defineComponent,
  inject,
  markRaw,
  onMounted,
  ref,
  watch,
  onUnmounted
} from "vue";
import { LMapInjectionKey } from "@src/types/injectionKeys";
import { setupPolyline, polylineProps } from "@src/functions/polyline";

export default defineComponent({
  name: "LPolyline",
  props: polylineProps,
  setup(props, context) {
    const leafletObject = ref<L.Polyline>();
    const map = inject<any>(LMapInjectionKey);

    const { options, methods } = setupPolyline(props, leafletObject, context);

    function getPoints() {
      if (props.coordinates && props.coordinates.length) return props.coordinates;
      if (props.latLngs && props.latLngs.length) return props.latLngs;
      return [];
    }

    onMounted(() => {
      leafletObject.value = markRaw(L.polyline(getPoints(), options));
      watch(
        () => props.edit,
        (val) => {
          if (val && map?.value) methods.addEditHandles(map.value);
          else methods.removeEditHandles();
        },
        { immediate: true }
      );
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

    return { leafletObject };
  }
});
</script>

<style>
.edit-handle {
  z-index: 1000;
}
</style>
