<template>
  <view class="identity">
    <view class="identity__top">
      <AppAvatar
        :src="user?.avatarUrl || ''"
        :name="user?.nickname || '视界用户'"
        :size="80"
        ring
      />

      <view class="identity__meta">
        <text class="identity__name">{{ user?.nickname || '视界用户' }}</text>
        <text class="identity__handle">@{{ user?.handle || 'shijie' }}</text>
      </view>

      <view
        class="identity__edit"
        hover-class="identity__edit--hover"
        :hover-stay-time="60"
        @tap="emit('edit')"
      >
        <text class="identity__edit-text">编辑个人资料</text>
      </view>
    </view>

    <text class="identity__bio">{{ user?.bio || '用镜头记录生活。' }}</text>
  </view>
</template>

<script setup lang="ts">
import type { User } from '@/shared/types/models'
import AppAvatar from '@/shared/components/AppAvatar.vue'

defineProps<{
  user: User | null
}>()

const emit = defineEmits<{
  (event: 'edit'): void
}>()
</script>

<style lang="scss" scoped>
.identity {
  width: 100%;
  padding: dp(8) dp($sj-page-padding) 0;
}

.identity__top {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
}

.identity__meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin-left: dp(16);
  padding-right: dp(10);
}

.identity__name {
  overflow: hidden;
  color: $sj-text;
  font-size: dp($sj-font-name);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.4px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.identity__handle {
  overflow: hidden;
  margin-top: dp(4);
  color: $sj-text-secondary;
  font-size: dp(14);
  font-weight: 400;
  line-height: 1.3;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.identity__edit {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: dp(34);
  padding: 0 dp(13);
  background: $sj-surface;
  border: 1px solid $sj-border;
  border-radius: dp($sj-radius-pill);
}

.identity__edit--hover {
  background: $sj-surface-muted;
}

.identity__edit-text {
  color: $sj-text;
  font-size: dp(12);
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.identity__bio {
  display: block;
  margin-top: dp(18);
  color: $sj-text-secondary;
  font-size: dp($sj-font-body);
  line-height: 1.55;
}
</style>
