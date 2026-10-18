<template>
  <view class="panel ai-panel" :class="{ 'ai-panel--empty': !editor.hasImage }">
    <view class="panel__head ai-panel__head">
      <view class="ai-panel__heading">
        <text class="panel__title ai-panel__title">{{ heading }}</text>
        <text class="ai-panel__meta">{{ meta }}</text>
      </view>
      <view class="ai-panel__actions">
        <text class="panel__reset" hover-class="panel__reset--hover" @tap="pickImage">换图</text>
        <text
          v-if="editor.aiReady"
          class="panel__reset"
          hover-class="panel__reset--hover"
          @tap="editor.setPreviewing(true)"
        >
          预览
        </text>
        <text
          class="panel__reset"
          hover-class="panel__reset--hover"
          @tap="editor.resetTool('ai')"
        >
          重置
        </text>
      </view>
    </view>

    <view class="ai-panel__regions">
      <scroll-view
        v-if="editor.aiReady && editor.visibleRegions.length"
        class="ai-regions"
        scroll-x
        :show-scrollbar="false"
      >
        <view class="ai-regions__row">
          <view
            class="ai-region-chip"
            :class="{ 'ai-region-chip--active': editor.selectedRegion === null }"
            @tap="editor.selectRegion(null)"
          >
            <text class="ai-region-chip__label">全图</text>
          </view>
          <view
            v-for="region in editor.visibleRegions"
            :key="region.id"
            class="ai-region-chip"
            :class="{ 'ai-region-chip--active': editor.selectedRegion === region.id }"
            @tap="editor.selectRegion(region.id)"
          >
            <view class="ai-region-chip__dot" :style="{ backgroundColor: region.color }" />
            <text class="ai-region-chip__label">{{ region.name }}</text>
          </view>
        </view>
      </scroll-view>
      <text v-else class="ai-panel__status">{{ statusHint }}</text>
    </view>

    <view class="ai-strength">
      <text class="ai-strength__label">强度</text>
      <view class="ai-strength__track">
        <AppSlider
          :model-value="editor.aiStrength"
          :min="0"
          :max="100"
          :step="1"
          compact
          :disabled="!editor.hasImage"
          @update:model-value="editor.setAiStrength"
        />
      </view>
      <text class="ai-strength__value">{{ editor.aiStrength }}%</text>
    </view>

    <scroll-view class="ai-panel__presets" scroll-x :show-scrollbar="false">
      <view class="ai-presets-row">
        <view class="ai-preset" @tap="onRestoreTap">
          <view
            class="ai-preset__thumb"
            :class="{ 'ai-preset__thumb--active': isRestoreActive }"
          >
            <view
              class="ai-preset__art ai-preset__art--restore"
              :style="{ background: restoreGradient }"
            >
              <AppIcon name="refresh-accent" :size="15" />
            </view>
          </view>
          <text
            class="ai-preset__label"
            :class="{ 'ai-preset__label--active': isRestoreActive }"
          >
            还原
          </text>
        </view>

        <view
          v-for="preset in editor.previewPresets"
          :key="preset.key"
          class="ai-preset"
          @tap="onPresetTap(preset.key)"
        >
          <view
            class="ai-preset__thumb"
            :class="{ 'ai-preset__thumb--active': editor.activeStyleKey === preset.key }"
          >
            <view
              class="ai-preset__art"
              :style="{
                background: gradientOf(preset.palette),
                filter: preset.cssFilter,
              }"
            />
          </view>
          <text
            class="ai-preset__label"
            :class="{ 'ai-preset__label--active': editor.activeStyleKey === preset.key }"
          >
            {{ preset.label }}
          </text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import AppSlider from '@/shared/components/AppSlider.vue'
import { gradientOf } from '@/shared/utils/color'
import { showToast } from '@/shared/utils/toast'
import { AI_RESTORE_KEY, AI_RESTORE_PALETTE } from '../../constants'
import { useEditor } from '../../useEditor'
import { useEditorImage } from '../../useEditorImage'

const editor = useEditor()
const { pickImage } = useEditorImage()

const isRestoreActive = computed(() => editor.activeStyleKey === AI_RESTORE_KEY)
const restoreGradient = gradientOf(AI_RESTORE_PALETTE)

const heading = computed(() => {
  if (!editor.hasImage) return 'AI 区域滤镜'
  if (!editor.aiReady) return editor.aiPhase === 'error' ? '识别失败' : 'AI 区域滤镜'
  if (editor.selectedRegionData) {
    return `${editor.selectedRegionData.name} · ${Math.round(editor.selectedRegionData.ratio * 100)}%`
  }
  return '全图'
})

