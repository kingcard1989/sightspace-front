import { onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

export type StatusBarStyle = 'dark' | 'light'

/**
 * 设置 App 端状态栏图标与背景色。
 * H5 / 小程序端自动跳过；页面 onShow 时会重新应用，
 * 因此从编辑页返回发现/我的页面时状态栏会恢复。
 */
export function useStatusBarStyle(style: StatusBarStyle, background = '#FAFAFA') {
  const apply = () => {
    // #ifdef APP-PLUS
    try {
      plus.navigator.setStatusBarStyle(style)
      plus.navigator.setStatusBarBackground(background)
    } catch {
      // 状态栏 API 偶发不可用，忽略即可
    }
    // #endif
  }

  onMounted(apply)
  onShow(apply)

  return apply
}
