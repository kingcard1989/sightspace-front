<template>
  <AppPage>
    <DiscoverHeader
      @search="onSearch"
      @menu="onMenu"
    />

    <CategoryTabs
      :options="DISCOVER_CATEGORIES"
      :active="store.category"
      @select="onCategory"
    />

    <scroll-view
      class="feed-scroll"
      scroll-y
      :scroll-top="scrollTop"
      :refresher-enabled="true"
      :refresher-triggered="store.refreshing"
      refresher-background="#FAFAFA"
      :lower-threshold="180"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view class="feed">
        <FeedSkeleton v-if="showSkeleton" />

        <AppError
          v-else-if="store.status === 'error' && store.items.length === 0"
          title="内容加载失败"
          :description="store.errorText"
          @retry="onRetry"
        />

        <AppEmpty
          v-else-if="store.isEmpty"
          icon="image-muted"
          title="这里还没有作品"
          description="换个分类，或者下拉刷新看看新的灵感。"
          action-label="刷新看看"
          @action="onRetry"
        />

        <template v-else>
          <MasonryFeed :items="store.items" @select="onSelect" />

          <view v-if="store.loadingMore" class="feed__footer">
            <AppSpinner :size="16" />
            <text class="feed__footer-text">正在加载更多…</text>
          </view>
          <view v-else-if="!store.hasMore && store.items.length > 0" class="feed__footer">
            <text class="feed__footer-text">已经到底啦</text>
          </view>
        </template>
      </view>
    </scroll-view>

    <CustomTabBar active="discover" />
  </AppPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppEmpty from '@/shared/components/AppEmpty.vue'
import AppError from '@/shared/components/AppError.vue'
import AppPage from '@/shared/components/AppPage.vue'
import AppSpinner from '@/shared/components/AppSpinner.vue'
import CustomTabBar from '@/shared/components/CustomTabBar.vue'
import { useStatusBarStyle } from '@/shared/composables/useStatusBarStyle'
import type { FeedImage } from '@/shared/types/models'
import { showToast } from '@/shared/utils/toast'
import CategoryTabs from '@/modules/discover/components/CategoryTabs.vue'
import DiscoverHeader from '@/modules/discover/components/DiscoverHeader.vue'
import FeedSkeleton from '@/modules/discover/components/FeedSkeleton.vue'
import MasonryFeed from '@/modules/discover/components/MasonryFeed.vue'
import { DISCOVER_CATEGORIES } from '@/modules/discover/constants'
import { useDiscoverStore } from '@/modules/discover/store'
import type { DiscoverCategory } from '@/modules/discover/types'

useStatusBarStyle('dark', '#FAFAFA')

const store = useDiscoverStore()

const scrollTop = ref(0)
let scrollFlip = 0

const showSkeleton = computed(
  () => store.status === 'idle' || store.isInitialLoading,
)

onShow(() => {
  store.ensureLoaded()
})

function resetScroll(): void {
  // 交替使用 0 / 1，确保每次切换分类都能触发 scroll-top 更新
  scrollFlip = scrollFlip === 0 ? 1 : 0
  scrollTop.value = scrollFlip
}

function onCategory(key: DiscoverCategory): void {
  if (key === store.category) return
  resetScroll()
  store.changeCategory(key)
}

function onRefresh(): void {
  void store.refresh()
}

function onLoadMore(): void {
  void store.loadMore()
}

function onRetry(): void {
  void store.retry()
}

function onSelect(item: FeedImage): void {
  showToast(`「${item.author}」的作品详情将在后续版本接入`)
}

function onSearch(): void {
  showToast('搜索功能将在后续版本接入')
}

function onMenu(): void {
  showToast('发现页菜单将在后续版本接入')
}
</script>

<style lang="scss" scoped>
.feed-scroll {
  flex: 1;
  width: 100%;
  height: 0;
  min-height: 0;
  background: $sj-bg;
}

.feed {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
}

.feed__footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: dp(56);
  padding-bottom: dp(8);
}

.feed__footer-text {
  margin-left: dp(8);
  color: $sj-text-weak;
  font-size: dp(12);
  line-height: 1.3;
}

.feed__footer-text:only-child {
  margin-left: 0;
}
</style>