const meta = computed(() => {
  if (!editor.hasImage) return '先选择照片'
  if (editor.aiPhase === 'loading') return '识别中…'
  if (editor.aiPhase === 'error') return '需要重试'
  return `${editor.aiRegions.length} 个区域`
})

const statusHint = computed(() => {
  if (!editor.hasImage) return '选择照片后自动识别画面区域'
  if (editor.aiPhase === 'loading') return '正在识别画面区域…'
  if (editor.aiPhase === 'error') return '识别失败，请在画布上重试'
  if (!editor.visibleRegions.length) return '未识别到可交互区域，可使用全图滤镜'
  return ''
})

function onPresetTap(key: string): void {
  if (!editor.hasImage) {
    showToast('请先选择一张照片')
    return
  }
  editor.selectPreset(key)
}

function onRestoreTap(): void {
  onPresetTap(AI_RESTORE_KEY)
}
</script>

<style lang="scss" scoped>
@import './panel.scss';

.ai-panel {
  padding-top: dp(0);
  padding-bottom: dp(6);
}

.ai-panel__head {
  height: dp(22);
}

.ai-panel__heading {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  min-width: 0;
}

.ai-panel__title {
  max-width: dp(150);
  overflow: hidden;
  font-size: dp(13);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-panel__meta {
  margin-left: dp(6);
  color: $sj-text-weak;
  font-size: dp(10);
  line-height: 1.2;
  white-space: nowrap;
}

.ai-panel__actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
}

.ai-panel__actions .panel__reset {
  padding-left: dp(10);
}

.ai-panel__regions {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  height: dp(28);
  margin-top: dp(2);
  overflow: hidden;
}

.ai-panel__status {
  color: $sj-text-weak;
  font-size: dp(10);
  line-height: 1.3;
}

.ai-regions {
  width: 100%;
  white-space: nowrap;
}

.ai-regions__row {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
}

.ai-region-chip {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  height: dp(24);
  margin-right: dp(6);
  padding: 0 dp(9);
  background: $sj-bg;
  border: 1px solid transparent;
  border-radius: dp($sj-radius-pill);
  box-sizing: border-box;
}

.ai-region-chip--active {
  background: $sj-accent-wash;
  border-color: $sj-accent;
}

.ai-region-chip__dot {
  width: dp(6);
  height: dp(6);
  margin-right: dp(4);
  border-radius: 50%;
}

.ai-region-chip__label {
  color: $sj-text-secondary;
  font-size: dp(10);
  line-height: 1.2;
}

.ai-region-chip--active .ai-region-chip__label {
  color: $sj-accent;
  font-weight: 500;
}

.ai-strength {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  height: dp(26);
  margin-top: dp(2);
}

.ai-strength__label {
  flex-shrink: 0;
  width: dp(28);
  color: $sj-text;
  font-size: dp(11);
  font-weight: 500;
  line-height: 1.2;
}

.ai-strength__track {
  flex: 1;
  min-width: 0;
}

.ai-strength__track :deep(.slider) {
  padding: 0;
}

.ai-strength__value {
  flex-shrink: 0;
  width: dp(34);
  color: $sj-text-secondary;
  font-size: dp(11);
  line-height: 1.2;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ai-panel__presets {
  width: 100%;
  margin-top: dp(2);
  white-space: nowrap;
}

.ai-presets-row {
  display: inline-flex;
  flex-direction: row;
  align-items: flex-start;
}

.ai-preset {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: dp(40);
  margin-right: dp(7);
}

.ai-preset:last-child {
  margin-right: 0;
}

.ai-preset__thumb {
  width: dp(38);
  height: dp(38);
  overflow: hidden;
  border-radius: dp(10);
  box-sizing: border-box;
  transition: box-shadow 0.16s ease;
}

.ai-preset__thumb--active {
  box-shadow: 0 0 0 dp(2) $sj-accent;
}

.ai-preset__art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  transform: scale(1.04);
}

.ai-preset__art--restore {
  transform: none;
}

.ai-preset__label {
  margin-top: dp(3);
  color: $sj-text-secondary;
  font-size: dp(10);
  line-height: 1.25;
}

.ai-preset__label--active {
  color: $sj-accent;
  font-weight: 500;
}

.ai-panel--empty .ai-panel__presets {
  opacity: 0.45;
}
</style>
