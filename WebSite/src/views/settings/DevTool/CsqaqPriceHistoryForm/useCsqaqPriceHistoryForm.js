import { ref, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { apiUrls } from '@/config/api.js'

export default function useCsqaqPriceHistoryForm() {
  // 采集选项
  const selectedPlatforms = ref([1, 2])  // 1-BUFF 2-悠悠有品 3-Steam
  const selectedKeys = ref(['sell_price', 'sell_num'])
  const skipExisting = ref(true)

  // 任务状态
  const fetching = ref(false)
  const stopping = ref(false)
  const progress = ref(null)  // { current, total, fetched, skipped, failed, rows_written, good_id, name }
  const finishedStatus = ref('')  // '' | 'complete' | 'stopped' | 'error'

  const progressPercent = computed(() => {
    if (!progress.value?.total) return 0
    return Math.floor(progress.value.current * 100 / progress.value.total)
  })

  const startFetch = async () => {
    if (fetching.value) return
    if (!selectedPlatforms.value.length) {
      ElMessage.warning('请至少选择一个平台')
      return
    }
    if (!selectedKeys.value.length) {
      ElMessage.warning('请至少选择一个指标')
      return
    }

    fetching.value = true
    finishedStatus.value = ''
    progress.value = null

    try {
      const response = await fetch(apiUrls.csqaqFetchPriceHistory(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selectedPlatforms.value,
          keys: selectedKeys.value,
          period: 1095,
          skip_existing: skipExisting.value
        })
      })

      if (!response.ok) {
        let message = `服务器响应异常: ${response.status}`
        try {
          const errBody = await response.json()
          message = errBody.message || message
        } catch (e) { /* 非JSON响应，保留默认提示 */ }
        throw new Error(message)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // 保留未完成的行

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'start') {
              progress.value = {
                current: 0, total: event.total,
                fetched: 0, skipped: 0, failed: 0, rows_written: 0,
                good_id: null, name: ''
              }
            } else if (event.type === 'progress' || event.type === 'complete' || event.type === 'stopped') {
              progress.value = { ...progress.value, ...event }
              if (event.type === 'complete') {
                finishedStatus.value = 'complete'
                ElMessage.success(`采集完成：成功 ${event.fetched}，跳过 ${event.skipped}，失败 ${event.failed}，写入 ${event.rows_written} 行`)
              } else if (event.type === 'stopped') {
                finishedStatus.value = 'stopped'
                ElMessage.warning('采集已停止，再次启动可从断点继续（跳过已采集饰品）')
              }
            } else if (event.type === 'error') {
              finishedStatus.value = 'error'
              ElMessage.error(event.error || '采集失败')
            }
          } catch (e) {
            console.error('解析进度事件失败:', e, line)
          }
        }
      }
    } catch (error) {
      console.error('CSQAQ历史价格采集失败:', error)
      finishedStatus.value = 'error'
      ElMessage.error(error.message || '采集失败，请检查后端服务')
    } finally {
      fetching.value = false
      stopping.value = false
    }
  }

  const stopFetch = async () => {
    if (!fetching.value || stopping.value) return
    stopping.value = true
    try {
      const response = await axios.post(apiUrls.csqaqStopFetchPriceHistory())
      ElMessage.info(response.data.message || '停止信号已发送')
    } catch (error) {
      console.error('停止采集失败:', error)
      stopping.value = false
      ElMessage.error('停止采集失败')
    }
  }

  return {
    selectedPlatforms,
    selectedKeys,
    skipExisting,
    fetching,
    stopping,
    progress,
    progressPercent,
    finishedStatus,
    startFetch,
    stopFetch
  }
}
