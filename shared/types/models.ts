/** 渐变色占位卡配色 */
export type Palette = [string, string]

/** 用户公开信息 */
export interface User {
  id: string
  phone: string
  nickname: string
  handle: string
  bio: string
  /** 后端返回的真实头像地址；为空时前端使用首字母 + 渐变占位 */
  avatarUrl: string
  createdAt: string
}

/** 个人主页统计 */
export interface UserStats {
  works: number
  followers: number
  following: number
}

/** 登录/注册成功后的会话 */
export interface AuthSession {
  token: string
  user: User
}

/** 发现页作品 */
export interface FeedImage {
  id: string
  /** 后端图片地址；为空时使用渐变占位 */
  imageUrl: string
  /** 原图宽高，用于计算瀑布流比例 */
  width: number
  height: number
  category: string
  author: string
  palette: Palette
  createdAt: string
  /** 可选：强制 1 列或 2 列宽；不传时按宽高比自动计算 */
  colSpan?: 1 | 2
}

/** 个人主页画廊作品 */
export interface GalleryItem {
  id: string
  imageUrl: string
  width: number
  height: number
  palette: Palette
  createdAt: string
}

/** GET /users/me 的返回 */
export interface ProfileData {
  user: User
  stats: UserStats
}

/** 个人主页分段 */
export type ProfileTab = 'gallery' | 'favorites' | 'drafts'
