<script lang="ts">
import L from "leaflet";
import { defineComponent, markRaw, onMounted, ref, watch, onUnmounted } from "vue";
import { AddLayerInjection, RemoveLayerInjection } from "@src/types/injectionKeys";
import { setupPolygon, polygonProps } from "@src/functions/polygon";
import { render } from "@src/functions/layer";
import { assertInject } from "@src/utils.js";

export default defineComponent({
  name: "LPolygon",
  props: polygonProps,
  emits: ['update:latLngs'],
  setup(props, context) {
    const leafletObject = ref<L.Polygon>();
    const editLayerGroup = ref<L.LayerGroup | null>(null);
    const addLayer = assertInject(AddLayerInjection);
    const removeLayer = assertInject(RemoveLayerInjection);

    const { options, methods } = setupPolygon(props, leafletObject, context);

    function getPoints() {
      if (props.latLngs && props.latLngs.length) return props.latLngs;
      return [];
    }

    // ========== 新增编辑模式相关 ==========
    function addEditLayerGroup() {
      if (editLayerGroup.value) return;

      const latlngs = [...getPoints()];
      // if (!latlngs.length) throw new Error('Polygon latlngs is empty');
      // console.log(latlngs)
      if(latlngs.length===0) return;

      // 判断多环还是单环
      let isMulti = false;
      if (
        Array.isArray(latlngs[0]) &&
        Array.isArray(latlngs[0][0])
      ) {
        isMulti = true;
      } else if (
        Array.isArray(latlngs[0]) &&
        (typeof latlngs[0][0] === 'number' || typeof latlngs[0][0] === 'string')
      ) {
        isMulti = false;
      } else {
        throw new Error('Polygon latlngs format is invalid');
      }

      const wrap = isMulti ? (latlngs as L.LatLngExpression[][]) : [latlngs as L.LatLngExpression[]];

      const group = L.layerGroup();
      wrap.forEach((ring, ringIdx) => {
        ring.forEach((latlng, idx) => {
          const marker = L.marker(latlng, { draggable: true });
          marker.on('drag', (e: L.LeafletMouseEvent) => {
            wrap[ringIdx][idx] = [e.latlng.lat, e.latlng.lng];
            const newLatlngs = isMulti ? wrap : wrap[0];
            leafletObject.value?.setLatLngs(newLatlngs);
          });
          marker.on('dragend', () => {
            // 仅在拖动放开时 emit
            const newLatlngs = isMulti ? wrap : wrap[0];
            context.emit('update:latLngs', newLatlngs);
          });
          group.addLayer(marker);
        });
      });

      editLayerGroup.value = group;
      addLayer({ leafletObject: group });
    }

    function removeEditLayerGroup() {
      if (editLayerGroup.value) {
        removeLayer({ leafletObject: editLayerGroup.value as  L.layerGroup });
        editLayerGroup.value = null;
      }
    }
    // =====================================

    onMounted(() => {
      leafletObject.value = markRaw(L.polygon(getPoints(), options));
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
