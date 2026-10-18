<template>
  <view
    class="app-input"
    :class="{
      'app-input--focus': focused,
      'app-input--error': error,
      'app-input--disabled': disabled,
      'app-input--compact': compact,
    }"
  >
    <AppIcon
      v-if="prefixIcon"
      class="app-input__prefix"
      :name="prefixIcon"
      :size="19"
    />

    <input
      class="app-input__control"
      :value="modelValue"
      :type="inputType"
      :password="password && !revealed"
      :placeholder="placeholder"
      :placeholder-class="'app-input__placeholder'"
      :placeholder-style="placeholderStyle"
      :maxlength="maxlength"
      :disabled="disabled"
      :focus="focus"
      :confirm-type="confirmType"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @confirm="onConfirm"
    />

    <view
      v-if="clearable && modelValue && !disabled"
      class="app-input__action"
      hover-class="app-input__action--hover"
      @tap="onClear"
    >
      <AppIcon name="close-muted" :size="14" />
    </view>

    <view
      v-if="password"
      class="app-input__action"
      hover-class="app-input__action--hover"
      @tap="toggleReveal"
    >
      <AppIcon :name="revealed ? 'eye-off-muted' : 'eye-muted'" :size="19" />
    </view>

    <slot name="suffix" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    type?: 'text' | 'number' | 'digit' | 'idcard'
    placeholder?: string
    maxlength?: number
    prefixIcon?: string
    clearable?: boolean
    password?: boolean
    disabled?: boolean
    error?: boolean
    focus?: boolean
    compact?: boolean
    confirmType?: 'done' | 'send' | 'search' | 'next' | 'go'
    placeholderStyle?: string
  }>(),
  {
    type: 'text',
    placeholder: '',
    maxlength: 140,
    prefixIcon: '',
    clearable: false,
    password: false,
    disabled: false,
    error: false,
    focus: false,
    compact: false,
    confirmType: 'done',
    placeholderStyle: 'color: #B5B5BE; font-size: 15px;',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'focus', value: unknown): void
  (event: 'blur', value: unknown): void
  (event: 'confirm', value: unknown): void
}>()

const focused = ref(false)
const revealed = ref(false)

const inputType = computed(() => (props.password ? 'text' : props.type))

function onInput(event: { detail: { value: string } }): void {
  emit('update:modelValue', event.detail.value)
}

function onFocus(event: unknown): void {
  focused.value = true
  emit('focus', event)
}

function onBlur(event: unknown): void {
  focused.value = false
  emit('blur', event)
}

function onConfirm(event: unknown): void {
  emit('confirm', event)
}

function onClear(): void {
  emit('update:modelValue', '')
}

function toggleReveal(): void {
  revealed.value = !revealed.value
}
</script>

<style lang="scss" scoped>
.app-input {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: dp(52);
  padding: 0 dp(16);
  background: $sj-surface;
  border: 1px solid $sj-border;
  border-radius: dp($sj-radius-input);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.app-input--focus {
  border-color: rgba(255, 92, 77, 0.55);
  box-shadow: 0 0 0 3px rgba(255, 92, 77, 0.09);
}

.app-input--error {
  border-color: rgba(255, 59, 48, 0.55);
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.07);
}

.app-input--disabled {
  opacity: 0.6;
}

.app-input--compact {
  height: dp(38);
  padding: 0 dp(12);
  background: $sj-bg;
  border-color: transparent;
  border-radius: dp(12);
}

.app-input--compact .app-input__control {
  font-size: dp(14);
}

.app-input__prefix {
  margin-right: dp(10);
  opacity: 0.9;
}

.app-input__control {
  flex: 1;
  width: 100%;
  min-width: 0;
  height: 100%;
  color: $sj-text;
  font-size: dp($sj-font-input);
  line-height: 1.2;
}

.app-input__placeholder {
  color: $sj-text-weak;
}

.app-input__action {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: dp(28);
  height: dp(28);
  margin-left: dp(6);
  border-radius: 50%;
}

.app-input__action--hover {
  background: $sj-surface-muted;
}
</style>
