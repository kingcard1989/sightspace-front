import { ApiError } from '@/shared/api/error'
import { mockDelay } from '@/shared/api/mock'
import type { AuthSession } from '@/shared/types/models'
import type { LoginPayload, RegisterPayload } from './types'
import {
  createMockToken,
  createRegisteredAccount,
  findAccountByPhone,
  isPhoneTaken,
} from './mock-db'

export async function mockLogin(payload: LoginPayload): Promise<AuthSession> {
  await mockDelay()

  const account = findAccountByPhone(payload.phone)
  if (!account || account.password !== payload.password) {
    throw new ApiError('手机号或密码不正确', 40101, 401)
  }

  return {
    token: createMockToken(account.user.id),
    user: { ...account.user },
  }
}

export async function mockRegister(payload: RegisterPayload): Promise<AuthSession> {
  await mockDelay()

  if (isPhoneTaken(payload.phone)) {
    throw new ApiError('该手机号已注册，请直接登录', 40901, 409)
  }

  const account = createRegisteredAccount({
    phone: payload.phone,
    nickname: payload.nickname,
    password: payload.password,
  })

  return {
    token: createMockToken(account.user.id),
    user: { ...account.user },
  }
}

export async function mockLogout(): Promise<void> {
  await mockDelay(120)
}
