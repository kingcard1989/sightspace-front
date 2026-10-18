import type { PageQuery } from '@/shared/types/api'

export type DiscoverCategory = 'recommended' | 'popular' | 'foryou'

export interface DiscoverCategoryOption {
  key: DiscoverCategory
  label: string
}

export interface FeedQuery extends PageQuery {
  category: DiscoverCategory
}
