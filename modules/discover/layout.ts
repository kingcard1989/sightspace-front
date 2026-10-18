import {
  MASONRY_COLUMNS,
  MASONRY_GAP,
  MASONRY_PADDING_BOTTOM,
  MASONRY_PADDING_TOP,
  MASONRY_PADDING_X,
  WIDE_RATIO,
} from './constants'

export interface MasonryInput {
  id: string
  width: number
  height: number
  colSpan?: 1 | 2
}

export interface MasonryPosition<T extends MasonryInput> {
  item: T
  x: number
  y: number
  width: number
  height: number
  span: number
}

export interface MasonryLayoutOptions {
  containerWidth: number
  columns?: number
  gap?: number
  paddingX?: number
  paddingTop?: number
  paddingBottom?: number
  wideRatio?: number
  maxSpan?: number
}

export interface MasonryLayoutResult<T extends MasonryInput> {
  positions: MasonryPosition<T>[]
  height: number
  columnWidth: number
}

/**
 * 混合宽度瀑布流布局（纯函数）。
 *
 * - 3 列，1 列或 2 列宽；
 * - 每次把新卡片放到当前最矮的列（2 列宽时选择“最高点最低”的相邻两列）；
 * - 返回绝对定位坐标与容器总高度。
 *
 * 布局完全由数据（宽高、colSpan）驱动，不写死行列。
 */
export function layoutMasonry<T extends MasonryInput>(
  items: T[],
  options: MasonryLayoutOptions,
): MasonryLayoutResult<T> {
  const columns = Math.max(1, options.columns ?? MASONRY_COLUMNS)
  const gap = options.gap ?? MASONRY_GAP
  const paddingX = options.paddingX ?? MASONRY_PADDING_X
  const paddingTop = options.paddingTop ?? MASONRY_PADDING_TOP
  const paddingBottom = options.paddingBottom ?? MASONRY_PADDING_BOTTOM
  const wideRatio = options.wideRatio ?? WIDE_RATIO
  const maxSpan = Math.max(1, Math.min(options.maxSpan ?? 2, columns))

  const containerWidth = Math.max(0, options.containerWidth)
  const contentWidth = Math.max(0, containerWidth - paddingX * 2)
  const columnWidth = Math.max(
    0,
    (contentWidth - gap * (columns - 1)) / columns,
  )

  const heights = new Array<number>(columns).fill(paddingTop)
  const positions: MasonryPosition<T>[] = []

  for (const item of items) {
    const ratio =
      item.width > 0 && item.height > 0 ? item.width / item.height : 1
    const rawSpan = item.colSpan ?? (ratio >= wideRatio ? 2 : 1)
    const span = Math.max(1, Math.min(rawSpan, maxSpan))
    const width = columnWidth * span + gap * (span - 1)
    const height = width / ratio

    let start = 0
    let bestTop = Number.POSITIVE_INFINITY

    for (let column = 0; column <= columns - span; column += 1) {
      let top = 0
      for (let offset = 0; offset < span; offset += 1) {
        top = Math.max(top, heights[column + offset])
      }
      if (top < bestTop) {
        bestTop = top
        start = column
      }
    }

    const x = paddingX + start * (columnWidth + gap)
    const y = bestTop

    positions.push({
      item,
      x,
      y,
      width,
      height,
      span,
    })

    for (let offset = 0; offset < span; offset += 1) {
      heights[start + offset] = y + height + gap
    }
  }

  const maxHeight =
    positions.length > 0
      ? Math.max(...heights) - gap + paddingBottom
      : 0

  return {
    positions,
    height: Math.max(0, maxHeight),
    columnWidth,
  }
}
