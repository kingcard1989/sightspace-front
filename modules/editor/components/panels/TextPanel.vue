<template>
  <view class="panel">
    <view class="panel__head">
      <text class="panel__title">文字</text>
      <text
        class="panel__reset"
        hover-class="panel__reset--hover"
        @tap="editor.resetTool('text')"
      >
        重置
      </text>
    </view>

    <AppInput
      compact
      :model-value="editor.textContent"
      placeholder="输入文字，实时预览"
      placeholder-style="color: #B5B5BE; font-size: 14px;"
      :maxlength="24"
      clearable
      @update:model-value="editor.setText"
    />

    <view class="text-panel__size">
      <SliderField
        label="字号"
        :model-value="editor.textSize"
        :min="12"
        :max="64"
        :step="1"
        :display="`${editor.textSize}px`"
        compact
        @update:model-value="editor.setTextSize"
      />
    </view>

    <view class="text-panel__style">
      <view class="text-panel__colors">
        <view
          v-for="color in TEXT_COLORS"
          :key="color"
          class="swatch"
          :class="{ 'swatch--light': color === '#FFFFFF' }"
          :style="{ backgroundColor: color, boxShadow: editor.textColor === color ? `0 0 0 ${toRpx(2)} ${color === '#FFFFFF' ? '#1F1F23' : '#FF5C4D'}` : 'none' }"
          @tap="editor.setTextColor(color)"
        />
      </view>

      <view class="text-panel__align">
        <text class="text-panel__align-label">对齐</text>
        <view
          v-for="option in ALIGNS"
          :key="option.key"
          class="align-button"
          :class="{ 'align-button--active': editor.textAlign === option.key }"
          @tap="editor.setTextAlign(option.key)"
        >
          <text class="align-button__text">{{ option.label }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppInput from '@/shared/components/AppInput.vue'
import SliderField from '@/shared/components/SliderField.vue'
import { toRpx } from '@/shared/utils/format'
import { TEXT_COLORS } from '../../constants'
import type { TextAlign } from '../../types'
import { useEditor } from '../../useEditor'

const editor = useEditor()

const ALIGNS: { key: TextAlign; label: string }[] = [
  { key: 'left', label: '左' },
  { key: 'center', label: '中' },
  { key: 'right', label: '右' },
]
</script>

<style lang="scss" scoped>
@import './panel.scss';

.text-panel__size {
  margin-top: dp(1);
}

.text-panel__style {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: dp(2);
}

.text-panel__colors {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.swatch {
  width: dp(22);
  height: dp(22);
  margin-right: dp(8);
  border-radius: 50%;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.swatch:last-child {
  margin-right: 0;
}

.swatch--light {
  border: 1px solid #E3E3E8;
  box-sizing: border-box;
}

.text-panel__align {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.text-panel__align-label {
  margin-right: dp(6);
  color: $sj-text-weak;
  font-size: dp(11);
  line-height: 1.2;
}

.align-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(26);
  height: dp(26);
  margin-left: dp(4);
  background: $sj-bg;
  border-radius: dp(8);
}

.align-button--active {
  background: $sj-text;
}

.align-button__text {
  color: $sj-text-secondary;
  font-size: dp(11);
  font-weight: 500;
  line-height: 1;
}

.align-button--active .align-button__text {
  color: $sj-text-inverse;
}
</style>
