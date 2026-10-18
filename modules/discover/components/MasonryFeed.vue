<template>
  <view class="masonry" :style="{ height: `${layout.height}px` }">
    <FeedCard
      v-for="position in layout.positions"
      :key="position.item.id"
      :item="position.item"
      :left="position.x"
      :top="position.y"
      :width="position.width"
      :height="position.height"
      @click="emit('select', $event)"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue'
import { DESIGN_WIDTH } from '@/config'
import type { FeedImage } from '@/shared/types/models'
import { useSystemLayout } from '@/shared/composables/useSystemLayout'
import {
  MASONRY_GAP,
  MASONRY_PADDING_BOTTOM,
  MASONRY_PADDING_TOP,
  MASONRY_PADDING_X,
} from '../constants'
import { layoutMasonry } from '../layout'
import FeedCard from './FeedCard.vue'

const props = defineProps<{
  items: FeedImage[]
}>()

const emit = defineEmits<{
  (event: 'select', item: FeedImage): void
}>()

const instance = getCurrentInstance()
const { windowWidth } = useSystemLayout()
const containerWidth = ref(0)

const layout = computed(() => {
  const width = containerWidth.value || windowWidth.value
  const scale = width / DESIGN_WIDTH

  return layoutMasonry(props.items, {
    containerWidth: width,
    gap: MASONRY_GAP * scale,
    paddingX: MASONRY_PADDING_X * scale,
    paddingTop: MASONRY_PADDING_TOP * scale,
    paddingBottom: MASONRY_PADDING_BOTTOM * scale,
  })
})

function measure(): void {
  try {
    uni
      .createSelectorQuery()
      .in(instance?.proxy)
      .select('.masonry')
      .boundingClientRect((rect: any) => {
        if (rect && typeof rect.width === 'number' && rect.width > 0) {
          containerWidth.value = rect.width
        }
      })
      .exec()
  } catch {
    // 使用窗口宽度兜底
  }
}

onMounted(measure)

watch(
  () => props.items,
  () => {
    // 列表变化后容器高度改变，重新量一次宽度与滚动区域
    setTimeout(measure, 0)
  },
)

watch(windowWidth, () => {
  measure()
})
</script>

<style lang="scss" scoped>
.masonry {
  position: relative;
  width: 100%;
  overflow: hidden;
  transition: height 0.2s ease;
}
</style>
