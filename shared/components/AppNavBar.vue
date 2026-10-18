<template>
  <view
    class="navbar"
    :class="[`navbar--${tone}`, { 'navbar--transparent': transparent, 'navbar--border': border }]"
  >
    <view class="navbar__side">
      <view
        v-if="showBack"
        class="navbar__hit"
        hover-class="navbar__hit--hover"
        :hover-stay-time="60"
        @tap="onBack"
      >
        <AppIcon :name="tone === 'light' ? 'chevron-left-white' : 'chevron-left-dark'" :size="22" />
      </view>
      <slot name="left" />
    </view>

    <text class="navbar__title">{{ title }}</text>

    <view class="navbar__side navbar__side--right">
      <slot name="right" />
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import { goBack } from '@/shared/utils/navigation'

const props = withDefaults(
  defineProps<{
    title?: string
    showBack?: boolean
    tone?: 'dark' | 'light'
    transparent?: boolean
    border?: boolean
    autoBack?: boolean
  }>(),
  {
    title: '',
    showBack: true,
    tone: 'dark',
    transparent: false,
    border: false,
    autoBack: true,
  },
)

const emit = defineEmits<{
  (event: 'back'): void
}>()

function onBack(): void {
  emit('back')
  if (props.autoBack) {
    goBack()
  }
}
</script>

<style lang="scss" scoped>
.navbar {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  width: 100%;
  height: dp(48);
  padding: 0 dp(16);
  background: $sj-bg;
}

.navbar--light {
  background: $sj-canvas;
}

.navbar--transparent {
  background: transparent;
}

.navbar--border {
  border-bottom: 1px solid $sj-border;
}

.navbar__side {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: dp(96);
  min-height: dp(44);
}

.navbar__side--right {
  justify-content: flex-end;
}

.navbar__hit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(40);
  height: dp(40);
  margin-left: dp(-8);
  border-radius: 50%;
}

.navbar__hit--hover {
  background: rgba(31, 31, 35, 0.05);
}

.navbar__title {
  flex: 1;
  overflow: hidden;
  color: $sj-text;
  font-size: dp(17);
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.navbar--light .navbar__title {
  color: $sj-text-inverse;
}
</style>
