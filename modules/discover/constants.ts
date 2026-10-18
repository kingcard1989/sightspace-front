import type { DiscoverCategoryOption } from './types'

export const DISCOVER_CATEGORIES: DiscoverCategoryOption[] = [
  { key: 'recommended', label: '编辑推荐' },
  { key: 'popular', label: '热门作品' },
  { key: 'foryou', label: '猜你喜欢' },
]

export const DEFAULT_CATEGORY = DISCOVER_CATEGORIES[0].key

export const MASONRY_COLUMNS = 3
export const MASONRY_GAP = 8
export const MASONRY_PADDING_X = 16
export const MASONRY_PADDING_TOP = 4
export const MASONRY_PADDING_BOTTOM = 20
/** 宽高比大于该值的图片占两列 */
export const WIDE_RATIO = 1.35
