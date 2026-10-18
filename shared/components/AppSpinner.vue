<template>
  <view class="spinner" :style="spinnerStyle" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toRpx } from '@/shared/utils/format'

const props = withDefaults(
  defineProps<{
    size?: number
    color?: string
    trackColor?: string
    thickness?: number
  }>(),
  {
    size: 18,
    color: '#FF5C4D',
    trackColor: 'rgba(31, 31, 35, 0.12)',
    thickness: 2,
  },
)

const spinnerStyle = computed(() => ({
  width: toRpx(props.size),
  height: toRpx(props.size),
  borderWidth: `${props.thickness}px`,
  borderColor: props.trackColor,
  borderTopColor: props.color,
}))
</script>

<style lang="scss" scoped>
.spinner {
  flex-shrink: 0;
  border-style: solid;
  border-radius: 50%;
  animation: sj-spin 0.8s linear infinite;
}
</style>
