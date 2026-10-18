import { ApiError } from '@/shared/api/error'
import { mockDelay, mockResolve } from '@/shared/api/mock'
import type {
  GalleryItem,
  ProfileData,
  ProfileTab,
} from '@/shared/types/models'
import { paletteAt } from '@/shared/utils/color'
import {
  DEMO_USER_ID,
  getCurrentAccount,
} from '@/modules/auth/mock-db'
import { PROFILE_GALLERY_SIZE } from './constants'

export async function mockGetProfile(): Promise<ProfileData> {
  const account = getCurrentAccount()
  await mockDelay()

  if (!account) {
    throw new ApiError('登录状态已失效，请重新登录', 40101, 401)
  }

  return mockResolve(
    {
      user: { ...account.user },
      stats: { ...account.stats },
    },
    0,
  )
}

export async function mockGetGallery(tab: ProfileTab): Promise<GalleryItem[]> {
  const account = getCurrentAccount()
  await mockDelay()

  if (!account) {
    throw new ApiError('登录状态已失效，请重新登录', 40101, 401)
  }

  // 收藏与草稿目前是空态；演示账号有 9 张作品，新注册用户从 0 开始
  if (tab !== 'gallery' || account.user.id !== DEMO_USER_ID) {
    return mockResolve([], 0)
  }

  const list: GalleryItem[] = []
  for (let index = 0; index < PROFILE_GALLERY_SIZE; index += 1) {
    const id = `gallery_demo_${index}`
    list.push({
      id,
      imageUrl: '',
      width: 1,
      height: 1,
      palette: paletteAt(index + 2),
      createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    })
  }

  return mockResolve(list, 0)
}
