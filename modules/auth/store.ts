import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { STORAGE_KEYS } from '@/config'
import type { AuthSession, User } from '@/shared/types/models'
import { getStorage, removeStorage, setStorage } from '@/shared/utils/storage'
import { showToast } from '@/shared/utils/toast'
import * as authApi from './api'
import type { LoginPayload, RegisterPayload } from './types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(getStorage<string>(STORAGE_KEYS.token, ''))
  const user = ref<User | null>(getStorage<User | null>(STORAGE_KEYS.user, null))
  const loading = ref(false)

  const isLoggedIn = computed(() => Boolean(token.value && user.value))

  function hydrate(): void {
    token.value = getStorage<string>(STORAGE_KEYS.token, '')
    user.value = getStorage<User | null>(STORAGE_KEYS.user, null)

    // 本地会话不完整时清空，避免出现“有 token 没有用户”的半登录状态
    if (!token.value || !user.value) {
      token.value = ''
      user.value = null
      removeStorage(STORAGE_KEYS.token)
      removeStorage(STORAGE_KEYS.user)
    }
  }

  function setSession(session: AuthSession): void {
    token.value = session.token
    user.value = session.user
    setStorage(STORAGE_KEYS.token, session.token)
    setStorage(STORAGE_KEYS.user, session.user)
  }

  async function login(payload: LoginPayload): Promise<AuthSession> {
    loading.value = true
    try {
      const session = await authApi.login(payload)
      setSession(session)
      return session
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterPayload): Promise<AuthSession> {
    loading.value = true
    try {
      const session = await authApi.register(payload)
      setSession(session)
      return session
    } finally {
      loading.value = false
    }
  }

  function clearSession(): void {
    token.value = ''
    user.value = null
    removeStorage(STORAGE_KEYS.token)
    removeStorage(STORAGE_KEYS.user)
  }

  function logout(notify = true): void {
    void authApi.logout().catch(() => {
      // 退出接口失败也要清理本地会话
    })
    clearSession()
    if (notify) {
      showToast('已退出登录')
    }
  }

  /** token 失效时调用：清理本地会话并通知应用回到登录页，不弹提示 */
  function expireSession(): void {
    if (!token.value && !user.value) return
    clearSession()
    uni.$emit('auth:expired')
  }

  function updateUser(nextUser: User): void {
    user.value = nextUser
    setStorage(STORAGE_KEYS.user, nextUser)
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    hydrate,
    login,
    register,
    logout,
    expireSession,
    updateUser,
    setSession,
  }
})
