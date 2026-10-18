import { ApiError } from '@/shared/api/error'
import { mockDelay } from '@/shared/api/mock'
import type { AuthSession } from '@/shared/types/models'
import type {
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  SendCodePayload,
  SendCodeResult,
  VerificationScene,
} from './types'
import {
  createMockToken,
  createRegisteredAccount,
  findAccountByPhone,
  isPhoneTaken,
  updateAccountPassword,
} from './mock-db'

interface PendingCode {
  code: string
  expiresAt: number
}

/** 仅存在于当前运行内存，重启应用后失效，符合验证码短时效的语义 */
const pendingCodes = new Map<string, PendingCode>()

function codeKey(phone: string, scene: VerificationScene): string {
  return `${scene}:${phone.trim()}`
}

export async function mockSendVerificationCode(
  payload: SendCodePayload,
): Promise<SendCodeResult> {
  await mockDelay(200)

  const phone = payload.phone.trim()
  if (payload.scene === 'register' && isPhoneTaken(phone)) {
    throw new ApiError('该手机号已注册，请直接登录', 40901, 409)
  }

  const code = `${Math.floor(Math.random() * 1_000_000)}`.padStart(6, '0')
  pendingCodes.set(codeKey(phone, payload.scene), {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  })

  return {
    expiresIn: 300,
    cooldown: 60,
    // Mock 模式总是把验证码返回给前端，方便本地演示。
    debugCode: code,
  }
}

function consumeMockCode(
  phone: string,
  scene: VerificationScene,
  code: string,
): void {
  const key = codeKey(phone, scene)
  const pending = pendingCodes.get(key)
  if (!pending || pending.expiresAt < Date.now()) {
    pendingCodes.delete(key)
    throw new ApiError('验证码已失效，请重新获取', 40002, 400)
  }
  if (pending.code !== code) {
    throw new ApiError('验证码不正确', 40003, 400)
  }
  pendingCodes.delete(key)
}

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
  consumeMockCode(payload.phone, 'register', payload.code)

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

export async function mockResetPassword(
  payload: ResetPasswordPayload,
): Promise<void> {
  await mockDelay()

  consumeMockCode(payload.phone, 'reset_password', payload.code)

  if (!updateAccountPassword(payload.phone, payload.newPassword)) {
    throw new ApiError('该手机号尚未注册', 40401, 404)
  }
}

export async function mockLogout(): Promise<void> {
  await mockDelay(120)
}
