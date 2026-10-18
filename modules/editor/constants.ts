import type { Palette } from '@/shared/types/models'
import type {
  AdjustOption,
  CropRatioOption,
  EditorPreset,
  EditorTool,
  ToolOption,
} from './types'

export const EDITOR_TOOLS: ToolOption[] = [
  { key: 'crop', label: '裁剪', icon: 'crop-dark' },
  { key: 'adjust', label: '调色', icon: 'sliders-dark' },
  { key: 'ai', label: 'ai滤镜', icon: 'sparkles-dark' },
  { key: 'text', label: '文字', icon: 'type-dark' },
  { key: 'sticker', label: '贴纸', icon: 'sticker-dark' },
  { key: 'brush', label: '刷子', icon: 'brush-dark' },
]

export const CROP_RATIOS: CropRatioOption[] = [
  { key: 'free', label: '自由' },
  { key: '1:1', label: '1:1' },
  { key: '4:5', label: '4:5' },
  { key: '16:9', label: '16:9' },
]

export const ADJUST_OPTIONS: AdjustOption[] = [
  { key: 'brightness', label: '亮度', min: -100, max: 100, step: 1 },
  { key: 'contrast', label: '对比度', min: -100, max: 100, step: 1 },
  { key: 'saturation', label: '饱和度', min: -100, max: 100, step: 1 },
  { key: 'temperature', label: '色温', min: -100, max: 100, step: 1 },
]

export const AI_PRESETS: EditorPreset[] = [
  {
    key: 'warm',
    label: '暖阳',
    palette: ['#FFE3B8', '#E9A15B'],
    recipe: { hueRotate: 8, saturate: 1.25, contrast: 1.05, brightness: 1.08, temperature: 22 },
  },
  {
    key: 'cool',
    label: '冷冽',
    palette: ['#DCEBFF', '#7FA8D9'],
    recipe: { hueRotate: -12, saturate: 1.15, contrast: 1.1, brightness: 1, temperature: -22 },
  },
  {
    key: 'vivid',
    label: '浓郁',
    palette: ['#FFD6A5', '#FF6B6B'],
    recipe: { hueRotate: 0, saturate: 1.55, contrast: 1.2, brightness: 1, temperature: 0 },
  },
  {
    key: 'mono',
    label: '黑白',
    palette: ['#F2F2F2', '#6E6E73'],
    recipe: { hueRotate: 0, saturate: 0, contrast: 1.18, brightness: 1, temperature: 0 },
  },
  {
    key: 'vintage',
    label: '复古',
    palette: ['#EAD8C0', '#9E7B5A'],
    recipe: { hueRotate: -14, saturate: 0.75, contrast: 0.9, brightness: 1.06, temperature: 16, sepia: 0.3 },
  },
  {
    key: 'cyber',
    label: '赛博',
    palette: ['#67E8F9', '#E879B9'],
    recipe: { hueRotate: 48, saturate: 1.6, contrast: 1.28, brightness: 0.95, temperature: -14 },
  },
]

/** “还原”不是滤镜，而是清除当前区域/全图的风格覆盖 */
export const AI_RESTORE_KEY = 'original'
export const AI_RESTORE_PALETTE: Palette = ['#F7F7F8', '#C9C9CF']

export const EDITOR_PALETTE: Palette = ['#EAD8C0', '#B4977B']

export const TEXT_COLORS = ['#FFFFFF', '#1F1F23', '#FF5C4D', '#F6C453', '#7FB3F5']

export const BRUSH_COLORS = ['#FF5C4D', '#1F1F23', '#F6C453', '#67C99A', '#7FB3F5', '#FFFFFF']

export const STICKERS = ['✨', '🌸', '🌿', '☀️', '🫧', '🎞️', '💫', '🖤']

export const AI_DEFAULT_STRENGTH = 80
export const AI_REGION_LIMIT = 12
export const TEXT_DEFAULT_SIZE = 28
export const BRUSH_DEFAULT_SIZE = 24
export const BRUSH_DEFAULT_OPACITY = 80
