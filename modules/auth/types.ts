export type LegalType = 'terms' | 'privacy'

export interface LoginPayload {
  phone: string
  password: string
}

export interface RegisterPayload {
  phone: string
  nickname: string
  password: string
}

export interface LoginFormErrors {
  phone?: string
  password?: string
  agreement?: string
}

export interface RegisterFormErrors {
  nickname?: string
  phone?: string
  password?: string
  confirmPassword?: string
  agreement?: string
}
