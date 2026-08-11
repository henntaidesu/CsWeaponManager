import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiUrls } from '@/config/api'
import { applyDeviceClass, watchDeviceType } from '@/utils/deviceDetect.js'

export function useSell() {
  const loading = ref(false)
  const sellData = ref([])
  const searchText = ref('')
  const statusFilter = ref('')
  const sourceFilter = ref('')
  const dataUserFilter = ref('')
  const weaponTypeFilter = ref([])
  const floatRangeFilter = ref([])
  const weaponTypes = ref([])
  const floatRanges = ref([])
  const statusList = ref([])
  const statusSubList = ref([])
  const sourceList = ref(['yyyp','buff','csfloat','SMK', 'C5game', 'igxe'])
  const dataUserList = ref([])
  const statusSubFilter = ref('')
  const currentPage = ref(1)
  const pageSize = ref(10)
  const totalItems = ref(0)
  const dateRange = ref(null)
  const isTimeSearchMode = ref(false)
  const sortOrder = ref('descending')
  
  // 预览弹窗相关
  const previewVisible = ref(false)
  const previewItem = ref(null)
  const yyypPriceInfo = ref({
    yyyp_price: null,
    yyyp_on_sale_count: null
  })
  const buffPriceInfo = ref({
    buff_price: null,
    buff_on_sale_count: null
  })
  const stickersPriceInfo = ref([])
  const pendantPriceInfo = ref(null)

  // 高级搜索相关
  const hasAdvancedFilters = computed(() => {
    return (searchText.value && searchText.value.trim()) || 
           !!statusFilter.value ||
           !!statusSubFilter.value ||
           !!sourceFilter.value ||
           !!dataUserFilter.value ||
           (weaponTypeFilter.value && weaponTypeFilter.value.length > 0) ||
           (floatRangeFilter.value && floatRangeFilter.value.length > 0) ||
           (dateRange.value && dateRange.value.length === 2)
  })
  const totalStats = ref({
    totalCount: 0,
    totalAmount: '0.00',
    avgPrice: '0.00',
    completedCount: 0,
    cancelledCount: 0,
    pendingCount: 0
  })

  const computeStatsFromData = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        totalCount: 0,
        totalAmount: '0.00',
        avgPrice: '0.00',
        completedCount: 0,
        cancelledCount: 0,
        pendingCount: 0
      }
    }

    let totalAmount = 0
    let sumForAvg = 0
    let avgCount = 0
    let completedCount = 0
    let cancelledCount = 0
    let pendingCount = 0

    data.forEach(item => {
      const price = Number(item.price) || 0
      if (item.status !== '已取消') {
        totalAmount += price
        sumForAvg += price
        avgCount += 1
      }
      if (item.status === '已完成') {
        completedCount += 1
      } else if (item.status === '已取消') {
        cancelledCount += 1
      } else if (item.status === '待收货') {
        pendingCount += 1
      }
    })

    const avgPrice = avgCount > 0 ? (sumForAvg / avgCount) : 0

    return {
      totalCount: data.length,
      totalAmount: totalAmount.toFixed(2),
      avgPrice: avgPrice.toFixed(2),
      completedCount,
      cancelledCount,
      pendingCount
    }
  }

  // 存储所有搜索结果，用于前端分页
  const allSearchResults = ref([])
  const isSearchMode = ref(false)

  const currentPageStats = computed(() => {
    // 基于当前页面显示的数据计算统计信息
    const currentData = filteredSellData.value
    const totalCount = currentData.length
    // 只计算非取消状态的金额
    const validData = currentData.filter(item => item.status !== '已取消')
    const totalAmount = validData.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0).toFixed(2)
    const avgPrice = validData.length > 0 ? (totalAmount / validData.length).toFixed(2) : '0.00'
    const completedCount = currentData.filter(item => item.status === '已完成').length
    const cancelledCount = currentData.filter(item => item.status === '已取消').length
    const pendingCount = currentData.filter(item => item.status === '待收货').length

    return {
      totalCount,
      totalAmount,
      avgPrice,
      completedCount,
      cancelledCount,
      pendingCount
    }
  })

  const filteredSellData = computed(() => {
    let filtered = sellData.value

    // 如果是搜索模式，进行前端分页
    if (isSearchMode.value && allSearchResults.value.length > 0) {
      filtered = allSearchResults.value
      
      // 状态筛选
      if (statusFilter.value) {
        filtered = filtered.filter(item => item.status === statusFilter.value)
      }
      if (statusSubFilter.value) {
        filtered = filtered.filter(item => (item.status_sub || '') === statusSubFilter.value)
      }
      
      // 更新总数以反映筛选后的结果
      totalItems.value = filtered.length
      
      // 前端分页
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filtered.slice(start, end)
    }

    // 非搜索模式的筛选（原有逻辑）
    if (statusFilter.value) {
      filtered = filtered.filter(item => item.status === statusFilter.value)
    }
    if (statusSubFilter.value) {
      filtered = filtered.filter(item => (item.status_sub || '') === statusSubFilter.value)
    }

    return filtered
  })

  const formatTime = (time) => {
    return new Date(time).toLocaleString('zh-CN')
  }

  const getStatusType = (status) => {
    const statusMap = {
      '已完成': 'success',
      '已取消': 'danger',
      '待收货': 'warning'
    }
    return statusMap[status] || 'info'
  }

  const getStatusColor = (status) => {
    const colorMap = {
      '已完成': '#52c41a',    // 更鲜明的绿色
      '已取消': '#ff4d4f',    // 更鲜明的红色
      '待收货': '#faad14'     // 橙色
    }
    return colorMap[status] || '#909399'
  }

  const getStatusTextColor = (status) => {
    // 对于所有状态都使用白色文字以确保对比度
    return '#FFFFFF'
  }

  const loadTotalStats = async () => {
    if (isSearchMode.value) {
      const stats = computeStatsFromData(allSearchResults.value)
      totalStats.value = stats
      totalItems.value = stats.totalCount
      return
    }

    try {
      const payload = {
        source: sourceFilter.value || null,
        status: statusFilter.value || null,
        status_sub: statusSubFilter.value || null,
        data_user: dataUserFilter.value || null,
        weapon_types: weaponTypeFilter.value && weaponTypeFilter.value.length > 0 ? weaponTypeFilter.value : null,
        float_ranges: floatRangeFilter.value && floatRangeFilter.value.length > 0 ? floatRangeFilter.value : null,
        search: searchText.value && searchText.value.trim() ? searchText.value.trim() : null
      }

      if (dateRange.value && dateRange.value.length === 2) {
        payload.start_date = dateRange.value[0]
        payload.end_date = dateRange.value[1]
      }

      const response = await fetch(apiUrls.sellStatsFiltered(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const statsData = await response.json()

      if (statsData && statsData.success) {
        totalStats.value = {
          totalCount: statsData.total_count || 0,
          totalAmount: Number(statsData.total_amount || 0).toFixed(2),
          avgPrice: Number(statsData.avg_price || 0).toFixed(2),
          completedCount: statsData.completed_count || 0,
          cancelledCount: statsData.cancelled_count || 0,
          pendingCount: statsData.pending_count || 0
        }
        totalItems.value = totalStats.value.totalCount
      } else {
        throw new Error(statsData?.message || '统计接口返回失败')
      }
    } catch (error) {
      console.error('获取总统计失败:', error)
      const fallbackStats = computeStatsFromData(sellData.value)
      totalStats.value = fallbackStats
      totalItems.value = fallbackStats.totalCount
    }
  }
  const handleDataUserChange = () => {
    currentPage.value = 1
    loadSellData()
    loadTotalStats()
  }

  const searchByName = async (itemName) => {
    loading.value = true
    try {
      console.log('正在搜索武器:', itemName)
      
      // 构建过滤条件，包含搜索关键词和其他过滤条件
      const filters = {
        source: sourceFilter.value || null,
        status: statusFilter.value || null,
        status_sub: statusSubFilter.value || null,
        data_user: dataUserFilter.value || null,
        weapon_types: weaponTypeFilter.value && weaponTypeFilter.value.length > 0 ? weaponTypeFilter.value : null,
        float_ranges: floatRangeFilter.value && floatRangeFilter.value.length > 0 ? floatRangeFilter.value : null,
        search: itemName.trim() || null
      }
      
      if (dateRange.value && dateRange.value.length === 2) {
        filters.start_date = dateRange.value[0]
        filters.end_date = dateRange.value[1]
      }
      
      // 使用组合查询接口获取所有搜索结果（不分页）
      const response = await fetch(apiUrls.sellDataFiltered(), {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          filters: filters,
          min: 0,
          max: 10000  // 获取所有搜索结果
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const rawData = await response.json()
      console.log('搜索结果:', rawData)
      
      if (!Array.isArray(rawData)) {
        throw new Error('搜索结果格式错误')
      }
      
      // 转换搜索结果并存储所有数据
      const searchResults = rawData.map((item, index) => ({
        id: index + 1,
        order_id: item[0] || '',
        item_name: item[1] || '', 
        weapon_name: item[2] || '',
        weapon_type: item[3] || '',
        weapon_float: item[4] || 0,
        float_range: item[5] || '',
        price: item[6] || 0,
        from: item[7] || '',
        order_time: item[8] || '',
        status: item[9] || '',
        status_sub: item[10] || '',
        steam_hash_name: item[11] || '',
        sticker: item[12] || null,
        pendant: item[13] || null,
        rename: item[14] || null
      }))

      // 进入搜索模式
      isSearchMode.value = true
      allSearchResults.value = searchResults
      sellData.value = [] // 清空普通数据
      totalItems.value = rawData.length
      currentPage.value = 1
      
      // 获取搜索结果的统计
      await loadTotalStats()
      
      if (searchResults.length === 0) {
        ElMessage.info(`未找到包含"${itemName}"的武器`)
      } else {
        ElMessage.success(`找到 ${searchResults.length} 条相关记录`)
      }
      
    } catch (error) {
      console.error('搜索失败:', error)
      ElMessage.error(`搜索失败: ${error.message}`)
      isSearchMode.value = false
      allSearchResults.value = []
      sellData.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  const loadSellData = async () => {
    // 如果是搜索模式且有搜索关键词，不需要重新加载数据
    if (isSearchMode.value && searchText.value.trim()) {
      console.log('搜索模式下，使用现有搜索结果进行分页')
      return
    }
    
    loading.value = true
    try {
      // 如果有搜索关键词但不在搜索模式，执行搜索
      if (searchText.value.trim()) {
        await searchByName(searchText.value.trim())
        return
      }
      
      // 退出搜索模式，进入普通模式
      isSearchMode.value = false
      allSearchResults.value = []
      
      // 计算分页参数
      const min = (currentPage.value - 1) * pageSize.value
      const max = pageSize.value
      
      console.log(`正在请求数据... 页码: ${currentPage.value}, 每页: ${pageSize.value}, min: ${min}, max: ${max}`)
      
      // 构建过滤条件
      const filters = {
        source: sourceFilter.value || null,
        status: statusFilter.value || null,
        status_sub: statusSubFilter.value || null,
        data_user: dataUserFilter.value || null,
        weapon_types: weaponTypeFilter.value && weaponTypeFilter.value.length > 0 ? weaponTypeFilter.value : null,
        float_ranges: floatRangeFilter.value && floatRangeFilter.value.length > 0 ? floatRangeFilter.value : null,
        search: null  // 搜索关键词在搜索模式下单独处理
      }
      
      if (dateRange.value && dateRange.value.length === 2) {
        filters.start_date = dateRange.value[0]
        filters.end_date = dateRange.value[1]
      }
      
      // 使用组合查询接口
      const response = await fetch(apiUrls.sellDataFiltered(), {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          filters: filters,
          min: min,
          max: max
        })
      })
      
      console.log('响应状态:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const rawData = await response.json()
      console.log('接收到的原始数据:', rawData)
      
      // 检查数据格式
      if (!Array.isArray(rawData)) {
        console.error('数据格式错误，期望数组格式，实际收到:', typeof rawData)
        throw new Error('数据格式错误')
      }
      
      // 转换数组格式数据为对象格式
      const transformedData = rawData.map((item, index) => {
        if (!Array.isArray(item)) {
          console.error('数据项格式错误，期望数组，实际收到:', item)
          return null
        }

        return {
          id: index + 1,
          order_id: item[0] || '',     // 订单ID
          item_name: item[1] || '',
          weapon_name: item[2] || '',   // 饰品名称
          weapon_type: item[3] || '',  // 武器类型
          weapon_float: item[4] || 0,  // Float值
          float_range: item[5] || '',  // 磨损等级
          price: item[6] || 0,         // 价格
          from: item[7] || '',         // 来源
          order_time: item[8] || '',   // 订单时间
          status: item[9] || '',       // 状态
          status_sub: item[10] || '',  // 状态详情
          steam_hash_name: item[11] || '',
        sticker: item[12] || null,
        pendant: item[13] || null,
        rename: item[14] || null  // Steam Hash Name
        }
      }).filter(item => item !== null)

      // 根据当前排序状态进行排序
      if (sortOrder.value === 'ascending') {
        transformedData.sort((a, b) => {
          const timeA = new Date(a.order_time).getTime()
          const timeB = new Date(b.order_time).getTime()
          return timeA - timeB
        })
      }

      sellData.value = transformedData

      console.log('转换后的数据:', sellData.value)
      
      // 获取总数统计（子状态优先）
      await loadTotalStats()
      
      if (sellData.value.length === 0) {
        ElMessage.info('暂无出售数据')
      } else {
        ElMessage.success(`加载成功，共 ${sellData.value.length} 条记录`)
      }
      
    } catch (error) {
      console.error('加载出售数据失败:', error)
      
      // 根据错误类型显示不同的错误信息
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        ElMessage.error('无法连接到服务器，请检查网络连接')
      } else if (error.message.includes('HTTP error')) {
        ElMessage.error(`服务器响应错误: ${error.message}`)
      } else if (error.message.includes('数据格式错误')) {
        ElMessage.error('服务器返回数据格式错误')
      } else {
        ElMessage.error(`加载数据失败: ${error.message}`)
      }
      
      // API调用失败时清空数据
      sellData.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  const handleSizeChange = (val) => {
    pageSize.value = val
    currentPage.value = 1
    loadSellData()
  }

  const handleCurrentChange = (val) => {
    currentPage.value = val
    loadSellData()
  }

  const handleSearch = () => {
    handleAdvancedSearch()
  }

  const handleClearSearch = () => {
    searchText.value = ''
    statusFilter.value = ''
    statusSubFilter.value = ''
    sourceFilter.value = ''
    dataUserFilter.value = ''
    statusSubList.value = []
    weaponTypeFilter.value = []
    floatRangeFilter.value = []
    dateRange.value = null
    currentPage.value = 1
    isSearchMode.value = false
    isTimeSearchMode.value = false
    allSearchResults.value = []
    loadStatusSubList()
    loadSellData()
  }

  // 移除单个武器类型
  const removeWeaponType = (type) => {
    const index = weaponTypeFilter.value.indexOf(type)
    if (index > -1) {
      weaponTypeFilter.value.splice(index, 1)
      handleTypeChange()
    }
  }

  // 移除单个磨损等级
  const removeFloatRange = (range) => {
    const index = floatRangeFilter.value.indexOf(range)
    if (index > -1) {
      floatRangeFilter.value.splice(index, 1)
      handleWearChange()
    }
  }

  const handleStatusChange = async () => {
    currentPage.value = 1
    statusSubFilter.value = ''
    await loadStatusSubList()

    // 如果是搜索模式，只需要更新统计，不需要重新加载数据
    if (isSearchMode.value && searchText.value.trim()) {
      await loadTotalStats()
    } else {
      // 非搜索模式，重新加载数据
      loadSellData()
    }
  }
  const handleStatusSubChange = () => {
    currentPage.value = 1
    loadSellData()
  }

  const handleSourceChange = () => {
    currentPage.value = 1
    loadSellData()
    loadTotalStats()
  }

  const handleSortChange = ({ column, prop, order }) => {
    console.log('排序变更:', { column, prop, order })
    if (prop === 'order_time') {
      sortOrder.value = order || 'descending'
      // 如果在搜索模式，对当前结果进行前端排序
      if (isSearchMode.value && allSearchResults.value.length > 0) {
        allSearchResults.value.sort((a, b) => {
          const timeA = new Date(a.order_time).getTime()
          const timeB = new Date(b.order_time).getTime()
          return sortOrder.value === 'ascending' ? timeA - timeB : timeB - timeA
        })
      } else {
        // 非搜索模式，重新加载数据
        loadSellData()
      }
    }
  }

  const handleDateRangeChange = (value) => {
    console.log('日期范围变更:', value)
  }

  // 来源显示映射
  const sourceLabel = (val) => {
    const map = { 
      yyyp: '悠悠有品', 
      buff: 'BUFF', 
      csfloat: 'CsFloat', 
      SMK: 'steam市场',
      ING: '游戏内购',
      c5: 'C5game',
      c5game: 'C5game',
      C5game: 'C5game',
      C5: 'C5game',
      igxe: 'IGXE',
      IGXE: 'IGXE'
    }
    return map[val] || val
  }

  // 加载 data_user 列表
  const loadDataUserList = async () => {
    try {
      const resp = await fetch(apiUrls.sellDataUserList(), { method: 'GET', headers: { 'Accept': 'application/json' } })
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`)
      const users = await resp.json()
      if (Array.isArray(users)) dataUserList.value = users
    } catch (e) {
      console.error('加载出售数据用户列表失败:', e)
    }
  }

  const normalizeFilters = () => {
    if (statusFilter.value === 'all') statusFilter.value = ''
    if (statusSubFilter.value === 'all') statusSubFilter.value = ''
    if (sourceFilter.value === 'all') sourceFilter.value = ''
  }

  onMounted(() => {
    normalizeFilters()
    loadDataUserList()
  })

  // 高级搜索处理
  const handleAdvancedSearch = async () => {
    loading.value = true
    currentPage.value = 1

    try {
      const hasTypeFilter = weaponTypeFilter.value && weaponTypeFilter.value.length > 0
      const hasWearFilter = floatRangeFilter.value && floatRangeFilter.value.length > 0
      const hasDateRange = dateRange.value && dateRange.value.length === 2
      const hasKeyword = searchText.value && searchText.value.trim()

      if (hasTypeFilter || hasWearFilter) {
        await searchByTypeAndWear()
      } else if (hasDateRange) {
        await handleTimeSearch()
      } else if (hasKeyword) {
        await searchByName(searchText.value.trim())
      } else {
        await loadSellData()
      }

      ElMessage.success('搜索完成')
    } catch (error) {
      console.error('搜索失败:', error)
      ElMessage.error(error.message || '搜索失败')
    } finally {
      loading.value = false
    }
  }

  const handleTimeSearch = async () => {
    if (!dateRange.value || dateRange.value.length !== 2) {
      ElMessage.warning('请选择时间范围')
      return
    }

    loading.value = true
    try {
      const [startDate, endDate] = dateRange.value
      console.log('按时间搜索:', startDate, '至', endDate)

      const response = await fetch(apiUrls.sellSearchTimeRange(startDate, endDate), {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const rawData = await response.json()
      console.log('时间搜索结果:', rawData)

      if (!Array.isArray(rawData)) {
        throw new Error('搜索结果格式错误')
      }

      // 转换搜索结果并存储所有数据
      const searchResults = rawData.map((item, index) => ({
        id: index + 1,
        order_id: item[0] || '',
        item_name: item[1] || '', 
        weapon_name: item[2] || '',
        weapon_type: item[3] || '',
        weapon_float: item[4] || 0,
        float_range: item[5] || '',
        price: item[6] || 0,
        from: item[7] || '',
        order_time: item[8] || '',
        status: item[9] || '',
        status_sub: item[10] || '',
        steam_hash_name: item[11] || '',
        sticker: item[12] || null,
        pendant: item[13] || null,
        rename: item[14] || null
      }))

      // 进入时间搜索模式
      isTimeSearchMode.value = true
      isSearchMode.value = true
      allSearchResults.value = searchResults
      sellData.value = [] // 清空普通数据
      totalItems.value = rawData.length
      currentPage.value = 1

      // 获取时间搜索结果的统计
      await loadTimeRangeStats(startDate, endDate)

      if (searchResults.length === 0) {
        ElMessage.info(`在 ${startDate} 至 ${endDate} 期间未找到出售记录`)
      } else {
        ElMessage.success(`找到 ${searchResults.length} 条出售记录`)
      }

    } catch (error) {
      console.error('时间搜索失败:', error)
      ElMessage.error(`时间搜索失败: ${error.message}`)
      isSearchMode.value = false
      isTimeSearchMode.value = false
      allSearchResults.value = []
      sellData.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  const loadTimeRangeStats = async (startDate, endDate) => {
    try {
      console.log('正在获取时间范围统计...', { startDate, endDate })
      
      const response = await fetch(apiUrls.sellStatsTimeRange(startDate, endDate), {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const statsData = await response.json()
      console.log('获取到的时间范围统计:', statsData)
      
      if (statsData) {
        totalStats.value = {
          totalCount: statsData.total_count || 0,
          totalAmount: statsData.total_amount?.toFixed(2) || '0.00',
          avgPrice: statsData.avg_price?.toFixed(2) || '0.00',
          completedCount: statsData.completed_count || 0,
          cancelledCount: statsData.cancelled_count || 0,
          pendingCount: statsData.pending_count || 0
        }
        console.log('设置时间范围统计为:', totalStats.value)
      } else {
        console.error('时间范围统计API返回数据格式错误:', statsData)
      }
    } catch (error) {
      console.error('获取时间范围统计失败:', error)
      totalStats.value = {
        totalCount: 0,
        totalAmount: '0.00',
        avgPrice: '0.00',
        completedCount: 0,
        cancelledCount: 0,
        pendingCount: 0
      }
    }
  }

  // 加载武器类型数据
  const loadWeaponTypes = async () => {
    try {
      const response = await fetch(apiUrls.sellWeaponTypes())
      const result = await response.json()
      if (result.success) {
        weaponTypes.value = result.data
      }
    } catch (error) {
      console.error('获取武器类型失败:', error)
    }
  }

  // 加载磨损等级数据
  const loadFloatRanges = async () => {
    try {
      const response = await fetch(apiUrls.sellFloatRanges())
      const result = await response.json()
      if (result.success) {
        floatRanges.value = result.data
      }
    } catch (error) {
      console.error('获取磨损等级失败:', error)
    }
  }

  // 加载状态列表数据
  const loadStatusList = async () => {
    try {
      const response = await fetch(apiUrls.sellStatusList())
      const result = await response.json()
      if (result.success) {
        statusList.value = result.data
      }
    } catch (error) {
      console.error('获取状态列表失败:', error)
    }
  }
  const loadStatusSubList = async () => {
    try {
      const response = await fetch(apiUrls.sellStatusSubList(statusFilter.value))
      const result = await response.json()
      if (result && result.success && Array.isArray(result.data)) {
        statusSubList.value = result.data
      } else if (Array.isArray(result)) {
        statusSubList.value = result
      } else {
        statusSubList.value = []
      }
    } catch (error) {
      console.error('获取子状态列表失败:', error)
      statusSubList.value = []
    }
  }

  // 类型筛选处理
  const handleTypeChange = async () => {
    if (weaponTypeFilter.value || floatRangeFilter.value) {
      await searchByTypeAndWear()
    } else {
      await loadSellData()
    }
  }

  // 磨损等级筛选处理
  const handleWearChange = async () => {
    if (weaponTypeFilter.value || floatRangeFilter.value) {
      await searchByTypeAndWear()
    } else {
      await loadSellData()
    }
  }

  // 按类型和磨损等级搜索
  const searchByTypeAndWear = async () => {
    if (!weaponTypeFilter.value && !floatRangeFilter.value) {
      return
    }

    loading.value = true
    try {
      const requestData = {
        weapon_type: weaponTypeFilter.value,
        float_range: floatRangeFilter.value,
        page: currentPage.value,
        page_size: pageSize.value
      }

      const response = await fetch(apiUrls.sellSearchByTypeWear(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 格式化数据
        const formattedData = result.data.map((item, index) => {
          return {
            id: index + 1,
            order_id: item[0] || '',
            item_name: item[1] || '',
            weapon_name: item[2] || '',
            weapon_type: item[3] || '',
            weapon_float: item[4] || 0,
            float_range: item[5] || '',
            price: item[6] || 0,
            from: item[7] || '',
            order_time: item[8] || '',
            status: item[9] || '',
            status_sub: item[10] || '',
            steam_hash_name: item[11] || '',
        sticker: item[12] || null,
        pendant: item[13] || null,
        rename: item[14] || null
          }
        })
        
        sellData.value = formattedData
        totalItems.value = result.total
        
        // 获取筛选后的统计数据
        await loadStatsByTypeAndWear()
      } else {
        ElMessage.error(result.message || '搜索失败')
      }
    } catch (error) {
      console.error('按类型和磨损搜索失败:', error)
      ElMessage.error('搜索失败')
    } finally {
      loading.value = false
    }
  }

  // 获取按类型和磨损筛选的统计数据
  const loadStatsByTypeAndWear = async () => {
    try {
      const requestData = {
        weapon_type: weaponTypeFilter.value,
        float_range: floatRangeFilter.value
      }

      const response = await fetch(apiUrls.sellStatsByTypeWear(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        totalStats.value = {
          totalCount: result.data.totalCount,
          totalAmount: result.data.totalAmount.toFixed(2),
          avgPrice: result.data.avgPrice.toFixed(2),
          completedCount: result.data.completedCount,
          cancelledCount: result.data.cancelledCount,
          pendingCount: result.data.pendingCount
        }
      }
    } catch (error) {
      console.error('获取筛选统计数据失败:', error)
    }
  }

  // 获取武器图片路径
  const getWeaponImage = (steamHashName) => {
    if (!steamHashName) {
      return null
    }
    const imageName = steamHashName
      .replace(/\s*\|\s*/g, '___')
      .replace(/\s/g, '_')
      + '.png'
    return apiUrls.weaponImage(imageName)
  }

  // 获取组合后的商品标题，若 weapon_name 与 item_name 相同则只显示一次
  const getItemTitle = (item) => {
    const weaponName = (item.weapon_name || '').trim()
    const itemName = (item.item_name || '').trim()
    const parts = []

    if (weaponName && itemName) {
      if (weaponName === itemName) {
        parts.push(itemName)
      } else {
        parts.push(weaponName)
        parts.push(itemName)
      }
    } else if (weaponName) {
      parts.push(weaponName)
    } else if (itemName) {
      parts.push(itemName)
    }

    let title = parts.join(' | ')
    if (item.float_range) {
      title += ` （${item.float_range}）`
    }
    return title
  }

  // 检查是否有额外信息（印花、挂件、改名）
  const hasExtras = (item) => {
    return !!(item.sticker || item.pendant || item.rename)
  }

  // 解析印花数据 - 与Inventory页面逻辑一致
  const parseStickers = (stickerData) => {
    if (!stickerData) return []
    try {
      const parsed = typeof stickerData === 'string' ? JSON.parse(stickerData) : stickerData
      if (!Array.isArray(parsed)) return []
      
      // 返回贴纸数组，每个贴纸包含name和image
      return parsed.map(sticker => {
        const name = sticker.name || '未知贴纸'
        const hashName = sticker.hashName || sticker.steam_hash_name || sticker.steamHashName
        
        // 根据hashName生成图片URL，添加"Sticker___"前缀
        let imageUrl = null
        if (hashName) {
          const imageName = hashName
            .replace(/\s*\|\s*/g, '___')
            .replace(/\s/g, '_')
          imageUrl = apiUrls.weaponImage(`Sticker___${imageName}.png`)
        }
        
        return {
          name: name,
          image: imageUrl
        }
      })
    } catch (e) {
      console.error('解析印花数据失败:', e)
      return []
    }
  }

  // 解析挂件数据
  const parsePendant = (pendantData) => {
    if (!pendantData) return null
    try {
      const parsed = typeof pendantData === 'string' ? JSON.parse(pendantData) : pendantData
      
      // 如果是数组，取第一个元素
      let pendantObj = Array.isArray(parsed) ? parsed[0] : parsed
      
      if (!pendantObj || typeof pendantObj !== 'object') return null
      
      // 获取hashName，支持多种字段名以提高兼容性
      const hashName = pendantObj.hashName || pendantObj.steam_hash_name || pendantObj.steamHashName
      
      // 生成图片URL
      let imageUrl = null
      if (hashName) {
        const imageName = hashName
          .replace(/\s*\|\s*/g, '___')
          .replace(/\s/g, '_')
          + '.png'
        imageUrl = apiUrls.weaponImage(imageName)
      }
      
      return {
        name: pendantObj.name || '挂件',
        image: imageUrl
      }
    } catch (e) {
      console.error('解析挂件数据失败:', e)
      return null
    }
  }


  // 获取挂件图片路径 - 使用hashName获取图片，与武器图片获取方式一致
  const getPendantImage = (pendant) => {
    if (!pendant) return null
    // 从pendant对象中获取hashName字段，支持多种字段名以提高兼容性
    const hashName = pendant.hashName || pendant.steam_hash_name || pendant.steamHashName
    if (!hashName) return null
    // 使用与武器图片相同的转换方式
    const imageName = hashName
      .replace(/\s*\|\s*/g, '___')
      .replace(/\s/g, '_')
      + '.png'
    return apiUrls.weaponImage(imageName)
  }

  // 打开预览弹窗
  const loadYyypPriceInfo = async (steamHashName) => {
    if (!steamHashName) {
      yyypPriceInfo.value = {
        yyyp_price: null,
        yyyp_on_sale_count: null
      }
      return
    }

    try {
      const response = await fetch(apiUrls.sellYyypPriceInfo(steamHashName), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        // 使用 Object.assign 确保 Vue 的响应式系统能检测到变化
        Object.assign(yyypPriceInfo.value, {
          yyyp_price: result.data.yyyp_price,
          yyyp_on_sale_count: result.data.yyyp_on_sale_count
        })
        console.log('成功获取价格信息:', yyypPriceInfo.value)
        console.log('yyyp_price 值类型:', typeof yyypPriceInfo.value.yyyp_price, '值:', yyypPriceInfo.value.yyyp_price)
      } else {
        Object.assign(yyypPriceInfo.value, {
          yyyp_price: null,
          yyyp_on_sale_count: null
        })
      }
    } catch (error) {
      console.error('查询悠悠有品价格信息失败:', error)
      yyypPriceInfo.value = {
        yyyp_price: null,
        yyyp_on_sale_count: null
      }
    }
  }

  const loadStickersPriceInfo = async (stickersData) => {
    stickersPriceInfo.value = []
    if (!stickersData) return

    try {
      const parsed = typeof stickersData === 'string' ? JSON.parse(stickersData) : stickersData
      if (!Array.isArray(parsed) || parsed.length === 0) return

      console.log('解析的印花数据:', parsed)

      const pricePromises = parsed.map(async (sticker) => {
        const rawHashName = sticker.hashName || sticker.steam_hash_name || sticker.steamHashName
        const name = sticker.name || '未知贴纸'

        // 印花需要添加 "Sticker | " 前缀
        const hashName = rawHashName && !rawHashName.startsWith('Sticker | ')
          ? `Sticker | ${rawHashName}`
          : rawHashName

        console.log('印花查询 - name:', name, 'rawHashName:', rawHashName, 'hashName:', hashName)
        if (!hashName) return null

        try {
          const url = apiUrls.sellYyypPriceInfo(hashName)
          console.log('请求URL:', url)

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          })

          console.log('响应状态:', response.status, response.statusText)

          if (!response.ok) {
            console.warn(`请求失败 (${hashName}): ${response.status} ${response.statusText}`)
            return null
          }

          const result = await response.json()
          console.log('响应数据:', result)

          if (result.success && result.data) {
            return {
              name: name,
              hashName: hashName,
              yyyp_price: result.data.yyyp_price,
              yyyp_on_sale_count: result.data.yyyp_on_sale_count,
              buff_price: result.data.buff_price,
              buff_on_sale_count: result.data.buff_on_sale_count,
              market_listing_item_name: result.data.market_listing_item_name
            }
          }
        } catch (error) {
          console.error(`查询印花价格失败 (${name} - ${hashName}):`, error.message || error)
          // 不抛出错误，让其他请求继续执行
        }
        return null
      })

      const results = await Promise.all(pricePromises)
      stickersPriceInfo.value = results.filter(item => item !== null)
      console.log('印花价格信息:', stickersPriceInfo.value)
    } catch (error) {
      console.error('解析印花价格信息失败:', error)
      stickersPriceInfo.value = []
    }
  }

  const loadPendantPriceInfo = async (pendantData) => {
    pendantPriceInfo.value = null
    if (!pendantData) return

    try {
      const parsed = typeof pendantData === 'string' ? JSON.parse(pendantData) : pendantData
      const pendantObj = Array.isArray(parsed) ? parsed[0] : parsed
      if (!pendantObj || typeof pendantObj !== 'object') return

      const rawHashName = pendantObj.hashName || pendantObj.steam_hash_name || pendantObj.steamHashName
      const name = pendantObj.name || '挂件'

      // 挂件需要添加 "Charm | " 前缀
      const hashName = rawHashName && !rawHashName.startsWith('Charm | ')
        ? `Charm | ${rawHashName}`
        : rawHashName

      if (!hashName) return

      const url = apiUrls.sellYyypPriceInfo(hashName)
      console.log('挂件请求URL:', url, 'rawHashName:', rawHashName, 'hashName:', hashName)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      console.log('挂件响应状态:', response.status, response.statusText)

      if (!response.ok) {
        console.warn(`挂件请求失败 (${hashName}): ${response.status} ${response.statusText}`)
        return
      }

      const result = await response.json()
      console.log('挂件响应数据:', result)

      if (result.success && result.data) {
        pendantPriceInfo.value = {
          name: name,
          hashName: hashName,
          yyyp_price: result.data.yyyp_price,
          yyyp_on_sale_count: result.data.yyyp_on_sale_count,
          buff_price: result.data.buff_price,
          buff_on_sale_count: result.data.buff_on_sale_count,
          market_listing_item_name: result.data.market_listing_item_name
        }
        console.log('挂件价格信息:', pendantPriceInfo.value)
      }
    } catch (error) {
      console.error('查询挂件价格信息失败:', error.message || error)
      pendantPriceInfo.value = null
    }
  }

  // 加载武器主体价格信息（包括悠悠有品和BUFF）
  const loadWeaponPriceInfo = async (steamHashName) => {
    // 重置价格信息
    Object.assign(yyypPriceInfo.value, {
      yyyp_price: null,
      yyyp_on_sale_count: null,
      market_listing_item_name: null
    })
    Object.assign(buffPriceInfo.value, {
      buff_price: null,
      buff_on_sale_count: null
    })

    if (!steamHashName) {
      console.log('未提供武器 steam_hash_name，跳过查询')
      return
    }

    try {
      const url = apiUrls.sellYyypPriceInfo(steamHashName)
      console.log('武器主体请求URL:', url, 'steamHashName:', steamHashName)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      console.log('武器主体响应状态:', response.status, response.statusText)

      if (!response.ok) {
        console.warn(`武器主体请求失败 (${steamHashName}): ${response.status} ${response.statusText}`)
        return
      }

      const result = await response.json()
      console.log('武器主体响应数据:', result)

      if (result.success && result.data) {
        // 更新悠悠有品价格
        Object.assign(yyypPriceInfo.value, {
          yyyp_price: result.data.yyyp_price,
          yyyp_on_sale_count: result.data.yyyp_on_sale_count,
          market_listing_item_name: result.data.market_listing_item_name
        })
        // 更新BUFF价格
        Object.assign(buffPriceInfo.value, {
          buff_price: result.data.buff_price,
          buff_on_sale_count: result.data.buff_on_sale_count
        })
        console.log('武器主体价格信息 - 悠悠:', yyypPriceInfo.value)
        console.log('武器主体价格信息 - BUFF:', buffPriceInfo.value)
      }
    } catch (error) {
      console.error('查询武器主体价格信息失败:', error.message || error)
    }
  }

  const openPreview = (item) => {
    previewItem.value = item
    previewVisible.value = true
    // 查询武器主体价格信息
    loadWeaponPriceInfo(item.steam_hash_name)
    // 查询印花价格信息
    loadStickersPriceInfo(item.sticker)
    // 查询挂件价格信息
    loadPendantPriceInfo(item.pendant)
  }

  // 跳转到商品搜索页面（带确认）
  const confirmJumpToItemSearch = () => {
    if (!previewItem.value || !previewItem.value.steam_hash_name) {
      ElMessage.warning('未找到商品信息')
      return
    }

    ElMessageBox.confirm(
      `是否跳转到商品搜索页面查看 "${previewItem.value.steam_hash_name}"？`,
      '跳转确认',
      {
        confirmButtonText: '跳转',
        cancelButtonText: '取消',
        type: 'info'
      }
    ).then(() => {
      // 在新标签页打开商品搜索页面
      const searchUrl = `/item-search?keyword=${encodeURIComponent(previewItem.value.steam_hash_name)}`
      window.open(searchUrl, '_blank')
    }).catch(() => {
      // 用户取消，不做任何操作
    })
  }

  // 跳转到商品搜索页面（不带确认，用于其他地方）
  const handleJumpToItemSearch = () => {
    if (!previewItem.value || !previewItem.value.steam_hash_name) {
      ElMessage.warning('未找到商品信息')
      return
    }

    // 在新标签页打开商品搜索页面
    const searchUrl = `/item-search?keyword=${encodeURIComponent(previewItem.value.steam_hash_name)}`
    window.open(searchUrl, '_blank')
  }

  // 通过印花跳转到商品搜索页面（带确认）
  const handleJumpToItemSearchBySticker = (sticker) => {
    if (!sticker) {
      ElMessage.warning('未找到印花信息')
      return
    }

    // 从印花对象中获取各种可能的字段名
    const hashName = sticker.hashName || sticker.HashName || sticker.steam_hash_name ||
                     sticker.steamHashName || sticker.name

    if (!hashName) {
      console.warn('印花对象:', sticker)
      ElMessage.warning('该印花没有有效的名称')
      return
    }

    const displayName = sticker.name || hashName

    ElMessageBox.confirm(
      `是否跳转到商品搜索页面查看印花 "${displayName}"？`,
      '跳转确认',
      {
        confirmButtonText: '跳转',
        cancelButtonText: '取消',
        type: 'info'
      }
    ).then(() => {
      // 在新标签页打开商品搜索页面
      const searchUrl = `/item-search?keyword=${encodeURIComponent(hashName)}`
      window.open(searchUrl, '_blank')
    }).catch(() => {
      // 用户取消，不做任何操作
    })
  }

  // 通过挂件跳转到商品搜索页面（带确认）
  const handleJumpToItemSearchByPendant = (pendant) => {
    if (!pendant) {
      ElMessage.warning('未找到挂件信息')
      return
    }

    // 解析挂件数据（可能是字符串、对象或数组）
    let pendantObj = typeof pendant === 'string' ? JSON.parse(pendant) : pendant

    // 如果是数组，取第一个元素
    if (Array.isArray(pendantObj) && pendantObj.length > 0) {
      pendantObj = pendantObj[0]
    }

    // 从挂件对象中获取各种可能的字段名
    const hashName = pendantObj.steamHashName || pendantObj.hashName || pendantObj.HashName ||
                     pendantObj.steam_hash_name || pendantObj.name

    if (!hashName) {
      console.warn('挂件对象:', pendantObj)
      ElMessage.warning('该挂件没有有效的名称')
      return
    }

    const displayName = pendantObj.name || hashName

    ElMessageBox.confirm(
      `是否跳转到商品搜索页面查看挂件 "${displayName}"？`,
      '跳转确认',
      {
        confirmButtonText: '跳转',
        cancelButtonText: '取消',
        type: 'info'
      }
    ).then(() => {
      // 在新标签页打开商品搜索页面
      const searchUrl = `/item-search?keyword=${encodeURIComponent(hashName)}`
      window.open(searchUrl, '_blank')
    }).catch(() => {
      // 用户取消，不做任何操作
    })
  }

  // 设备类型监听取消函数
  let unwatchDevice = null

  onMounted(() => {
    // 应用设备类型类到 body
    const deviceType = applyDeviceClass()
    console.log('[Sell] 当前设备类型:', deviceType)

    // 监听设备类型变化
    unwatchDevice = watchDeviceType((newDeviceType) => {
      console.log('[Sell] 设备类型已变更:', newDeviceType)
    })

    loadSellData()
    loadWeaponTypes()
    loadFloatRanges()
    loadStatusList()
    loadStatusSubList()
  })

  onUnmounted(() => {
    // 取消设备类型监听
    if (unwatchDevice) {
      unwatchDevice()
    }
  })

  return {
    loading,
    sellData,
    filteredSellData,
    totalStats,
    currentPageStats,
    searchText,
    statusFilter,
    weaponTypeFilter,
    floatRangeFilter,
    weaponTypes,
    floatRanges,
    statusList,
    statusSubList,
    statusSubFilter,
    dateRange,
    isTimeSearchMode,
    currentPage,
    pageSize,
    totalItems,
    isSearchMode,
    allSearchResults,
    sortOrder,
    formatTime,
    getStatusType,
    getStatusColor,
    getStatusTextColor,
    handleSizeChange,
    handleCurrentChange,
    handleSearch,
    handleClearSearch,
    handleStatusChange,
    handleStatusSubChange,
    sourceFilter,
    sourceList,
    handleSourceChange,
    sourceLabel,
    handleSortChange,
    handleTypeChange,
    handleWearChange,
    handleAdvancedSearch,
    hasAdvancedFilters,
    handleDateRangeChange,
    handleTimeSearch,
    removeWeaponType,
    removeFloatRange,
    dataUserFilter,
    dataUserList,
    handleDataUserChange,
    getWeaponImage,
    getItemTitle,
    hasExtras,
    parseStickers,
    parsePendant,
    getPendantImage,
    previewVisible,
    previewItem,
    openPreview,
    confirmJumpToItemSearch,
    handleJumpToItemSearch,
    handleJumpToItemSearchBySticker,
    handleJumpToItemSearchByPendant,
    yyypPriceInfo,
    buffPriceInfo,
    stickersPriceInfo,
    pendantPriceInfo
  }
}
