<template>
  <AppPage>
    <AppNavBar title="重置密码" :auto-back="false" @back="onBack" />

    <scroll-view class="auth-scroll" scroll-y>
      <view class="auth-body">
        <view class="auth-glow" />

        <AuthBrand class="auth-brand" />

        <view class="auth-intro">
          <text class="auth-intro__title">找回你的账号</text>
          <text class="auth-intro__subtitle">验证手机号后即可设置新密码</text>
        </view>

        <view class="auth-form">
          <view class="auth-field">
            <AppInput
              :model-value="phone"
              type="number"
              prefix-icon="phone-muted"
              placeholder="请输入注册手机号"
              placeholder-style="color: #B5B5BE; font-size: 15px;"
              :maxlength="11"
              :error="Boolean(errors.phone)"
              @update:model-value="onPhoneInput"
            />
            <text v-if="errors.phone" class="auth-field__error">{{ errors.phone }}</text>
          </view>

          <view class="auth-field">
            <AppInput
              :model-value="code"
              type="number"
              prefix-icon="check-accent"
              placeholder="请输入 6 位验证码"
              placeholder-style="color: #B5B5BE; font-size: 15px;"
              :maxlength="6"
              :error="Boolean(errors.code)"
              @update:model-value="onCodeInput"
            >
              <template #suffix>
                <view
                  class="auth-code"
                  :class="{ 'auth-code--disabled': codeButtonDisabled }"
                  @tap="onSendCode"
                >
                  <view class="auth-code__divider" />
                  <text class="auth-code__text">{{ codeButtonText }}</text>
                </view>
              </template>
            </AppInput>
            <text v-if="errors.code" class="auth-field__error">{{ errors.code }}</text>
            <text v-else-if="debugCode" class="auth-code__hint" @tap="fillDebugCode">
              开发模式验证码：{{ debugCode }}（点击填入）
            </text>
          </view>

          <view class="auth-field">
            <AppInput
              :model-value="password"
              password
              prefix-icon="lock-muted"
              placeholder="请设置新密码（6-20 位）"
              placeholder-style="color: #B5B5BE; font-size: 15px;"
              :maxlength="20"
              :error="Boolean(errors.password)"
              @update:model-value="onPasswordInput"
            />
            <text v-if="errors.password" class="auth-field__error">{{ errors.password }}</text>
          </view>

          <view class="auth-field">
            <AppInput
              :model-value="confirmPassword"
              password
              prefix-icon="lock-muted"
              placeholder="请再次输入新密码"
              placeholder-style="color: #B5B5BE; font-size: 15px;"
              :maxlength="20"
              :error="Boolean(errors.confirmPassword)"
              confirm-type="done"
              @update:model-value="onConfirmInput"
              @confirm="onSubmit"
            />
            <text v-if="errors.confirmPassword" class="auth-field__error">
              {{ errors.confirmPassword }}
            </text>
          </view>

          <AppButton
            class="auth-submit"
            type="primary"
            block
            label="确认重置"
            loading-text="提交中"
            :loading="submitting"
            @click="onSubmit"
          />

          <view class="auth-switch">
            <text class="auth-switch__text">想起密码了？</text>
            <text class="auth-switch__link" @tap="onBack">去登录</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </AppPage>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import AppButton from '@/shared/components/AppButton.vue'
import AppInput from '@/shared/components/AppInput.vue'
import AppNavBar from '@/shared/components/AppNavBar.vue'
import AppPage from '@/shared/components/AppPage.vue'
import { useStatusBarStyle } from '@/shared/composables/useStatusBarStyle'
import { errorMessage } from '@/shared/api/error'
import { goBack, ROUTES } from '@/shared/utils/navigation'
import { showToast } from '@/shared/utils/toast'
import {
  isPassword,
  isPhone,
  isVerificationCode,
} from '@/shared/utils/validate'
import AuthBrand from '@/modules/auth/components/AuthBrand.vue'
import { resetPassword } from '@/modules/auth/api'
import { useAuthStore } from '@/modules/auth/store'
import { useVerificationCode } from '@/modules/auth/useVerificationCode'
import type { ResetPasswordFormErrors } from '@/modules/auth/types'

useStatusBarStyle('dark', '#FAFAFA')

const auth = useAuthStore()

const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const errors = reactive<ResetPasswordFormErrors>({})

