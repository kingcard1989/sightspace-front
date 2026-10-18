<template>
  <view class="skeleton" :style="skeletonStyle" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toRpx } from '@/shared/utils/format'

const props = withDefaults(
  defineProps<{
    width?: string
    height?: number
    radius?: number
    circle?: boolean
  }>(),
  {
    width: '100%',
    height: 14,
    radius: 8,
    circle: false,
  },
)

const skeletonStyle = computed(() => ({
  width: props.circle ? toRpx(props.height) : props.width,
  height: toRpx(props.height),
  borderRadius: props.circle ? '50%' : toRpx(props.radius),
}))
</script>

<style lang="scss" scoped>
.skeleton {
  flex-shrink: 0;
  background: $sj-surface-muted;
  animation: sj-skeleton-pulse 1.5s ease-in-out infinite;
}
</style>
