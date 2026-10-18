<template>
  <view
    class="checkbox"
    :class="{ 'checkbox--checked': modelValue, 'checkbox--disabled': disabled }"
    hover-class="checkbox--hover"
    :hover-stay-time="60"
    @tap="toggle"
  >
    <view class="checkbox__box">
      <AppIcon v-if="modelValue" name="check-white" :size="12" />
    </view>
    <view class="checkbox__label">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

function toggle(): void {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<style lang="scss" scoped>
.checkbox {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  width: 100%;
}

.checkbox--disabled {
  opacity: 0.5;
}

.checkbox--hover {
  opacity: 0.78;
}

.checkbox__box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: dp(18);
  height: dp(18);
  margin-top: dp(1);
  background: $sj-surface;
  border: 1px solid #d6d6de;
  border-radius: dp(6);
  transition: background 0.16s ease, border-color 0.16s ease;
}

.checkbox--checked .checkbox__box {
  background: $sj-accent;
  border-color: $sj-accent;
}

.checkbox__label {
  flex: 1;
  min-width: 0;
  margin-left: dp(8);
  color: $sj-text-secondary;
  font-size: dp(12);
  line-height: 1.55;
}
</style>
