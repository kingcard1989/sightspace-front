<template>
  <AppSheet
    :model-value="modelValue"
    :title="isPrivacy ? '隐私政策' : '用户协议'"
    subtitle="演示版本 · 正式上线前请替换为审核文本"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <view class="legal">
      <text class="legal__note">
        以下内容为占位说明，仅用于展示协议弹层的交互形式，不构成任何正式条款。
      </text>

      <template v-if="isPrivacy">
        <text class="legal__heading">一、我们收集的信息</text>
        <text class="legal__paragraph">
          为完成账号注册与登录，我们会处理你主动填写的手机号、昵称等基础信息。演示版本中的账号数据仅保存在本地，
          不会上传到真实服务器。
        </text>
        <text class="legal__heading">二、信息的使用</text>
        <text class="legal__paragraph">
          相关信息仅用于身份识别、展示个人空间与保障账号安全。我们不会将你的信息用于与产品无关的用途。
        </text>
        <text class="legal__heading">三、你的权利</text>
        <text class="legal__paragraph">
          你可以随时退出登录并清除本地会话。正式版本将提供账号注销、信息更正与数据导出能力。
        </text>
      </template>

      <template v-else>
        <text class="legal__heading">一、服务说明</text>
        <text class="legal__paragraph">
          视界是一款以影像记录与灵感分享为核心的创作工具。当前版本为毕业设计演示，部分功能仍在持续完善。
        </text>
        <text class="legal__heading">二、账号使用</text>
        <text class="legal__paragraph">
          请使用真实、有效的手机号注册，并妥善保管账号与密码。因个人保管不当造成的损失由账号使用者自行承担。
        </text>
        <text class="legal__heading">三、内容规范</text>
        <text class="legal__paragraph">
          你发布的内容应当遵守法律法规与公序良俗。演示版本暂不提供公开上传能力，所有图片均为本地占位数据。
        </text>
      </template>

      <text class="legal__footer">更新日期：2026 年 10 月</text>
    </view>
  </AppSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppSheet from '@/shared/components/AppSheet.vue'
import type { LegalType } from '../types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    type?: LegalType
  }>(),
  {
    type: 'terms',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const isPrivacy = computed(() => props.type === 'privacy')
</script>

<style lang="scss" scoped>
.legal {
  display: flex;
  flex-direction: column;
  padding-bottom: dp(8);
}

.legal__note {
  padding: dp(12) dp(14);
  margin-bottom: dp(16);
  color: $sj-text-secondary;
  font-size: dp(12);
  line-height: 1.7;
  background: $sj-bg;
  border-radius: dp(12);
}

.legal__heading {
  margin-top: dp(14);
  color: $sj-text;
  font-size: dp(14);
  font-weight: 600;
  line-height: 1.5;
}

.legal__paragraph {
  margin-top: dp(6);
  color: $sj-text-secondary;
  font-size: dp(13);
  line-height: 1.8;
}

.legal__footer {
  margin-top: dp(24);
  color: $sj-text-weak;
  font-size: dp(11);
  line-height: 1.5;
}
</style>
