import { computed, ref } from 'vue'

const SEARCH_FIELDS = ['usageCategory', 'roomUsage', 'floorAreaType', 'remark', 'roomLevel', 'roomNumber']

export function useCalibrationRoomTableFilter(getRoomRows) {
  const keyword = ref('')

  const normalizedKeyword = computed(() => String(keyword.value || '').trim().toLowerCase())

  const isFiltering = computed(() => normalizedKeyword.value.length > 0)

  const filteredRoomInfoData = computed(() => {
    const rows = getRoomRows() || []
    const kw = normalizedKeyword.value
    if (!kw) return rows
    return rows.filter((row) =>
      SEARCH_FIELDS.some((field) => String(row?.[field] ?? '').toLowerCase().includes(kw))
    )
  })

  const filteredCount = computed(() => filteredRoomInfoData.value.length)

  const clearKeyword = () => {
    keyword.value = ''
  }

  return {
    keyword,
    isFiltering,
    filteredRoomInfoData,
    filteredCount,
    clearKeyword
  }
}
