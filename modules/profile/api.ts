import { USE_MOCK } from '@/config'
import { request } from '@/shared/api/request'
import type {
  GalleryItem,
  ProfileData,
  ProfileTab,
} from '@/shared/types/models'
import { mockGetGallery, mockGetProfile } from './mock'

export function getProfile(): Promise<ProfileData> {
  if (USE_MOCK) {
    return mockGetProfile()
  }

  return request<ProfileData>({
    url: '/users/me',
    method: 'GET',
  })
}

export function getGallery(tab: ProfileTab): Promise<GalleryItem[]> {
  if (USE_MOCK) {
    return mockGetGallery(tab)
  }

  return request<GalleryItem[]>({
    url: '/users/me/gallery',
    method: 'GET',
    data: { tab },
  })
}
