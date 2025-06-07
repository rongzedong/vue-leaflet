<script lang="ts">
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
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
import { setupPolyline, polylineProps } from "@src/functions/polyline";

export default defineComponent({
  name: "LPolyline",
  props: polylineProps,
  setup(props, context) {
    const leafletObject = ref<L.Polyline>();
    const map = inject<any>(LMapInjectionKey);

    const { options, methods } = setupPolyline(props, leafletObject, context);

    onMounted(() => {
      leafletObject.value = markRaw(L.polyline(props.latLngs as LatLngExpression[], options));
      // 监听 edit 状态
      watch(
        () => props.edit,
        (val) => {
          if (val && map?.value) methods.addEditHandles(map.value);
          else methods.removeEditHandles();
        },
        { immediate: true }
      );
      // 监听数据变化，刷新 handle
      watch(
        () => props.latLngs,
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
