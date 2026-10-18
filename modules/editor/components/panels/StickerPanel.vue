<template>
  <view class="panel">
    <view class="panel__head">
      <text class="panel__title">贴纸</text>
      <text
        class="panel__reset"
        hover-class="panel__reset--hover"
        @tap="editor.resetTool('sticker')"
      >
        重置
      </text>
    </view>

    <scroll-view class="panel__scroll sticker-scroll" scroll-x :show-scrollbar="false">
      <view class="sticker-row">
        <view
          v-for="item in STICKERS"
          :key="item"
          class="sticker-item"
          :class="{ 'sticker-item--active': editor.sticker === item }"
          hover-class="sticker-item--hover"
          :hover-stay-time="60"
          @tap="editor.toggleSticker(item)"
        >
          <text class="sticker-item__emoji">{{ item }}</text>
        </view>
      </view>
    </scroll-view>

    <text class="panel__hint">
      {{ editor.sticker ? `已添加 ${editor.sticker}，再次点击可取消` : '轻触贴纸添加到画面，再次点击取消' }}
    </text>
  </view>
</template>

<script setup lang="ts">
import { STICKERS } from '../../constants'
import { useEditor } from '../../useEditor'

const editor = useEditor()
</script>

<style lang="scss" scoped>
@import './panel.scss';

.sticker-scroll {
  flex-shrink: 0;
  margin-top: dp(8);
}

.sticker-row {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
}

.sticker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: dp(48);
  height: dp(48);
  margin-right: dp(8);
  background: $sj-bg;
  border: 1px solid transparent;
  border-radius: dp(14);
  box-sizing: border-box;
}

.sticker-item:last-child {
  margin-right: 0;
}

.sticker-item--active {
  background: $sj-accent-wash;
  border-color: $sj-accent;
}

.sticker-item--hover {
  background: $sj-surface-muted;
}

.sticker-item__emoji {
  font-size: dp(24);
  line-height: 1;
}
</style>
