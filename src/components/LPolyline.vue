<script lang="ts">
import L from "leaflet";
import { debounce } from "ts-debounce";
import {
  defineComponent,
  inject,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  watch,
  ref,
} from "vue";

import { setupPolyline, polylineProps } from "@src/functions/polyline";
import { render } from "@src/functions/layer";
import {
  AddLayerInjection,
  RemoveLayerInjection,
  CanSetParentHtmlInjection,
  SetIconInjection,
  SetParentHtmlInjection,
  UseGlobalLeafletInjection,
} from "@src/types/injectionKeys";
import {
  WINDOW_OR_GLOBAL,
  assertInject,
  cancelDebounces,
  isFunction,
  propsBinder,
  remapEvents,
} from "@src/utils.js";

// 增强：检查点是否合法
function isValidLatLng(latlng: any): boolean {
  // 支持 [number, number] 或 {lat: number, lng: number}
  return (
    Array.isArray(latlng) && latlng.length === 2 &&
    typeof latlng[0] === 'number' && typeof latlng[1] === 'number'
  ) || (
    latlng && typeof latlng.lat === 'number' && typeof latlng.lng === 'number'
  );
}

export default defineComponent({
  name: "LPolyline",
  props: polylineProps,
  emits: ['update:latLngs', 'ready'],
  setup(props, context) {
    const leafletObject = ref<L.Polyline>();
    const ready = ref(false);
    const editLayerGroup = ref<L.LayerGroup | null>(null);
    const addLayer = assertInject(AddLayerInjection);
    const removeLayer = assertInject(RemoveLayerInjection);

    const { options, methods } = setupPolyline(props, leafletObject, context);





    // 增强：只返回有效点
    function getPoints() {
      if (Array.isArray(props.latLngs) && props.latLngs.length) {
        return props.latLngs.filter(isValidLatLng);
      }
      return [];
    }

    // ========== 新增编辑模式相关 ==========
    function addEditLayerGroup() {
      if (editLayerGroup.value) return;
      const latlngs = [...getPoints()];
      if (!latlngs.length) {
        // 增强：无有效点不创建编辑层组
        return;
      }
      const group = L.layerGroup();
      latlngs.forEach((latlng, idx) => {
        if (!isValidLatLng(latlng)) return; // 增强：跳过无效点
        const marker = L.marker(latlng, { draggable: true });
        marker.on('drag', (e: L.LeafletEvent) => {
          const latlng = marker.getLatLng();
          latlngs[idx] = [latlng.lat, latlng.lng];
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
        removeLayer({ leafletObject: editLayerGroup.value as unknown as L.LayerGroup });
        editLayerGroup.value = null;
      }
    }
    // =====================================


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
          const pts = getPoints();
          if (!leafletObject.value) {
            if (pts.length) {
              leafletObject.value = markRaw(L.polyline(pts, options));
              addLayer({
                ...props,
                ...methods,
                leafletObject: leafletObject.value,
              });
            }
          } else {
            leafletObject.value.setLatLngs(pts);
          }
          if (props.edit) {
            removeEditLayerGroup();
            addEditLayerGroup();
          }
        }
      );

    onMounted(async () => {
      const latlngs = [...getPoints()];

      // leafletObject.value = markRaw<L.Polyline>(Polyline(props.latLng, options));
      leafletObject.value = markRaw(L.polyline(latlngs, options));
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
    });

    return { ready, leafletObject };
  },
  render() {
    return render(this.ready, this.$slots);
  },
});

</script>
