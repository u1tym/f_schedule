const DEFAULT_API_ORIGIN = 'http://127.0.0.1:8000'

export const appConfig = {
  apiOrigin: import.meta.env.VITE_API_ORIGIN || DEFAULT_API_ORIGIN,
  apiDevPrefix: '/api',
} as const

export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return appConfig.apiDevPrefix
  }
  return appConfig.apiOrigin
}
