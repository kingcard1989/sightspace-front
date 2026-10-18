<template>
  <view class="panel">
    <view class="panel__head">
      <text class="panel__title">裁剪与旋转</text>
      <text
        class="panel__reset"
        hover-class="panel__reset--hover"
        @tap="editor.resetTool('crop')"
      >
        重置
      </text>
    </view>

    <view class="panel__chips">
      <AppChip
        v-for="ratio in CROP_RATIOS"
        :key="ratio.key"
        class="panel__chip"
        size="small"
        :label="ratio.label"
        :active="editor.cropRatio === ratio.key"
        @click="editor.setCropRatio(ratio.key)"
      />
    </view>

    <view class="crop-panel__actions">
      <view
        class="crop-action"
        hover-class="crop-action--hover"
        @tap="editor.rotate()"
      >
        <AppIcon name="rotate-ccw-dark" :size="18" />
        <text class="crop-action__label">左转</text>
      </view>
      <view
        class="crop-action"
        hover-class="crop-action--hover"
        @tap="editor.rotate()"
      >
        <AppIcon name="rotate-cw-dark" :size="18" />
        <text class="crop-action__label">右转</text>
      </view>
      <view
        class="crop-action"
        hover-class="crop-action--hover"
        @tap="editor.flip()"
      >
        <AppIcon name="flip-horizontal-dark" :size="18" />
        <text class="crop-action__label">翻转</text>
      </view>
    </view>

    <text class="panel__hint">旋转与翻转仅作用于预览，保存功能后续接入。</text>
  </view>
</template>

<script setup lang="ts">
import AppChip from '@/shared/components/AppChip.vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { CROP_RATIOS } from '../../constants'
import { useEditor } from '../../useEditor'

const editor = useEditor()
</script>

<style lang="scss" scoped>
@import './panel.scss';

.crop-panel__actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: dp(10);
}

.crop-action {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: dp(40);
  margin-right: dp(8);
  background: $sj-bg;
  border-radius: dp(12);
}

.crop-action:last-child {
  margin-right: 0;
}

.crop-action--hover {
  background: $sj-surface-muted;
}

.crop-action__label {
  margin-left: dp(5);
  color: $sj-text;
  font-size: dp(12);
  font-weight: 500;
  line-height: 1.2;
}
</style>
