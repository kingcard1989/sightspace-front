<template>
  <view class="gallery-wrap">
    <view v-if="showSkeleton" class="gallery">
      <view
        v-for="columnIndex in 3"
        :key="`skeleton-${columnIndex}`"
        class="gallery__column"
        :class="{ 'gallery__column--offset': columnIndex === 2 }"
      >
        <view v-for="rowIndex in 3" :key="rowIndex" class="gallery__cell">
          <view class="gallery__skeleton" />
        </view>
      </view>
    </view>

    <AppError
      v-else-if="isError"
      class="gallery-wrap__state"
      title="作品加载失败"
      :description="errorText"
      @retry="emit('retry')"
    />

    <AppEmpty
      v-else-if="isEmpty"
      class="gallery-wrap__state"
      :icon="emptyIcon"
      :title="emptyTitle"
      :description="emptyDescription"
      :action-label="emptyActionLabel"
      @action="emit('action')"
    />

    <view v-else class="gallery">
      <view
        v-for="(column, columnIndex) in columns"
        :key="columnIndex"
        class="gallery__column"
        :class="{ 'gallery__column--offset': columnIndex === 1 }"
      >
        <view
          v-for="item in column"
          :key="item.id"
          class="gallery__cell"
          hover-class="gallery__cell--hover"
          :hover-stay-time="60"
          @tap="emit('select', item)"
        >
          <view class="gallery__square">
            <PhotoPlaceholder
              class="gallery__photo"
              :src="item.imageUrl"
              :palette="item.palette"
              :radius="16"
            />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoadStatus } from '@/shared/types/api'
import type { GalleryItem, ProfileTab } from '@/shared/types/models'
import AppEmpty from '@/shared/components/AppEmpty.vue'
import AppError from '@/shared/components/AppError.vue'
import PhotoPlaceholder from '@/shared/components/PhotoPlaceholder.vue'

const props = defineProps<{
  items: GalleryItem[]
  tab: ProfileTab
  status: LoadStatus
  errorText?: string
}>()

const emit = defineEmits<{
  (event: 'retry'): void
  (event: 'action'): void
  (event: 'select', item: GalleryItem): void
}>()

const showSkeleton = computed(
  () => props.items.length === 0 && (props.status === 'idle' || props.status === 'loading'),
)

const isError = computed(() => props.status === 'error' && props.items.length === 0)

const isEmpty = computed(
  () => props.status === 'empty' || (props.status === 'success' && props.items.length === 0),
)

const columns = computed<GalleryItem[][]>(() => {
  const result: GalleryItem[][] = [[], [], []]
  props.items.forEach((item, index) => {
    result[index % 3].push(item)
  })
  return result
})

const emptyIcon = computed(() => {
  if (props.tab === 'favorites') return 'heart-muted'
  if (props.tab === 'drafts') return 'file-text-muted'
  return 'image-muted'
})

const emptyTitle = computed(() => {
  if (props.tab === 'favorites') return '还没有收藏'
  if (props.tab === 'drafts') return '草稿箱是空的'
  return '还没有作品'
})

const emptyDescription = computed(() => {
  if (props.tab === 'favorites') return '在发现页遇到喜欢的作品，可以先收藏起来。'
  if (props.tab === 'drafts') return '未完成的编辑会保存在这里，随时可以继续。'
  return '从一次简单的编辑开始，记录你的第一份灵感。'
})

const emptyActionLabel = computed(() => (props.tab === 'favorites' ? '去发现' : '去创作'))
</script>

<style lang="scss" scoped>
.gallery-wrap {
  width: 100%;
  padding: dp(16) dp(16) dp(24);
}

.gallery-wrap__state {
  padding-top: dp(12);
}

.gallery {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: dp(8);
  width: 100%;
}

.gallery__column {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: dp(8);
  min-width: 0;
}

.gallery__column--offset {
  padding-top: dp(16);
}

.gallery__cell {
  width: 100%;
  border-radius: dp(16);
  overflow: hidden;
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.gallery__cell--hover {
  opacity: 0.88;
  transform: scale(0.985);
}

.gallery__square {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
}

.gallery__photo {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.gallery__skeleton {
  width: 100%;
  padding-bottom: 100%;
  background: $sj-surface-muted;
  border-radius: dp(16);
  animation: sj-skeleton-pulse 1.5s ease-in-out infinite;
}
</style>
