import { ref } from 'vue'
import { showToast } from '@/shared/utils/toast'
import { useEditor } from './useEditor'

function basename(path: string): string {
  const clean = path.split('?')[0]
  const name = clean.split('/').pop() || ''
  return name || '未命名图片'
}

/**
 * Android 10+ 上，相册选中的原始路径可能无法被 plus.io 读取
 * （readAsDataURL / readAsArrayBuffer 都可能永远不回调）。
 * uni.compressImage 由原生侧读取并写出到应用自己的临时目录，
 * 返回的路径可以被 renderjs 正常分块读取。
 */
function compressForAi(path: string, done: (finalPath: string) => void): void {
  let finished = false
  const finish = (finalPath: string): void => {
    if (finished) return
    finished = true
    const resolved = finalPath || path
    console.log('[editor] 图片路径:', path, '->', resolved)
    done(resolved)
  }
  try {
    uni.compressImage({
      src: path,
      quality: 95,
      success: (res) => finish(res && res.tempFilePath ? res.tempFilePath : path),
      fail: (err) => {
        console.warn('[editor] compressImage 失败，使用原路径:', err)
        finish(path)
      },
    })
  } catch (e) {
    console.warn('[editor] compressImage 异常，使用原路径:', e)
    finish(path)
  }
}

export function useEditorImage() {
  const editor = useEditor()
  const picking = ref(false)

  function pickImage(): void {
    if (picking.value) return
    picking.value = true

    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const path = res.tempFilePaths && res.tempFilePaths[0]
        if (!path) {
          picking.value = false
          showToast('没有取到图片，请重试')
          return
        }
        const file = res.tempFiles && res.tempFiles[0]
        const name = (file && (file as any).name) || basename(path)
        compressForAi(path, (finalPath) => {
          editor.setAiImage({ path: finalPath, name })
          picking.value = false
        })
      },
      fail: (err) => {
        picking.value = false
        const message = err && err.errMsg ? err.errMsg : ''
        if (/cancel/i.test(message)) return
        showToast('选择图片失败，请检查相册权限')
      },
    })
  }

  function retrySegmentation(): void {
    editor.retryAiSegmentation()
  }

  return {
    picking,
    pickImage,
    retrySegmentation,
  }
}
