<template>
  <view class="editor-canvas" :class="{ 'editor-canvas--preview': editor.previewing }">
    <view class="editor-canvas__media">
      <view
        class="editor-canvas__visual"
        :style="{ transform: editor.canvasTransform }"
      >
        <view class="editor-canvas__photo" :style="{ filter: editor.canvasFilter }">
          <AiCanvasStage :payload="editor.aiRenderPayload" />
        </view>

        <view
          v-if="showOverlays && editor.hasText"
          class="editor-canvas__text-wrap"
          :style="{ textAlign: editor.textAlign }"
        >
          <text
            class="editor-canvas__text"
            :style="{ color: editor.textColor, fontSize: toRpx(editor.textSize) }"
          >
            {{ editor.textContent }}
          </text>
        </view>

        <view v-if="showOverlays && editor.sticker" class="editor-canvas__sticker">
          <text class="editor-canvas__sticker-emoji">{{ editor.sticker }}</text>
        </view>
      </view>

      <!-- 空态：选择图片 -->
      <view v-if="!editor.hasImage" class="editor-empty" @tap="pickImage">
        <view class="editor-empty__icon">
          <AppIcon name="image-muted" :size="30" />
        </view>
        <text class="editor-empty__title">
          {{ picking ? '正在打开相册…' : '点击选择一张照片' }}
        </text>
        <text class="editor-empty__hint">
          自动识别天空、人物、建筑等区域，再为每个区域单独上色
        </text>
        <view class="editor-empty__button" hover-class="editor-empty__button--hover">
          <text class="editor-empty__button-text">从相册选择</text>
        </view>
      </view>

      <!-- AI 处理中 -->
      <view
        v-if="editor.hasImage && editor.aiPhase === 'loading'"
        class="ai-overlay ai-overlay--loading"
      >
        <view class="ai-spinner" />
        <text class="ai-overlay__title">{{ editor.aiStageText || 'AI 处理中…' }}</text>
        <text class="ai-overlay__hint">首次加载模型约需数秒，请保持应用在前台</text>
      </view>

      <!-- AI 失败 -->
      <view
        v-else-if="editor.hasImage && editor.aiPhase === 'error'"
        class="ai-overlay ai-overlay--error"
      >
        <view class="ai-error__icon">
          <AppIcon name="alert-circle-accent" :size="28" />
        </view>
        <text class="ai-overlay__title">AI 分割失败</text>
        <text class="ai-overlay__error">{{ editor.aiError }}</text>
        <view class="ai-error__actions">
          <view class="ai-error__button ai-error__button--primary" @tap.stop="retrySegmentation">
            <text class="ai-error__button-text">重试</text>
          </view>
          <view class="ai-error__button" @tap.stop="pickImage">
            <text class="ai-error__button-text ai-error__button-text--dark">重新选图</text>
          </view>
          <view class="ai-error__button" @tap.stop="openDiagnostics">
            <text class="ai-error__button-text ai-error__button-text--dark">自检</text>
          </view>
        </view>
      </view>

      <view v-if="cropActive" class="editor-canvas__crop">
        <view
          class="crop-frame"
          :class="{ 'crop-frame--free': editor.cropRatio === 'free' }"
          :style="frameStyle"
        >
          <view class="crop-grid crop-grid--v1" />
          <view class="crop-grid crop-grid--v2" />
          <view class="crop-grid crop-grid--h1" />
          <view class="crop-grid crop-grid--h2" />

          <view class="crop-corner crop-corner--tl" />
          <view class="crop-corner crop-corner--tr" />
          <view class="crop-corner crop-corner--bl" />
          <view class="crop-corner crop-corner--br" />
        </view>
      </view>

      <view v-if="editor.comparing" class="editor-canvas__badge">
        <text class="editor-canvas__badge-text">原图</text>
      </view>

      <view
        v-if="editor.previewing"
        class="preview-exit"
        hover-class="preview-exit--hover"
        @tap.stop="editor.setPreviewing(false)"
      >
        <AppIcon name="close-white" :size="14" />
        <text class="preview-exit__text">退出预览</text>
      </view>

      <view v-if="editor.previewing" class="preview-hint">
        <text class="preview-hint__text">轻触画面退出 · 双击放大</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onMounted,
  ref,
  watch,
} from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useSystemLayout } from '@/shared/composables/useSystemLayout'
import { toRpx } from '@/shared/utils/format'
import type { CropRatio } from '../types'
import { useEditor } from '../useEditor'
import { useEditorImage } from '../useEditorImage'
import AiCanvasStage from './AiCanvasStage.vue'

