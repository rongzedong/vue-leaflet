<template>
  <l-map ref="map" v-model:zoom="zoom" :center="[24.886, -70.268]">
    <l-tile-layer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      layer-type="base"
      name="OpenStreetMap"
    ></l-tile-layer>

    <l-polygon
      :edit=true
      v-model:lat-lngs="latlngs"
      color="#41b782"
      :fill="true"
      :fillOpacity="0.5"
      fillColor="#41b782"

    />
  </l-map>
</template>
<script lang="ts">
import { LMap, LPolygon, LTileLayer } from "@src/components";

import { ref, watch } from "vue";

const latlngs = ref([
  [25.774, -80.19],
  [18.466, -66.118],
  [32.321, -64.757],
  [25.774, -80.19],
]);

watch(latlngs, (newVal) => {
  console.log('latlngs changed:', newVal)
});

export default {
  components: {
    LMap,
    LTileLayer,
    LPolygon,
  },
  data() {
    return {
      zoom: 5,
      latlngs: latlngs
    };
  },
};


</script>

<style></style>
