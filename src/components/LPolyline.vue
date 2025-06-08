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
    Array.isArray(latlng) &&
    latlng.length === 2 &&
    typeof latlng[0] === "number" &&
    typeof latlng[1] === "number"
  ) ||
    (latlng &&
      typeof latlng.lat === "number" &&
      typeof latlng.lng === "number");
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

    return {
      ready,
      leafletObject,
      editPoints,
      onMarkerDrag,
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
