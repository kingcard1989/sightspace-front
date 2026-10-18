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
 * 已切换为 FastAPI 后端；把 USE_MOCK 改回 true 可离线演示，
 * 此时验证码会直接显示在注册页上。
 */
export const USE_MOCK = false

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

/**
 * 真机调试时填写电脑的局域网 IP，例如 '192.168.1.23'。
 * 留空时：Android 模拟器使用 10.0.2.2，H5 使用 localhost。
 */
const LAN_HOST = ''

let apiBaseUrl = 'http://localhost:3000/api'

// #ifdef APP-PLUS
apiBaseUrl = LAN_HOST
  ? `http://${LAN_HOST}:3000/api`
  : 'http://10.0.2.2:3000/api'
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
