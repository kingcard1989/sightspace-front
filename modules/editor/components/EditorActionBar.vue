<template>
  <view class="action-bar-wrap">
    <view class="action-bar">
      <view
        class="action-bar__cancel"
        hover-class="action-bar__cancel--hover"
        @tap="emit('cancel')"
      >
        <text class="action-bar__cancel-text">取消编辑</text>
      </view>

      <view
        class="action-bar__compare"
        :class="{ 'action-bar__compare--active': editor.comparing }"
        @touchstart.stop.prevent="startCompare"
        @touchend.stop="endCompare"
        @touchcancel.stop="endCompare"
        @mousedown.stop.prevent="startCompare"
        @mouseup.stop="endCompare"
        @mouseleave="endCompare"
      >
        <AppIcon name="columns-dark" :size="20" />
        <text class="action-bar__compare-text">对比原图</text>
      </view>

      <view
        class="action-bar__save"
        hover-class="action-bar__save--hover"
        @tap="emit('save')"
      >
        <text class="action-bar__save-text">保存</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useEditor } from '../useEditor'

const emit = defineEmits<{
  (event: 'cancel'): void
  (event: 'save'): void
}>()

const editor = useEditor()

function startCompare(): void {
  editor.setComparing(true)
}

function endCompare(): void {
  editor.setComparing(false)
}

onUnmounted(() => {
  editor.setComparing(false)
})
</script>

<style lang="scss" scoped>
.action-bar-wrap {
  flex-shrink: 0;
  background: $sj-surface;
  border-top: 1px solid $sj-border;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.action-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: dp(50);
  padding: 0 dp(20);
}

.action-bar__cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: dp(38);
  padding: 0 dp(4);
}

.action-bar__cancel--hover {
  opacity: 0.55;
}

.action-bar__cancel-text {
  color: $sj-text;
  font-size: dp(14);
  font-weight: 500;
  line-height: 1.2;
}

.action-bar__compare {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: dp(64);
  height: dp(42);
  border-radius: dp(12);
}

.action-bar__compare--active {
  opacity: 0.45;
}

.action-bar__compare-text {
  margin-top: dp(2);
  color: $sj-text-secondary;
  font-size: dp(10);
  line-height: 1.2;
}

.action-bar__save {
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(120);
  height: dp(44);
  background: $sj-accent;
  border-radius: dp($sj-radius-pill);
  box-shadow: 0 dp(6) dp(16) rgba(255, 92, 77, 0.28);
  transition: background 0.16s ease, transform 0.16s ease;
}

.action-bar__save--hover {
  background: $sj-accent-pressed;
  transform: scale(0.98);
}

.action-bar__save-text {
  color: $sj-white;
  font-size: dp(15);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.4px;
}
</style>
