import { API_BASE_URL, REQUEST_TIMEOUT, STORAGE_KEYS } from '@/config'
import type { ApiEnvelope } from '@/shared/types/api'
import { getStorage, removeStorage } from '@/shared/utils/storage'
import { ApiError } from './error'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface RequestOptions {
  url: string
  method?: HttpMethod
  data?: Record<string, unknown>
  /** 是否携带 Bearer token，默认 true */
  auth?: boolean
  timeout?: number
}

/**
 * 真实后端请求封装。
 * 约定后端返回：{ code, message, data }，code === 0 表示成功。
 */
export function request<T>(options: RequestOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const token = getStorage<string>(STORAGE_KEYS.token, '')
    const header: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (options.auth !== false && token) {
      header.Authorization = `Bearer ${token}`
    }

    uni.request({
      url: `${API_BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      timeout: options.timeout || REQUEST_TIMEOUT,
      success: (res) => {
        const status = res.statusCode
        let body = res.data as unknown

        if (typeof body === 'string') {
          try {
            body = JSON.parse(body)
          } catch {
            // 保持原始字符串
          }
        }

        if (status >= 200 && status < 300) {
          if (body && typeof body === 'object' && 'code' in body) {
            const envelope = body as ApiEnvelope<T>
            if (envelope.code === 0) {
              resolve(envelope.data)
              return
            }
            reject(new ApiError(envelope.message || '请求失败', envelope.code, status))
            return
          }

          // 兼容未包信封的 2xx 响应
          resolve(body as T)
          return
        }

        if (status === 401) {
          // 只清理本地缓存；认证 store 收到 401 后会派发 auth:expired
          removeStorage(STORAGE_KEYS.token)
          removeStorage(STORAGE_KEYS.user)
        }

        const message =
          body && typeof body === 'object' && 'message' in body
            ? String((body as { message?: unknown }).message || '')
            : ''

        reject(
          new ApiError(
            message || `请求失败（${status}）`,
            body && typeof body === 'object' && 'code' in body
              ? Number((body as { code?: unknown }).code) || -1
              : -1,
            status,
          ),
        )
      },
      fail: (err) => {
        const raw = err && err.errMsg ? err.errMsg : ''
        const message = raw.includes('timeout')
          ? '请求超时，请稍后重试'
          : '网络连接失败，请检查网络'
        reject(new ApiError(message, -1, 0))
      },
    })
  })
}
