import { DESIGN_WIDTH } from '@/config'

/** 设计稿 px 转 rpx 字符串，供动态 style 使用 */
export function toRpx(px: number): string {
  return `${(px * 750) / DESIGN_WIDTH}rpx`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}

/** 128 -> 128；2400 -> 2.4k；12000 -> 1.2w */
export function formatCount(value: number): string {
  if (value >= 10000) {
    return `${trimZero(value / 10000)}w`
  }
  if (value >= 1000) {
    return `${trimZero(value / 1000)}k`
  }
  return String(value)
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}

/** 简单字符串哈希，用于稳定生成占位配色 */
export function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
