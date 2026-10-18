<template>
  <view class="categories">
    <template v-for="(option, index) in options" :key="option.key">
      <view v-if="index > 0" class="categories__divider" />
      <view
        class="categories__item"
        hover-class="categories__item--hover"
        :hover-stay-time="60"
        @tap="emit('select', option.key)"
      >
        <text
          class="categories__label"
          :class="{ 'categories__label--active': option.key === active }"
        >
          {{ option.label }}
        </text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import type { DiscoverCategory, DiscoverCategoryOption } from '../types'

withDefaults(
  defineProps<{
    options: DiscoverCategoryOption[]
    active: DiscoverCategory
  }>(),
  {},
)

const emit = defineEmits<{
  (event: 'select', key: DiscoverCategory): void
}>()
</script>

<style lang="scss" scoped>
.categories {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  width: 100%;
  height: dp(58);
  padding: 0 dp($sj-page-padding) dp(8);
}

.categories__item {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 100%;
  border-radius: dp(12);
}

.categories__item--hover {
  opacity: 0.65;
}

.categories__label {
  color: $sj-text-secondary;
  font-size: dp($sj-font-label);
  font-weight: 500;
  line-height: 1.2;
  transition: color 0.18s ease;
}

.categories__label--active {
  color: $sj-text;
  font-weight: 600;
}

.categories__divider {
  flex-shrink: 0;
  width: 1px;
  height: dp(28);
  background: $sj-border;
}
</style>
