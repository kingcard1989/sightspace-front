<template>
  <view class="agreement">
    <AppCheckbox :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
      <text class="agreement__text">我已阅读并同意</text>
      <text class="agreement__link" @tap.stop="open('terms')">《用户协议》</text>
      <text class="agreement__text">和</text>
      <text class="agreement__link" @tap.stop="open('privacy')">《隐私政策》</text>
    </AppCheckbox>

    <LegalSheet v-model="sheetVisible" :type="sheetType" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppCheckbox from '@/shared/components/AppCheckbox.vue'
import type { LegalType } from '../types'
import LegalSheet from './LegalSheet.vue'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const sheetVisible = ref(false)
const sheetType = ref<LegalType>('terms')

function open(type: LegalType): void {
  sheetType.value = type
  sheetVisible.value = true
}
</script>

<style lang="scss" scoped>
.agreement {
  width: 100%;
}

.agreement__text {
  color: $sj-text-secondary;
  font-size: dp(12);
  line-height: 1.55;
}

.agreement__link {
  color: $sj-accent;
  font-size: dp(12);
  line-height: 1.55;
}
</style>
