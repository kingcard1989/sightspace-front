<template>
  <view class="field">
    <view class="field__head">
      <text class="field__label">{{ label }}</text>
      <text
        class="field__value"
        :class="{ 'field__value--active': highlight }"
      >
        {{ displayText }}
      </text>
    </view>

    <AppSlider
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :active-color="activeColor"
      :disabled="disabled"
      :compact="compact"
      @update:model-value="onUpdate"
    />

    <view v-if="showScale" class="field__scale">
      <text class="field__scale-label">{{ scaleMinText }}</text>
      <text class="field__scale-label">{{ scaleMaxText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatSigned } from '@/shared/utils/format'
import AppSlider from './AppSlider.vue'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: number
    min?: number
    max?: number
    step?: number
    suffix?: string
    display?: string
    showScale?: boolean
    highlight?: boolean
    disabled?: boolean
    activeColor?: string
    compact?: boolean
  }>(),
  {
    min: -100,
    max: 100,
    step: 1,
    suffix: '',
    display: '',
    showScale: false,
    highlight: undefined,
    disabled: false,
    activeColor: '#FF5C4D',
    compact: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
}>()

const displayText = computed(() => {
  if (props.display) return props.display
  return `${formatSigned(props.modelValue)}${props.suffix}`
})

const highlight = computed(() =>
  props.highlight === undefined ? props.modelValue !== 0 : props.highlight,
)

const scaleMinText = computed(() => `${props.min}${props.suffix}`)
const scaleMaxText = computed(() => `${props.max}${props.suffix}`)

function onUpdate(value: number): void {
  emit('update:modelValue', value)
}
</script>

<style lang="scss" scoped>
.field {
  width: 100%;
}

.field__head {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.field__label {
  color: $sj-text;
  font-size: dp(14);
  font-weight: 500;
  line-height: 1.4;
}

.field__value {
  color: $sj-text-secondary;
  font-size: dp(14);
  font-weight: 500;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}

.field__value--active {
  color: $sj-accent;
}

.field__scale {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 dp(9);
  margin-top: dp(-8);
}

.field__scale-label {
  color: $sj-text-weak;
  font-size: dp(11);
  line-height: 1.4;
}
</style>
