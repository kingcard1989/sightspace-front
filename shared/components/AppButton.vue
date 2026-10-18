<template>
  <button
    class="app-button"
    :class="[
      `app-button--${type}`,
      `app-button--${size}`,
      {
        'app-button--block': block,
        'app-button--disabled': disabled || loading,
      },
    ]"
    :disabled="disabled || loading"
    hover-class="app-button--hover"
    :hover-stay-time="60"
    @tap="onTap"
  >
    <AppSpinner
      v-if="loading"
      :size="size === 'small' ? 12 : 16"
      :color="type === 'primary' ? '#FFFFFF' : '#FF5C4D'"
      :track-color="type === 'primary' ? 'rgba(255,255,255,0.35)' : 'rgba(255,92,77,0.2)'"
    />
    <text v-if="loading && loadingText" class="app-button__text">{{ loadingText }}</text>
    <slot v-else>
      <text class="app-button__text">{{ label }}</text>
    </slot>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    type?: 'primary' | 'secondary' | 'ghost' | 'text'
    size?: 'normal' | 'small'
    block?: boolean
    disabled?: boolean
    loading?: boolean
    loadingText?: string
  }>(),
  {
    label: '',
    type: 'primary',
    size: 'normal',
    block: false,
    disabled: false,
    loading: false,
    loadingText: '',
  },
)

const emit = defineEmits<{
  (event: 'click'): void
}>()

function onTap(): void {
  emit('click')
}
</script>

<style lang="scss" scoped>
.app-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: dp(8);
  min-width: 0;
  padding: 0 dp(24);
  border-radius: dp($sj-radius-pill);
  font-size: dp($sj-font-button);
  font-weight: 600;
  line-height: 1;
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.app-button--normal {
  height: dp(52);
}

.app-button--small {
  height: dp(38);
  padding: 0 dp(18);
  font-size: dp(13);
  gap: dp(6);
}

.app-button--block {
  width: 100%;
}

.app-button--primary {
  color: $sj-text-inverse;
  background: $sj-accent;
  box-shadow: 0 dp(10) dp(24) rgba(255, 92, 77, 0.22);
}

.app-button--secondary {
  color: $sj-text;
  background: $sj-surface;
  border: 1px solid $sj-border;
}

.app-button--ghost {
  color: $sj-accent;
  background: $sj-accent-wash;
}

.app-button--text {
  height: auto;
  padding: 0;
  color: $sj-text-secondary;
  background: transparent;
  font-weight: 500;
}

.app-button--disabled {
  opacity: 0.5;
  box-shadow: none;
}

.app-button--hover {
  opacity: 0.82;
  transform: scale(0.985);
}

.app-button__text {
  line-height: 1.2;
}
</style>
