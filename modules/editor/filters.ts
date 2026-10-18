import { clamp } from '@/shared/utils/format'
import type { StyleRecipe } from './types'

export interface AdjustValues {
  brightness: number
  contrast: number
  saturation: number
  temperature: number
}

function round(value: number): string {
  return value.toFixed(2)
}

/**
 * 将参考代码1 的风格配方 + 全局强度合成为 CSS filter。
 * strength 0 时完全回到原图，100 时使用配方原值。
 */
export function buildPresetFilter(recipe: StyleRecipe, strength: number): string {
  const t = clamp(strength, 0, 100) / 100

  const sepia = (recipe.sepia || 0) * t
  const saturate = 1 + (recipe.saturate - 1) * t
  const contrast = 1 + (recipe.contrast - 1) * t
  const brightness = 1 + (recipe.brightness - 1) * t
  const hue = recipe.hueRotate * t

  const parts = [
    `saturate(${round(saturate)})`,
    `contrast(${round(contrast)})`,
    `brightness(${round(brightness)})`,
    `hue-rotate(${round(hue)}deg)`,
  ]
  if (sepia > 0) parts.unshift(`sepia(${round(sepia)})`)
  return parts.join(' ')
}

/** 调色滑杆值 -> CSS filter；所有值归零时等同原图 */
export function buildAdjustFilter(values: AdjustValues): string {
  const parts = [
    `brightness(${round(1 + values.brightness / 200)})`,
    `contrast(${round(1 + values.contrast / 200)})`,
    `saturate(${round(1 + values.saturation / 100)})`,
  ]

  if (values.temperature > 0) {
    parts.push(`sepia(${round(values.temperature / 320)})`)
  } else if (values.temperature < 0) {
    parts.push(`hue-rotate(${round(values.temperature / 12)}deg)`)
  }

  return parts.join(' ')
}

/** 暖/冷色温叠加强度（0-1），渲染层用来近似参考代码的 r/b 通道偏移 */
export function temperatureTint(recipe: StyleRecipe, strength: number): {
  color: string
  alpha: number
} | null {
  const t = clamp(strength, 0, 100) / 100
  const temperature = recipe.temperature * t
  if (Math.abs(temperature) < 0.5) return null
  return {
    color: temperature > 0 ? '255, 138, 64' : '64, 138, 255',
    alpha: Math.min(0.24, (Math.abs(temperature) / 100) * 0.32),
  }
}
