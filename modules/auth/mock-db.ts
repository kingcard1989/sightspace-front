import { STORAGE_KEYS } from '@/config'
import type { User, UserStats } from '@/shared/types/models'
import { getStorage, setStorage } from '@/shared/utils/storage'

/**
 * 仅用于前端演示的本地“用户表”。
 * 注意：这里为了能验证登录密码，明文保存了 Mock 密码。
 * 真实 Node.js + Prisma 后端必须使用 bcrypt/argon2 哈希，前端绝不保存密码。
 */
export interface MockAccount {
  user: User
  password: string
  stats: UserStats
}

export const DEMO_PHONE = '13800138000'
export const DEMO_PASSWORD = '123456'
export const DEMO_USER_ID = 'u_demo'

const DEMO_CREATED_AT = '2026-01-01T08:00:00.000Z'

export function createDemoAccount(): MockAccount {
  return {
    user: {
      id: DEMO_USER_ID,
      phone: DEMO_PHONE,
      nickname: 'Ava',
      handle: 'avac',
      bio: 'Collecting light & little moments.',
      avatarUrl: '',
      createdAt: DEMO_CREATED_AT,
    },
    password: DEMO_PASSWORD,
    stats: {
      works: 128,
      followers: 2400,
      following: 312,
    },
  }
}

function readAccounts(): MockAccount[] {
  const value = getStorage<MockAccount[]>(STORAGE_KEYS.mockAccounts, [])
  return Array.isArray(value) ? value : []
}

function writeAccounts(accounts: MockAccount[]): void {
  setStorage(STORAGE_KEYS.mockAccounts, accounts)
}

export function findAccountByPhone(phone: string): MockAccount | null {
  const normalized = phone.trim()
  if (normalized === DEMO_PHONE) {
    return createDemoAccount()
  }
  return readAccounts().find((account) => account.user.phone === normalized) || null
}

export function findAccountById(id: string): MockAccount | null {
  if (!id) return null
  if (id === DEMO_USER_ID) {
    return createDemoAccount()
  }
  return readAccounts().find((account) => account.user.id === id) || null
}

export function isPhoneTaken(phone: string): boolean {
  return Boolean(findAccountByPhone(phone))
}

function createUserId(): string {
  return `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function createHandle(phone: string): string {
  const base = `user_${phone.slice(-4)}`
  const taken = new Set([
    createDemoAccount().user.handle,
    ...readAccounts().map((account) => account.user.handle),
  ])
  if (!taken.has(base)) return base
  return `${base}_${Math.random().toString(36).slice(2, 4)}`
}

export function createRegisteredAccount(params: {
  phone: string
  nickname: string
  password: string
}): MockAccount {
  const account: MockAccount = {
    user: {
      id: createUserId(),
      phone: params.phone.trim(),
      nickname: params.nickname.trim(),
      handle: createHandle(params.phone.trim()),
      bio: '用镜头记录生活。',
      avatarUrl: '',
      createdAt: new Date().toISOString(),
    },
    password: params.password,
    stats: {
      works: 0,
      followers: 0,
      following: 0,
    },
  }

  const accounts = readAccounts()
  accounts.push(account)
  writeAccounts(accounts)
  return account
}

export function createMockToken(userId: string): string {
  return `mock-token:${userId}:${Date.now()}`
}

export function parseMockToken(token: string): string {
  if (!token) return ''
  const parts = token.split(':')
  if (parts.length < 2 || parts[0] !== 'mock-token') return ''
  return parts[1] || ''
}

/** 从本地 token 反查当前 Mock 用户 */
export function getCurrentAccount(): MockAccount | null {
  const token = getStorage<string>(STORAGE_KEYS.token, '')
  const userId = parseMockToken(token)
  return findAccountById(userId)
}