const editor = useEditor()
const { pickImage, retrySegmentation, picking } = useEditorImage()
const instance = getCurrentInstance()
const { windowWidth } = useSystemLayout()

const mediaWidth = ref(0)
const mediaHeight = ref(0)

const RATIO_VALUE: Record<CropRatio, number | null> = {
  free: null,
  '1:1': 1,
  '4:5': 4 / 5,
  '16:9': 16 / 9,
}

const cropActive = computed(
  () =>
    editor.activeTool === 'crop' &&
    !editor.comparing &&
    !editor.previewing &&
    editor.hasImage,
)

const showOverlays = computed(() => !editor.comparing)

const frameStyle = computed<Record<string, string>>(() => {
  const ratio = RATIO_VALUE[editor.cropRatio]
  if (!ratio) {
    return { width: '100%', height: '100%' }
  }

  if (!mediaWidth.value || !mediaHeight.value) {
    return { width: '86%', height: '86%' }
  }

  const maxWidth = mediaWidth.value * 0.86
  const maxHeight = mediaHeight.value * 0.86
  let width = Math.min(maxWidth, maxHeight * ratio)
  let height = width / ratio

  if (height > maxHeight) {
    height = maxHeight
    width = height * ratio
  }

  return {
    width: `${Math.round(width)}px`,
    height: `${Math.round(height)}px`,
  }
})

function measureMedia(): void {
  try {
    uni
      .createSelectorQuery()
      .in(instance?.proxy)
      .select('.editor-canvas__media')
      .boundingClientRect((rect: any) => {
        if (rect && rect.width) {
          mediaWidth.value = rect.width
          mediaHeight.value = rect.height
        }
      })
      .exec()
  } catch {
    // 测量失败时使用百分比兜底
  }
}

function openDiagnostics(): void {
  uni.navigateTo({ url: '/pages/editor/ai-test' })
}

onMounted(() => {
  nextTick(measureMedia)
})

watch(windowWidth, () => {
  nextTick(measureMedia)
})

watch(
  () => editor.previewing,
  () => {
    nextTick(measureMedia)
  },
)
</script>

<style lang="scss" scoped>
.editor-canvas {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: dp(8) dp(16) dp(12);
  background: $sj-canvas;
  transition: padding 0.2s ease;
}

.editor-canvas--preview {
  padding: 0;
}

.editor-canvas__media {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  background: #1B1B1E;
  border-radius: dp(14);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  transition: border-radius 0.2s ease;
}

.editor-canvas--preview .editor-canvas__media {
  border-radius: 0;
}

.editor-canvas__visual {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: transform 0.25s ease;
}

.editor-canvas__photo {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: filter 0.2s ease;
}

.editor-canvas__text-wrap {
  position: absolute;
  top: 40%;
  left: 10%;
  right: 10%;
  pointer-events: none;
}

.editor-canvas__text {
  display: block;
  width: 100%;
  font-weight: 600;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.32);
}

.editor-canvas__sticker {
  position: absolute;
  right: 12%;
  bottom: 12%;
  pointer-events: none;
}

.editor-canvas__sticker-emoji {
  font-size: dp(52);
  line-height: 1;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.24));
}

/* ---------- 空态 ---------- */
.editor-empty {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0 dp(34);
  box-sizing: border-box;
}

.editor-empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(64);
  height: dp(64);
  margin-bottom: dp(14);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}

.editor-empty__title {
  color: $sj-white;
  font-size: dp(16);
  font-weight: 600;
  line-height: 1.4;
}

.editor-empty__hint {
  max-width: dp(250);
  margin-top: dp(8);
  color: rgba(255, 255, 255, 0.42);
  font-size: dp(11);
  line-height: 1.6;
  text-align: center;
}

.editor-empty__button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: dp(40);
  margin-top: dp(18);
  padding: 0 dp(26);
  background: $sj-accent;
  border-radius: dp($sj-radius-pill);
  box-shadow: 0 dp(8) dp(20) rgba(255, 92, 77, 0.3);
}

.editor-empty__button--hover {
  background: $sj-accent-pressed;
}

.editor-empty__button-text {
  color: $sj-white;
  font-size: dp(13);
  font-weight: 600;
  line-height: 1.2;
}

/* ---------- AI 状态 ---------- */
.ai-overlay {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0 dp(26);
  background: rgba(14, 14, 17, 0.72);
  box-sizing: border-box;
}

