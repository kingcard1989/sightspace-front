export type LegalType = 'terms' | 'privacy'

/** 验证码使用场景，与后端 scene 字段一致 */
export type VerificationScene = 'register' | 'reset_password'

export interface LoginPayload {
  phone: string
  password: string
}

export interface RegisterPayload {
  phone: string
  nickname: string
  password: string
  code: string
}

export interface SendCodePayload {
  phone: string
  scene: VerificationScene
}

export interface SendCodeResult {
  /** 验证码有效期（秒） */
  expiresIn: number
  /** 再次发送前的冷却时间（秒） */
  cooldown: number
  /** 仅开发模式返回，生产环境为 null */
  debugCode?: string | null
}

export interface ResetPasswordPayload {
  phone: string
  code: string
  newPassword: string
}

export interface LoginFormErrors {
  phone?: string
  password?: string
  agreement?: string
}

export interface RegisterFormErrors {
  phone?: string
  code?: string
  nickname?: string
  password?: string
  confirmPassword?: string
  agreement?: string
}

export interface ResetPasswordFormErrors {
  phone?: string
  code?: string
  password?: string
  confirmPassword?: string
}
