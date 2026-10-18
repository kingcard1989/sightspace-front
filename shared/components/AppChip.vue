<template>
  <view
    class="chip"
    :class="[
      { 'chip--active': active, 'chip--disabled': disabled },
      size === 'small' ? 'chip--small' : '',
    ]"
    hover-class="chip--hover"
    :hover-stay-time="60"
    @tap="onTap"
  >
    <slot>
      <text class="chip__label">{{ label }}</text>
    </slot>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label?: string
    active?: boolean
    disabled?: boolean
    size?: 'normal' | 'small'
  }>(),
  {
    label: '',
    active: false,
    disabled: false,
    size: 'normal',
  },
)

const emit = defineEmits<{
  (event: 'click'): void
}>()

function onTap(): void {
  if (props.disabled) return
  emit('click')
}
</script>

<style lang="scss" scoped>
.chip {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: dp(34);
  padding: 0 dp(15);
  background: $sj-surface;
  border: 1px solid $sj-border;
  border-radius: dp($sj-radius-pill);
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}

.chip--small {
  height: dp(28);
  padding: 0 dp(11);
}

.chip--active {
  background: $sj-text;
  border-color: $sj-text;
}

.chip--disabled {
  opacity: 0.45;
}

.chip--hover {
  opacity: 0.78;
}

.chip__label {
  color: $sj-text-secondary;
  font-size: dp(13);
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.chip--small .chip__label {
  font-size: dp(12);
}

.chip--active .chip__label {
  color: $sj-text-inverse;
}
</style>
