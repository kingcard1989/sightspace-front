<template>
  <view v-if="modelValue" class="sheet">
    <view class="sheet__mask" @tap="onMaskTap" @touchmove.stop.prevent />
    <view class="sheet__panel" @touchmove.stop>
      <view class="sheet__handle" />
      <view class="sheet__header">
        <view class="sheet__heading">
          <text class="sheet__title">{{ title }}</text>
          <text v-if="subtitle" class="sheet__subtitle">{{ subtitle }}</text>
        </view>
        <view class="sheet__close" hover-class="sheet__close--hover" @tap="close">
          <AppIcon name="close-muted" :size="18" />
        </view>
      </view>
      <view class="sheet__body">
        <slot />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    subtitle?: string
    maskClosable?: boolean
  }>(),
  {
    title: '',
    subtitle: '',
    maskClosable: true,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'close'): void
}>()

function close(): void {
  emit('update:modelValue', false)
  emit('close')
}

function onMaskTap(): void {
  if (props.maskClosable) {
    close()
  }
}
</script>

<style lang="scss" scoped>
.sheet {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 900;
}

.sheet__mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: $sj-mask;
  animation: sj-fade-in 0.2s ease-out both;
}

.sheet__panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  max-height: 82vh;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  background: $sj-surface;
  border-radius: dp($sj-radius-sheet) dp($sj-radius-sheet) 0 0;
  box-shadow: 0 dp(-12) dp(40) rgba(31, 31, 35, 0.12);
  animation: sj-slide-up 0.26s cubic-bezier(0.22, 0.72, 0.2, 1) both;
}

.sheet__handle {
  width: dp(36);
  height: dp(4);
  margin: dp(10) auto dp(2);
  background: $sj-border;
  border-radius: dp($sj-radius-pill);
}

.sheet__header {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  padding: dp(14) dp(24) dp(8);
}

.sheet__heading {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.sheet__title {
  color: $sj-text;
  font-size: dp(19);
  font-weight: 600;
  line-height: 1.3;
}

.sheet__subtitle {
  margin-top: dp(3);
  color: $sj-text-secondary;
  font-size: dp(12);
  line-height: 1.5;
}

.sheet__close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: dp(32);
  height: dp(32);
  margin-top: dp(-2);
  background: $sj-surface-muted;
  border-radius: 50%;
}

.sheet__close--hover {
  opacity: 0.7;
}

.sheet__body {
  max-height: 62vh;
  padding: 0 dp(24) dp(20);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
