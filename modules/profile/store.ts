import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { LoadStatus } from '@/shared/types/api'
import type {
  GalleryItem,
  ProfileData,
  ProfileTab,
  User,
  UserStats,
} from '@/shared/types/models'
import { errorMessage as resolveErrorMessage, isApiError } from '@/shared/api/error'
import { useAuthStore } from '@/modules/auth/store'
import { showToast } from '@/shared/utils/toast'
import { getGallery, getProfile } from './api'
import { EMPTY_STATS } from './constants'

type TabMap<T> = Record<ProfileTab, T>

interface Settled<T> {
  ok: boolean
  value?: T
  error?: unknown
}

async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise }
  } catch (error) {
    return { ok: false, error }
  }
}

function emptyTabMap<T>(factory: () => T): TabMap<T> {
  return {
    gallery: factory(),
    favorites: factory(),
    drafts: factory(),
  }
}

export const useProfileStore = defineStore('profile', () => {
  const auth = useAuthStore()

  const profileUser = ref<User | null>(auth.user)
  const stats = ref<UserStats>({ ...EMPTY_STATS })
  const metaStatus = ref<LoadStatus>('idle')
  const metaError = ref('')
  const activeTab = ref<ProfileTab>('gallery')
  const refreshing = ref(false)

  const itemsByTab = reactive<TabMap<GalleryItem[]>>(
    emptyTabMap<GalleryItem[]>(() => []),
  )
  const statusByTab = reactive<TabMap<LoadStatus>>(
    emptyTabMap<LoadStatus>(() => 'idle'),
  )
  const errorByTab = reactive<TabMap<string>>(emptyTabMap<string>(() => ''))

  const currentItems = computed(() => itemsByTab[activeTab.value])
  const currentStatus = computed(() => statusByTab[activeTab.value])
  const currentError = computed(() => errorByTab[activeTab.value])
  const metaLoading = computed(() => metaStatus.value === 'loading')
  const tabLoading = computed(
    () =>
      statusByTab[activeTab.value] === 'loading' &&
      itemsByTab[activeTab.value].length === 0,
  )
  const isLoading = computed(() => metaLoading.value || tabLoading.value)
  const isPageError = computed(() => metaStatus.value === 'error')
  const pageError = computed(() => metaError.value)
  const isEmpty = computed(() => currentStatus.value === 'empty')

  function handleAuthError(error: unknown): boolean {
    if (isApiError(error) && error.status === 401) {
      auth.expireSession()
      return true
    }
    return false
  }

  function applyProfile(data: ProfileData): void {
    profileUser.value = data.user
    stats.value = { ...data.stats }
    auth.updateUser(data.user)
  }

  function applyTab(tab: ProfileTab, list: GalleryItem[]): void {
    itemsByTab[tab] = list
    statusByTab[tab] = list.length > 0 ? 'success' : 'empty'
    errorByTab[tab] = ''
  }

  async function fetchMeta(): Promise<void> {
    metaStatus.value = 'loading'
    metaError.value = ''

    try {
      const data = await getProfile()
      applyProfile(data)
      metaStatus.value = 'success'
    } catch (error) {
      metaStatus.value = 'error'
      metaError.value = resolveErrorMessage(error, '个人资料加载失败，请稍后重试')
      handleAuthError(error)
    }
  }

  async function fetchTab(tab: ProfileTab, force = false): Promise<void> {
    if (statusByTab[tab] === 'loading') return
    if (!force && (statusByTab[tab] === 'success' || statusByTab[tab] === 'empty')) {
      return
    }

    statusByTab[tab] = 'loading'
    errorByTab[tab] = ''

    try {
      const list = await getGallery(tab)
      applyTab(tab, list)
    } catch (error) {
      statusByTab[tab] = 'error'
      errorByTab[tab] = resolveErrorMessage(error, '作品加载失败，请稍后重试')
      handleAuthError(error)
    }
  }

  async function load(): Promise<void> {
    if (metaStatus.value === 'loading') return

    const tab = activeTab.value
    const needMeta = !(metaStatus.value === 'success' && profileUser.value)
    const needTab =
      statusByTab[tab] !== 'success' && statusByTab[tab] !== 'empty'

    if (!needMeta && !needTab) return

    const tasks: Promise<void>[] = []
    if (needMeta) tasks.push(fetchMeta())
    if (needTab) tasks.push(fetchTab(tab))

    await Promise.all(tasks)
  }

  function changeTab(tab: ProfileTab): void {
    if (tab === activeTab.value) return
    activeTab.value = tab
    if (statusByTab[tab] === 'idle') {
      void fetchTab(tab)
    }
  }

  async function refresh(): Promise<void> {
    if (refreshing.value) return
    refreshing.value = true

    const tab = activeTab.value
    const [metaResult, galleryResult] = await Promise.all([
      settle(getProfile()),
      settle(getGallery(tab)),
    ])

    let failed = false

    if (metaResult.ok && metaResult.value) {
      applyProfile(metaResult.value)
      metaStatus.value = 'success'
      metaError.value = ''
    } else {
      failed = true
      const message = resolveErrorMessage(
        metaResult.error,
        '个人资料刷新失败，请稍后重试',
      )
      if (metaStatus.value !== 'success') {
        metaStatus.value = 'error'
        metaError.value = message
      }
      handleAuthError(metaResult.error)
    }

    if (galleryResult.ok && galleryResult.value) {
      applyTab(tab, galleryResult.value)
    } else {
      failed = true
      const message = resolveErrorMessage(
        galleryResult.error,
        '作品刷新失败，请稍后重试',
      )
      if (itemsByTab[tab].length === 0) {
        statusByTab[tab] = 'error'
        errorByTab[tab] = message
      }
      handleAuthError(galleryResult.error)
    }

    refreshing.value = false

    if (failed) {
      showToast('刷新失败，请稍后重试')
    }
  }

  async function retry(): Promise<void> {
    if (metaStatus.value === 'error') {
      await load()
      return
    }
    if (statusByTab[activeTab.value] === 'error') {
      await fetchTab(activeTab.value, true)
      return
    }
    await load()
  }

  function reset(): void {
    profileUser.value = null
    stats.value = { ...EMPTY_STATS }
    metaStatus.value = 'idle'
    metaError.value = ''
    activeTab.value = 'gallery'
    refreshing.value = false
    ;(Object.keys(itemsByTab) as ProfileTab[]).forEach((key) => {
      itemsByTab[key] = []
      statusByTab[key] = 'idle'
      errorByTab[key] = ''
    })
  }

  // 切换账号 / 退出登录后清空缓存，避免看到上一个账号的数据
  watch(
    () => auth.user && auth.user.id,
    (nextId, previousId) => {
      if (nextId !== previousId) {
        reset()
      }
    },
  )

  return {
    profileUser,
    stats,
    metaStatus,
    metaError,
    activeTab,
    refreshing,
    itemsByTab,
    statusByTab,
    errorByTab,
    currentItems,
    currentStatus,
    currentError,
    metaLoading,
    tabLoading,
    isLoading,
    isPageError,
    pageError,
    isEmpty,
    load,
    changeTab,
    refresh,
    retry,
    reset,
  }
})
