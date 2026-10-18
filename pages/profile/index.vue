<template>
  <AppPage>
    <ProfileHeader @menu="menuOpen = true" />

    <scroll-view
      class="profile-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="store.refreshing"
      refresher-background="#FAFAFA"
      @refresherrefresh="onRefresh"
    >
      <view class="profile">
        <ProfileSkeleton v-if="showSkeleton" />

        <AppError
          v-else-if="store.isPageError && !user"
          class="profile__error"
          title="个人资料加载失败"
          :description="store.pageError"
          @retry="onRetry"
        />

        <template v-else>
          <ProfileIdentity :user="user" @edit="onEdit" />
          <ProfileStats :stats="store.stats" />

          <view class="profile__tabs">
            <ProfileSegmented
              :options="PROFILE_TABS"
              :active="store.activeTab"
              @select="store.changeTab"
            />
          </view>

          <ProfileGallery
            :items="store.currentItems"
            :tab="store.activeTab"
            :status="store.currentStatus"
            :error-text="store.currentError"
            @retry="onRetry"
            @action="onEmptyAction"
            @select="onSelect"
          />
        </template>
      </view>
    </scroll-view>

    <CustomTabBar active="profile" />

    <ProfileMenuSheet
      v-model="menuOpen"
      @edit="onEdit"
      @logout="onLogout"
    />
  </AppPage>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppError from '@/shared/components/AppError.vue'
import AppPage from '@/shared/components/AppPage.vue'
import CustomTabBar from '@/shared/components/CustomTabBar.vue'
import { useLoginGuard } from '@/shared/composables/useLoginGuard'
import { useStatusBarStyle } from '@/shared/composables/useStatusBarStyle'
import type { GalleryItem } from '@/shared/types/models'
import { goEditor, navigateTab } from '@/shared/utils/navigation'
import { showToast } from '@/shared/utils/toast'
import ProfileGallery from '@/modules/profile/components/ProfileGallery.vue'
import ProfileHeader from '@/modules/profile/components/ProfileHeader.vue'
import ProfileIdentity from '@/modules/profile/components/ProfileIdentity.vue'
import ProfileMenuSheet from '@/modules/profile/components/ProfileMenuSheet.vue'
import ProfileSegmented from '@/modules/profile/components/ProfileSegmented.vue'
import ProfileSkeleton from '@/modules/profile/components/ProfileSkeleton.vue'
import ProfileStats from '@/modules/profile/components/ProfileStats.vue'
import { PROFILE_TABS } from '@/modules/profile/constants'
import { useProfileStore } from '@/modules/profile/store'

useStatusBarStyle('dark', '#FAFAFA')

const auth = useLoginGuard()
const store = useProfileStore()

const menuOpen = ref(false)

const user = computed(() => store.profileUser || auth.user)

const showSkeleton = computed(
  () =>
    !user.value &&
    (store.metaStatus === 'idle' || store.metaStatus === 'loading'),
)

onShow(() => {
  if (!auth.isLoggedIn) return
  void store.load()
})

function onRefresh(): void {
  void store.refresh()
}

function onRetry(): void {
  void store.retry()
}

function onEdit(): void {
  showToast('编辑个人资料将在后续版本接入')
}

function onSelect(item: GalleryItem): void {
  showToast(`作品 ${item.id} 的详情将在后续版本接入`)
}

function onEmptyAction(): void {
  if (store.activeTab === 'favorites') {
    navigateTab('discover')
    return
  }
  goEditor()
}

function onLogout(): void {
  menuOpen.value = false
  auth.logout()
  uni.reLaunch({ url: '/pages/discover/index' })
}
</script>

<style lang="scss" scoped>
.profile-scroll {
  flex: 1;
  width: 100%;
  height: 0;
  min-height: 0;
  background: $sj-bg;
}

.profile {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  padding-bottom: dp(8);
}

.profile__error {
  padding-top: dp(40);
}

.profile__tabs {
  width: 100%;
  padding: dp(4) dp($sj-page-padding) dp(0);
}
</style>
