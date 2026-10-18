import { PAGE_SIZE } from '@/config'
import { mockResolve } from '@/shared/api/mock'
import type { ApiPage } from '@/shared/types/api'
import type { FeedImage } from '@/shared/types/models'
import { paletteFor } from '@/shared/utils/color'
import { hashString } from '@/shared/utils/format'
import type { FeedQuery } from './types'

const MOCK_TOTAL = 48
const WIDE_RATIOS = [1.63, 3.06, 2.0, 1.5, 1.8]
const SINGLE_RATIOS = [0.48, 0.6, 0.75, 0.8, 1.0, 1.2, 1.33]

let refreshSeed = 0

/** 稳定伪随机数（同一 seed 每次布局一致） */
function mulberry32(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildItem(
  category: FeedQuery['category'],
  seed: number,
  index: number,
): FeedImage {
  const rand = mulberry32(hashString(`${category}:${seed}:${index}`))
  const firstOfFirstPage = index === 0
  const isWide = firstOfFirstPage || rand() < 0.3
  const ratio = isWide
    ? WIDE_RATIOS[Math.floor(rand() * WIDE_RATIOS.length)]
    : SINGLE_RATIOS[Math.floor(rand() * SINGLE_RATIOS.length)]

  const id = `feed_${category}_${seed}_${index}`
  const width = 1000
  const height = Math.max(120, Math.round(width / ratio))

  return {
    id,
    imageUrl: '',
    width,
    height,
    category,
    author: `视界用户 ${(index % 36) + 1}`,
    palette: paletteFor(id),
    createdAt: new Date(Date.now() - index * 3600 * 1000).toISOString(),
    colSpan: isWide ? 2 : 1,
  }
}

export async function mockFetchFeed(query: FeedQuery): Promise<ApiPage<FeedImage>> {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.max(1, query.pageSize ?? PAGE_SIZE)

  if (page === 1) {
    refreshSeed += 1
  }

  const seed = refreshSeed
  const start = (page - 1) * pageSize
  const end = Math.min(start + pageSize, MOCK_TOTAL)
  const list: FeedImage[] = []

  for (let index = start; index < end; index += 1) {
    list.push(buildItem(query.category, seed, index))
  }

  return mockResolve({
    list,
    page,
    pageSize,
    total: MOCK_TOTAL,
    hasMore: start + list.length < MOCK_TOTAL,
  })
}
