<template>
  <image
    class="app-icon"
    :src="src"
    :style="iconStyle"
    mode="aspectFit"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toRpx } from '@/shared/utils/format'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
  }>(),
  {
    size: 20,
  },
)

const src = computed(() => `/static/icons/${props.name}.png`)

const iconStyle = computed(() => ({
  width: toRpx(props.size),
  height: toRpx(props.size),
  flexShrink: 0,
}))
</script>

<style lang="scss" scoped>
.app-icon {
  display: block;
}
</style>
