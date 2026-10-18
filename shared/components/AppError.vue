<template>
  <view class="error">
    <view class="error__icon">
      <AppIcon name="alert-circle-accent" :size="30" />
    </view>
    <text class="error__title">{{ title }}</text>
    <text v-if="description" class="error__desc">{{ description }}</text>
    <AppButton
      class="error__action"
      type="ghost"
      size="small"
      :label="actionLabel"
      @click="emit('retry')"
    />
  </view>
</template>

<script setup lang="ts">
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    actionLabel?: string
  }>(),
  {
    title: '加载失败',
    description: '网络开小差了，请稍后再试',
    actionLabel: '重新加载',
  },
)

const emit = defineEmits<{
  (event: 'retry'): void
}>()
</script>

<style lang="scss" scoped>
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: dp(48) dp(32);
}

.error__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(68);
  height: dp(68);
  margin-bottom: dp(16);
  background: $sj-accent-wash;
  border-radius: 50%;
}

.error__title {
  color: $sj-text;
  font-size: dp(16);
  font-weight: 600;
  line-height: 1.4;
}

.error__desc {
  max-width: dp(260);
  margin-top: dp(6);
  color: $sj-text-secondary;
  font-size: dp(13);
  line-height: 1.6;
  text-align: center;
}

.error__action {
  margin-top: dp(18);
}
</style>
