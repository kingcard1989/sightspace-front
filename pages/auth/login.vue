<template>
  <AppPage>
    <AppNavBar :show-back="true" :auto-back="false" @back="onBack">
      <template #right>
        <view
          class="auth-nav-link"
          hover-class="auth-nav-link--hover"
          :hover-stay-time="60"
          @tap="onRegister"
        >
          <text class="auth-nav-link__text">注册</text>
        </view>
      </template>
    </AppNavBar>

    <scroll-view class="auth-scroll" scroll-y>
      <view class="auth-body">
        <view class="auth-glow" />

        <AuthBrand class="auth-brand" />

        <view class="auth-intro">
          <text class="auth-intro__title">欢迎回来</text>
          <text class="auth-intro__subtitle">登录后同步你的作品与收藏</text>
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
              :model-value="password"
              password
              prefix-icon="lock-muted"
              placeholder="请输入密码"
              placeholder-style="color: #B5B5BE; font-size: 15px;"
              :maxlength="20"
              :error="Boolean(errors.password)"
              confirm-type="done"
              @update:model-value="onPasswordInput"
              @confirm="onSubmit"
            />
            <text v-if="errors.password" class="auth-field__error">{{ errors.password }}</text>
            <view class="auth-forgot">
              <text class="auth-forgot__link" @tap="onForgotPassword">忘记密码？</text>
            </view>
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
            label="登录"
            loading-text="登录中"
            :loading="auth.loading"
            @click="onSubmit"
          />

          <view class="auth-switch">
            <text class="auth-switch__text">还没有账号？</text>
            <text class="auth-switch__link" @tap="onRegister">立即注册</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </AppPage>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppButton from '@/shared/components/AppButton.vue'
import AppInput from '@/shared/components/AppInput.vue'
import AppNavBar from '@/shared/components/AppNavBar.vue'
import AppPage from '@/shared/components/AppPage.vue'
import { useStatusBarStyle } from '@/shared/composables/useStatusBarStyle'
import { errorMessage } from '@/shared/api/error'
import { isPassword, isPhone } from '@/shared/utils/validate'
import {
  finishAuth,
  goBack,
  openRegister,
  openResetPassword,
} from '@/shared/utils/navigation'
import { showToast } from '@/shared/utils/toast'
import AuthAgreement from '@/modules/auth/components/AuthAgreement.vue'
import AuthBrand from '@/modules/auth/components/AuthBrand.vue'
import { useAuthStore } from '@/modules/auth/store'
import type { LoginFormErrors } from '@/modules/auth/types'

useStatusBarStyle('dark', '#FAFAFA')

const auth = useAuthStore()

const phone = ref('')
const password = ref('')
const agreed = ref(false)
const errors = reactive<LoginFormErrors>({})

const redirect = ref<'profile' | 'discover'>('profile')

onLoad((query) => {
  redirect.value = query?.redirect === 'discover' ? 'discover' : 'profile'
})

function validate(): boolean {
  errors.phone = isPhone(phone.value) ? '' : '请输入正确的手机号'
  errors.password = isPassword(password.value)
    ? ''
    : '密码需为 6-20 位且不含空格'
  errors.agreement = agreed.value ? '' : '请先阅读并同意用户协议和隐私政策'
  return !errors.phone && !errors.password && !errors.agreement
}

function onPhoneInput(value: string): void {
  phone.value = value
  errors.phone = ''
}

function onPasswordInput(value: string): void {
  password.value = value
  errors.password = ''
}

function onAgree(value: boolean): void {
  agreed.value = value
  errors.agreement = ''
}

async function onSubmit(): Promise<void> {
  if (auth.loading) return
  if (!validate()) return

  try {
    await auth.login({
      phone: phone.value.trim(),
      password: password.value,
    })
    showToast('登录成功')
    finishAuth(redirect.value)
  } catch (error) {
    showToast(errorMessage(error, '登录失败，请稍后重试'))
  }
}

function onRegister(): void {
  openRegister()
}

function onForgotPassword(): void {
  openResetPassword()
}

function onBack(): void {
  goBack()
}
</script>

<style lang="scss" scoped>
.auth-nav-link {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: dp(40);
  padding: 0 dp(6);
}

.auth-nav-link--hover {
  opacity: 0.55;
}

.auth-nav-link__text {
  color: $sj-accent;
  font-size: dp(14);
  font-weight: 600;
  line-height: 1.2;
}

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
  padding: dp(12) dp(24) dp(32);
  overflow: hidden;
  box-sizing: border-box;
}

.auth-glow {
  position: absolute;
  top: dp(-140);
  right: dp(-90);
  width: dp(320);
  height: dp(320);
  background: radial-gradient(circle, rgba(255, 92, 77, 0.16) 0%, rgba(255, 92, 77, 0) 68%);
  border-radius: 50%;
  pointer-events: none;
}

.auth-brand {
  position: relative;
  margin-top: dp(16);
}

.auth-intro {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: dp(34);
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
  margin-top: dp(26);
}

.auth-field {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: dp(14);
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

.auth-forgot {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  width: 100%;
  margin-top: dp(8);
}

.auth-forgot__link {
  color: $sj-text-secondary;
  font-size: dp(12);
  line-height: 1.4;
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
