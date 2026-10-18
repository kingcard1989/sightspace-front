<template>
  <AppPage canvas background="#121214" status-background="#121214">
    <EditorHeader
      v-if="!editor.previewing"
      :filename="editor.aiImageName || '未选择图片'"
      @back="onCancel"
      @undo="onUndo"
      @more="onMore"
    />

    <EditorCanvas />

    <view v-if="!editor.previewing" class="editor-bottom">
      <EditorToolRail />
      <EditorToolPanel />
    </view>

    <EditorActionBar v-if="!editor.previewing" @cancel="onCancel" @save="onSave" />
  </AppPage>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import AppPage from '@/shared/components/AppPage.vue'
import { useStatusBarStyle } from '@/shared/composables/useStatusBarStyle'
import { goBack } from '@/shared/utils/navigation'
import { showToast } from '@/shared/utils/toast'
import EditorActionBar from '@/modules/editor/components/EditorActionBar.vue'
import EditorCanvas from '@/modules/editor/components/EditorCanvas.vue'
import EditorHeader from '@/modules/editor/components/EditorHeader.vue'
import EditorToolPanel from '@/modules/editor/components/EditorToolPanel.vue'
import EditorToolRail from '@/modules/editor/components/EditorToolRail.vue'
import { useEditor } from '@/modules/editor/useEditor'

useStatusBarStyle('light', '#121214')

const editor = useEditor()
const saving = ref(false)

let saveTimer: ReturnType<typeof setTimeout> | null = null

onLoad(() => {
  editor.resetAll()
})

onUnload(() => {
  editor.setComparing(false)
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
})

function onCancel(): void {
  goBack()
}

function onUndo(): void {
  showToast('撤销功能将在后续版本接入')
}

function onMore(): void {
  uni.showActionSheet({
    itemList: ['AI 分割自检', '编辑帮助'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: '/pages/editor/ai-test' })
        return
      }
      showToast('选择图片后会自动识别，点击画面区域即可单独调色')
    },
  })
}

function onSave(): void {
  if (saving.value) return
  saving.value = true
  showToast('已保存到草稿（演示）', 1400)

  saveTimer = setTimeout(() => {
    saveTimer = null
    saving.value = false
    goBack()
  }, 900)
}
</script>

<style lang="scss" scoped>
.editor-bottom {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: dp(218);
  background: $sj-surface;
}
</style>
