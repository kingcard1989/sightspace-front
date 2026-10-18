import { MOCK_DELAY, MOCK_FAILURE_RATE } from '@/config'
import { ApiError } from './error'

export function mockDelay(delay = MOCK_DELAY): Promise<void> {
  const jitter = Math.floor(Math.random() * 160)
  return new Promise((resolve) => {
    setTimeout(resolve, delay + jitter)
  })
}

function maybeFail(): void {
  if (MOCK_FAILURE_RATE > 0 && Math.random() < MOCK_FAILURE_RATE) {
    throw new ApiError('网络开小差了，请稍后重试', 50000, 500)
  }
}

/** 模拟成功响应 */
export async function mockResolve<T>(data: T, delay = MOCK_DELAY): Promise<T> {
  await mockDelay(delay)
  maybeFail()
  return data
}

/** 模拟业务错误 */
export async function mockReject(
  message: string,
  code = 40000,
  status = 400,
): Promise<never> {
  await mockDelay()
  throw new ApiError(message, code, status)
}
