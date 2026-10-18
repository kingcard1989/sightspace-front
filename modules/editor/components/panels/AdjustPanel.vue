<template>
  <view class="panel">
    <view class="panel__head">
      <text class="panel__title">调色</text>
      <text
        class="panel__reset"
        hover-class="panel__reset--hover"
        @tap="editor.resetTool('adjust')"
      >
        重置
      </text>
    </view>

    <view class="panel__chips">
      <AppChip
        v-for="option in ADJUST_OPTIONS"
        :key="option.key"
        class="panel__chip"
        size="small"
        :label="option.label"
        :active="editor.activeAdjustment === option.key"
        @click="editor.selectAdjustment(option.key)"
      />
    </view>

    <view class="adjust-panel__field">
      <SliderField
        :label="editor.activeAdjustOption.label"
        :model-value="editor.activeAdjustValue"
        :min="editor.activeAdjustOption.min"
        :max="editor.activeAdjustOption.max"
        :step="editor.activeAdjustOption.step"
        show-scale
        compact
        @update:model-value="editor.setAdjustValue"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import AppChip from '@/shared/components/AppChip.vue'
import SliderField from '@/shared/components/SliderField.vue'
import { ADJUST_OPTIONS } from '../../constants'
import { useEditor } from '../../useEditor'

const editor = useEditor()
</script>

<style lang="scss" scoped>
@import './panel.scss';

.adjust-panel__field {
  margin-top: dp(4);
}
</style>
