<template>
  <view class="header">
    <text class="header__title">发现</text>

    <view class="header__actions">
      <view
        class="header__hit"
        hover-class="header__hit--hover"
        :hover-stay-time="60"
        @tap="emit('search')"
      >
        <AppIcon name="search-dark" :size="22" />
      </view>
      <view
        class="header__hit"
        hover-class="header__hit--hover"
        :hover-stay-time="60"
        @tap="emit('menu')"
      >
        <AppIcon name="menu-dark" :size="24" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'

const emit = defineEmits<{
  (event: 'search'): void
  (event: 'menu'): void
}>()
</script>

<style lang="scss" scoped>
.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  width: 100%;
  height: dp(56);
  padding: 0 dp($sj-page-padding);
}

.header__title {
  color: $sj-text;
  font-size: dp($sj-font-title);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.2px;
}

.header__actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: dp(10);
}

.header__hit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(38);
  height: dp(38);
  margin-right: dp(-8);
  border-radius: 50%;
}

.header__hit:last-child {
  margin-right: 0;
}

.header__hit--hover {
  background: rgba(31, 31, 35, 0.05);
}
</style>
