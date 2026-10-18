<template>
  <view class="tool-panel">
    <view :key="editor.activeTool" class="tool-panel__inner">
      <AiPanel v-if="editor.activeTool === 'ai'" />
      <CropPanel v-else-if="editor.activeTool === 'crop'" />
      <AdjustPanel v-else-if="editor.activeTool === 'adjust'" />
      <TextPanel v-else-if="editor.activeTool === 'text'" />
      <StickerPanel v-else-if="editor.activeTool === 'sticker'" />
      <BrushPanel v-else />
    </view>
  </view>
</template>

<script setup lang="ts">
import AdjustPanel from './panels/AdjustPanel.vue'
import AiPanel from './panels/AiPanel.vue'
import BrushPanel from './panels/BrushPanel.vue'
import CropPanel from './panels/CropPanel.vue'
import StickerPanel from './panels/StickerPanel.vue'
import TextPanel from './panels/TextPanel.vue'
import { useEditor } from '../useEditor'

const editor = useEditor()
</script>

<style lang="scss" scoped>
.tool-panel {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: $sj-surface;
}

.tool-panel__inner {
  width: 100%;
  height: 100%;
  animation: panel-in 0.18s ease both;
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(6rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
