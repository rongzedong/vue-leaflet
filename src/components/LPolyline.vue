<script lang="ts">
import type L from "leaflet";
import { debounce } from "ts-debounce";
import {  defineComponent,  inject,  markRaw,  onMounted,  ref,  watch, nextTick, onBeforeUnmount, onUnmounted} from "vue";
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



export default defineComponent({
  name: "LPolyline",
  props: polylineProps,
  setup(props, context) {
    const leafletObject = ref<L.Polyline>();
    const ready = ref(false);
    const addLayer = assertInject(AddLayerInjection);
    const removeLayer = assertInject(RemoveLayerInjection);

    const { options, methods } = setupPolyline(props, leafletObject, context);

    const eventHandlers = {
      moveHandler: debounce(methods.latLngSync),
    };

    function getPoints() {
      if (props.coordinates && props.coordinates.length) return props.coordinates;
      if (props.latLngs && props.latLngs.length) return props.latLngs;
      return [];
    }

    onMounted(() => {
      // TODO L.layerGroup([marker1, marker2]) 如果是编辑模式，就返回 带标记的群组
      // 或者在 addEditHandles 和 removeEditHandles 的时候，用 addLayer 方式来实现
      leafletObject.value = markRaw(L.polyline(getPoints(), options));
      const { listeners } = remapEvents(context.attrs);
      leafletObject.value.on(listeners);
      leafletObject.value.on("move", eventHandlers.moveHandler);
      propsBinder(methods, leafletObject.value, props);
      addLayer({
        ...props,
        ...methods,
        leafletObject: leafletObject.value,
      });

       watch(
        () => {
          // console.log(props.edit);
          return props.edit;
        },
        (val) => {
          // console.log(val);
          if (val) {
            var handle = methods.removeEditHandles();
            addLayer({
            ...props,
            ...methods,
            leafletObject: handle.value
            })

          }
          else ;
        },
        { immediate: true }
      );
      watch(
        () => getPoints(),
        () => {
          if (props.edit) {
            removeLayer({})
            methods.removeEditHandles();
            var handle = methods.removeEditHandles();
            addLayer({
            ...props,
            ...methods,
            leafletObject: handle.value
            })
          }
        }
      );


      ready.value = true;
      nextTick(() => context.emit("ready", leafletObject.value));
    });

    onBeforeUnmount(() => cancelDebounces(eventHandlers));

    return { ready, leafletObject };
  },
  render() {
    return render(this.ready, this.$slots);
  },
});
</script>
