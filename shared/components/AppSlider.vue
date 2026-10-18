<template>
  <view class="slider" :class="{ 'slider--disabled': disabled, 'slider--compact': compact }">
    <view
      class="slider__hit"
      @touchstart.stop.prevent="onTouchStart"
      @touchmove.stop.prevent="onTouchMove"
      @touchend.stop="onTouchEnd"
      @touchcancel.stop="onTouchEnd"
      @mousedown.stop.prevent="onMouseDown"
    >
      <view class="slider__track" :style="{ backgroundColor: trackColor }">
        <view
          class="slider__active"
          :style="{ width: `${percent}%`, backgroundColor: activeColor }"
        />
        <view
          class="slider__thumb"
          :class="{ 'slider__thumb--dragging': dragging }"
          :style="{
            left: `${percent}%`,
            borderColor: activeColor,
            backgroundColor: thumbColor,
          }"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onUnmounted, ref } from 'vue'
import { clamp } from '@/shared/utils/format'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    step?: number
    activeColor?: string
    trackColor?: string
    thumbColor?: string
    disabled?: boolean
    compact?: boolean
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    activeColor: '#FF5C4D',
    trackColor: '#EFEFF2',
    thumbColor: '#FFFFFF',
    disabled: false,
    compact: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
  (event: 'change', value: number): void
}>()

const instance = getCurrentInstance()
const dragging = ref(false)

let trackLeft = 0
let trackWidth = 0
let pendingX = 0
let lastValue = props.modelValue

const percent = computed(() => {
  const span = props.max - props.min
  if (span <= 0) return 0
  return clamp(((props.modelValue - props.min) / span) * 100, 0, 100)
})

function measureTrack(): Promise<void> {
  return new Promise((resolve) => {
    try {
      uni
        .createSelectorQuery()
        .in(instance?.proxy)
        .select('.slider__track')
        .boundingClientRect((rect: any) => {
          if (rect && typeof rect.left === 'number' && typeof rect.width === 'number') {
            trackLeft = rect.left
            trackWidth = rect.width
          }
          resolve()
        })
        .exec()
    } catch {
      resolve()
    }
  })
}

function snap(value: number): number {
  const step = props.step > 0 ? props.step : 1
  const snapped = Math.round((value - props.min) / step) * step + props.min
  return Number(clamp(snapped, props.min, props.max).toFixed(4))
}

function updateFromClientX(clientX: number): void {
  if (trackWidth <= 0) return

  const ratio = clamp((clientX - trackLeft) / trackWidth, 0, 1)
  const next = snap(props.min + ratio * (props.max - props.min))

  if (next !== props.modelValue || next !== lastValue) {
    lastValue = next
    emit('update:modelValue', next)
  }
}

async function beginAt(clientX: number): Promise<void> {
  if (props.disabled) return

  dragging.value = true
  pendingX = clientX
  await measureTrack()
  if (dragging.value) {
    updateFromClientX(pendingX)
  }
}

function endDrag(): void {
  if (!dragging.value) return
  dragging.value = false
  emit('change', lastValue)
}

function clientXOf(event: any): number | null {
  const touch = event?.touches?.[0] || event?.changedTouches?.[0]
  if (touch && typeof touch.clientX === 'number') return touch.clientX
  if (typeof event?.clientX === 'number') return event.clientX
  return null
}

function onTouchStart(event: any): void {
  const clientX = clientXOf(event)
  if (clientX != null) void beginAt(clientX)
}

function onTouchMove(event: any): void {
  if (!dragging.value) return
  const clientX = clientXOf(event)
  if (clientX != null) updateFromClientX(clientX)
}

function onTouchEnd(event: any): void {
  const clientX = clientXOf(event)
  if (clientX != null) updateFromClientX(clientX)
  endDrag()
}

function onMouseDown(event: any): void {
  if (props.disabled) return
  const clientX = clientXOf(event)
  if (clientX == null) return

  // #ifdef H5
  document.addEventListener('mousemove', onDocumentMouseMove)
  document.addEventListener('mouseup', onDocumentMouseUp)
  // #endif

  void beginAt(clientX)
}

// #ifdef H5
function onDocumentMouseMove(event: MouseEvent): void {
  if (dragging.value) updateFromClientX(event.clientX)
}

function onDocumentMouseUp(): void {
  endDrag()
  document.removeEventListener('mousemove', onDocumentMouseMove)
  document.removeEventListener('mouseup', onDocumentMouseUp)
}
// #endif

onUnmounted(() => {
  // #ifdef H5
  document.removeEventListener('mousemove', onDocumentMouseMove)
  document.removeEventListener('mouseup', onDocumentMouseUp)
  // #endif
})
</script>

<style lang="scss" scoped>
.slider {
  width: 100%;
  padding: 0 dp(9);
  user-select: none;
}

.slider--disabled {
  opacity: 0.5;
}

.slider__hit {
  width: 100%;
  padding: dp(16) 0;
  touch-action: none;
}

.slider--compact .slider__hit {
  padding: dp(10) 0;
}

.slider__track {
  position: relative;
  width: 100%;
  height: dp(4);
  border-radius: dp($sj-radius-pill);
}

.slider__active {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: dp($sj-radius-pill);
}

.slider__thumb {
  position: absolute;
  top: 50%;
  width: dp(20);
  height: dp(20);
  margin-top: dp(-10);
  margin-left: dp(-10);
  border: dp(2) solid $sj-accent;
  border-radius: 50%;
  box-shadow: 0 dp(2) dp(8) rgba(31, 31, 35, 0.16);
  transition: transform 0.16s ease;
}

.slider__thumb--dragging {
  transform: scale(1.12);
}
</style>
