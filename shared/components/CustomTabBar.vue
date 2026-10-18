<template>
  <view class="tabbar">
    <view class="tabbar__inner">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tabbar__item"
        hover-class="tabbar__item--hover"
        :hover-stay-time="60"
        @tap="onTap(tab.key)"
      >
        <AppIcon :name="iconOf(tab.key)" :size="23" />
        <text class="tabbar__label" :class="{ 'tabbar__label--active': isActive(tab.key) }">
          {{ tab.label }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { navigateTab, type AppTab } from '@/shared/utils/navigation'

const props = withDefaults(
  defineProps<{
    active?: AppTab
  }>(),
  {
    active: 'discover',
  },
)

const tabs: Array<{ key: AppTab; label: string }> = [
  { key: 'discover', label: '发现' },
  { key: 'editor', label: '编辑' },
  { key: 'profile', label: '我的' },
]

function isActive(tab: AppTab): boolean {
  return props.active === tab
}

function iconOf(tab: AppTab): string {
  if (tab === 'discover') {
    return isActive(tab) ? 'compass-accent' : 'compass-muted'
  }
  if (tab === 'profile') {
    return isActive(tab) ? 'user-filled-accent' : 'user-muted'
  }
  return 'sliders-muted'
}

function onTap(tab: AppTab): void {
  navigateTab(tab)
}
</script>

<style lang="scss" scoped>
.tabbar {
  flex-shrink: 0;
  width: 100%;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  background: $sj-surface;
  border-top: 1px solid $sj-border;
}

.tabbar__inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: dp(58);
  padding: 0 dp(20);
}

.tabbar__item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: dp(4);
  height: 100%;
  border-radius: dp(14);
}

.tabbar__item--hover {
  opacity: 0.7;
}

.tabbar__label {
  color: $sj-text-secondary;
  font-size: dp($sj-font-tab);
  font-weight: 500;
  line-height: 1.2;
}

.tabbar__label--active {
  color: $sj-accent;
  font-weight: 600;
}
</style>
