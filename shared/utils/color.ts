import type { Palette } from '@/shared/types/models'
import { hashString } from './format'

/** 与设计稿气质一致的柔和渐变色板 */
export const PALETTES: Palette[] = [
  ['#FFD9D4', '#FFB2A5'],
  ['#DCEBFF', '#A9C9F5'],
  ['#E8E0FF', '#C2B2F2'],
  ['#DDF3E4', '#A8DDBB'],
  ['#FFE9C7', '#F4C87B'],
  ['#F5E6D3', '#D8BBA0'],
  ['#E0F2F1', '#9DD8D4'],
  ['#F3E1E8', '#D8AEC2'],
  ['#E7E9F5', '#B5BCD9'],
  ['#F0EAD6', '#CDBE9A'],
  ['#FFE3D3', '#F2B99A'],
  ['#E3EEF0', '#AFCBD1'],
]

export function paletteFor(seed: string): Palette {
  return PALETTES[hashString(seed) % PALETTES.length]
}

export function paletteAt(index: number): Palette {
  return PALETTES[Math.abs(index) % PALETTES.length]
}

export function gradientOf(palette: Palette, angle = 135): string {
  return `linear-gradient(${angle}deg, ${palette[0]} 0%, ${palette[1]} 100%)`
}

export function initialOf(name: string): string {
  const chars = Array.from((name || '').trim())
  return (chars[0] || '?').toUpperCase()
}
