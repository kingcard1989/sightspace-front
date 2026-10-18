<template>
  <view class="editor-header">
    <view class="editor-header__side">
      <view
        class="editor-header__button"
        hover-class="editor-header__button--hover"
        @tap="emit('back')"
      >
        <AppIcon name="chevron-left-white" :size="22" />
      </view>
      <text class="editor-header__title">{{ filename }}</text>
    </view>

    <view class="editor-header__side">
      <view
        class="editor-header__button"
        hover-class="editor-header__button--hover"
        @tap="emit('undo')"
      >
        <AppIcon class="editor-header__undo" name="undo-muted" :size="20" />
      </view>
      <view
        class="editor-header__button"
        hover-class="editor-header__button--hover"
        @tap="emit('more')"
      >
        <AppIcon name="more-white" :size="20" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'

withDefaults(
  defineProps<{
    filename?: string
  }>(),
  {
    filename: 'IMG_2048',
  },
)

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'undo'): void
  (event: 'more'): void
}>()
</script>

<style lang="scss" scoped>
.editor-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: dp(44);
  padding: 0 dp(10);
  background: $sj-canvas;
}

.editor-header__side {
  display: flex;
  flex-direction: row;
  align-items: center;
  min-width: 0;
}

.editor-header__button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: dp(36);
  height: dp(36);
  border-radius: 50%;
}

.editor-header__button--hover {
  background: rgba(255, 255, 255, 0.08);
}

.editor-header__title {
  max-width: dp(150);
  margin-left: dp(2);
  overflow: hidden;
  color: $sj-white;
  font-size: dp(13);
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.2px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-header__undo {
  opacity: 0.4;
}
</style>
