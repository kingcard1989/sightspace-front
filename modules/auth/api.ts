import { USE_MOCK } from '@/config'
import { request } from '@/shared/api/request'
import type { AuthSession } from '@/shared/types/models'
import type { LoginPayload, RegisterPayload } from './types'
import { mockLogin, mockLogout, mockRegister } from './mock'

export function login(payload: LoginPayload): Promise<AuthSession> {
  if (USE_MOCK) {
    return mockLogin(payload)
  }
  return request<AuthSession>({
    url: '/auth/login',
    method: 'POST',
    auth: false,
    data: { ...payload },
  })
}

export function register(payload: RegisterPayload): Promise<AuthSession> {
  if (USE_MOCK) {
    return mockRegister(payload)
  }
  return request<AuthSession>({
    url: '/auth/register',
    method: 'POST',
    auth: false,
    data: { ...payload },
  })
}

export function logout(): Promise<void> {
  if (USE_MOCK) {
    return mockLogout()
  }
  return request<void>({
    url: '/auth/logout',
    method: 'POST',
  })
}
