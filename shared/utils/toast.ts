export function showToast(title: string, duration = 1800): void {
  uni.showToast({
    title,
    icon: 'none',
    duration,
    mask: false,
  })
}

export function showSuccess(title: string, duration = 1600): void {
  uni.showToast({
    title,
    icon: 'success',
    duration,
    mask: false,
  })
}

export function showLoading(title = '请稍候...'): void {
  uni.showLoading({
    title,
    mask: true,
  })
}

export function hideLoading(): void {
  uni.hideLoading()
}
