<template>
  <view
    class="app-avatar"
    :class="{ 'app-avatar--ring': ring }"
    :style="wrapperStyle"
  >
    <view class="app-avatar__inner">
      <image
        v-if="showImage"
        class="app-avatar__image"
        :src="src"
        mode="aspectFill"
        @error="onImageError"
      />
      <view
        v-else
        class="app-avatar__fallback"
        :style="{ background: fallbackBackground }"
      >
        <text class="app-avatar__initial" :style="{ fontSize: initialSize }">
          {{ initial }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Palette } from '@/shared/types/models'
import { gradientOf, initialOf, paletteFor } from '@/shared/utils/color'
import { toRpx } from '@/shared/utils/format'

const props = withDefaults(
  defineProps<{
    src?: string
    name?: string
    size?: number
    ring?: boolean
    palette?: Palette
  }>(),
  {
    src: '',
    name: '',
    size: 80,
    ring: false,
    palette: undefined,
  },
)

const broken = ref(false)

const showImage = computed(() => Boolean(props.src) && !broken.value)
const initial = computed(() => initialOf(props.name || 'U'))
const fallbackBackground = computed(() =>
  gradientOf(props.palette || paletteFor(props.name || 'user'), 140),
)
const initialSize = computed(() => toRpx(Math.max(14, Math.round(props.size * 0.36))))

const wrapperStyle = computed(() => ({
  width: toRpx(props.size),
  height: toRpx(props.size),
}))

watch(
  () => props.src,
  () => {
    broken.value = false
  },
)

function onImageError(): void {
  broken.value = true
}
</script>

<style lang="scss" scoped>
.app-avatar {
  flex-shrink: 0;
  padding: 0;
  border-radius: 50%;
  overflow: hidden;
  background: $sj-surface-muted;
}

.app-avatar--ring {
  padding: dp(3);
  background: linear-gradient(145deg, #ffe3df 0%, #ffffff 52%, #ffd3cd 100%);
}

.app-avatar__inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: $sj-surface-muted;
}

.app-avatar--ring .app-avatar__inner {
  border: dp(2) solid $sj-surface;
}

.app-avatar__image {
  width: 100%;
  height: 100%;
}

.app-avatar__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.app-avatar__initial {
  color: $sj-surface;
  font-weight: 600;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(31, 31, 35, 0.08);
}
</style>