const {
  debugCode,
  disabled: codeButtonDisabled,
  buttonText: codeButtonText,
  send: sendCode,
} = useVerificationCode('reset_password')

function validate(): boolean {
  errors.phone = isPhone(phone.value) ? '' : '请输入正确的手机号'
  errors.code = isVerificationCode(code.value) ? '' : '请输入 6 位验证码'
  errors.password = isPassword(password.value)
    ? ''
    : '密码需为 6-20 位且不含空格'
  errors.confirmPassword =
    confirmPassword.value === password.value ? '' : '两次输入的密码不一致'

  return !Object.values(errors).some(Boolean)
}

function onPhoneInput(value: string): void {
  phone.value = value
  errors.phone = ''
}

function onCodeInput(value: string): void {
  code.value = value.replace(/\D/g, '').slice(0, 6)
  errors.code = ''
}

function onPasswordInput(value: string): void {
  password.value = value
  errors.password = ''
  if (errors.confirmPassword && value === confirmPassword.value) {
    errors.confirmPassword = ''
  }
}

function onConfirmInput(value: string): void {
  confirmPassword.value = value
  errors.confirmPassword = ''
}

function fillDebugCode(): void {
  if (!debugCode.value) return
  code.value = debugCode.value
  errors.code = ''
}

async function onSendCode(): Promise<void> {
  errors.phone = isPhone(phone.value) ? '' : '请输入正确的手机号'
  if (errors.phone) return
  await sendCode(phone.value.trim())
}

async function onSubmit(): Promise<void> {
  if (submitting.value) return
  if (!validate()) return

  submitting.value = true
  try {
    await resetPassword({
      phone: phone.value.trim(),
      code: code.value.trim(),
      newPassword: password.value,
    })
    // 后端已吊销全部旧会话，本地也立即清理，回到登录页重新登录。
    if (auth.isLoggedIn) auth.expireSession()
    showToast('密码已重置，请重新登录')
    uni.reLaunch({ url: ROUTES.login })
  } catch (error) {
    showToast(errorMessage(error, '重置失败，请稍后重试'))
  } finally {
    submitting.value = false
  }
}

function onBack(): void {
  goBack(ROUTES.login)
}
</script>

<style lang="scss" scoped>
.auth-scroll {
  flex: 1;
  width: 100%;
  height: 0;
  min-height: 0;
}

.auth-body {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  padding: dp(4) dp(24) dp(32);
  overflow: hidden;
  box-sizing: border-box;
}

.auth-glow {
  position: absolute;
  top: dp(-150);
  right: dp(-90);
  width: dp(320);
  height: dp(320);
  background: radial-gradient(circle, rgba(255, 92, 77, 0.14) 0%, rgba(255, 92, 77, 0) 68%);
  border-radius: 50%;
  pointer-events: none;
}

.auth-brand {
  position: relative;
  margin-top: dp(8);
}

.auth-intro {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: dp(24);
}

.auth-intro__title {
  color: $sj-text;
  font-size: dp(24);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.4px;
}

.auth-intro__subtitle {
  margin-top: dp(6);
  color: $sj-text-secondary;
  font-size: dp(13);
  line-height: 1.5;
}

.auth-form {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: dp(22);
}

.auth-field {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: dp(12);
}

.auth-field__error {
  margin-top: dp(5);
  margin-left: dp(4);
  color: $sj-danger;
  font-size: dp(11);
  line-height: 1.4;
}

.auth-code {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  height: dp(32);
  margin-left: dp(8);
}

.auth-code__divider {
  width: 1px;
  height: dp(16);
  background: $sj-border;
}

.auth-code__text {
  margin-left: dp(10);
  color: $sj-accent;
  font-size: dp(13);
  font-weight: 600;
  line-height: 1;
}

.auth-code--disabled .auth-code__text {
  color: $sj-text-weak;
}

.auth-code__hint {
  margin-top: dp(5);
  margin-left: dp(4);
  color: $sj-accent;
  font-size: dp(11);
  line-height: 1.4;
}

.auth-submit {
  margin-top: dp(22);
}

.auth-switch {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: dp(18);
}

.auth-switch__text {
  color: $sj-text-secondary;
  font-size: dp(13);
  line-height: 1.4;
}

.auth-switch__link {
  color: $sj-accent;
  font-size: dp(13);
  font-weight: 600;
  line-height: 1.4;
}
</style>
