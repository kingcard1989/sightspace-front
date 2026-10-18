<template>
  <view class="tool-rail">
    <view
      v-for="tool in EDITOR_TOOLS"
      :key="tool.key"
      class="tool-item"
      hover-class="tool-item--hover"
      :hover-stay-time="60"
      @tap="editor.selectTool(tool.key)"
    >
      <view
        class="tool-item__circle"
        :class="{ 'tool-item__circle--active': editor.activeTool === tool.key }"
      >
        <AppIcon :name="tool.icon" :size="22" />
      </view>
      <text
        class="tool-item__label"
        :class="{ 'tool-item__label--active': editor.activeTool === tool.key }"
      >
        {{ tool.label }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'
import { EDITOR_TOOLS } from '../constants'
import { useEditor } from '../useEditor'

const editor = useEditor()
</script>

<style lang="scss" scoped>
.tool-rail {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  flex-shrink: 0;
  height: dp(76);
  padding: dp(4) dp(22) 0;
  background: $sj-surface;
  box-sizing: border-box;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: dp(46);
}

.tool-item--hover {
  opacity: 0.7;
}

.tool-item__circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: dp(44);
  height: dp(44);
  background: $sj-surface;
  border: 1px solid $sj-border;
  border-radius: 50%;
  box-sizing: border-box;
  transition: box-shadow 0.16s ease, border-color 0.16s ease;
}

.tool-item__circle--active {
  border-color: transparent;
  box-shadow: 0 0 0 dp(1.5) $sj-text;
}

.tool-item__label {
  margin-top: dp(3);
  color: $sj-text-secondary;
  font-size: dp(10);
  line-height: 1.2;
  white-space: nowrap;
}

.tool-item__label--active {
  color: $sj-text;
  font-weight: 500;
}
</style>
