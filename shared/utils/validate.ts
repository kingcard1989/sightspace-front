/** 中国大陆手机号 */
export function isPhone(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value.trim())
}

/** 密码：6-20 位，不允许空格 */
export function isPassword(value: string): boolean {
  return /^\S{6,20}$/.test(value)
}

/** 昵称：2-12 个字符（中文、英文、数字均可） */
export function isNickname(value: string): boolean {
  const length = Array.from(value.trim()).length
  return length >= 2 && length <= 12
}

/** 短信验证码：6 位数字 */
export function isVerificationCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim())
}

export function requireValue(value: string): boolean {
  return value.trim().length > 0
}
