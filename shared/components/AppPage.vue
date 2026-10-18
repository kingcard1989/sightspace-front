<template>
  <view class="app-page" :class="{ 'app-page--canvas': canvas }" :style="{ backgroundColor: background }">
    <view class="sj-statusbar" :style="{ backgroundColor: statusBackground || background }" />
    <view class="app-page__body">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    background?: string
    statusBackground?: string
    canvas?: boolean
  }>(),
  {
    background: '#FAFAFA',
    statusBackground: '',
    canvas: false,
  },
)
</script>

<style lang="scss" scoped>
.app-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.app-page__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
</style>
