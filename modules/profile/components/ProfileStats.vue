<template>
  <view class="stats">
    <template v-for="(item, index) in items" :key="item.key">
      <view v-if="index > 0" class="stats__divider" />
      <view class="stats__item">
        <text class="stats__value">{{ formatCount(item.value) }}</text>
        <text class="stats__label">{{ item.label }}</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UserStats } from '@/shared/types/models'
import { formatCount } from '@/shared/utils/format'

const props = defineProps<{
  stats: UserStats
}>()

const items = computed(() => [
  { key: 'works', label: '作品', value: props.stats.works },
  { key: 'followers', label: '粉丝', value: props.stats.followers },
  { key: 'following', label: '关注', value: props.stats.following },
])
</script>

<style lang="scss" scoped>
.stats {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  padding: dp(22) dp(24) dp(18);
}

.stats__item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.stats__value {
  color: $sj-text;
  font-size: dp(24);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.3px;
  font-variant-numeric: tabular-nums;
}

.stats__label {
  margin-top: dp(4);
  color: $sj-text-secondary;
  font-size: dp($sj-font-label);
  font-weight: 400;
  line-height: 1.3;
}

.stats__divider {
  flex-shrink: 0;
  width: 1px;
  height: dp(28);
  background: $sj-border;
}
</style>
