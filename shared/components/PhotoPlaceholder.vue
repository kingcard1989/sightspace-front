<template>
  <view class="photo" :style="rootStyle">
    <image
      v-if="showImage"
      class="photo__image"
      :src="src"
      mode="aspectFill"
      @error="onImageError"
    />

    <template v-else>
      <view class="photo__wash" />
      <view class="photo__shape" :style="{ background: highlight }" />
      <view class="photo__line" :style="{ background: highlight }" />
      <view v-if="mark" class="photo__mark">
        <AppIcon name="aperture-white" :size="20" />
      </view>
    </template>

    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Palette } from '@/shared/types/models'
import { paletteFor } from '@/shared/utils/color'
import { toRpx } from '@/shared/utils/format'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    src?: string
    palette?: Palette
    radius?: number
    mark?: boolean
  }>(),
  {
    src: '',
    palette: undefined,
    radius: 16,
    mark: false,
  },
)

const broken = ref(false)

const resolvedPalette = computed<Palette>(
  () => props.palette || paletteFor(props.src || 'photo'),
)

const showImage = computed(() => Boolean(props.src) && !broken.value)

const rootStyle = computed(() => {
  const [from, to] = resolvedPalette.value
  return {
    borderRadius: toRpx(props.radius),
    background: `radial-gradient(circle at 22% 14%, rgba(255, 255, 255, 0.52) 0%, rgba(255, 255, 255, 0) 46%), linear-gradient(148deg, ${from} 0%, ${to} 100%)`,
  }
})

const highlight = computed(() => 'rgba(255, 255, 255, 0.22)')

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
.photo {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
}

.photo__image {
  width: 100%;
  height: 100%;
}

.photo__wash {
  position: absolute;
  top: -18%;
  left: -12%;
  width: 68%;
  height: 52%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  filter: blur(2px);
}

.photo__shape {
  position: absolute;
  right: -18%;
  bottom: -12%;
  width: 78%;
  height: 62%;
  border-radius: 46% 54% 30% 70% / 52% 38% 62% 48%;
  transform: rotate(-16deg);
}

.photo__line {
  position: absolute;
  top: 30%;
  right: 14%;
  width: 34%;
  height: 1px;
  opacity: 0.5;
  transform: rotate(-32deg);
}

.photo__mark {
  position: absolute;
  right: dp(10);
  bottom: dp(10);
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(30);
  height: dp(30);
  background: rgba(18, 18, 20, 0.18);
  border-radius: 50%;
  backdrop-filter: blur(6px);
}
</style>
