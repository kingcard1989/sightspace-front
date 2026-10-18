<template>
  <view class="loading">
    <AppSpinner :size="24" :color="tone === 'light' ? '#FFFFFF' : '#FF5C4D'" :track-color="tone === 'light' ? 'rgba(255,255,255,0.24)' : 'rgba(31,31,35,0.1)'" />
    <text class="loading__label" :class="{ 'loading__label--light': tone === 'light' }">
      {{ label }}
    </text>
  </view>
</template>

<script setup lang="ts">
import AppSpinner from './AppSpinner.vue'

withDefaults(
  defineProps<{
    label?: string
    tone?: 'light' | 'dark'
  }>(),
  {
    label: '正在加载…',
    tone: 'dark',
  },
)
</script>

<style lang="scss" scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: dp(200);
  padding: dp(40) 0;
}

.loading__label {
  margin-top: dp(12);
  color: $sj-text-secondary;
  font-size: dp(13);
}

.loading__label--light {
  color: rgba(255, 255, 255, 0.7);
}
</style>
