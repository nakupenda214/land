import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { addBenchmarkCase } from '@/services/agent-management.service.js'
import { addBenchmarkRecordToState } from '@/utils/selfopt-benchmark-record.js'

export function useSelfOptimizeBenchmarkPanel() {
  const state = ref({ benchmarks: [] })
  const submitLoading = ref(false)
  const form = reactive({
    userQuery: '',
    expectedNode: '',
    expectedResult: '',
    expectedCount: undefined,
    caseType: 'regression',
    priority: 5,
    mustPass: true,
    toleranceThreshold: 0,
  })

  const records = computed(() => state.value.benchmarks || [])

  function saveState(next) {
    state.value = next
  }

  function resetForm() {
    form.userQuery = ''
    form.expectedNode = ''
    form.expectedResult = ''
    form.expectedCount = undefined
    form.caseType = 'regression'
    form.priority = 5
    form.mustPass = true
    form.toleranceThreshold = 0
  }

  async function submitCase() {
    if (!form.userQuery) {
      ElMessage.warning('用户问题不能为空')
      return
    }
    submitLoading.value = true
    try {
      const payload = {
        userQuery: form.userQuery,
        expectedNode: form.expectedNode,
        expectedResult: form.expectedResult,
        expectedCount:
          form.expectedCount != null && form.expectedCount !== ''
            ? Number(form.expectedCount)
            : undefined,
        caseType: form.caseType,
        priority: form.priority,
        mustPass: form.mustPass,
        toleranceThreshold: form.toleranceThreshold,
      }
      const data = await addBenchmarkCase(payload)
      const next = addBenchmarkRecordToState(state.value, data || payload)
      saveState(next)
      resetForm()
      ElMessage.success('基准用例新增成功')
    } catch (e) {
      ElMessage.error(e?.message || '新增基准用例失败')
    } finally {
      submitLoading.value = false
    }
  }

  return {
    form,
    submitLoading,
    records,
    submitCase,
  }
}
