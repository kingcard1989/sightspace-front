<template>
  <view class="feed-skeleton">
    <view
      v-for="(column, columnIndex) in columns"
      :key="columnIndex"
      class="feed-skeleton__column"
      :class="{ 'feed-skeleton__column--offset': columnIndex === 1 }"
    >
      <view
        v-for="(height, index) in column"
        :key="index"
        class="feed-skeleton__block"
        :style="{ height: `${height}rpx` }"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
// 仅用于加载态占位，不参与真实瀑布流布局
const columns = [
  [300, 220, 260],
  [220, 280, 200],
  [260, 210, 280],
]
</script>

<style lang="scss" scoped>
.feed-skeleton {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: dp(8);
  width: 100%;
  padding: dp(4) dp(16) dp(20);
}

.feed-skeleton__column {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: dp(8);
  min-width: 0;
}

.feed-skeleton__column--offset {
  padding-top: dp(16);
}

.feed-skeleton__block {
  width: 100%;
  background: $sj-surface-muted;
  border-radius: dp(16);
  animation: sj-skeleton-pulse 1.5s ease-in-out infinite;
}
</style>
