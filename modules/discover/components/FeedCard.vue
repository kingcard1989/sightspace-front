<template>
  <view
    class="feed-card"
    :style="cardStyle"
    hover-class="feed-card--hover"
    :hover-stay-time="60"
    @tap="emit('click', item)"
  >
    <PhotoPlaceholder :src="item.imageUrl" :palette="item.palette" :radius="16" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FeedImage } from '@/shared/types/models'
import PhotoPlaceholder from '@/shared/components/PhotoPlaceholder.vue'

const props = defineProps<{
  item: FeedImage
  left: number
  top: number
  width: number
  height: number
}>()

const emit = defineEmits<{
  (event: 'click', item: FeedImage): void
}>()

const cardStyle = computed(() => ({
  left: `${props.left}px`,
  top: `${props.top}px`,
  width: `${props.width}px`,
  height: `${props.height}px`,
}))
</script>

<style lang="scss" scoped>
.feed-card {
  position: absolute;
  overflow: hidden;
  border-radius: dp(16);
  background: $sj-surface-muted;
  transition: transform 0.18s ease, opacity 0.18s ease;
  animation: sj-card-in 0.28s ease-out both;
  will-change: transform;
}

.feed-card--hover {
  opacity: 0.9;
  transform: scale(0.985);
}
</style>
