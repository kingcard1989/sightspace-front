import type { UserStats } from '@/shared/types/models'
import type { ProfileTabOption } from './types'

export const PROFILE_TABS: ProfileTabOption[] = [
  { key: 'gallery', label: '画廊' },
  { key: 'favorites', label: '收藏' },
  { key: 'drafts', label: '草稿' },
]

export const EMPTY_STATS: UserStats = {
  works: 0,
  followers: 0,
  following: 0,
}

export const PROFILE_GALLERY_SIZE = 9
