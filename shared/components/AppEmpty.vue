<template>
  <view class="empty">
    <view class="empty__icon">
      <AppIcon :name="icon" :size="28" />
    </view>
    <text class="empty__title">{{ title }}</text>
    <text v-if="description" class="empty__desc">{{ description }}</text>
    <AppButton
      v-if="actionLabel"
      class="empty__action"
      type="ghost"
      size="small"
      :label="actionLabel"
      @click="emit('action')"
    />
  </view>
</template>

<script setup lang="ts">
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    icon?: string
    title: string
    description?: string
    actionLabel?: string
  }>(),
  {
    icon: 'image-muted',
    description: '',
    actionLabel: '',
  },
)

const emit = defineEmits<{
  (event: 'action'): void
}>()
</script>

<style lang="scss" scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: dp(48) dp(32);
}

.empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(68);
  height: dp(68);
  margin-bottom: dp(16);
  background: $sj-surface-muted;
  border-radius: 50%;
}

.empty__title {
  color: $sj-text;
  font-size: dp(16);
  font-weight: 600;
  line-height: 1.4;
}

.empty__desc {
  max-width: dp(260);
  margin-top: dp(6);
  color: $sj-text-secondary;
  font-size: dp(13);
  line-height: 1.6;
  text-align: center;
}

.empty__action {
  margin-top: dp(18);
}
</style>
