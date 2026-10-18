/**
 * 视界 · 全局配置
 * 前端与后端完全分离，这里只维护前端请求地址与 Mock 开关。
 */

export const APP_NAME = '视界'
export const APP_SLOGAN = '记录灵感，看见世界'
export const APP_VERSION = '1.0.0'

/** 设计稿基准宽度（Figma 390 × 844） */
export const DESIGN_WIDTH = 390

/**
 * 是否使用本地 Mock。
 * 后端（Node.js + Express + Prisma + PostgreSQL）启动后，
 * 将 USE_MOCK 改为 false，并把 API_BASE_URL 指向后端即可。
 */
export const USE_MOCK = true

/** Mock 延迟（毫秒），便于观察加载态 */
export const MOCK_DELAY = 420

/**
 * Mock 失败率（0 ~ 1），默认 0。
 * 想验证错误重试态时，可临时改为 1。
 */
export const MOCK_FAILURE_RATE = 0

/** 列表分页大小 */
export const PAGE_SIZE = 12

/** 请求超时（毫秒） */
export const REQUEST_TIMEOUT = 10000

let apiBaseUrl = 'http://localhost:3000/api'

// #ifdef APP-PLUS
// Android 模拟器访问宿主机；真机调试请改为电脑局域网 IP
apiBaseUrl = 'http://10.0.2.2:3000/api'
// #endif

// #ifdef H5
apiBaseUrl = 'http://localhost:3000/api'
// #endif

export const API_BASE_URL = apiBaseUrl

export const STORAGE_KEYS = {
  token: 'sj_token',
  user: 'sj_user',
  mockAccounts: 'sj_mock_accounts',
} as const
