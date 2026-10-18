import { onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/modules/auth/store'
import { openLogin } from '@/shared/utils/navigation'

/**
 * 需要登录的页面使用。
 * 用 reLaunch 打开登录页，避免登录页返回时再次触发守卫造成循环。
 */
export function useLoginGuard() {
  const auth = useAuthStore()

  onShow(() => {
    if (!auth.isLoggedIn) {
      openLogin('profile', true)
    }
  })

  return auth
}
