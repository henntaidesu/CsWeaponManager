import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiUrls } from '@/config/api'


export function useSteamMarket() {
  // Buy相关状态
  const buyLoading = ref(false)
  const buyData = ref([])
  const buySearchText = ref('')
  const buyGameNameFilter = ref('all')
  const buyCurrentPage = ref(1)
  const buyPageSize = ref(20)
  const buyTotalItems = ref(0)
  const buyDateRange = ref(null)
  const buyIsTimeSearchMode = ref(false)
  const buyTotalStats = ref({
    totalCount: 0,
    totalAmount: '0.00',
    avgPrice: '0.00'
  })
  const buyAllSearchResults = ref([])
  const buyIsSearchMode = ref(false)

  // Sell相关状态
  const sellLoading = ref(false)
  const sellData = ref([])
  const sellSearchText = ref('')
  const sellGameNameFilter = ref('all')
  const sellCurrentPage = ref(1)
  const sellPageSize = ref(20)
  const sellTotalItems = ref(0)
  const sellDateRange = ref(null)
  const sellIsTimeSearchMode = ref(false)
  const sellTotalStats = ref({
    totalCount: 0,
    totalAmount: '0.00',
    avgPrice: '0.00'
  })
  const sellAllSearchResults = ref([])
  const sellIsSearchMode = ref(false)

  // 计算属性
  const buyCurrentPageStats = computed(() => {
    const currentData = filteredBuyData.value
    const totalCount = currentData.length
    const totalAmount = currentData.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0).toFixed(2)
    const avgPrice = totalCount > 0 ? (totalAmount / totalCount).toFixed(2) : '0.00'

    return {
      totalCount,
      totalAmount,
      avgPrice
    }
  })

  const sellCurrentPageStats = computed(() => {
    const currentData = filteredSellData.value
    const totalCount = currentData.length
    const totalAmount = currentData.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0).toFixed(2)
    const avgPrice = totalCount > 0 ? (totalAmount / totalCount).toFixed(2) : '0.00'

    return {
      totalCount,
      totalAmount,
      avgPrice
    }
  })

  const filteredBuyData = computed(() => {
    let filtered = buyData.value

    if (buyIsSearchMode.value && buyAllSearchResults.value.length > 0) {
      filtered = buyAllSearchResults.value
      
      const start = (buyCurrentPage.value - 1) * buyPageSize.value
      const end = start + buyPageSize.value
      return filtered.slice(start, end)
    }

    return filtered
  })

  const filteredSellData = computed(() => {
    let filtered = sellData.value

    if (sellIsSearchMode.value && sellAllSearchResults.value.length > 0) {
      filtered = sellAllSearchResults.value
      
      const start = (sellCurrentPage.value - 1) * sellPageSize.value
      const end = start + sellPageSize.value
      return filtered.slice(start, end)
    }

    return filtered
  })

  // 工具函数
  const formatTime = (time) => {
    if (!time) return ''
    
    // 处理Steam的时间格式 "2025年9月2日"
    if (typeof time === 'string' && time.includes('年') && time.includes('月') && time.includes('日')) {
      // 直接返回Steam的原始格式，因为它已经是中文格式
      return time
    }
    
    // 处理标准时间格式
    try {
      return new Date(time).toLocaleString('zh-CN')
    } catch (error) {
      return time || ''
    }
  }

  // Buy相关方法
  const loadBuyTotalStats = async (searchKeyword = null) => {
    try {
      let apiUrl
      
      const keyword = searchKeyword || buySearchText.value.trim()
      
      if (keyword) {
        apiUrl = apiUrls.steamBuyStatsBySearch(keyword)
      } else {
        apiUrl = apiUrls.steamBuyStats()
      }
      
      const response = await fetch(apiUrl, {
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
      
      if (statsData) {
        buyTotalStats.value = {
          totalCount: statsData.total_count || 0,
          totalAmount: statsData.total_amount?.toFixed(2) || '0.00',
          avgPrice: statsData.avg_price?.toFixed(2) || '0.00'
        }
        buyTotalItems.value = statsData.total_count || 0
      }
    } catch (error) {
      console.error('获取Steam购买统计失败:', error)
      buyTotalStats.value = {
        totalCount: 0,
        totalAmount: '0.00',
        avgPrice: '0.00'
      }
      buyTotalItems.value = 0
    }
  }

  const searchBuyByName = async (itemName) => {
    buyLoading.value = true
    try {
      const response = await fetch(apiUrls.steamBuySearchByName(itemName), {
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
      
      if (!Array.isArray(rawData)) {
        throw new Error('搜索结果格式错误')
      }
      
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
        game_name: item[10] || ''
      }))
      
      buyIsSearchMode.value = true
      buyAllSearchResults.value = searchResults
      buyData.value = []
      buyTotalItems.value = rawData.length
      buyCurrentPage.value = 1
      
      await loadBuyTotalStats(itemName)
      
      if (searchResults.length === 0) {
        ElMessage.info(`未找到包含"${itemName}"的Steam购买记录`)
      } else {
        ElMessage.success(`找到 ${searchResults.length} 条Steam购买记录`)
      }
      
    } catch (error) {
      console.error('搜索Steam购买记录失败:', error)
      ElMessage.error(`搜索失败: ${error.message}`)
      buyIsSearchMode.value = false
      buyAllSearchResults.value = []
      buyData.value = []
      buyTotalItems.value = 0
    } finally {
      buyLoading.value = false
    }
  }

  const loadBuyData = async () => {
    if (buyIsSearchMode.value && buySearchText.value.trim()) {
      return
    }
    
    buyLoading.value = true
    try {
      if (buySearchText.value.trim()) {
        await searchBuyByName(buySearchText.value.trim())
        return
      }
      
      buyIsSearchMode.value = false
      buyAllSearchResults.value = []
      
      const min = (buyCurrentPage.value - 1) * buyPageSize.value
      const max = buyPageSize.value
      
      let apiUrl
      if (buyGameNameFilter.value !== 'all') {
        apiUrl = apiUrls.steamBuyDataByGameName(buyGameNameFilter.value, min, max)
      } else {
        apiUrl = apiUrls.steamBuyData(min, max)
      }
      
      const response = await fetch(apiUrl, {
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
      
      if (!Array.isArray(rawData)) {
        throw new Error('数据格式错误')
      }
      
      buyData.value = rawData.map((item, index) => {
        if (!Array.isArray(item)) {
          return null
        }
        
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
          status: item[9] || ''
        }
      }).filter(item => item !== null)
      
      if (buyGameNameFilter.value !== 'all') {
        await loadBuyStatsByGameName(buyGameNameFilter.value)
      } else {
        await loadBuyTotalStats()
      }
      
      if (buyData.value.length === 0) {
        ElMessage.info('暂无Steam购买数据')
      } else {
        ElMessage.success(`加载成功，共 ${buyData.value.length} 条Steam购买记录`)
      }
      
    } catch (error) {
      console.error('加载Steam购买数据失败:', error)
      ElMessage.error(`加载数据失败: ${error.message}`)
      buyData.value = []
      buyTotalItems.value = 0
    } finally {
      buyLoading.value = false
    }
  }

  const handleBuyTimeSearch = async () => {
    if (!buyDateRange.value || buyDateRange.value.length !== 2) {
      ElMessage.warning('请选择时间范围')
      return
    }

    buyLoading.value = true
    try {
      const [startDate, endDate] = buyDateRange.value
      
      const response = await fetch(apiUrls.steamBuySearchByTime(startDate, endDate), {
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
      
      if (!Array.isArray(rawData)) {
        throw new Error('搜索结果格式错误')
      }
      
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
        game_name: item[10] || ''
      }))
      
      buyIsTimeSearchMode.value = true
      buyIsSearchMode.value = true
      buyAllSearchResults.value = searchResults
      buyData.value = []
      buyTotalItems.value = rawData.length
      buyCurrentPage.value = 1
      
      await loadBuyTimeRangeStats(startDate, endDate)
      
      if (searchResults.length === 0) {
        ElMessage.info(`在 ${startDate} 至 ${endDate} 期间未找到Steam购买记录`)
      } else {
        ElMessage.success(`找到 ${searchResults.length} 条Steam购买记录`)
      }
      
    } catch (error) {
      console.error('时间搜索失败:', error)
      ElMessage.error(`时间搜索失败: ${error.message}`)
      buyIsSearchMode.value = false
      buyIsTimeSearchMode.value = false
      buyAllSearchResults.value = []
      buyData.value = []
      buyTotalItems.value = 0
    } finally {
      buyLoading.value = false
    }
  }

  const loadBuyTimeRangeStats = async (startDate, endDate) => {
    try {
      const response = await fetch(apiUrls.steamBuyStatsByTime(startDate, endDate), {
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
      
      if (statsData) {
        buyTotalStats.value = {
          totalCount: statsData.total_count || 0,
          totalAmount: statsData.total_amount?.toFixed(2) || '0.00',
          avgPrice: statsData.avg_price?.toFixed(2) || '0.00'
        }
      }
    } catch (error) {
      console.error('获取时间范围统计失败:', error)
      buyTotalStats.value = {
        totalCount: 0,
        totalAmount: '0.00',
        avgPrice: '0.00'
      }
    }
  }

  // Sell相关方法（类似Buy方法）
  const loadSellTotalStats = async (searchKeyword = null) => {
    try {
      const keyword = searchKeyword || sellSearchText.value.trim()
      let apiUrl = keyword
        ? apiUrls.steamSellStatsBySearch(keyword)
        : apiUrls.steamSellStats()
      
      const response = await fetch(apiUrl, {
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
      
      if (statsData) {
        sellTotalStats.value = {
          totalCount: statsData.total_count || 0,
          totalAmount: statsData.total_amount?.toFixed(2) || '0.00',
          avgPrice: statsData.avg_price?.toFixed(2) || '0.00'
        }
        sellTotalItems.value = statsData.total_count || 0
      }
    } catch (error) {
      console.error('获取Steam销售统计失败:', error)
      sellTotalStats.value = {
        totalCount: 0,
        totalAmount: '0.00',
        avgPrice: '0.00'
      }
      sellTotalItems.value = 0
    }
  }

  const searchSellByName = async (itemName) => {
    sellLoading.value = true
    try {
      const response = await fetch(apiUrls.steamSellSearchByName(itemName), {
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
      
      if (!Array.isArray(rawData)) {
        throw new Error('搜索结果格式错误')
      }
      
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
        game_name: item[10] || ''
      }))
      
      sellIsSearchMode.value = true
      sellAllSearchResults.value = searchResults
      sellData.value = []
      sellTotalItems.value = rawData.length
      sellCurrentPage.value = 1
      
      await loadSellTotalStats(itemName)
      
      if (searchResults.length === 0) {
        ElMessage.info(`未找到包含"${itemName}"的Steam销售记录`)
      } else {
        ElMessage.success(`找到 ${searchResults.length} 条Steam销售记录`)
      }
      
    } catch (error) {
      console.error('搜索Steam销售记录失败:', error)
      ElMessage.error(`搜索失败: ${error.message}`)
      sellIsSearchMode.value = false
      sellAllSearchResults.value = []
      sellData.value = []
      sellTotalItems.value = 0
    } finally {
      sellLoading.value = false
    }
  }

  const loadSellData = async () => {
    if (sellIsSearchMode.value && sellSearchText.value.trim()) {
      return
    }
    
    sellLoading.value = true
    try {
      if (sellSearchText.value.trim()) {
        await searchSellByName(sellSearchText.value.trim())
        return
      }
      
      sellIsSearchMode.value = false
      sellAllSearchResults.value = []
      
      const min = (sellCurrentPage.value - 1) * sellPageSize.value
      const max = sellPageSize.value
      
      let apiUrl
      if (sellGameNameFilter.value !== 'all') {
        apiUrl = apiUrls.steamSellDataByGameName(sellGameNameFilter.value, min, max)
      } else {
        apiUrl = apiUrls.steamSellData(min, max)
      }
      
      const response = await fetch(apiUrl, {
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
      
      if (!Array.isArray(rawData)) {
        throw new Error('数据格式错误')
      }
      
      sellData.value = rawData.map((item, index) => {
        if (!Array.isArray(item)) {
          return null
        }
        
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
          status: item[9] || ''
        }
      }).filter(item => item !== null)
      
      if (sellGameNameFilter.value !== 'all') {
        await loadSellStatsByGameName(sellGameNameFilter.value)
      } else {
        await loadSellTotalStats()
      }
      
      if (sellData.value.length === 0) {
        ElMessage.info('暂无Steam销售数据')
      } else {
        ElMessage.success(`加载成功，共 ${sellData.value.length} 条Steam销售记录`)
      }
      
    } catch (error) {
      console.error('加载Steam销售数据失败:', error)
      ElMessage.error(`加载数据失败: ${error.message}`)
      sellData.value = []
      sellTotalItems.value = 0
    } finally {
      sellLoading.value = false
    }
  }

  const handleSellTimeSearch = async () => {
    if (!sellDateRange.value || sellDateRange.value.length !== 2) {
      ElMessage.warning('请选择时间范围')
      return
    }

    sellLoading.value = true
    try {
      const [startDate, endDate] = sellDateRange.value
      
      const response = await fetch(apiUrls.steamSellSearchByTime(startDate, endDate), {
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
      
      if (!Array.isArray(rawData)) {
        throw new Error('搜索结果格式错误')
      }
      
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
        game_name: item[10] || ''
      }))
      
      sellIsTimeSearchMode.value = true
      sellIsSearchMode.value = true
      sellAllSearchResults.value = searchResults
      sellData.value = []
      sellTotalItems.value = rawData.length
      sellCurrentPage.value = 1
      
      await loadSellTimeRangeStats(startDate, endDate)
      
      if (searchResults.length === 0) {
        ElMessage.info(`在 ${startDate} 至 ${endDate} 期间未找到Steam销售记录`)
      } else {
        ElMessage.success(`找到 ${searchResults.length} 条Steam销售记录`)
      }
      
    } catch (error) {
      console.error('时间搜索失败:', error)
      ElMessage.error(`时间搜索失败: ${error.message}`)
      sellIsSearchMode.value = false
      sellIsTimeSearchMode.value = false
      sellAllSearchResults.value = []
      sellData.value = []
      sellTotalItems.value = 0
    } finally {
      sellLoading.value = false
    }
  }

  const loadSellTimeRangeStats = async (startDate, endDate) => {
    try {
      const response = await fetch(apiUrls.steamSellStatsByTime(startDate, endDate), {
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
      
      if (statsData) {
        sellTotalStats.value = {
          totalCount: statsData.total_count || 0,
          totalAmount: statsData.total_amount?.toFixed(2) || '0.00',
          avgPrice: statsData.avg_price?.toFixed(2) || '0.00'
        }
      }
    } catch (error) {
      console.error('获取时间范围统计失败:', error)
      sellTotalStats.value = {
        totalCount: 0,
        totalAmount: '0.00',
        avgPrice: '0.00'
      }
    }
  }

  // 事件处理函数
  const handleTabClick = (tab) => {
    if (tab.paneName === 'buy') {
      loadBuyData()
    } else if (tab.paneName === 'sell') {
      loadSellData()
    }
  }

  // Buy事件处理
  const handleBuySizeChange = (val) => {
    buyPageSize.value = val
    buyCurrentPage.value = 1
    loadBuyData()
  }

  const handleBuyCurrentChange = (val) => {
    buyCurrentPage.value = val
    loadBuyData()
  }

  const handleBuySearch = () => {
    buyCurrentPage.value = 1
    loadBuyData()
  }

  const handleBuyClearSearch = () => {
    buySearchText.value = ''
    buyGameNameFilter.value = 'all'
    buyDateRange.value = null
    buyCurrentPage.value = 1
    buyIsSearchMode.value = false
    buyIsTimeSearchMode.value = false
    buyAllSearchResults.value = []
    loadBuyData()
  }

  const handleBuyGameChange = () => {
    buyCurrentPage.value = 1
    loadBuyData()
  }

  const loadBuyStatsByGameName = async (gameName) => {
    try {
      const response = await fetch(apiUrls.steamBuyStatsByGameName(gameName), {
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
      
      if (statsData) {
        buyTotalStats.value = {
          totalCount: statsData.total_count || 0,
          totalAmount: statsData.total_amount?.toFixed(2) || '0.00',
          avgPrice: statsData.avg_price?.toFixed(2) || '0.00'
        }
        buyTotalItems.value = statsData.total_count || 0
      }
    } catch (error) {
      console.error('根据游戏名称获取Steam购买统计失败:', error)
      buyTotalStats.value = {
        totalCount: 0,
        totalAmount: '0.00',
        avgPrice: '0.00'
      }
      buyTotalItems.value = 0
    }
  }

  const handleBuyDateRangeChange = (value) => {
  }

  // Sell事件处理
  const handleSellSizeChange = (val) => {
    sellPageSize.value = val
    sellCurrentPage.value = 1
    loadSellData()
  }

  const handleSellCurrentChange = (val) => {
    sellCurrentPage.value = val
    loadSellData()
  }

  const handleSellSearch = () => {
    sellCurrentPage.value = 1
    loadSellData()
  }

  const handleSellClearSearch = () => {
    sellSearchText.value = ''
    sellGameNameFilter.value = 'all'
    sellDateRange.value = null
    sellCurrentPage.value = 1
    sellIsSearchMode.value = false
    sellIsTimeSearchMode.value = false
    sellAllSearchResults.value = []
    loadSellData()
  }

  const handleSellGameChange = () => {
    sellCurrentPage.value = 1
    loadSellData()
  }

  const loadSellStatsByGameName = async (gameName) => {
    try {
      const response = await fetch(apiUrls.steamSellStatsByGameName(gameName), {
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
      
      if (statsData) {
        sellTotalStats.value = {
          totalCount: statsData.total_count || 0,
          totalAmount: statsData.total_amount?.toFixed(2) || '0.00',
          avgPrice: statsData.avg_price?.toFixed(2) || '0.00'
        }
        sellTotalItems.value = statsData.total_count || 0
      }
    } catch (error) {
      console.error('根据游戏名称获取Steam销售统计失败:', error)
      sellTotalStats.value = {
        totalCount: 0,
        totalAmount: '0.00',
        avgPrice: '0.00'
      }
      sellTotalItems.value = 0
    }
  }

  const handleSellDateRangeChange = (value) => {
  }

  // 加载Buy游戏名称列表
  const loadBuyGameNames = async () => {
    try {
      const response = await fetch(apiUrls.steamBuyGameNames(), {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      buyGameNamesList.value = data || []
    } catch (error) {
      console.error('加载Buy游戏名称列表失败:', error)
      buyGameNamesList.value = []
    }
  }

  // 加载Sell游戏名称列表
  const loadSellGameNames = async () => {
    try {
      const response = await fetch(apiUrls.steamSellGameNames(), {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      sellGameNamesList.value = data || []
    } catch (error) {
      console.error('加载Sell游戏名称列表失败:', error)
      sellGameNamesList.value = []
    }
  }

  onMounted(() => {
    loadBuyGameNames() // 加载Buy游戏名称列表
    loadSellGameNames() // 加载Sell游戏名称列表
    loadBuyData() // 默认加载购买数据
  })

  return {
    activeTab,
    buyGameNamesList,
    sellGameNamesList,
    // Buy相关
    buyLoading,
    buyData,
    filteredBuyData,
    buyTotalStats,
    buyCurrentPageStats,
    buySearchText,
    buyGameNameFilter,
    buyDateRange,
    buyIsTimeSearchMode,
    buyCurrentPage,
    buyPageSize,
    buyTotalItems,
    buyIsSearchMode,
    buyAllSearchResults,
    // Sell相关
    sellLoading,
    sellData,
    filteredSellData,
    sellTotalStats,
    sellCurrentPageStats,
    sellSearchText,
    sellGameNameFilter,
    sellDateRange,
    sellIsTimeSearchMode,
    sellCurrentPage,
    sellPageSize,
    sellTotalItems,
    sellIsSearchMode,
    sellAllSearchResults,
    // 方法
    formatTime,
    handleTabClick,
    // Buy方法
    handleBuySizeChange,
    handleBuyCurrentChange,
    handleBuySearch,
    handleBuyClearSearch,
    handleBuyGameChange,
    handleBuyDateRangeChange,
    handleBuyTimeSearch,
    // Sell方法
    handleSellSizeChange,
    handleSellCurrentChange,
    handleSellSearch,
    handleSellClearSearch,
    handleSellGameChange,
    handleSellDateRangeChange,
    handleSellTimeSearch
  }
  }
}
}
