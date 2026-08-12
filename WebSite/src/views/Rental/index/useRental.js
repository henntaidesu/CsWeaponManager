import { ref, computed, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiUrls } from '@/config/api'
import { applyDeviceClass, watchDeviceType } from '@/utils/deviceDetect.js'

export function useRental() {
  const loading = ref(false)
  const dataController = ref(null)
  const statsController = ref(null)
  const rentalData = ref([])
  const searchText = ref('')
  const statusFilter = ref('')
  const statusSubFilter = ref('')
  const statusList = ref([])
  const statusSubList = ref([])
  const weaponTypeFilter = ref([])
  const floatRangeFilter = ref([])
  const weaponTypes = ref([])
  const floatRanges = ref([])
  const platformList = ref([])
  const platformFilter = ref('')
  const lessorList = ref([])
  const lessorFilter = ref('')
  const lenterList = ref([]) // 添加 lenterList 变量
  const currentPage = ref(1)
  const pageSize = ref(10)
  const totalItems = ref(0)
  const dateRange = ref(null)
  const isTimeSearchMode = ref(false)
  const sortOrder = ref('descending')

  // API请求缓存（简单的内存缓存，5分钟过期）
  const apiCache = new Map()
  const CACHE_DURATION = 5 * 60 * 1000 // 5分钟

  const getCachedData = (key) => {
    const cached = apiCache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    return null
  }

  const setCachedData = (key, data) => {
    apiCache.set(key, {
      data,
      timestamp: Date.now()
    })
  }
  
  // 高级搜索相关
  const hasAdvancedFilters = computed(() => {
    return (searchText.value && searchText.value.trim()) || 
           (statusFilter.value && statusFilter.value !== 'all') ||
           (statusSubFilter.value && statusSubFilter.value !== 'all') ||
           (weaponTypeFilter.value && weaponTypeFilter.value.length > 0) ||
           (floatRangeFilter.value && floatRangeFilter.value.length > 0) ||
           (dateRange.value && dateRange.value.length === 2)
  })
  // 全部数据统计（通过API获取）
  const allDataStats = ref({
    totalCount: 0,
    totalAmount: '0.00',
    avgPrice: '0.00',
    totalLeaseDays: 0,
    avgLeaseDays: '0.0',
    rentingCount: 0,
    completedCount: 0,
    cancelledCount: 0
  })

  // 当前页面统计（基于当前显示的数据计算）- 优化：减少重复遍历
  const currentPageStats = computed(() => {
    let totalCount = 0
    let totalAmount = 0
    let totalLeaseDays = 0
    let rentingCount = 0
    let completedCount = 0
    let cancelledCount = 0

    // 单次遍历计算所有统计
    for (const item of rentalData.value) {
      if (item.status === '已取消') {
        cancelledCount++
        continue
      }

      totalCount++
      const price = item.price || 0
      const days = item.total_Lease_Days || 0
      totalAmount += price * days
      totalLeaseDays += days

      if (item.status === '租赁中') rentingCount++
      else if (item.status === '已完成') completedCount++
    }

    return {
      totalCount,
      totalAmount: totalAmount.toFixed(2),
      avgPrice: totalCount > 0 ? (totalAmount / totalCount).toFixed(2) : '0.00',
      totalLeaseDays,
      avgLeaseDays: totalCount > 0 ? (totalLeaseDays / totalCount).toFixed(1) : '0.0',
      rentingCount,
      completedCount,
      cancelledCount
    }
  })

  // 预览弹窗
  const previewVisible = ref(false)
  const previewItem = ref(null)

  // 存储所有搜索结果，用于前端分页
  const allSearchResults = ref([])
  const isSearchMode = ref(false)

  const filteredRentalData = computed(() => {
    // 如果是搜索模式，进行前端分页
    if (isSearchMode.value && allSearchResults.value.length > 0) {
      let filtered = allSearchResults.value
      
      // 状态筛选
      if (statusFilter.value && statusFilter.value !== 'all') {
        filtered = filtered.filter(item => item.status === statusFilter.value)
      }
      
      // 更新总数以反映筛选后的结果
      // 仅在搜索模式下需要根据筛选结果调整 total
      totalItems.value = filtered.length

      // 前端分页
      const start = (currentPage.value - 1) * pageSize.value
      const end = start + pageSize.value
      return filtered.slice(start, end)
    }

    // 非搜索模式的筛选
    let filtered = rentalData.value
    if (statusFilter.value && statusFilter.value !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter.value)
    }
    if (statusSubFilter.value && statusSubFilter.value !== 'all') {
      // 子状态对应 status_sub 字段
      filtered = filtered.filter(item => (item.status_sub || '') === statusSubFilter.value)
    }
    if (platformFilter.value && platformFilter.value !== 'all') {
      filtered = filtered.filter(item => (item.from || '') === platformFilter.value)
    }
    if (lessorFilter.value && lessorFilter.value !== 'all') {
      filtered = filtered.filter(item => (item.data_user || '') === lessorFilter.value)
    }
    return filtered
  })

  const formatTime = (time) => {
    if (!time) return ''
    return new Date(time).toLocaleString('zh-CN')
  }

  const getStatusType = (status) => {
    const statusMap = {
      '已完成': 'success',
      '租赁中': 'warning',
      '已取消': 'danger',
      '已归还': 'success',
      '已转租': 'success'
    }
    return statusMap[status] || 'info'
  }

  const getStatusColor = (status) => {
    const colorMap = {
      '已完成': '#52c41a',    // 更鲜明的绿色
      '租赁中': '#faad14',    // 更鲜明的橙色
      '已取消': '#ff4d4f',    // 更鲜明的红色
      '进行中': '#1890ff',    // 蓝色
      '已归还': '#52c41a',
      '已转租': '#52c41a'
    }
    return colorMap[status] || '#909399'
  }

  const getStatusTextColor = (status) => {
    return '#FFFFFF'
  }

  const mapSource = (val) => {
    if (!val) return '-'
    if (val.toLowerCase() === 'yyyp') return '悠悠有品'
    if (val.toLowerCase() === 'buff') return 'BUFF'
    if (val.toLowerCase() === 'igxe') return 'IGXE'
    return val
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

  // 组合标题：武器名 | 饰品名 （磨损）；若两者相同，仅显示一次
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
    return title || item.ID || ''
  }

  // 检查是否有额外信息（印花、挂件、改名）
  const hasExtras = (item) => {
    return !!(item.sticker || item.pendant || item.rename)
  }

  // 解析印花数据
  const parseStickers = (stickerData) => {
    if (!stickerData) return []
    try {
      const parsed = typeof stickerData === 'string' ? JSON.parse(stickerData) : stickerData
      if (!Array.isArray(parsed)) return []

      return parsed.map(sticker => {
        const name = sticker.name || '未知贴纸'
        const hashName = sticker.hashName || sticker.steam_hash_name || sticker.steamHashName

        let imageUrl = null
        if (hashName) {
          // 如果 hashName 已经包含 "Sticker | " 前缀，直接使用；否则添加前缀
          const fullHashName = hashName.startsWith('Sticker | ')
            ? hashName
            : `Sticker | ${hashName}`

          const imageName = fullHashName
            .replace(/\s*\|\s*/g, '___')
            .replace(/\s/g, '_')
            .replace(/\*/g, '_')
            .replace(/™/g, '?')
          imageUrl = apiUrls.weaponImage(`${imageName}.png`)
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

      let pendantObj = Array.isArray(parsed) ? parsed[0] : parsed

      if (!pendantObj || typeof pendantObj !== 'object') return null

      const hashName = pendantObj.hashName || pendantObj.steam_hash_name || pendantObj.steamHashName

      let imageUrl = null
      if (hashName) {
        // 如果 hashName 已经包含 "Charm | " 前缀，直接使用；否则添加前缀
        const fullHashName = hashName.startsWith('Charm | ')
          ? hashName
          : `Charm | ${hashName}`

        const imageName = fullHashName
          .replace(/\s*\|\s*/g, '___')
          .replace(/\s/g, '_')
          .replace(/\*/g, '_')
          .replace(/™/g, '?')
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

  const createAbortSignal = (controllerRef) => {
    if (controllerRef.value) {
      controllerRef.value.abort()
    }
    controllerRef.value = new AbortController()
    return controllerRef.value.signal
  }

  const searchByName = async (itemName) => {
    loading.value = true
    try {
      const count = await fetchRentalDataFiltered({
        min: 0,
        max: 10000,
        keywordOverride: itemName,
        storeInSearch: true
      })

      // 进入搜索模式
      isSearchMode.value = true
      totalItems.value = count
      currentPage.value = 1

      if (count === 0) {
        ElMessage.info(`未找到包含"${itemName}"的武器`)
      } else {
        ElMessage.success(`找到 ${count} 条相关记录`)
      }
      
    } catch (error) {
      if (error.name === 'AbortError') return
      console.error('搜索失败:', error)
      ElMessage.error(`搜索失败: ${error.message}`)
      rentalData.value = []
      allSearchResults.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
      await loadFilteredStats()
    }
  }

  const buildStatFilters = () => {
    const filters = {}
    if (statusFilter.value && statusFilter.value !== 'all') {
      filters.status = statusFilter.value
    }
    if (statusSubFilter.value && statusSubFilter.value !== 'all') {
      filters.status_sub = statusSubFilter.value
    }
    if (platformFilter.value && platformFilter.value !== 'all') {
      filters.platform = platformFilter.value
    }
    if (lessorFilter.value && lessorFilter.value !== 'all') {
      filters.data_user = lessorFilter.value
    }
    if (weaponTypeFilter.value && weaponTypeFilter.value.length > 0) {
      filters.weapon_types = weaponTypeFilter.value
    }
    if (floatRangeFilter.value && floatRangeFilter.value.length > 0) {
      filters.float_ranges = floatRangeFilter.value
    }
    if (searchText.value && searchText.value.trim()) {
      filters.search = searchText.value.trim()
    }
    if (dateRange.value && dateRange.value.length === 2) {
      filters.start_date = dateRange.value[0]
      filters.end_date = dateRange.value[1]
    }
    return filters
  }

  const loadFilteredStats = async () => {
    try {
      // 使用 rental 统计接口
      const response = await fetch(apiUrls.rentalStats(), {
        method: 'GET',
        mode: 'cors',
        signal: createAbortSignal(statsController),
        headers: {
          'Accept': 'application/json',
        },
      })

      // 检查请求是否已被取消
      if (statsController.value?.signal.aborted) {
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const statsData = await response.json()

      allDataStats.value = {
        totalCount: statsData.total_count ?? 0,
        totalAmount: (statsData.total_amount ?? 0).toFixed(2),
        avgPrice: (statsData.avg_price ?? 0).toFixed(2),
        totalLeaseDays: statsData.total_lease_days ?? 0,
        avgLeaseDays: (statsData.avg_lease_days ?? 0).toFixed(1),
        rentingCount: statsData.renting_count ?? 0,
        completedCount: statsData.completed_count ?? 0,
        cancelledCount: statsData.cancelled_count ?? 0
      }

      // 复用统计返回的总数作为分页总数，减少额外计数请求
      if (typeof statsData.total_count === 'number') {
        totalItems.value = statsData.total_count
      }
    } catch (error) {
      if (error.name === 'AbortError') return
      console.error('加载统计数据失败:', error)
      allDataStats.value = {
        totalCount: 0,
        totalAmount: '0.00',
        avgPrice: '0.00',
        totalLeaseDays: 0,
        avgLeaseDays: '0.0',
        rentingCount: 0,
        completedCount: 0,
        cancelledCount: 0
      }
    }
  }

  // 向后兼容旧调用
  const loadAllDataStats = () => loadFilteredStats()

  const buildDataFilters = (keywordOverride = null) => {
    const filters = {
      status: statusFilter.value && statusFilter.value !== 'all' ? statusFilter.value : null,
      status_sub: statusSubFilter.value && statusSubFilter.value !== 'all' ? statusSubFilter.value : null,
      platform: platformFilter.value && platformFilter.value !== 'all' ? platformFilter.value : null,
      lessor_name: lessorFilter.value && lessorFilter.value !== 'all' ? lessorFilter.value : null,
      weapon_types: weaponTypeFilter.value && weaponTypeFilter.value.length > 0 ? weaponTypeFilter.value : null,
      float_ranges: floatRangeFilter.value && floatRangeFilter.value.length > 0 ? floatRangeFilter.value : null,
      search: keywordOverride !== null
        ? (keywordOverride || null)
        : (searchText.value && searchText.value.trim() ? searchText.value.trim() : null),
    }

    if (dateRange.value && dateRange.value.length === 2) {
      filters.start_date = dateRange.value[0]
      filters.end_date = dateRange.value[1]
    }

    return filters
  }

  const fetchRentalDataFiltered = async ({ min, max, keywordOverride = null, storeInSearch = false }) => {
    const response = await fetch(apiUrls.rentalSearchByName(keywordOverride || searchText.value.trim()), {
      method: 'GET',
      mode: 'cors',
      signal: createAbortSignal(dataController),
      headers: {
        'Accept': 'application/json',
      }
    })

    // 检查请求是否已被取消
    if (dataController.value?.signal.aborted) {
      return 0 // 返回0表示没有找到数据
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const rawData = await response.json()
    if (!Array.isArray(rawData)) {
      throw new Error('数据格式错误')
    }

    const mapped = rawData.map((item, index) => {
      if (!Array.isArray(item)) return null
      return {
        id: index + 1,
        ID: item[0] || '',
        weapon_name: item[1] || '',
        weapon_type: item[2] || '',
        item_name: item[3] || '', 
        weapon_float: item[4] || 0,
        float_range: item[5] || '',
        price: item[6] || 0,
        lessor_name: item[7] || '',
        status: item[8] || '',
        last_status: item[9] || '',
        from: item[10] || '',
        lean_start_time: item[11] || '',
        lean_end_time: item[12] || '',
        total_Lease_Days: item[13] || 0,
        max_Lease_Days: item[14] || 0,
        steam_hash_name: item[15] || '',
        sticker: item[16] || null,
        pendant: item[17] || null,
        rename: item[18] || '',
        data_user: item[19] || ''
      }
    }).filter(Boolean)

    if (storeInSearch) {
      allSearchResults.value = mapped
      rentalData.value = []
    } else {
      rentalData.value = mapped
    }

    return mapped.length
  }

  const loadRentalData = async () => {
    // 如果是搜索模式且有搜索关键词，不需要重新加载数据
    if (isSearchMode.value && searchText.value.trim()) {
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
      

      
      // 根据状态/子状态筛选选择不同的API（子状态优先）
      let apiUrl = apiUrls.rentalData(min, max)
      if (statusSubFilter.value && statusSubFilter.value !== 'all') {
        apiUrl = apiUrls.rentalDataByStatusSub(statusSubFilter.value, min, max)
      } else if (statusFilter.value && statusFilter.value !== 'all') {
        apiUrl = apiUrls.rentalDataByStatus(statusFilter.value, min, max)
      }
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        mode: 'cors',
        signal: createAbortSignal(dataController),
        headers: {
          'Accept': 'application/json',
        },
      })

      // 检查请求是否已被取消
      if (dataController.value?.signal.aborted) {
        return
      }


      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const rawData = await response.json()
      
      // 检查数据格式
      if (!Array.isArray(rawData)) {
        console.error('数据格式错误，期望数组格式，实际收到:', typeof rawData)
        throw new Error('数据格式错误')
      }
      
      // 转换数组格式数据为对象格式
      rentalData.value = rawData.map((item, index) => {
        if (!Array.isArray(item)) {
          console.error('数据项格式错误，期望数组，实际收到:', item)
          return null
        }

        return {
          id: index + 1,
          ID: item[0] || '',
          weapon_name: item[1] || '',
          weapon_type: item[2] || '',
          item_name: item[3] || '',
          weapon_float: item[4] || 0,
          float_range: item[5] || '',
          price: item[6] || 0,
          lessor_name: item[7] || '',
          status: item[8] || '',
          status_sub: item[9] || '',
          from: item[10] || '',
          lean_start_time: item[11] || '',
          lean_end_time: item[12] || '',
          total_Lease_Days: item[13] || 0,
          max_Lease_Days: item[14] || 0,
          steam_hash_name: item[15] || '',
          sticker: item[16] || null,
          pendant: item[17] || null,
          rename: item[18] || '',
          data_user: item[19] || ''
        }
      }).filter(item => item !== null)
      

      // 并行刷新统计（内部会更新 totalItems）
      await loadFilteredStats()

      if (rentalData.value.length === 0) {
        ElMessage.info('暂无借入数据')
      } else {
        ElMessage.success(`加载成功，共 ${rentalData.value.length} 条记录`)
      }
      
    } catch (error) {
      if (error.name === 'AbortError') return
      console.error('加载出租数据失败:', error)
      
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
      rentalData.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  const handleSizeChange = (val) => {
    pageSize.value = val
    currentPage.value = 1
    loadRentalData()
  }

  const handleCurrentChange = (val) => {
    currentPage.value = val
    loadRentalData()
  }

  const handleSortChange = ({ prop, order }) => {
    if (prop === 'lean_start_time') {
      sortOrder.value = order || 'descending'
      const sortFn = (a, b) => {
        const ta = new Date(a.lean_start_time || 0).getTime()
        const tb = new Date(b.lean_start_time || 0).getTime()
        return sortOrder.value === 'ascending' ? ta - tb : tb - ta
      }

      if (isSearchMode.value && allSearchResults.value.length > 0) {
        allSearchResults.value.sort(sortFn)
      } else {
        rentalData.value.sort(sortFn)
      }
    }
  }

  const handleSearch = () => {
    handleAdvancedSearch()
  }

  const handleClearSearch = async () => {
    searchText.value = ''
    statusFilter.value = ''
    statusSubFilter.value = ''
    statusSubList.value = []
    weaponTypeFilter.value = []
    floatRangeFilter.value = []
    dateRange.value = null
    currentPage.value = 1
    isSearchMode.value = false
    isTimeSearchMode.value = false
    allSearchResults.value = []

    // 优化：并行执行，避免重复调用
    await Promise.all([
      loadStatusSubList(),
      loadRentalData(),
      loadFilteredStats()
    ])
  }

  const handleStatusChange = async () => {
    // 未选择时为空，接口内部会将空转换为 all
    currentPage.value = 1
    // 重置子状态并立即刷新子状态列表
    statusSubFilter.value = ''
    statusSubList.value = []

    // 如果是搜索模式，只需要更新分页，不需要重新加载数据
    if (isSearchMode.value && searchText.value.trim()) {
      await loadStatusSubList()
      // 状态变更会自动通过computed属性重新计算filteredLentData
      return
    } else {
      // 非搜索模式，并行加载数据
      await Promise.all([
        loadStatusSubList(),
        loadRentalData(),
        loadFilteredStats()
      ])
    }
  }
  const handleStatusSubChange = async () => {
    currentPage.value = 1
    // 空子状态表示全部
    if (!statusSubFilter.value) {
      statusSubFilter.value = ''
    }
    // 优化：并行加载
    await Promise.all([
      loadRentalData(),
      loadFilteredStats()
    ])
  }

  const handlePlatformChange = async () => {
    currentPage.value = 1
    // 优化：并行加载
    await Promise.all([
      loadRentalData(),
      loadFilteredStats()
    ])
  }

  const handleLessorChange = async () => {
    currentPage.value = 1
    // 优化：并行加载
    await Promise.all([
      loadRentalData(),
      loadFilteredStats()
    ])
  }

  const handleStatusSubVisibleChange = (visible) => {
    if (visible) {
      loadStatusSubList()
    }
  }

  const handleDateRangeChange = (value) => {
  }

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
        await loadRentalData()
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
      
      const response = await fetch(apiUrls.rentalSearchByTime(startDate, endDate), {
        method: 'GET',
        mode: 'cors',
        signal: createAbortSignal(dataController),
        headers: {
          'Accept': 'application/json',
        },
      })

      // 检查请求是否已被取消
      if (dataController.value?.signal.aborted) {
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const rawData = await response.json()

      if (!Array.isArray(rawData)) {
        throw new Error('搜索结果格式错误')
      }

      // 转换搜索结果并存储所有数据
      const searchResults = rawData.map((item, index) => ({
        id: index + 1,
        ID: item[0] || '',
        weapon_name: item[1] || '',
        weapon_type: item[2] || '',
        item_name: item[3] || '',
        weapon_float: item[4] || 0,
        float_range: item[5] || '',
        price: item[6] || 0,
        lessor_name: item[7] || '',
        status: item[8] || '',
        status_sub: item[9] || '',
        from: item[10] || '',
        lean_start_time: item[11] || '',
        lean_end_time: item[12] || '',
        total_Lease_Days: item[13] || 0,
        max_Lease_Days: item[14] || 0,
        steam_hash_name: item[15] || '',
        sticker: item[16] || null,
        pendant: item[17] || null,
        rename: item[18] || '',
        data_user: item[19] || ''
      }))
      
      // 进入时间搜索模式
      isTimeSearchMode.value = true
      isSearchMode.value = true
      allSearchResults.value = searchResults
      rentalData.value = [] // 清空普通数据
      totalItems.value = rawData.length
      currentPage.value = 1
      
      // 获取时间搜索结果的统计
      await loadTimeRangeStats(startDate, endDate)
      
      if (searchResults.length === 0) {
        ElMessage.info(`在 ${startDate} 至 ${endDate} 期间未找到出租记录`)
      } else {
        ElMessage.success(`找到 ${searchResults.length} 条出租记录`)
      }
      
    } catch (error) {
      if (error.name === 'AbortError') return
      console.error('时间搜索失败:', error)
      ElMessage.error(`时间搜索失败: ${error.message}`)
      isSearchMode.value = false
      isTimeSearchMode.value = false
      allSearchResults.value = []
      rentalData.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  const loadTimeRangeStats = async (startDate, endDate) => {
    try {
      
      const response = await fetch(apiUrls.rentalStatsByTime(startDate, endDate), {
        method: 'GET',
        mode: 'cors',
        signal: createAbortSignal(statsController),
        headers: {
          'Accept': 'application/json',
        },
      })

      // 检查请求是否已被取消
      if (statsController.value?.signal.aborted) {
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const statsData = await response.json()
      
      if (statsData) {
        allDataStats.value = {
          totalCount: statsData.total_count || 0,
          totalAmount: statsData.total_amount?.toFixed(2) || '0.00',
          avgPrice: statsData.avg_price?.toFixed(2) || '0.00',
          totalLeaseDays: statsData.total_lease_days || 0,
          avgLeaseDays: statsData.avg_lease_days?.toFixed(1) || '0.0',
          rentingCount: statsData.renting_count || 0,
          completedCount: statsData.completed_count || 0,
          cancelledCount: statsData.cancelled_count || 0
        }
      } else {
        console.error('时间范围统计API返回数据格式错误:', statsData)
      }
    } catch (error) {
      if (error.name === 'AbortError') return
      console.error('获取时间范围统计失败:', error)
      allDataStats.value = {
        totalCount: 0,
        totalAmount: '0.00',
        avgPrice: '0.00',
        totalLeaseDays: 0,
        avgLeaseDays: '0.0',
        rentingCount: 0,
        completedCount: 0,
        cancelledCount: 0
      }
    }
  }

  // 加载武器类型数据（带缓存）
  const loadWeaponTypes = async () => {
    try {
      const cacheKey = 'rentalWeaponTypes'
      const cached = getCachedData(cacheKey)
      if (cached) {
        weaponTypes.value = cached
        return
      }

      const response = await fetch(apiUrls.rentalWeaponTypes())
      const result = await response.json()
      if (result.success) {
        weaponTypes.value = result.data
        setCachedData(cacheKey, result.data)
      }
    } catch (error) {
      console.error('获取武器类型失败:', error)
    }
  }

  // 加载磨损等级数据（带缓存）
  const loadFloatRanges = async () => {
    try {
      const cacheKey = 'rentalFloatRanges'
      const cached = getCachedData(cacheKey)
      if (cached) {
        floatRanges.value = cached
        return
      }

      const response = await fetch(apiUrls.rentalFloatRanges())
      const result = await response.json()
      if (result.success) {
        floatRanges.value = result.data
        setCachedData(cacheKey, result.data)
      }
    } catch (error) {
      console.error('获取磨损等级失败:', error)
    }
  }

  // 加载状态列表数据（status）- 带缓存
  const loadStatusList = async () => {
    try {
      const cacheKey = 'rentalStatusList'
      const cached = getCachedData(cacheKey)
      if (cached) {
        statusList.value = cached
        return
      }

      const response = await fetch(apiUrls.rentalStatusList())
      const result = await response.json()
      if (result && result.success && Array.isArray(result.data)) {
        statusList.value = result.data
        setCachedData(cacheKey, result.data)
      } else {
        statusList.value = []
      }
    } catch (error) {
      console.error('获取状态列表失败:', error)
    }
  }

  // 加载子状态列表数据（status_sub），依据当前 statusFilter
  const loadStatusSubList = async () => {
    try {
      const statusParam = statusFilter.value || 'all'
      const response = await fetch(apiUrls.rentalStatusSubList(statusParam))
      const result = await response.json()
      if (result && result.success && Array.isArray(result.data)) {
        statusSubList.value = result.data
      } else {
        statusSubList.value = []
      }
    } catch (error) {
      console.error('获取子状态列表失败:', error)
      statusSubList.value = []
    }
  }

  const loadPlatformList = async () => {
    try {
      const cacheKey = 'rentalPlatformList'
      const cached = getCachedData(cacheKey)
      if (cached) {
        platformList.value = cached
        return
      }

      const response = await fetch(apiUrls.rentalPlatformList())
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        platformList.value = result.data
        setCachedData(cacheKey, result.data)
      } else {
        platformList.value = []
      }
    } catch (error) {
      console.error('获取平台列表失败:', error)
      platformList.value = []
    }
  }

  const loadLenterList = async () => {
    try {
      const cacheKey = 'rentalUserList'
      const cached = getCachedData(cacheKey)
      if (cached) {
        lenterList.value = cached
        lessorList.value = cached
        return
      }

      // 使用 getRentalUserList 接口读取 data_user 列
      const response = await fetch(apiUrls.rentalUserList())
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        lenterList.value = result.data
        lessorList.value = result.data
        setCachedData(cacheKey, result.data)
      } else {
        lenterList.value = []
        lessorList.value = []
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
      lenterList.value = []
      lessorList.value = []
    }
  }

  // 类型筛选处理
  const handleTypeChange = async () => {
    if (weaponTypeFilter.value && weaponTypeFilter.value.length > 0 || 
        floatRangeFilter.value && floatRangeFilter.value.length > 0) {
      await searchByTypeAndWear()
    } else {
      await loadRentalData()
    }
  }

  // 磨损等级筛选处理
  const handleWearChange = async () => {
    if (weaponTypeFilter.value && weaponTypeFilter.value.length > 0 || 
        floatRangeFilter.value && floatRangeFilter.value.length > 0) {
      await searchByTypeAndWear()
    } else {
      await loadRentalData()
    }
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

  // 按类型和磨损等级搜索 - rental暂不支持，保留空实现
  const searchByTypeAndWear = async () => {
    ElMessage.warning('借入数据暂不支持按类型和磨损筛选')
    await loadRentalData()
  }

  // 获取按类型和磨损筛选的统计数据 - rental暂不支持，保留空实现
  const loadStatsByTypeAndWear = async () => {
    // rental暂不支持
  }

  const openPreview = (item) => {
    previewItem.value = item
    previewVisible.value = true
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

  onMounted(async () => {
    // 应用设备类型类到 body
    const deviceType = applyDeviceClass()

    // 监听设备类型变化
    unwatchDevice = watchDeviceType((newDeviceType) => {
    })

    // 优化：先加载主数据，其他数据按需加载
    // 立即加载主数据和统计
    const criticalRequests = [
      loadRentalData(),
      loadFilteredStats()
    ]

    // 延迟加载非关键数据（如下拉列表选项）
    setTimeout(async () => {
      const lazyRequests = [
        loadWeaponTypes(),
        loadFloatRanges(),
        loadStatusList(),
        loadStatusSubList(),
        loadPlatformList(),
        loadLenterList()
      ]
      await Promise.allSettled(lazyRequests)
    }, 100)

    await Promise.allSettled(criticalRequests)
  })

  onUnmounted(() => {
    // 取消设备类型监听
    if (unwatchDevice) {
      unwatchDevice()
    }
  })

  onBeforeUnmount(() => {
    dataController.value?.abort()
    statsController.value?.abort()
  })

  return {
    loading,
    rentalData,
    filteredRentalData,
    allDataStats,
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
    platformList,
    lessorList,
    platformFilter,
    lessorFilter,
    dateRange,
    isTimeSearchMode,
    currentPage,
    pageSize,
    totalItems,
    isSearchMode,
    allSearchResults,
    sortOrder,
    previewVisible,
    previewItem,
    formatTime,
    getStatusType,
    getStatusColor,
    getStatusTextColor,
    mapSource,
    handleSizeChange,
    handleCurrentChange,
    handleSortChange,
    handleSearch,
    handleClearSearch,
    handleStatusChange,
    handleStatusSubChange,
    handlePlatformChange,
    handleLessorChange,
    handleTypeChange,
    handleWearChange,
    removeWeaponType,
    removeFloatRange,
    handleStatusSubVisibleChange,
    handleAdvancedSearch,
    handleDateRangeChange,
    hasAdvancedFilters,
    handleTimeSearch,
    getWeaponImage,
    getItemTitle,
    hasExtras,
    parseStickers,
    parsePendant,
    openPreview,
    confirmJumpToItemSearch,
    handleJumpToItemSearch,
    handleJumpToItemSearchBySticker,
    handleJumpToItemSearchByPendant
  }
}
