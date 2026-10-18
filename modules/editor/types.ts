import type { Palette } from '@/shared/types/models'

export type EditorTool = 'crop' | 'adjust' | 'ai' | 'text' | 'sticker' | 'brush'

export type CropRatio = 'free' | '1:1' | '4:5' | '16:9'

export type AdjustKey = 'brightness' | 'contrast' | 'saturation' | 'temperature'

export type TextAlign = 'left' | 'center' | 'right'

export type BrushMode = 'draw' | 'erase'

export interface ToolOption {
  key: EditorTool
  label: string
  icon: string
}

export interface CropRatioOption {
  key: CropRatio
  label: string
}

export interface AdjustOption {
  key: AdjustKey
  label: string
  min: number
  max: number
  step: number
}

/** 参考代码1 的风格配方；强度在渲染时按比例插值 */
export interface StyleRecipe {
  hueRotate: number
  saturate: number
  contrast: number
  brightness: number
  /** 负值偏冷、正值偏暖，单位与参考代码一致 */
  temperature: number
  /** 做旧程度，仅复古风格使用 */
  sepia?: number
}

export interface EditorPreset {
  key: string
  label: string
  palette: Palette
  recipe: StyleRecipe
}

/** 分割后的语义区域（面积按像素占比） */
export interface AiRegion {
  id: number
  name: string
  color: string
  count: number
  ratio: number
}

export type AiPhase = 'empty' | 'loading' | 'ready' | 'error'
