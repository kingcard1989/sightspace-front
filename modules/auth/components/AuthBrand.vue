<template>
  <view class="brand">
    <view class="brand__mark">
      <AppIcon name="aperture-white" :size="34" />
    </view>
    <text class="brand__name">视界</text>
    <text class="brand__slogan">{{ slogan }}</text>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'

withDefaults(
  defineProps<{
    slogan?: string
  }>(),
  {
    slogan: '记录灵感，看见世界',
  },
)
</script>

<style lang="scss" scoped>
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.brand__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(68);
  height: dp(68);
  background: linear-gradient(145deg, #ff8a67 0%, #ff5c4d 58%, #ef4438 100%);
  border-radius: dp(22);
  box-shadow: 0 dp(14) dp(30) rgba(255, 92, 77, 0.28);
}

.brand__name {
  margin-top: dp(16);
  color: $sj-text;
  font-size: dp(28);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 2px;
}

.brand__slogan {
  margin-top: dp(7);
  color: $sj-text-secondary;
  font-size: dp(13);
  line-height: 1.5;
  letter-spacing: 0.4px;
}
</style>
