<template>
  <AppPage>
    <AppNavBar title="创建账号" :auto-back="false" @back="onBack" />

    <scroll-view class="auth-scroll" scroll-y>
      <view class="auth-body">
        <view class="auth-glow" />

        <AuthBrand class="auth-brand" />

        <view class="auth-intro">
          <text class="auth-intro__title">加入视界</text>
          <text class="auth-intro__subtitle">注册后即可保存作品与收藏</text>
        </view>

        <view class="auth-form">
          <view class="auth-field">
            <AppInput
              :model-value="phone"
              type="number"
              prefix-icon="phone-muted"
              placeholder="请输入手机号"
              placeholder-style="color: #B5B5BE; font-size: 15px;"
              :maxlength="11"
              :error="Boolean(errors.phone)"
              @update:model-value="onPhoneInput"
            />
            <text v-if="errors.phone" class="auth-field__error">{{ errors.phone }}</text>
          </view>

          <view class="auth-field">
            <AppInput
              :model-value="nickname"
              prefix-icon="user-muted"
              placeholder="请输入昵称（2-12 个字符）"
              placeholder-style="color: #B5B5BE; font-size: 15px;"
              :maxlength="12"
              :error="Boolean(errors.nickname)"
              @update:model-value="onNicknameInput"
            />
            <text v-if="errors.nickname" class="auth-field__error">{{ errors.nickname }}</text>
          </view>

          <view class="auth-field">
            <AppInput
              :model-value="password"
              password
              prefix-icon="lock-muted"
              placeholder="请设置密码（6-20 位）"
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
              placeholder="请再次输入密码"
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

          <view class="auth-agreement">
            <AuthAgreement :model-value="agreed" @update:model-value="onAgree" />
            <text v-if="errors.agreement" class="auth-field__error auth-field__error--agreement">
              {{ errors.agreement }}
            </text>
          </view>

          <AppButton
            class="auth-submit"
            type="primary"
            block
            label="注册并登录"
            loading-text="注册中"
            :loading="auth.loading"
            @click="onSubmit"
          />

          <view class="auth-switch">
            <text class="auth-switch__text">已有账号？</text>
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
import { finishAuth, goBack, ROUTES } from '@/shared/utils/navigation'
import { showToast } from '@/shared/utils/toast'
import { isNickname, isPassword, isPhone } from '@/shared/utils/validate'
import AuthAgreement from '@/modules/auth/components/AuthAgreement.vue'
import AuthBrand from '@/modules/auth/components/AuthBrand.vue'
import { useAuthStore } from '@/modules/auth/store'
import type { RegisterFormErrors } from '@/modules/auth/types'

useStatusBarStyle('dark', '#FAFAFA')

const auth = useAuthStore()

const phone = ref('')
const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreed = ref(false)
const errors = reactive<RegisterFormErrors>({})

function validate(): boolean {
  errors.phone = isPhone(phone.value) ? '' : '请输入正确的手机号'
  errors.nickname = isNickname(nickname.value)
    ? ''
    : '昵称需为 2-12 个字符'
  errors.password = isPassword(password.value)
    ? ''
    : '密码需为 6-20 位且不含空格'
  errors.confirmPassword =
    confirmPassword.value === password.value ? '' : '两次输入的密码不一致'
  errors.agreement = agreed.value ? '' : '请先阅读并同意用户协议和隐私政策'

  return !Object.values(errors).some(Boolean)
}

function onPhoneInput(value: string): void {
  phone.value = value
  errors.phone = ''
}

function onNicknameInput(value: string): void {
  nickname.value = value
  errors.nickname = ''
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

function onAgree(value: boolean): void {
  agreed.value = value
  errors.agreement = ''
}

async function onSubmit(): Promise<void> {
  if (auth.loading) return
  if (!validate()) return

  try {
    await auth.register({
      phone: phone.value.trim(),
      nickname: nickname.value.trim(),
      password: password.value,
    })
    showToast('注册成功')
    finishAuth('profile')
  } catch (error) {
    showToast(errorMessage(error, '注册失败，请稍后重试'))
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

.auth-field__error--agreement {
  margin-left: dp(26);
}

.auth-agreement {
  width: 100%;
  margin-top: dp(2);
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
