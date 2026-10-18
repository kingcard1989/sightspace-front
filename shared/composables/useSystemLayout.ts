import { computed, onMounted, onUnmounted, ref } from 'vue'
import { DESIGN_WIDTH } from '@/config'

interface WindowInfo {
  windowWidth: number
  windowHeight: number
  statusBarHeight: number
  safeBottom: number
}

function readWindowInfo(): WindowInfo {
  try {
    const info = uni.getSystemInfoSync()
    const safeArea = info.safeAreaInsets
    return {
      windowWidth: info.windowWidth || DESIGN_WIDTH,
      windowHeight: info.windowHeight || 844,
      statusBarHeight: info.statusBarHeight || 0,
      safeBottom: safeArea ? safeArea.bottom : 0,
    }
  } catch {
    return {
      windowWidth: DESIGN_WIDTH,
      windowHeight: 844,
      statusBarHeight: 0,
      safeBottom: 0,
    }
  }
}

/**
 * 获取窗口尺寸与安全区。
 * 状态栏占位统一使用 CSS 变量 --status-bar-height（App 端更准确）。
 */
export function useSystemLayout() {
  const initial = readWindowInfo()
  const windowWidth = ref(initial.windowWidth)
  const windowHeight = ref(initial.windowHeight)
  const statusBarHeight = ref(initial.statusBarHeight)
  const safeBottom = ref(initial.safeBottom)

  const designScale = computed(() => windowWidth.value / DESIGN_WIDTH)

  function refresh() {
    const info = readWindowInfo()
    windowWidth.value = info.windowWidth
    windowHeight.value = info.windowHeight
    statusBarHeight.value = info.statusBarHeight
    safeBottom.value = info.safeBottom
  }

  function onResize(event: { size: { windowWidth: number; windowHeight: number } }) {
    windowWidth.value = event.size.windowWidth || windowWidth.value
    windowHeight.value = event.size.windowHeight || windowHeight.value
  }

  onMounted(() => {
    refresh()
    try {
      uni.onWindowResize(onResize)
    } catch {
      // 部分平台不支持窗口尺寸变化监听
    }
  })

  onUnmounted(() => {
    try {
      uni.offWindowResize(onResize)
    } catch {
      // ignore
    }
  })

  return {
    windowWidth,
    windowHeight,
    statusBarHeight,
    safeBottom,
    designScale,
    refresh,
  }
}