.ai-overlay--error {
  background: rgba(14, 14, 17, 0.82);
}

.ai-spinner {
  width: dp(30);
  height: dp(30);
  margin-bottom: dp(14);
  border: dp(2) solid rgba(255, 255, 255, 0.14);
  border-top-color: $sj-accent;
  border-radius: 50%;
  animation: ai-spin 0.85s linear infinite;
}

.ai-overlay__title {
  color: $sj-white;
  font-size: dp(13);
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
}

.ai-overlay__hint {
  margin-top: dp(6);
  color: rgba(255, 255, 255, 0.38);
  font-size: dp(10);
  line-height: 1.5;
  text-align: center;
}

.ai-error__icon {
  margin-bottom: dp(8);
}

.ai-overlay__error {
  display: -webkit-box;
  max-width: dp(280);
  margin-top: dp(6);
  overflow: hidden;
  color: rgba(255, 255, 255, 0.4);
  font-size: dp(10);
  line-height: 1.5;
  text-align: center;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.ai-error__actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: dp(16);
}

.ai-error__button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: dp(34);
  margin: 0 dp(4);
  padding: 0 dp(14);
  background: rgba(255, 255, 255, 0.08);
  border-radius: dp(10);
}

.ai-error__button--primary {
  background: $sj-accent;
}

.ai-error__button-text {
  color: $sj-white;
  font-size: dp(12);
  font-weight: 500;
  line-height: 1.2;
}

.ai-error__button-text--dark {
  color: rgba(255, 255, 255, 0.72);
}

@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---------- 预览 ---------- */
.preview-exit {
  position: absolute;
  top: dp(12);
  right: dp(12);
  display: flex;
  flex-direction: row;
  align-items: center;
  height: dp(30);
  padding: 0 dp(12);
  background: rgba(18, 18, 20, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: dp($sj-radius-pill);
  backdrop-filter: blur(8px);
}

.preview-exit--hover {
  opacity: 0.7;
}

.preview-exit__text {
  margin-left: dp(4);
  color: $sj-white;
  font-size: dp(11);
  line-height: 1.2;
}

.preview-hint {
  position: absolute;
  left: 50%;
  bottom: dp(16);
  padding: dp(4) dp(10);
  background: rgba(18, 18, 20, 0.45);
  border-radius: dp($sj-radius-pill);
  transform: translateX(-50%);
  pointer-events: none;
}

.preview-hint__text {
  color: rgba(255, 255, 255, 0.55);
  font-size: dp(10);
  line-height: 1.3;
}

/* ---------- 裁剪 ---------- */
.editor-canvas__crop {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.crop-frame {
  position: relative;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.46);
}

.crop-frame--free {
  box-shadow: none;
}

.crop-grid {
  position: absolute;
  background: rgba(255, 255, 255, 0.36);
}

.crop-grid--v1,
.crop-grid--v2 {
  top: 0;
  width: 1px;
  height: 100%;
}

.crop-grid--v1 {
  left: 33.333%;
}

.crop-grid--v2 {
  left: 66.666%;
}

.crop-grid--h1,
.crop-grid--h2 {
  left: 0;
  width: 100%;
  height: 1px;
}

.crop-grid--h1 {
  top: 33.333%;
}

.crop-grid--h2 {
  top: 66.666%;
}

.crop-corner {
  position: absolute;
  width: dp(18);
  height: dp(18);
  border-color: $sj-white;
  border-style: solid;
}

.crop-corner--tl {
  top: dp(-1);
  left: dp(-1);
  border-width: dp(2) 0 0 dp(2);
}

.crop-corner--tr {
  top: dp(-1);
  right: dp(-1);
  border-width: dp(2) dp(2) 0 0;
}

.crop-corner--bl {
  bottom: dp(-1);
  left: dp(-1);
  border-width: 0 0 dp(2) dp(2);
}

.crop-corner--br {
  right: dp(-1);
  bottom: dp(-1);
  border-width: 0 dp(2) dp(2) 0;
}

.editor-canvas__badge {
  position: absolute;
  top: dp(12);
  left: 50%;
  padding: dp(4) dp(10);
  background: rgba(18, 18, 20, 0.6);
  border-radius: dp($sj-radius-pill);
  transform: translateX(-50%);
}

.editor-canvas__badge-text {
  color: $sj-white;
  font-size: dp(11);
  line-height: 1.2;
}
</style>
