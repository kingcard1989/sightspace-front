import { computed, onUnmounted, ref } from 'vue'
import { errorMessage } from '@/shared/api/error'
import { showToast } from '@/shared/utils/toast'
import { sendVerificationCode } from './api'
import type { VerificationScene } from './types'

/**
 * 验证码发送状态：冷却倒计时、开发模式验证码提示。
 * 注册页与重置密码页共用，页面只负责校验手机号。
 */
export function useVerificationCode(scene: VerificationScene) {
  const sending = ref(false)
  const countdown = ref(0)
  const debugCode = ref('')
  let timer: ReturnType<typeof setInterval> | null = null

  const disabled = computed(() => sending.value || countdown.value > 0)

  const buttonText = computed(() => {
    if (sending.value) return '发送中'
    if (countdown.value > 0) return `${countdown.value}s 后重发`
    return '获取验证码'
  })

  function stopCountdown(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    countdown.value = 0
  }

  function startCountdown(seconds: number): void {
    stopCountdown()
    countdown.value = Math.max(1, Math.floor(seconds))
    timer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) {
        stopCountdown()
      }
    }, 1000)
  }

  onUnmounted(stopCountdown)

  async function send(phone: string): Promise<void> {
    if (disabled.value) return

    sending.value = true
    try {
      const result = await sendVerificationCode({ phone, scene })
      debugCode.value = result.debugCode || ''
      startCountdown(result.cooldown || 60)
      showToast(
        result.debugCode
          ? `开发模式验证码：${result.debugCode}`
          : '验证码已发送，请注意查收',
        2400,
      )
    } catch (error) {
      showToast(errorMessage(error, '验证码发送失败，请稍后重试'))
    } finally {
      sending.value = false
    }
  }

  return {
    sending,
    countdown,
    debugCode,
    disabled,
    buttonText,
    send,
  }
}
