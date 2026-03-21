const COOKIE_MONTH_DISPLAY = 'f_schedule_month_display'
const COOKIE_WEEK_START = 'f_schedule_week_start'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export type MonthDisplayMode = 'list' | 'calendar'
export type WeekStartMode = 'sunday' | 'monday'

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const prefix = `${encodeURIComponent(name)}=`
  const parts = document.cookie.split('; ')
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length))
    }
  }
  return null
}

const setCookie = (name: string, value: string, maxAgeSeconds = ONE_YEAR_SECONDS): void => {
  if (typeof document === 'undefined') return
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}`
}

export const readMonthDisplayMode = (): MonthDisplayMode => {
  const raw = getCookie(COOKIE_MONTH_DISPLAY)
  if (raw === 'calendar') return 'calendar'
  return 'list'
}

export const readWeekStartMode = (): WeekStartMode => {
  const raw = getCookie(COOKIE_WEEK_START)
  if (raw === 'monday') return 'monday'
  return 'sunday'
}

export const persistMonthDisplayMode = (mode: MonthDisplayMode): void => {
  setCookie(COOKIE_MONTH_DISPLAY, mode)
}

export const persistWeekStartMode = (mode: WeekStartMode): void => {
  setCookie(COOKIE_WEEK_START, mode)
}
