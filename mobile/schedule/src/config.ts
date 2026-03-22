const DEFAULT_API_ORIGIN = 'http://127.0.0.1:8000'
const DEFAULT_CONFIG_API_ORIGIN = 'http://127.0.0.1:8000'

export const appConfig = {
  apiOrigin: import.meta.env.VITE_SCHEDULE_API_ORIGIN || DEFAULT_API_ORIGIN,
  apiDevPrefix: '/api',
  /** 本番: 設定 API のオリジン（GET/PUT /settings） */
  configApiOrigin: import.meta.env.VITE_CONFIG_API_ORIGIN || DEFAULT_CONFIG_API_ORIGIN,
} as const

/** スケジュール API（既存） */
export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return appConfig.apiDevPrefix
  }
  return appConfig.apiOrigin
}

/**
 * 設定 API（GET/PUT /settings）
 * 開発時はスケジュールと同一プロキシ `/api` 経由で同一ホストの `/settings` を呼ぶ想定。
 */
export const getConfigApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return appConfig.apiDevPrefix
  }
  return appConfig.configApiOrigin.replace(/\/$/, '')
}
