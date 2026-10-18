/** 后端统一响应信封 */
export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

/** 分页响应 */
export interface ApiPage<T> {
  list: T[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

/** 页面/列表加载状态 */
export type LoadStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'

/** 通用分页查询参数 */
export interface PageQuery {
  page?: number
  pageSize?: number
}
