<template>
  <view class="panel">
    <view class="panel__head">
      <text class="panel__title">刷子</text>
      <text
        class="panel__reset"
        hover-class="panel__reset--hover"
        @tap="editor.resetTool('brush')"
      >
        重置
      </text>
    </view>

    <view class="panel__chips">
      <AppChip
        class="panel__chip"
        size="small"
        label="画笔"
        :active="editor.brushMode === 'draw'"
        @click="editor.setBrushMode('draw')"
      />
      <AppChip
        class="panel__chip"
        size="small"
        label="橡皮"
        :active="editor.brushMode === 'erase'"
        @click="editor.setBrushMode('erase')"
      />
      <view class="panel__divider" />
      <AppChip
        class="panel__chip"
        size="small"
        label="大小"
        :active="activeSetting === 'size'"
        @click="activeSetting = 'size'"
      />
      <AppChip
        class="panel__chip"
        size="small"
        label="透明度"
        :active="activeSetting === 'opacity'"
        @click="activeSetting = 'opacity'"
      />
    </view>

    <view class="brush-panel__field">
      <SliderField
        :label="activeSetting === 'size' ? '笔刷大小' : '不透明度'"
        :model-value="activeSetting === 'size' ? editor.brushSize : editor.brushOpacity"
        :min="activeSetting === 'size' ? 4 : 10"
        :max="activeSetting === 'size' ? 80 : 100"
        :step="1"
        :display="activeSetting === 'size' ? `${editor.brushSize}px` : `${editor.brushOpacity}%`"
        compact
        @update:model-value="onSettingChange"
      />
    </view>

    <view class="brush-panel__colors" :class="{ 'brush-panel__colors--disabled': editor.brushMode === 'erase' }">
      <text class="brush-panel__colors-label">颜色</text>
      <view
        v-for="color in BRUSH_COLORS"
        :key="color"
        class="swatch"
        :class="{ 'swatch--light': color === '#FFFFFF' }"
        :style="{
          backgroundColor: color,
          boxShadow: editor.brushColor === color ? `0 0 0 ${toRpx(2)} ${color === '#FFFFFF' ? '#1F1F23' : '#FF5C4D'}` : 'none',
        }"
        @tap="onPickColor(color)"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppChip from '@/shared/components/AppChip.vue'
import SliderField from '@/shared/components/SliderField.vue'
import { toRpx } from '@/shared/utils/format'
import { BRUSH_COLORS } from '../../constants'
import { useEditor } from '../../useEditor'

const editor = useEditor()
const activeSetting = ref<'size' | 'opacity'>('size')

function onSettingChange(value: number): void {
  if (activeSetting.value === 'size') {
    editor.setBrushSize(value)
    return
  }
  editor.setBrushOpacity(value)
}

function onPickColor(color: string): void {
  if (editor.brushMode === 'erase') return
  editor.setBrushColor(color)
}
</script>

<style lang="scss" scoped>
@import './panel.scss';

.brush-panel__field {
  margin-top: dp(1);
}

.brush-panel__colors {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: dp(2);
  transition: opacity 0.16s ease;
}

.brush-panel__colors--disabled {
  opacity: 0.35;
}

.brush-panel__colors-label {
  margin-right: dp(10);
  color: $sj-text-weak;
  font-size: dp(11);
  line-height: 1.2;
}

.swatch {
  width: dp(22);
  height: dp(22);
  margin-right: dp(8);
  border-radius: 50%;
}

.swatch:last-child {
  margin-right: 0;
}

.swatch--light {
  border: 1px solid #E3E3E8;
  box-sizing: border-box;
}
</style>
