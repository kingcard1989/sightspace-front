<template>
  <view class="profile-skeleton">
    <view class="profile-skeleton__identity">
      <AppSkeleton :height="80" circle />
      <view class="profile-skeleton__meta">
        <AppSkeleton width="42%" :height="22" :radius="7" />
        <AppSkeleton width="28%" :height="13" :radius="6" />
      </view>
      <AppSkeleton width="92rpx" :height="34" :radius="17" />
    </view>

    <AppSkeleton width="72%" :height="14" :radius="7" />
    <AppSkeleton class="profile-skeleton__bio" width="54%" :height="14" :radius="7" />

    <view class="profile-skeleton__stats">
      <view v-for="index in 3" :key="index" class="profile-skeleton__stat">
        <AppSkeleton width="54rpx" :height="24" :radius="7" />
        <AppSkeleton width="40rpx" :height="11" :radius="6" />
      </view>
    </view>

    <AppSkeleton class="profile-skeleton__tabs" width="100%" :height="46" :radius="23" />

    <view class="profile-skeleton__grid">
      <view
        v-for="columnIndex in 3"
        :key="columnIndex"
        class="profile-skeleton__column"
        :class="{ 'profile-skeleton__column--offset': columnIndex === 2 }"
      >
        <view v-for="rowIndex in 3" :key="rowIndex" class="profile-skeleton__cell" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppSkeleton from '@/shared/components/AppSkeleton.vue'
</script>

<style lang="scss" scoped>
.profile-skeleton {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: dp(8) dp(24) dp(24);
}

.profile-skeleton__identity {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
}

.profile-skeleton__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: dp(8);
  min-width: 0;
  margin-left: dp(16);
}

.profile-skeleton__bio {
  margin-top: dp(10);
}

.profile-skeleton__stats {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  padding: dp(26) 0 dp(22);
}

.profile-skeleton__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: dp(6);
}

.profile-skeleton__tabs {
  margin-bottom: dp(16);
}

.profile-skeleton__grid {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: dp(8);
  width: 100%;
  margin-left: dp(-8);
}

.profile-skeleton__column {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: dp(8);
  min-width: 0;
}

.profile-skeleton__column--offset {
  padding-top: dp(16);
}

.profile-skeleton__cell {
  width: 100%;
  padding-bottom: 100%;
  background: $sj-surface-muted;
  border-radius: dp(16);
  animation: sj-skeleton-pulse 1.5s ease-in-out infinite;
}
</style>
