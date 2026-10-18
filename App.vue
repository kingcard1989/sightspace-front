<script lang="ts">
import { useAuthStore } from '@/modules/auth/store'

/** 会话失效时回到登录页；登录/注册页本身不再重复跳转 */
function handleAuthExpired(): void {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as unknown as
    | { route?: string }
    | undefined
  const route = current?.route || ''

  if (route === 'pages/auth/login' || route === 'pages/auth/register') return

  uni.reLaunch({ url: '/pages/auth/login?redirect=profile' })
}

export default {
  onLaunch() {
    // 恢复本地登录态；没有 token 时保持游客状态
    useAuthStore().hydrate()
    uni.$on('auth:expired', handleAuthExpired)
  },
}
</script>

<style lang="scss">
@import './shared/styles/global.scss';
</style>
