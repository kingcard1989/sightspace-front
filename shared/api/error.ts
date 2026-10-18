/** 统一的业务/网络错误 */
export class ApiError extends Error {
  code: number
  status: number

  constructor(message: string, code = -1, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    // 兼容 ES5 目标下的 Error 继承
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function errorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
