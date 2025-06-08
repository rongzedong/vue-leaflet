<script lang="ts">
import type L from "leaflet";
import {
  defineComponent,
  inject,
  markRaw,
  nextTick,
  onMounted,
  ref,
  watch,
  computed,
  h,
  Fragment,
  type VNode
} from "vue";

import { render } from "@src/functions/layer";
import { polygonProps, setupPolygon } from "@src/functions/polygon";
import {
  AddLayerInjection,
  UseGlobalLeafletInjection,
} from "@src/types/injectionKeys";
import {
  WINDOW_OR_GLOBAL,
  assertInject,
  propsBinder,
  remapEvents,
} from "@src/utils.js";
import LLayerGroup from "./LLayerGroup.vue";
import LMarker from "./LMarker.vue";

const isClient = typeof window !== "undefined";

// 判断多环/单环，输出二维数组
function getRings(latLngs: any[]): any[][] {
  if (!Array.isArray(latLngs) || !latLngs.length) return [];
  // 多环（二维数组）
  if (Array.isArray(latLngs[0]) && Array.isArray(latLngs[0][0])) {
    return latLngs;
  }
  // 单环（一维数组）
  if (
    Array.isArray(latLngs[0]) &&
    (typeof latLngs[0][0] === "number" || typeof latLngs[0][0] === "string")
  ) {
    return [latLngs];
  }
  return [];
}

export default defineComponent({
  name: "LPolygon",
  props: {
    ...polygonProps,
    edit: { type: Boolean, default: false }
  },
  emits: ['update:latLngs', 'ready'],
  components: { LLayerGroup, LMarker },
  setup(props, context) {
    const leafletObject = ref<L.Polygon>();
    const ready = ref(false);

    const useGlobalLeaflet = inject(UseGlobalLeafletInjection);
    const addLayer = assertInject(AddLayerInjection);

    const { options, methods } = setupPolygon(props, leafletObject, context);

    // 二维环数据，兼容单环/多环
    const rings = computed(() => getRings(props.latLngs));

    // 编辑模式的 marker 拖拽回调
    function onMarkerDrag(ringIdx: number, idx: number, e: any) {
      const latlng =
        e.latlng ??
        (e.target && e.target.getLatLng && e.target.getLatLng());
      if (!latlng) return;

      const nextRings = rings.value.map(ring => ring.slice());
      nextRings[ringIdx][idx] = [latlng.lat, latlng.lng];
      // Leaflet 兼容单环/多环
      if (leafletObject.value) {
        leafletObject.value.setLatLngs(
          rings.value.length > 1 ? nextRings : nextRings[0]
        );
      }
      context.emit(
        "update:latLngs",
        rings.value.length > 1 ? nextRings : nextRings[0]
      );
    }

    onMounted(async () => {
      if (!isClient) return;
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
    });

    // latLngs 响应式同步
    watch(
      () => props.latLngs,
      val => {
        if (leafletObject.value) leafletObject.value.setLatLngs(val);
      }
    );

    return {
      ready,
      leafletObject,
      rings,
      onMarkerDrag,
      isClient,
      props
    };
  },
  render() {
    if (!this.isClient) return null;

    // let editLayer = null;
    // 编辑时渲染 marker 组
    let editLayer: VNode | null = null;

    if (this.props.edit && this.rings.length) {
      editLayer = h(
        LLayerGroup,
        {},
        {
          default: () =>
            this.rings.flatMap((ring, ringIdx) =>
              ring.map((latlng, idx) =>
                h(LMarker, {
                  key: `${ringIdx}-${idx}`,
                  draggable: true,
                  latLng: latlng,
                  onDrag: (e) => this.onMarkerDrag(ringIdx, idx, e),
                  onDragend: (e) => this.onMarkerDrag(ringIdx, idx, e),
                })
              )
            ),
        }
      );
    }

    return h(Fragment, {}, [
      render(this.ready, this.$slots),
      editLayer
    ]);
  },
});
</script>
