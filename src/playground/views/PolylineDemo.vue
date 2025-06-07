<template>
  <l-map ref="map" v-model:zoom="zoom" :center="[47.41322, -1.219482]">
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

const latlngs = ref([
  [47.334852, -1.509485],
        [47.342596, -1.328731],
        [47.241487, -1.190568],
        [47.234787, -1.358337],
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
