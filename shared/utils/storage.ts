import { STORAGE_KEYS } from '@/config'

/**
 * 统一封装本地存储，避免各页面直接操作 uni storage。
 * uni-app 在不同平台对对象的序列化行为略有差异，这里做一次兼容处理。
 */
export function getStorage<T>(key: string, fallback: T): T {
  try {
    const value = uni.getStorageSync(key)
    if (value === '' || value === null || value === undefined) {
      return fallback
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.parse(trimmed) as T
        } catch {
          return value as unknown as T
        }
      }
    }
    return value as T
  } catch {
    return fallback
  }
}

export function setStorage<T>(key: string, value: T): void {
  try {
    uni.setStorageSync(key, value)
  } catch {
    // 存储失败不阻断主流程
  }
}

export function removeStorage(key: string): void {
  try {
    uni.removeStorageSync(key)
  } catch {
    // ignore
  }
}

export function clearSessionStorage(): void {
  removeStorage(STORAGE_KEYS.token)
  removeStorage(STORAGE_KEYS.user)
}
