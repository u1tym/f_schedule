<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from './api'
import type { ScheduleListItem, SchedulePayload, ScheduleType } from './types'

interface DayRow {
  date: Date
  dateKey: string
  day: number
  weekdayLabel: string
  schedules: ScheduleListItem[]
  holidayName: string
  isHoliday: boolean
  isSaturday: boolean
  isSunday: boolean
}

type DialogMode = 'create' | 'edit'

interface FormState {
  title: string
  scheduleType: ScheduleType
  categoryId: string
  isAllDay: boolean
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  isTodoCompleted: boolean
  location: string
  details: string
}

const today = new Date()
const currentMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const categories = ref<{ id: number; name: string }[]>([])
const holidays = ref<Record<string, string>>({})
const schedules = ref<ScheduleListItem[]>([])

const isLoading = ref(false)
const errorMessage = ref('')

const showDialog = ref(false)
const dialogMode = ref<DialogMode>('create')
const editingId = ref<number | null>(null)
const formError = ref('')
const selectedDateForCreate = ref('')

const form = reactive<FormState>({
  title: '',
  scheduleType: '予定',
  categoryId: '',
  isAllDay: false,
  startDate: '',
  endDate: '',
  startTime: '09:00',
  endTime: '10:00',
  isTodoCompleted: false,
  location: '',
  details: '',
})

const weekdays = ['日', '月', '火', '水', '木', '金', '土']
const categoryColors = ['#e0f2fe', '#dcfce7', '#fef3c7', '#fce7f3', '#ede9fe', '#ffedd5', '#ccfbf1']

const monthLabel = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth() + 1
  return `${year}年${String(month).padStart(2, '0')}月`
})

const monthRange = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return { start, end }
})

const dayRows = computed<DayRow[]>(() => {
  const rows: DayRow[] = []
  const { start, end } = monthRange.value
  const dayCount = end.getDate()
  for (let day = 1; day <= dayCount; day += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), day)
    const dateKey = toDateKey(date)
    const weekday = date.getDay()
    const holidayName = holidays.value[dateKey] || ''
    rows.push({
      date,
      dateKey,
      day,
      weekdayLabel: weekdays[weekday],
      schedules: schedulesForDay(dateKey),
      holidayName,
      isHoliday: Boolean(holidayName),
      isSaturday: weekday === 6,
      isSunday: weekday === 0,
    })
  }
  return rows
})

const categoryColorMap = computed(() => {
  const map = new Map<number, string>()
  categories.value.forEach((category, index) => {
    map.set(category.id, categoryColors[index % categoryColors.length])
  })
  return map
})

const toDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toDateTimeString = (date: string, time = '00:00'): string => `${date}T${time}:00`

const parseDate = (value: string): Date => new Date(`${value}T00:00:00`)

const formatClock = (iso: string): string => {
  const date = new Date(iso)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const schedulesForDay = (dateKey: string): ScheduleListItem[] => {
  return schedules.value.filter((item) => {
    if (item.is_all_day && item.start_date && item.end_date) {
      return dateKey >= item.start_date && dateKey <= item.end_date
    }
    if (!item.is_all_day && item.start_datetime) {
      return item.start_datetime.slice(0, 10) === dateKey
    }
    return false
  })
}

const scheduleText = (item: ScheduleListItem): string => {
  if (item.is_all_day) {
    return item.title
  }
  if (!item.start_datetime || !item.end_datetime) {
    return item.title
  }
  return `${formatClock(item.start_datetime)}～${formatClock(item.end_datetime)} ${item.title}`
}

const scheduleClass = (row: DayRow): string => {
  if (row.isHoliday || row.isSunday) {
    return 'sun-holiday'
  }
  if (row.isSaturday) {
    return 'saturday'
  }
  return 'weekday'
}

const backgroundColor = (item: ScheduleListItem): string => {
  return categoryColorMap.value.get(item.activity_category_id) || '#f3f4f6'
}

const toPayload = (): SchedulePayload => {
  if (!form.title.trim()) {
    throw new Error('タイトルを入力してください。')
  }
  if (!form.categoryId) {
    throw new Error('カテゴリを選択してください。')
  }

  if (form.isAllDay) {
    if (!form.startDate || !form.endDate) {
      throw new Error('開始日と終了日を入力してください。')
    }
    const start = parseDate(form.startDate)
    const end = parseDate(form.endDate)
    if (end < start) {
      throw new Error('終了日は開始日以降を指定してください。')
    }
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
    return {
      title: form.title.trim(),
      start_datetime: toDateTimeString(form.startDate),
      duration: days,
      is_all_day: true,
      activity_category_id: Number(form.categoryId),
      schedule_type: form.scheduleType,
      location: form.location.trim(),
      details: form.details.trim(),
      is_todo_completed: form.scheduleType === 'TODO' ? form.isTodoCompleted : false,
    }
  }

  if (!form.startDate || !form.startTime || !form.endTime) {
    throw new Error('日付と時間を入力してください。')
  }
  const startDateTime = new Date(toDateTimeString(form.startDate, form.startTime))
  const endDateTime = new Date(toDateTimeString(form.startDate, form.endTime))
  if (endDateTime <= startDateTime) {
    throw new Error('終了時刻は開始時刻より後にしてください。')
  }
  const minutes = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 60000)
  return {
    title: form.title.trim(),
    start_datetime: toDateTimeString(form.startDate, form.startTime),
    duration: minutes,
    is_all_day: false,
    activity_category_id: Number(form.categoryId),
    schedule_type: form.scheduleType,
    location: form.location.trim(),
    details: form.details.trim(),
    is_todo_completed: form.scheduleType === 'TODO' ? form.isTodoCompleted : false,
  }
}

