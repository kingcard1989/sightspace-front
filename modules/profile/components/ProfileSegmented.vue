<template>
  <view class="segmented">
    <view
      v-for="option in options"
      :key="option.key"
      class="segmented__item"
      :class="{ 'segmented__item--active': option.key === active }"
      hover-class="segmented__item--hover"
      :hover-stay-time="60"
      @tap="emit('select', option.key)"
    >
      <text
        class="segmented__label"
        :class="{ 'segmented__label--active': option.key === active }"
      >
        {{ option.label }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ProfileTab } from '@/shared/types/models'
import type { ProfileTabOption } from '../types'

defineProps<{
  options: ProfileTabOption[]
  active: ProfileTab
}>()

const emit = defineEmits<{
  (event: 'select', key: ProfileTab): void
}>()
</script>

<style lang="scss" scoped>
.segmented {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: dp(46);
  padding: dp(4);
  background: $sj-surface-muted;
  border-radius: dp($sj-radius-pill);
}

.segmented__item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 100%;
  border-radius: dp($sj-radius-pill);
  transition: background 0.18s ease, box-shadow 0.18s ease;
}

.segmented__item--active {
  background: $sj-surface;
  box-shadow: 0 dp(2) dp(8) rgba(31, 31, 35, 0.06);
}

.segmented__item--hover {
  opacity: 0.8;
}

.segmented__label {
  color: $sj-text-secondary;
  font-size: dp($sj-font-body);
  font-weight: 500;
  line-height: 1.2;
  transition: color 0.18s ease;
}

.segmented__label--active {
  color: $sj-text;
  font-weight: 600;
}
</style>
