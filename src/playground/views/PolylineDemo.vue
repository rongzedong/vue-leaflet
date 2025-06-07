<template>
  <l-map ref="map" v-model:zoom="zoom" :center="[25.774, -80.19]">
    <l-tile-layer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      layer-type="base"
      name="OpenStreetMap"
    ></l-tile-layer>

    <l-polyline
      :edit=true   
      v-model:lat-lngs="latlngs" 
      color="green"
    />
  </l-map>
</template>
<script lang="ts">
import { LMap, LPolyline, LTileLayer } from "@src/components";

import { ref, watch } from "vue";

const latlngs = ref<[number, number][]>([
  [25.774, -80.19],
  [18.466, -66.118],
  [32.321, -64.757],
  [25.774, -80.19],
]);

watch(latlngs, (newVal) => {
  console.log('latlngs changed:', JSON.stringify(newVal))
});

export default {
  components: {
    LMap,
    LTileLayer,
    LPolyline,
  },
  data() {
    return {
      zoom: 5,
      latlngs: latlngs
    };
  },
};
</script>
