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
import { polylineProps, setupPolyline } from "@src/functions/polyline";
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

function isValidLatLng(latlng: any): boolean {
  return (
    (Array.isArray(latlng) &&
      latlng.length === 2 &&
      typeof latlng[0] === "number" &&
      typeof latlng[1] === "number") ||
    (latlng &&
      typeof latlng.lat === "number" &&
      typeof latlng.lng === "number")
  );
}

// 计算点到线段的最近距离，并返回线段起点索引
function findClosestSegmentIndex(latlngs: any[], point: L.LatLng) {
  let minDist = Infinity;
  let minIdx = -1;
  for (let i = 0; i < latlngs.length - 1; i++) {
    const a = latlngs[i];
    const b = latlngs[i + 1];
    const dist = pointToSegmentDistance(point, a, b);
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }
  return minIdx;
}

// 计算点到线段距离
function pointToSegmentDistance(
  p: L.LatLng,
  a: L.LatLng | [number, number],
  b: L.LatLng | [number, number]
): number {
  // 把 a, b, p 转为 {lat, lng}
  const toLatLng = (pt: any) =>
    Array.isArray(pt)
      ? { lat: pt[0], lng: pt[1] }
      : { lat: pt.lat, lng: pt.lng };
  const pa = toLatLng(a);
  const pb = toLatLng(b);

  // 向量算法
  const dx = pb.lat - pa.lat;
  const dy = pb.lng - pa.lng;
  if (dx === 0 && dy === 0) {
    // a == b
    return Math.sqrt(
      (p.lat - pa.lat) * (p.lat - pa.lat) + (p.lng - pa.lng) * (p.lng - pa.lng)
    );
  }
  const t =
    ((p.lat - pa.lat) * dx + (p.lng - pa.lng) * dy) / (dx * dx + dy * dy);
  let closest;
  if (t < 0) {
    closest = pa;
  } else if (t > 1) {
    closest = pb;
  } else {
    closest = { lat: pa.lat + t * dx, lng: pa.lng + t * dy };
  }
  return Math.sqrt(
    (p.lat - closest.lat) * (p.lat - closest.lat) +
      (p.lng - closest.lng) * (p.lng - closest.lng)
  );
}

export default defineComponent({
  name: "LPolyline",
  props: {
    ...polylineProps,
    edit: {
      type: Boolean,
      default: false,
    }
  },
  emits: ['update:latLngs', 'ready'],
  components: { LLayerGroup, LMarker },
  setup(props, context) {
    const leafletObject = ref<L.Polyline>();
    const ready = ref(false);

    const useGlobalLeaflet = inject(UseGlobalLeafletInjection);
    const addLayer = assertInject(AddLayerInjection);

    const { options, methods } = setupPolyline(props, leafletObject, context);

    // 只返回有效点
    const points = computed(() =>
      Array.isArray(props.latLngs) ? props.latLngs.filter(isValidLatLng) : []
    );

    // 编辑点，只有在 edit=true 时才有
    const editPoints = computed(() => (props.edit ? points.value : []));

    // 拖动 marker 更新 latLngs
    function onMarkerDrag(idx: number, e: any) {
      const latlng =
        e.latlng ??
        (e.target && e.target.getLatLng && e.target.getLatLng());
      if (!latlng) return;
      const updated = points.value.slice();
      updated[idx] = [latlng.lat, latlng.lng];
      if (leafletObject.value) leafletObject.value.setLatLngs(updated);
      context.emit("update:latLngs", updated);
    }

    // 折线点击插入点（仅编辑模式下）
    function onPolylineClick(e: any) {
      if (!props.edit) return;
      const latlng = e.latlng;
      const pts = points.value.slice();
      if (!latlng || pts.length < 2) return;
      const LLatLng = (window as any).L ? (window as any).L.latLng : (lat, lng) => ({lat, lng});
      const clickPoint = LLatLng(latlng.lat, latlng.lng);

      // 找到最近线段
      const insertIdx = findClosestSegmentIndex(
        pts.map(pt => LLatLng(Array.isArray(pt) ? pt[0] : pt.lat, Array.isArray(pt) ? pt[1] : pt.lng)),
        clickPoint
      );
      if (insertIdx < 0) return;
      // 插入点
      const insertLatLng = [latlng.lat, latlng.lng];
      pts.splice(insertIdx + 1, 0, insertLatLng);
      if (leafletObject.value) leafletObject.value.setLatLngs(pts);
      context.emit("update:latLngs", pts);
    }

    // 双击marker删除点
    function onMarkerDblClick(idx: number) {
      const pts = points.value.slice();
      if (pts.length <= 2) return; // 最少保留两个点
      pts.splice(idx, 1);
      if (leafletObject.value) leafletObject.value.setLatLngs(pts);
      context.emit("update:latLngs", pts);
    }

    // SSR安全
    onMounted(async () => {
      if (!isClient) return;
      const { polyline }: typeof L = useGlobalLeaflet
        ? WINDOW_OR_GLOBAL.L
        : await import("leaflet/dist/leaflet-src.esm");

      leafletObject.value = markRaw<L.Polyline>(
        polyline(points.value, options)
      );

      const { listeners } = remapEvents(context.attrs);
      leafletObject.value.on(listeners);

      propsBinder(methods, leafletObject.value, props);

      // 仅编辑模式绑定一次 polyline click
      leafletObject.value.on("click", onPolylineClick);

      addLayer({
        ...props,
        ...methods,
        leafletObject: leafletObject.value,
      });
      ready.value = true;
      nextTick(() => context.emit("ready", leafletObject.value));
    });

    // latLngs 有变化时，同步
    watch(
      () => points.value,
      (pts) => {
        if (leafletObject.value) {
          leafletObject.value.setLatLngs(pts);
        }
      }
    );

    // 响应 edit 开关，绑定/解绑 click 事件
    watch(
      () => props.edit,
      (edit) => {
        if (!leafletObject.value) return;
        if (edit) {
          leafletObject.value.on("click", onPolylineClick);
        } else {
          leafletObject.value.off("click", onPolylineClick);
        }
      }
    );

    return {
      ready,
      leafletObject,
      editPoints,
      onMarkerDrag,
      onMarkerDblClick,
      isClient,
      props,
    };
  },
  render() {
    if (!this.isClient) return null;

    let editLayer: VNode | null = null;

    if (this.props.edit && this.editPoints.length) {
      editLayer = h(
        LLayerGroup,
        {},
        {
          default: () =>
            this.editPoints.map((latlng, idx) =>
              h(LMarker, {
                key: idx,
                draggable: true,
                latLng: latlng,
                onDrag: (e) => this.onMarkerDrag(idx, e),
                onDragend: (e) => this.onMarkerDrag(idx, e),
                ondblclick: () => this.onMarkerDblClick(idx),
              })
            ),
        }
      );
    }

    return h(Fragment, {}, [
      render(this.ready, this.$slots),
      editLayer,
    ]);
  }
});
</script>
