<template>
  <AppSheet
    :model-value="modelValue"
    title="更多操作"
    subtitle="管理你的账号与个人资料"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <view class="menu">
      <view
        class="menu__item"
        hover-class="menu__item--hover"
        :hover-stay-time="60"
        @tap="onAction('edit')"
      >
        <view class="menu__icon"><AppIcon name="user-muted" :size="20" /></view>
        <text class="menu__label">编辑个人资料</text>
        <AppIcon name="chevron-right-muted" :size="18" />
      </view>

      <view
        class="menu__item menu__item--danger"
        hover-class="menu__item--hover"
        :hover-stay-time="60"
        @tap="onAction('logout')"
      >
        <view class="menu__icon"><AppIcon name="log-out-dark" :size="20" /></view>
        <text class="menu__label">退出登录</text>
        <AppIcon name="chevron-right-muted" :size="18" />
      </view>

      <view
        class="menu__cancel"
        hover-class="menu__cancel--hover"
        :hover-stay-time="60"
        @tap="close"
      >
        <text class="menu__cancel-text">取消</text>
      </view>
    </view>
  </AppSheet>
</template>

<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'
import AppSheet from '@/shared/components/AppSheet.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'edit'): void
  (event: 'logout'): void
}>()

function close(): void {
  emit('update:modelValue', false)
}

function onAction(action: 'edit' | 'logout'): void {
  close()
  if (action === 'edit') {
    emit('edit')
    return
  }
  emit('logout')
}
</script>

<style lang="scss" scoped>
.menu {
  display: flex;
  flex-direction: column;
  gap: dp(10);
  padding-top: dp(6);
}

.menu__item {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: dp(54);
  padding: 0 dp(14);
  background: $sj-bg;
  border-radius: dp(14);
}

.menu__item--hover {
  background: $sj-surface-muted;
}

.menu__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(34);
  height: dp(34);
  margin-right: dp(10);
  background: $sj-surface;
  border-radius: 50%;
}

.menu__label {
  flex: 1;
  color: $sj-text;
  font-size: dp(15);
  font-weight: 500;
  line-height: 1.3;
}

.menu__item--danger .menu__label {
  color: $sj-danger;
}

.menu__cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: dp(48);
  margin-top: dp(2);
  border-radius: dp(14);
  border: 1px solid $sj-border;
}

.menu__cancel--hover {
  background: $sj-bg;
}

.menu__cancel-text {
  color: $sj-text-secondary;
  font-size: dp(14);
  font-weight: 500;
}
</style>