const openCreateDialog = (dateKey: string): void => {
  dialogMode.value = 'create'
  editingId.value = null
  formError.value = ''
  selectedDateForCreate.value = dateKey
  form.title = ''
  form.scheduleType = '予定'
  form.categoryId = categories.value[0] ? String(categories.value[0].id) : ''
  form.isAllDay = false
  form.startDate = dateKey
  form.endDate = dateKey
  form.startTime = '09:00'
  form.endTime = '10:00'
  form.isTodoCompleted = false
  form.location = ''
  form.details = ''
  showDialog.value = true
}

const openEditDialog = async (item: ScheduleListItem): Promise<void> => {
  dialogMode.value = 'edit'
  editingId.value = item.id
  formError.value = ''
  form.title = item.title
  form.scheduleType = item.schedule_type
  form.categoryId = String(item.activity_category_id)
  form.isAllDay = item.is_all_day
  form.isTodoCompleted = Boolean(item.is_todo_completed)
  form.location = ''
  form.details = ''
  if (item.is_all_day && item.start_date && item.end_date) {
    form.startDate = item.start_date
    form.endDate = item.end_date
    form.startTime = '09:00'
    form.endTime = '10:00'
  } else if (item.start_datetime && item.end_datetime) {
    form.startDate = item.start_datetime.slice(0, 10)
    form.endDate = item.start_datetime.slice(0, 10)
    form.startTime = item.start_datetime.slice(11, 16)
    form.endTime = item.end_datetime.slice(11, 16)
  }
  try {
    const detail = await api.getSchedule(item.id)
    form.location = detail.location || ''
    form.details = detail.details || ''
  } catch (_error) {
    // Keep list data for editing even if detail fetch fails.
  }
  showDialog.value = true
}

const closeDialog = (): void => {
  showDialog.value = false
}

const saveSchedule = async (): Promise<void> => {
  formError.value = ''
  try {
    const payload = toPayload()
    if (dialogMode.value === 'create') {
      await api.createSchedule(payload)
    } else if (editingId.value !== null) {
      await api.updateSchedule(editingId.value, payload)
    }
    showDialog.value = false
    await loadMonthData()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存に失敗しました。'
  }
}

const removeSchedule = async (): Promise<void> => {
  if (editingId.value === null) {
    return
  }
  const ok = window.confirm('この予定を削除しますか？')
  if (!ok) {
    return
  }
  try {
    await api.deleteSchedule(editingId.value)
    showDialog.value = false
    await loadMonthData()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '削除に失敗しました。'
  }
}

const shiftMonth = async (delta: number): Promise<void> => {
  const date = currentMonth.value
  currentMonth.value = new Date(date.getFullYear(), date.getMonth() + delta, 1)
  await loadMonthData()
}

const toggleView = (): void => {
  window.alert('表示切替は今後実装予定です。')
}

