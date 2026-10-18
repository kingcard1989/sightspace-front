import { useAuthStore } from '@/modules/auth/store'

export type AppTab = 'discover' | 'editor' | 'profile'

const ROUTES = {
  discover: '/pages/discover/index',
  editor: '/pages/editor/index',
  profile: '/pages/profile/index',
  login: '/pages/auth/login',
  register: '/pages/auth/register',
} as const

function currentRoute(): string {
  try {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as unknown as { route?: string }
    return page && page.route ? `/${page.route}` : ''
  } catch {
    return ''
  }
}

export function goDiscover(reLaunch = false): void {
  if (currentRoute() === ROUTES.discover) return
  if (reLaunch) {
    uni.reLaunch({ url: ROUTES.discover })
  } else {
    uni.navigateTo({ url: ROUTES.discover })
  }
}

export function goEditor(): void {
  if (currentRoute() === ROUTES.editor) return
  uni.navigateTo({ url: ROUTES.editor })
}

export function goProfile(): void {
  const auth = useAuthStore()
  if (!auth.isLoggedIn) {
    openLogin('profile')
    return
  }
  if (currentRoute() === ROUTES.profile) return
  uni.reLaunch({ url: ROUTES.profile })
}

export function navigateTab(tab: AppTab): void {
  if (tab === 'discover') {
    if (currentRoute() === ROUTES.discover) return
    uni.reLaunch({ url: ROUTES.discover })
    return
  }
  if (tab === 'editor') {
    goEditor()
    return
  }
  goProfile()
}

export function openLogin(redirect: 'profile' | 'discover' = 'profile', replace = false): void {
  const url = `${ROUTES.login}?redirect=${redirect}`
  if (currentRoute() === ROUTES.login) return
  if (replace) {
    uni.reLaunch({ url })
  } else {
    uni.navigateTo({ url })
  }
}

export function openRegister(): void {
  if (currentRoute() === ROUTES.register) return
  uni.navigateTo({ url: ROUTES.register })
}

/** 登录/注册成功后回到目标页面 */
export function finishAuth(redirect: 'profile' | 'discover' = 'profile'): void {
  uni.reLaunch({
    url: redirect === 'discover' ? ROUTES.discover : ROUTES.profile,
  })
}

export function goBack(fallback: string = ROUTES.discover): void {
  if (getCurrentPages().length > 1) {
    uni.navigateBack({
      fail: () => {
        uni.reLaunch({ url: fallback })
      },
    })
    return
  }
  uni.reLaunch({ url: fallback })
}

export { ROUTES }
