import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { apiUrls } from '@/config/api'


export function useBuffMessageBox() {
  const loading = ref(false)
  const searchText = ref('')
  const messageTypeFilter = ref([])
  const dateRange = ref(null)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalItems = ref(0)
  const messageData = ref([])
  const messageTypes = ref([])
  // 同步相关
  const accountList = ref([])
  const selectedAccount = ref('')
  const syncing = ref(false)

  const fetchMessageTypes = async () => {
    try {
      const response = await axios.get(apiUrls.buffMessageTypes())
      if (response.data.success) {
        messageTypes.value = response.data.data
      } else {
        console.warn('获取BUFF消息类型失败:', response.data.message || response.data.error)
        // 如果后端返回失败，使用默认类型列表
        messageTypes.value = []
      }
    } catch (error) {
      console.error('获取BUFF消息类型失败:', error)
      // 如果请求失败，使用空数组，不影响其他功能
      messageTypes.value = []
      // 只在非 500 错误时显示提示（500 错误通常是后端问题，用户无法解决）
      if (error.response && error.response.status !== 500) {
        ElMessage.warning('获取消息类型列表失败，将使用默认类型')
      }
    }
  }

  const fetchMessages = async () => {
    loading.value = true
    try {
      const response = await axios.get(apiUrls.buffMessageData(currentPage.value, pageSize.value))
      if (response.data.success) {
        messageData.value = response.data.data
        totalItems.value = response.data.total || 0
      } else {
        ElMessage.error(response.data.error || response.data.message || '获取消息列表失败')
      }
    } catch (error) {
      console.error('获取BUFF消息列表失败:', error)
      ElMessage.error('获取消息列表失败')
    } finally {
      loading.value = false
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(apiUrls.getBuffAccounts())
      if (response.data.success) {
        accountList.value = response.data.data || []
        if (accountList.value.length && !selectedAccount.value) {
          selectedAccount.value = accountList.value[0].steam_id
        }
      }
    } catch (error) {
      console.error('获取BUFF账号列表失败:', error)
      accountList.value = []
    }
  }

  // 同步消息：mode='new' 增量，mode='history' 全量
  const syncMessages = async (mode) => {
    if (!selectedAccount.value) {
      ElMessage.warning('请先选择BUFF账号')
      return
    }
    syncing.value = true
    try {
      const url = mode === 'history'
        ? apiUrls.buffSyncHistoryMessages()
        : apiUrls.buffSyncNewMessages()
      const response = await axios.post(url, { steamID: selectedAccount.value })
      if (response.data.success) {
        ElMessage.success(response.data.message || '同步完成')
        currentPage.value = 1
        await fetchMessages()
        await fetchMessageTypes()
      } else {
        ElMessage.error(response.data.message || '同步失败')
      }
    } catch (error) {
      console.error('同步BUFF消息失败:', error)
      ElMessage.error(error.response?.data?.message || '同步失败，请检查Spider服务是否运行')
    } finally {
      syncing.value = false
    }
  }

  const handleSyncNew = () => syncMessages('new')
  const handleSyncHistory = () => syncMessages('history')

  const handleSearch = async () => {
    // 仅做前端过滤显示（后端未提供搜索接口）
    currentPage.value = 1
  }

  const handleClearSearch = () => {
    searchText.value = ''
    messageTypeFilter.value = []
    dateRange.value = null
    currentPage.value = 1
    fetchMessages()
  }

  const handleTypeChange = async () => {
    // 仅前端过滤
    currentPage.value = 1
  }

  const handleTimeSearch = async () => {
    // 仅前端过滤（如需后端时间搜索，可新增接口）
    currentPage.value = 1
  }

  const handleDateRangeChange = (value) => {
    dateRange.value = value
  }

  const handleCurrentChange = (page) => {
    currentPage.value = page
    fetchMessages()
  }

  const handleSizeChange = (size) => {
    pageSize.value = size
    currentPage.value = 1
    fetchMessages()
  }

  const getMessageTypeColor = (type) => {
    const colorMap = {
      '购买': 'success',
      '出售': 'warning',
      '租赁': 'primary',
      '提取': 'info',
      '诚信卖家': 'danger'
    }
    return colorMap[type] || 'info'
  }

  const filteredMessageData = computed(() => {
    let data = messageData.value
    if (messageTypeFilter.value && messageTypeFilter.value.length) {
      data = data.filter(d => messageTypeFilter.value.includes(d.sentName))
    }
    if (searchText.value && searchText.value.trim()) {
      const kw = searchText.value.trim()
      data = data.filter(d =>
        String(d.title || '').includes(kw) ||
        String(d.message_text || '').includes(kw) ||
        String(d.orderNo || '').includes(kw)
      )
    }
    if (dateRange.value && dateRange.value.length === 2) {
      const [start, end] = dateRange.value
      data = data.filter(d => d.createTime >= start && d.createTime <= end)
    }
    return data
  })

  onMounted(() => {
    fetchMessages()
    fetchMessageTypes()
    fetchAccounts()
  })

  return {
    loading,
    accountList,
    selectedAccount,
    syncing,
    handleSyncNew,
    handleSyncHistory,
    searchText,
    messageTypeFilter,
    dateRange,
    currentPage,
    pageSize,
    totalItems,
    messageData,
    messageTypes,
    filteredMessageData,
    handleSearch,
    handleClearSearch,
    handleTypeChange,
    handleTimeSearch,
    handleDateRangeChange,
    handleCurrentChange,
    handleSizeChange,
    getMessageTypeColor
  }
}
