import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { apiUrls } from '@/config/api'

// 系统公告在 igxe_messagebox 表中固定用 category = -1，
// 与 Spider 侧 igxe_message_box/message_box.py 的 CATEGORY_SYSTEM 保持一致
const CATEGORY_SYSTEM = -1

export function useIgxeMessageBox() {
  const loading = ref(false)
  const searchText = ref('')
  const categoryFilter = ref([])
  const dateRange = ref(null)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const totalItems = ref(0)
  const messageData = ref([])
  const categories = ref([])
  // 同步相关
  const accountList = ref([])
  const selectedAccount = ref('')
  const syncing = ref(false)

  const fetchCategories = async () => {
    try {
      const response = await axios.get(apiUrls.igxeMessageCategories())
      if (response.data.success) {
        categories.value = response.data.data || []
      } else {
        categories.value = []
      }
    } catch (error) {
      console.error('获取IGXE消息分类失败:', error)
      categories.value = []
    }
  }

  const fetchMessages = async () => {
    loading.value = true
    try {
      const response = await axios.get(apiUrls.igxeMessageData(currentPage.value, pageSize.value))
      if (response.data.success) {
        messageData.value = response.data.data || []
        totalItems.value = response.data.total || 0
      } else {
        ElMessage.error(response.data.error || response.data.message || '获取消息列表失败')
      }
    } catch (error) {
      console.error('获取IGXE消息列表失败:', error)
      ElMessage.error('获取消息列表失败')
    } finally {
      loading.value = false
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(apiUrls.getIgxeAccounts())
      if (response.data.success) {
        accountList.value = response.data.data || []
        if (accountList.value.length && !selectedAccount.value) {
          selectedAccount.value = accountList.value[0].steam_id
        }
      }
    } catch (error) {
      console.error('获取IGXE账号列表失败:', error)
      accountList.value = []
    }
  }

  // 同步消息：mode='new' 增量，mode='history' 全量
  const syncMessages = async (mode) => {
    if (!selectedAccount.value) {
      ElMessage.warning('请先选择IGXE账号')
      return
    }
    syncing.value = true
    try {
      const url = mode === 'history'
        ? apiUrls.igxeSyncHistoryMessages()
        : apiUrls.igxeSyncNewMessages()
      const response = await axios.post(url, { steamID: selectedAccount.value })
      if (response.data.success) {
        ElMessage.success(response.data.message || '同步完成')
        currentPage.value = 1
        await fetchMessages()
        await fetchCategories()
      } else {
        ElMessage.error(response.data.message || '同步失败')
      }
    } catch (error) {
      console.error('同步IGXE消息失败:', error)
      ElMessage.error(error.response?.data?.message || '同步失败，请检查Spider服务是否运行')
    } finally {
      syncing.value = false
    }
  }

  const handleSyncNew = () => syncMessages('new')
  const handleSyncHistory = () => syncMessages('history')

  const handleClearSearch = () => {
    searchText.value = ''
    categoryFilter.value = []
    dateRange.value = null
    currentPage.value = 1
    fetchMessages()
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

  const getCategoryLabel = (category) => {
    if (category === CATEGORY_SYSTEM) return '系统公告'
    return `分类 ${category}`
  }

  const getCategoryColor = (category) => {
    if (category === CATEGORY_SYSTEM) return 'info'
    const colors = ['primary', 'success', 'warning', 'danger']
    return colors[Math.abs(Number(category) || 0) % colors.length]
  }

  // 搜索/分类/时间均为前端过滤，与 BUFF 消息盒子行为一致
  const filteredMessageData = computed(() => {
    let data = messageData.value
    if (categoryFilter.value && categoryFilter.value.length) {
      data = data.filter(d => categoryFilter.value.includes(d.category))
    }
    if (searchText.value && searchText.value.trim()) {
      const kw = searchText.value.trim()
      data = data.filter(d =>
        String(d.title || '').includes(kw) ||
        String(d.content || '').includes(kw) ||
        String(d.biz_id || '').includes(kw)
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
    fetchCategories()
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
    categoryFilter,
    dateRange,
    currentPage,
    pageSize,
    totalItems,
    messageData,
    categories,
    filteredMessageData,
    handleClearSearch,
    handleCurrentChange,
    handleSizeChange,
    getCategoryLabel,
    getCategoryColor
  }
}