const loadMonthData = async (): Promise<void> => {
  const fromDate = toDateKey(monthRange.value.start)
  const toDate = toDateKey(monthRange.value.end)
  isLoading.value = true
  errorMessage.value = ''
  try {
    const [categoryData, holidayData, scheduleData] = await Promise.all([
      api.getActivityCategories(),
      api.getHolidays(fromDate, toDate),
      api.getSchedules(fromDate, toDate),
    ])
    categories.value = categoryData
    holidays.value = holidayData.reduce<Record<string, string>>((acc, holiday) => {
      acc[holiday.date] = holiday.name
      return acc
    }, {})
    schedules.value = scheduleData
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'データの取得に失敗しました。'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadMonthData()
})
</script>

<template>
  <main class="mobile-root">
    <header class="header">
      <button class="icon-button" type="button" @click="toggleView">表示切替</button>
      <div class="month-nav">
        <button type="button" class="nav-button" @click="shiftMonth(-1)">＜</button>
        <strong>{{ monthLabel }}</strong>
        <button type="button" class="nav-button" @click="shiftMonth(1)">＞</button>
      </div>
    </header>

    <p v-if="errorMessage" class="message error">{{ errorMessage }}</p>
    <p v-if="isLoading" class="message">読み込み中...</p>

    <section class="day-list">
      <article
        v-for="row in dayRows"
        :key="row.dateKey"
        class="day-row"
        @click="openCreateDialog(row.dateKey)"
      >
        <div class="date-col" :class="scheduleClass(row)">
          <span class="day-number">{{ row.day }}</span>
          <span class="weekday">({{ row.weekdayLabel }})</span>
        </div>
        <div class="schedule-col">
          <p v-if="row.holidayName" class="holiday-name">{{ row.holidayName }}</p>
          <div
            v-for="item in row.schedules"
            :key="item.id"
            class="schedule-chip"
            :style="{ backgroundColor: backgroundColor(item) }"
            @click.stop="openEditDialog(item)"
          >
            <template v-if="item.schedule_type === 'TODO'">
              <span class="todo-box">{{ item.is_todo_completed ? '☑' : '□' }}</span>
              <span :class="{ completed: item.is_todo_completed }">{{ scheduleText(item) }}</span>
            </template>
            <template v-else>
              <span>{{ scheduleText(item) }}</span>
            </template>
          </div>
        </div>
      </article>
    </section>
  </main>

  <div v-if="showDialog" class="dialog-backdrop" @click.self="closeDialog">
    <section class="dialog-card">
      <h2>{{ dialogMode === 'create' ? '新規スケジュール' : 'スケジュール編集' }}</h2>
      <p class="dialog-mode-date" v-if="dialogMode === 'create'">
        日付: {{ selectedDateForCreate }}
      </p>
      <p v-if="formError" class="message error">{{ formError }}</p>

      <label>
        タイトル
        <input v-model="form.title" type="text" />
      </label>

      <label>
        種別
        <select v-model="form.scheduleType">
          <option value="予定">予定</option>
          <option value="TODO">TODO</option>
        </select>
      </label>

      <label>
        カテゴリ
        <select v-model="form.categoryId">
          <option v-for="category in categories" :key="category.id" :value="String(category.id)">
            {{ category.name }}
          </option>
        </select>
      </label>

      <label class="checkbox-line">
        <input v-model="form.isAllDay" type="checkbox" />
        終日
      </label>

      <label>
        開始日
        <input v-model="form.startDate" type="date" />
      </label>

      <label v-if="form.isAllDay">
        終了日
        <input v-model="form.endDate" type="date" />
      </label>

      <template v-else>
        <label>
          開始時刻
          <input v-model="form.startTime" type="time" />
        </label>
        <label>
          終了時刻
          <input v-model="form.endTime" type="time" />
        </label>
      </template>

      <label v-if="form.scheduleType === 'TODO'" class="checkbox-line">
        <input v-model="form.isTodoCompleted" type="checkbox" />
        実施済み
      </label>

      <label>
        場所
        <input v-model="form.location" type="text" />
      </label>

      <label>
        詳細
        <textarea v-model="form.details" rows="3" />
      </label>

      <div class="dialog-actions">
        <button type="button" @click="closeDialog">閉じる</button>
        <button type="button" class="primary" @click="saveSchedule">保存</button>
        <button v-if="dialogMode === 'edit'" type="button" class="danger" @click="removeSchedule">
          削除
        </button>
      </div>
    </section>
  </div>
</template>
