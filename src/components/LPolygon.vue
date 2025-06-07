<script lang="ts">
import type L from "leaflet";
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

import { render } from "@src/functions/layer";
import { polygonProps, setupPolygon } from "@src/functions/polygon";
import {
  AddLayerInjection,
  UseGlobalLeafletInjection,
  LMapInjectionKey // 请确保此 key 存在你的项目注入 keys 中
} from "@src/types/injectionKeys";
import {
  WINDOW_OR_GLOBAL,
  assertInject,
  propsBinder,
  remapEvents,
} from "@src/utils.js";

/**
 * Polygon component, lets you add and customize polygon regions on the map
 */
export default defineComponent({
  name: "LPolygon",
  props: {
    ...polygonProps,
    edit: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, context) {
    const leafletObject = ref<L.Polygon>();
    const ready = ref(false);

    const useGlobalLeaflet = inject(UseGlobalLeafletInjection);
    const addLayer = assertInject(AddLayerInjection);
    const map = inject<any>(LMapInjectionKey); // <== 通过注入获取 map 实例

    const { options, methods } = setupPolygon(props, leafletObject, context);

    // === 编辑模式相关 ===
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

    onMounted(async () => {
      const { polygon }: typeof L = useGlobalLeaflet
        ? WINDOW_OR_GLOBAL.L
        : await import("leaflet/dist/leaflet-src.esm");

      leafletObject.value = markRaw<L.Polygon>(polygon(props.latLngs, options));

      const { listeners } = remapEvents(context.attrs);
      leafletObject.value.on(listeners);

      propsBinder(methods, leafletObject.value, props);

      addLayer({
        ...props,
        ...methods,
        leafletObject: leafletObject.value,
      });
      ready.value = true;
      nextTick(() => context.emit("ready", leafletObject.value));

      // 编辑模式监听
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

    return { ready, leafletObject };
  },
  render() {
    return render(this.ready, this.$slots);
  },
});
</script>

<style>
.edit-handle {
  z-index: 1000;
}
</style>
