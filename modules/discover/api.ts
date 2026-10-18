import { USE_MOCK } from '@/config'
import { request } from '@/shared/api/request'
import type { ApiPage } from '@/shared/types/api'
import type { FeedImage } from '@/shared/types/models'
import { mockFetchFeed } from './mock'
import type { FeedQuery } from './types'

export function fetchFeed(query: FeedQuery): Promise<ApiPage<FeedImage>> {
  if (USE_MOCK) {
    return mockFetchFeed(query)
  }

  return request<ApiPage<FeedImage>>({
    url: '/feed',
    method: 'GET',
    data: {
      category: query.category,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 12,
    },
  })
}
