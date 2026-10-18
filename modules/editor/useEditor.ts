import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { clamp } from '@/shared/utils/format'
import {
  ADJUST_OPTIONS,
  AI_DEFAULT_STRENGTH,
  AI_PRESETS,
  AI_REGION_LIMIT,
  AI_RESTORE_KEY,
  BRUSH_DEFAULT_OPACITY,
  BRUSH_DEFAULT_SIZE,
  TEXT_DEFAULT_SIZE,
} from './constants'
import { buildAdjustFilter, buildPresetFilter } from './filters'
import type {
  AdjustKey,
  AiPhase,
  AiRegion,
  BrushMode,
  CropRatio,
  EditorTool,
  TextAlign,
} from './types'

export interface AiImageInput {
  path: string
  name: string
}

export const useEditor = defineStore('editor', () => {
  const activeTool = ref<EditorTool>('ai')
  const comparing = ref(false)
  const previewing = ref(false)

  // AI 滤镜 / 语义区域
  const aiImagePath = ref('')
  const aiImageName = ref('')
  const aiImageToken = ref(0)
  const aiRetryToken = ref(0)
  const aiPhase = ref<AiPhase>('empty')
  const aiStageText = ref('')
  const aiError = ref('')
  const aiRegions = ref<AiRegion[]>([])
  const selectedRegion = ref<number | null>(null)
  const fullStyle = ref('')
  const regionStyles = reactive<Record<string, string>>({})
  const aiStrength = ref(AI_DEFAULT_STRENGTH)

  // 调色
  const adjustments = reactive({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
  })
  const activeAdjustment = ref<AdjustKey>('brightness')

  // 裁剪
  const cropRatio = ref<CropRatio>('free')
  const rotation = ref(0)
  const flipX = ref(false)

  // 文字
  const textContent = ref('')
  const textSize = ref(TEXT_DEFAULT_SIZE)
  const textColor = ref('#FFFFFF')
  const textAlign = ref<TextAlign>('center')

  // 贴纸
  const sticker = ref('')

  // 刷子
  const brushMode = ref<BrushMode>('draw')
  const brushSize = ref(BRUSH_DEFAULT_SIZE)
  const brushOpacity = ref(BRUSH_DEFAULT_OPACITY)
  const brushColor = ref('#FF5C4D')

  const hasImage = computed(() => aiImagePath.value.length > 0)
  const aiReady = computed(() => aiPhase.value === 'ready')
  const showAiMask = computed(
    () =>
      activeTool.value === 'ai' &&
      !comparing.value &&
      !previewing.value &&
      aiPhase.value === 'ready',
  )

  const activeStyleKey = computed(() => {
    if (selectedRegion.value === null) return fullStyle.value || AI_RESTORE_KEY
    return regionStyles[String(selectedRegion.value)] || AI_RESTORE_KEY
  })

  const previewPresets = computed(() =>
    AI_PRESETS.map((preset) => ({
      ...preset,
      cssFilter: buildPresetFilter(preset.recipe, 100),
    })),
  )

  const visibleRegions = computed(() => {
    const top = aiRegions.value.slice(0, AI_REGION_LIMIT)
    const id = selectedRegion.value
    if (id === null || top.some((region: AiRegion) => region.id === id)) return top
    const current = aiRegions.value.find((region: AiRegion) => region.id === id)
    return current ? [current, ...top] : top
  })

  const selectedRegionData = computed(() => {
    const id = selectedRegion.value
    if (id === null) return null
    return aiRegions.value.find((region: AiRegion) => region.id === id) || null
  })

  /** 逻辑层 -> renderjs 的轻量渲染指令 */
  const aiRenderPayload = computed(() =>
    JSON.stringify({
      imagePath: aiImagePath.value,
      imageName: aiImageName.value,
      imageToken: aiImageToken.value,
      retryToken: aiRetryToken.value,
      fullStyle: fullStyle.value,
      regionStyles: { ...regionStyles },
      strength: aiStrength.value,
      selectedRegion: selectedRegion.value,
      showMask: showAiMask.value,
      comparing: comparing.value,
      previewing: previewing.value,
      activeTool: activeTool.value,
      rotation: rotation.value,
      flipX: flipX.value,
      restoreKey: AI_RESTORE_KEY,
      presets: AI_PRESETS,
    }),
  )

  const canvasFilter = computed(() => {
    if (comparing.value) return 'none'
    return buildAdjustFilter(adjustments)
  })

  const canvasTransform = computed(
    () => `rotate(${rotation.value}deg) scaleX(${flipX.value ? -1 : 1})`,
  )

  const activeAdjustOption = computed(
    () =>
      ADJUST_OPTIONS.find((option) => option.key === activeAdjustment.value) ||
      ADJUST_OPTIONS[0],
  )

  const activeAdjustValue = computed(() => adjustments[activeAdjustment.value])

  const hasText = computed(() => textContent.value.trim().length > 0)

  function selectTool(tool: EditorTool): void {
    activeTool.value = tool
    if (tool !== 'ai') previewing.value = false
  }

  function selectPreset(key: string): void {
    if (selectedRegion.value === null) {
      fullStyle.value = key === AI_RESTORE_KEY ? '' : key
      return
    }
    const regionKey = String(selectedRegion.value)
    if (key === AI_RESTORE_KEY) {
      delete regionStyles[regionKey]
      return
    }
    regionStyles[regionKey] = key
  }

  function selectRegion(id: number | null): void {
    selectedRegion.value = id === 0 ? null : id
  }

  function setAiStrength(value: number): void {
    aiStrength.value = clamp(Math.round(value), 0, 100)
  }

  function setAiImage(input: AiImageInput): void {
    aiImagePath.value = input.path
    aiImageName.value = input.name
    aiImageToken.value += 1
    aiRetryToken.value = 0
    aiPhase.value = 'loading'
    aiStageText.value = '读取图片…'
    aiError.value = ''
    aiRegions.value = []
    selectedRegion.value = null
    fullStyle.value = ''
    Object.keys(regionStyles).forEach((key) => delete regionStyles[key])
    previewing.value = false
  }

  function retryAiSegmentation(): void {
    if (!aiImagePath.value) return
    aiRetryToken.value += 1
    aiPhase.value = 'loading'
    aiStageText.value = '重新准备 AI 模型…'
    aiError.value = ''
    selectedRegion.value = null
    previewing.value = false
  }

  function setAiPhase(
    phase: 'loading' | 'ready' | 'error' | 'empty',
    text = '',
    error = '',
  ): void {
    aiPhase.value = phase
    if (phase === 'loading') {
      aiStageText.value = text || '处理中…'
      aiError.value = ''
      return
    }
    aiStageText.value = ''
    if (phase === 'error') {
      aiError.value = error || text || 'AI 分割失败'
      return
    }
    aiError.value = ''
  }

  function setAiRegions(regions: AiRegion[]): void {
    aiRegions.value = regions
    selectedRegion.value = null
    aiPhase.value = 'ready'
    aiStageText.value = ''
    aiError.value = ''
  }

  function setPreviewing(value: boolean): void {
    previewing.value = value
    if (value) comparing.value = false
  }

  function selectAdjustment(key: AdjustKey): void {
    activeAdjustment.value = key
  }

  function setAdjustValue(value: number): void {
    const option = activeAdjustOption.value
    adjustments[activeAdjustment.value] = clamp(value, option.min, option.max)
  }

  function setCropRatio(ratio: CropRatio): void {
    cropRatio.value = ratio
  }

  function rotate(): void {
    rotation.value = (rotation.value + 90) % 360
  }

  function flip(): void {
    flipX.value = !flipX.value
  }

  function setText(value: string): void {
    textContent.value = value
  }

  function setTextSize(value: number): void {
    textSize.value = clamp(Math.round(value), 12, 64)
  }

  function setTextColor(color: string): void {
    textColor.value = color
  }

  function setTextAlign(align: TextAlign): void {
    textAlign.value = align
  }

  function toggleSticker(value: string): void {
    sticker.value = sticker.value === value ? '' : value
  }

  function setBrushMode(mode: BrushMode): void {
    brushMode.value = mode
  }

  function setBrushSize(value: number): void {
    brushSize.value = clamp(Math.round(value), 4, 80)
  }

  function setBrushOpacity(value: number): void {
    brushOpacity.value = clamp(Math.round(value), 10, 100)
  }

  function setBrushColor(color: string): void {
    brushColor.value = color
  }

  function setComparing(value: boolean): void {
    comparing.value = value
    if (value) previewing.value = false
  }

  function resetAiStyles(): void {
    fullStyle.value = ''
    Object.keys(regionStyles).forEach((key) => delete regionStyles[key])
    selectedRegion.value = null
    aiStrength.value = AI_DEFAULT_STRENGTH
    previewing.value = false
  }

  function resetTool(tool: EditorTool = activeTool.value): void {
    if (tool === 'crop') {
      cropRatio.value = 'free'
      rotation.value = 0
      flipX.value = false
      return
    }
    if (tool === 'adjust') {
      adjustments.brightness = 0
      adjustments.contrast = 0
      adjustments.saturation = 0
      adjustments.temperature = 0
      activeAdjustment.value = 'brightness'
      return
    }
    if (tool === 'ai') {
      resetAiStyles()
      return
    }
    if (tool === 'text') {
      textContent.value = ''
      textSize.value = TEXT_DEFAULT_SIZE
      textColor.value = '#FFFFFF'
      textAlign.value = 'center'
      return
    }
    if (tool === 'sticker') {
      sticker.value = ''
      return
    }
    brushMode.value = 'draw'
    brushSize.value = BRUSH_DEFAULT_SIZE
    brushOpacity.value = BRUSH_DEFAULT_OPACITY
    brushColor.value = '#FF5C4D'
  }

  function resetAll(): void {
    activeTool.value = 'ai'
    comparing.value = false
    previewing.value = false
    aiImagePath.value = ''
    aiImageName.value = ''
    aiImageToken.value += 1
    aiRetryToken.value = 0
    aiPhase.value = 'empty'
    aiStageText.value = ''
    aiError.value = ''
    aiRegions.value = []
    resetTool('ai')
    resetTool('crop')
    resetTool('adjust')
    resetTool('text')
    resetTool('sticker')
    resetTool('brush')
  }

  return {
    activeTool,
    comparing,
    previewing,
    aiImagePath,
    aiImageName,
    aiImageToken,
    aiRetryToken,
    aiPhase,
    aiStageText,
    aiError,
    aiRegions,
    selectedRegion,
    fullStyle,
    regionStyles,
    aiStrength,
    adjustments,
    activeAdjustment,
    cropRatio,
    rotation,
    flipX,
    textContent,
    textSize,
    textColor,
    textAlign,
    sticker,
    brushMode,
    brushSize,
    brushOpacity,
    brushColor,
    hasImage,
    aiReady,
    showAiMask,
    activeStyleKey,
    previewPresets,
    visibleRegions,
    selectedRegionData,
    aiRenderPayload,
    canvasFilter,
    canvasTransform,
    activeAdjustOption,
    activeAdjustValue,
    hasText,
    selectTool,
    selectPreset,
    selectRegion,
    setAiStrength,
    setAiImage,
    retryAiSegmentation,
    setAiPhase,
    setAiRegions,
    setPreviewing,
    selectAdjustment,
    setAdjustValue,
    setCropRatio,
    rotate,
    flip,
    setText,
    setTextSize,
    setTextColor,
    setTextAlign,
    toggleSticker,
    setBrushMode,
    setBrushSize,
    setBrushOpacity,
    setBrushColor,
    setComparing,
    resetAiStyles,
    resetTool,
    resetAll,
  }
})
