import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { PAGE_SIZE } from '@/config'
import { errorMessage as resolveErrorMessage } from '@/shared/api/error'
import type { LoadStatus } from '@/shared/types/api'
import type { FeedImage } from '@/shared/types/models'
import { showToast } from '@/shared/utils/toast'
import { fetchFeed } from './api'
import { DEFAULT_CATEGORY } from './constants'
import type { DiscoverCategory } from './types'

export const useDiscoverStore = defineStore('discover', () => {
  const category = ref<DiscoverCategory>(DEFAULT_CATEGORY)
  const items = ref<FeedImage[]>([])
  const page = ref(0)
  const total = ref(0)
  const hasMore = ref(true)
  const status = ref<LoadStatus>('idle')
  const refreshing = ref(false)
  const loadingMore = ref(false)
  const errorText = ref('')

  const isEmpty = computed(
    () => status.value === 'empty' || (status.value === 'success' && items.value.length === 0),
  )
  const isInitialLoading = computed(
    () => status.value === 'loading' && items.value.length === 0,
  )

  // 请求序号：切换分类 / 刷新时让旧请求的结果失效
  let requestSeq = 0

  async function loadFirst(refresh = false): Promise<void> {
    const seq = ++requestSeq

    if (refresh) {
      refreshing.value = true
      if (items.value.length === 0) {
        status.value = 'loading'
      }
    } else {
      status.value = 'loading'
    }
    errorText.value = ''

    try {
      const result = await fetchFeed({
        category: category.value,
        page: 1,
        pageSize: PAGE_SIZE,
      })
      if (seq !== requestSeq) return

      items.value = result.list
      page.value = 1
      total.value = result.total
      hasMore.value = result.hasMore
      status.value = result.list.length > 0 ? 'success' : 'empty'
    } catch (error) {
      if (seq !== requestSeq) return

      const message = resolveErrorMessage(error, '内容加载失败，请稍后重试')
      errorText.value = message

      if (refresh && items.value.length > 0) {
        status.value = 'success'
        showToast(message)
      } else {
        status.value = 'error'
      }
    } finally {
      if (seq === requestSeq) {
        refreshing.value = false
      }
    }
  }

  async function loadMore(): Promise<void> {
    if (
      !hasMore.value ||
      loadingMore.value ||
      refreshing.value ||
      status.value !== 'success'
    ) {
      return
    }

    const seq = requestSeq
    loadingMore.value = true

    try {
      const nextPage = page.value + 1
      const result = await fetchFeed({
        category: category.value,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      if (seq !== requestSeq) return

      // 极端情况下后端可能返回重复项，按 id 去重
      const existing = new Set(items.value.map((item) => item.id))
      const appended = result.list.filter((item) => !existing.has(item.id))
      items.value = [...items.value, ...appended]
      page.value = nextPage
      total.value = result.total
      hasMore.value = result.hasMore
    } catch (error) {
      if (seq === requestSeq) {
        showToast(resolveErrorMessage(error, '加载更多失败，请稍后重试'))
      }
    } finally {
      loadingMore.value = false
    }
  }

  function changeCategory(next: DiscoverCategory): void {
    if (next === category.value) return

    category.value = next
    items.value = []
    page.value = 0
    total.value = 0
    hasMore.value = true
    errorText.value = ''
    status.value = 'loading'

    // 使正在进行的旧分类请求失效
    requestSeq += 1
    void loadFirst(false)
  }

  async function refresh(): Promise<void> {
    if (refreshing.value) return
    await loadFirst(true)
  }

  async function retry(): Promise<void> {
    await loadFirst(false)
  }

  /** 页面首次进入时按需加载（返回页面时保留已有数据） */
  function ensureLoaded(): void {
    if (items.value.length > 0 || status.value === 'loading' || refreshing.value) {
      return
    }
    void loadFirst(false)
  }

  return {
    category,
    items,
    page,
    total,
    hasMore,
    status,
    refreshing,
    loadingMore,
    errorText,
    isEmpty,
    isInitialLoading,
    ensureLoaded,
    loadFirst,
    loadMore,
    changeCategory,
    refresh,
    retry,
  }
})
