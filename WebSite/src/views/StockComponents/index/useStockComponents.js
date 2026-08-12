import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { apiUrls } from '@/config/api.js'
import { applyDeviceClass, watchDeviceType } from '@/utils/deviceDetect.js'

export function useStockComponents() {
  const STORAGE_KEYS = {
    displayMode: 'stock-components:displayMode',
    groupMode: 'stock-components:groupMode',
  }

  const safeGetLocalStorage = (key) => {
    try {
      return localStorage.getItem(key)
    } catch (e) {
      return null
    }
  }

  const safeSetLocalStorage = (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      // ignore
    }
  }

  const loading = ref(false)
  const updateLoading = ref(false)
  const updateAllLoading = ref(false)
  const updateAbnormalLoading = ref(false)
  const autoFillLoading = ref(false)
  const platformPriceLoading = ref(false)
  const platformPriceDialogVisible = ref(false)
  const searchText = ref('')

  // 视图模式持久化：默认卡片；如果本地保存了选择则恢复
  const persistedDisplayMode = safeGetLocalStorage(STORAGE_KEYS.displayMode)
  const initialDisplayMode = persistedDisplayMode === 'list' || persistedDisplayMode === 'card'
    ? persistedDisplayMode
    : 'card'
  const displayMode = ref(initialDisplayMode)

  // 组合模式：默认 true；如果本地保存了选择则恢复（卡片模式和列表模式都支持）
  const persistedGroupMode = safeGetLocalStorage(STORAGE_KEYS.groupMode)
  const initialGroupMode = persistedGroupMode === 'true'
    ? true
    : (persistedGroupMode === 'false' ? false : true)
  const groupMode = ref(initialGroupMode)

  const showPriceDiff = ref(true)
  const componentData = ref([])
  const groupedData = ref([])
  const weaponTypeFilter = ref('') // 武器类型筛选
  const weaponTypes = ref([]) // 武器类型列表
  const weaponNameFilter = ref('') // 磨损等级筛选
  const weaponNames = ref([]) // 磨损等级列表
  const currentPage = ref(1)
  // 根据显示模式设置初始 pageSize：卡片模式100条，列表模式10条
  const pageSize = ref(initialDisplayMode === 'card' ? 100 : 10)
  const currentOffset = ref(0) // 当前偏移量
  const hasMore = ref(true) // 是否还有更多数据
  const loadingMore = ref(false) // 是否正在加载更多
  const totalItems = ref(0)
  const steamIdList = ref([])
  const selectedSteamId = ref('')
  const inventoryComponents = ref([])
  const selectedComponent = ref('')
  const tableRef = ref(null)
  const expandedRowPages = ref({})
  const previewVisible = ref(false)
  const previewItem = ref(null)

  // 列表排序（服务端排序）：保存当前排序字段与方向，切页时继续带参
  const sortBy = ref('unit_price')
  const sortDir = ref('desc')
  
  // 多选模式相关
  const isMultiSelectMode = ref(true) // 默认开启多选模式
  const selectedItems = ref([])
  const removeLoading = ref(false)
  
  // Popover 相关
  const popoverVisible = ref(false)
  const popoverItem = ref(null)
  const popoverPosition = ref({ x: 0, y: 0 })

  // 移出数量对话框相关
  const removeQuantityDialogVisible = ref(false)
  const removeQuantity = ref(0)
  const maxRemoveQuantity = ref(0)
  
  // 图片观察器
  let imageObserver = null
  
  // 编辑价格相关
  const editingGoodsAssetId = ref(null)
  const editingPrice = ref('')
  const originalPrice = ref('')
  
  
  // classid常量 - 组件的classid
  const COMPONENT_CLASSID = '3604678661'

  // 计算异常组件数量
  const abnormalComponentsCount = computed(() => {
    return inventoryComponents.value.filter(item => hasCountMismatch(item)).length
  })

  const totalStats = ref({
    componentCount: 0,
    totalCount: 0,
    totalCost: '0.00',
    totalYYYPPrice: '0.00',
    totalBuffPrice: '0.00',
    totalSteamPrice: '0.00',
    yyypDiff: '0.00',
    buffDiff: '0.00',
    steamDiff: '0.00'
  })

  const filteredData = computed(() => {
    return groupMode.value ? groupedData.value : componentData.value
  })

  const formatTime = (time) => {
    if (!time) return '-'
    return new Date(time).toLocaleString('zh-CN')
  }

  const formatPrice = (price) => {
    if (!price || price === 0 || price === '0') return '0.00'
    const num = parseFloat(price)
    if (isNaN(num)) return '0.00'
    return num.toFixed(2)
  }

  const formatWeaponFloat = (value) => {
    if (!value || value === '0' || value === '0.0') return ''
    const str = String(value)
    if (str === '0' || str === '0.0') return ''
    return str
  }

  // 判断组件数量是否不匹配
  const hasCountMismatch = (item) => {
    if (item.actual_count === null || item.actual_count === undefined) {
      return false
    }
    const displayCount = parseInt(item.weapon_float) || 0
    const actualCount = parseInt(item.actual_count) || 0
    return displayCount !== actualCount
  }

  // 获取组件下拉框的label文本
  const getComponentLabel = (item) => {
    const displayCount = item.weapon_float || 0
    const actualCount = item.actual_count

    if (actualCount !== null && actualCount !== undefined) {
      const mismatch = hasCountMismatch(item)
      const prefix = mismatch ? '⚠ ' : ''
      return `${prefix}${item.item_name} (显示:${displayCount} | 实际:${actualCount})`
    } else {
      return item.weapon_float ? `${item.item_name} (数量:${displayCount})` : item.item_name
    }
  }

  const getQuantityType = (quantity) => {
    if (quantity === 0) return 'danger'
    if (quantity < 5) return 'warning'
    if (quantity < 10) return 'info'
    return 'success'
  }

  // 获取武器图片
  const getWeaponImage = (steamHashName) => {
    if (!steamHashName) {
      return null
    }
    // steam_hash_name 应当是 Steam 市场名；历史数据里可能残留平台图床 URL，
    // 那种值拼不出本地文件名，直接放弃，避免刷一片 404
    if (/^https?:\/\//i.test(steamHashName)) {
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

  // 解析印花数据
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

  const loadSteamIdList = async () => {
    try {
      // 从完美世界配置中获取账号列表，传递classid参数统计库存组件数量
      const response = await axios.get(apiUrls.stockComponentsSteamIds(), {
        params: {
          classid: COMPONENT_CLASSID
        }
      })
      if (response.data.success) {
        steamIdList.value = response.data.data
        if (steamIdList.value.length > 0) {
          selectedSteamId.value = steamIdList.value[0].steamID
        } else {
          ElMessage.warning('没有找到完美世界账号配置')
        }
      }
    } catch (error) {
      console.error('加载完美世界配置列表失败:', error)
      ElMessage.error('加载账号列表失败: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleSteamIdChange = () => {
    selectedComponent.value = ''
    weaponTypeFilter.value = ''
    loadInventoryComponents()
    loadWeaponTypes()
    groupMode.value ? loadGroupedData() : loadComponentData()
  }

  const loadWeaponTypes = async () => {
    if (!selectedSteamId.value) {
      weaponTypes.value = []
      return
    }
    
    try {
      const response = await axios.get(apiUrls.stockComponentsWeaponTypes(selectedSteamId.value))
      if (response.data.success) {
        weaponTypes.value = response.data.data || []
      } else {
        weaponTypes.value = []
      }
    } catch (error) {
      console.error('加载武器类型失败:', error)
      weaponTypes.value = []
    }
  }

  const loadWeaponNames = async () => {
    if (!selectedSteamId.value) {
      weaponNames.value = []
      return
    }

    try {
      const response = await axios.get(apiUrls.stockComponentsFloatRanges(selectedSteamId.value))
      if (response.data.success) {
        weaponNames.value = response.data.data || []
      } else {
        weaponNames.value = []
      }
    } catch (error) {
      console.error('加载磨损等级失败:', error)
      weaponNames.value = []
    }
  }

  const handleWeaponTypeChange = () => {
    currentPage.value = 1
    currentOffset.value = 0

    // 根据当前显示模式决定加载哪个数据
    if (groupMode.value) {
      loadGroupedData()
    } else {
      loadComponentData()
    }

    // 重新加载统计数据
    loadComponentStats()
  }

  const handleWeaponNameChange = () => {
    currentPage.value = 1
    currentOffset.value = 0

    // 根据当前显示模式决定加载哪个数据
    if (groupMode.value) {
      loadGroupedData()
    } else {
      loadComponentData()
    }

    // 重新加载统计数据
    loadComponentStats()
  }

  const handleFilterChange = () => {
    currentPage.value = 1
    currentOffset.value = 0

    // 根据当前显示模式决定加载哪个数据
    if (groupMode.value) {
      loadGroupedData()
    } else {
      loadComponentData()
    }

    // 重新加载统计数据
    loadComponentStats()
  }

  const loadInventoryComponents = async () => {
    if (!selectedSteamId.value) {
      return
    }
    
    try {
      
      // 从 steam_inventory 表获取组件列表用于下拉框
      const response = await axios.get(apiUrls.stockComponentsInventory(selectedSteamId.value), {
        params: {
          classid: COMPONENT_CLASSID,
          limit: 9999,
          offset: 0
        }
      })
      
      
      if (response.data.success) {
        inventoryComponents.value = response.data.data || []
      } else {
        console.error('加载库存组件失败:', response.data.error)
        inventoryComponents.value = []
      }
    } catch (error) {
      console.error('加载库存组件失败:', error)
      console.error('错误详情:', error.response?.status, error.response?.data)
      // 如果获取失败,不显示错误提示,只是清空列表
      inventoryComponents.value = []
    }
  }

  const handleComponentSelect = async () => {

    // 切换组件时清空之前的选择
    clearSelection()

    if (!selectedComponent.value) {
      // 清空选择，重新加载所有组件数据
      currentPage.value = 1
      currentOffset.value = 0
      // 根据当前显示模式决定加载哪个数据
      if (groupMode.value) {
      loadGroupedData()
    } else {
      loadComponentData()
    }
      // 重新加载统计数据
      loadComponentStats()
      return
    }

    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }

    // 重置页码和偏移量
    currentPage.value = 1
    currentOffset.value = 0

    // 根据分组模式决定加载哪个数据（不再仅根据显示模式）
    if (groupMode.value) {
      loadGroupedData()
    } else {
      loadComponentData()
    }

    // 重新加载统计数据
    loadComponentStats()
  }

  const loadComponentData = async (reset = true) => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请选择Steam账号')
      return
    }

    // 如果是重置，清空数据
    if (reset) {
      componentData.value = []
      currentOffset.value = 0
      hasMore.value = true
    }

    loading.value = true
    try {
      // 列表模式：使用 currentPage，卡片模式：使用 offset 计算页码
      const currentPageNum = displayMode.value === 'list'
        ? currentPage.value
        : Math.floor(currentOffset.value / pageSize.value) + 1


      const params = {
        search: searchText.value,
        page: currentPageNum,
        page_size: pageSize.value,
        // 服务端排序：默认按"单价/平均购入价"
        order_by: sortBy.value,
        order_dir: sortDir.value
      }

      // 如果选择了组件，添加 assetid 参数进行筛选
      if (selectedComponent.value) {
        params.assetid = selectedComponent.value
      }

      // 如果选择了武器类型，添加 weapon_type 参数进行筛选
      if (weaponTypeFilter.value) {
        params.weapon_type = weaponTypeFilter.value
      }

      // 如果选择了磨损等级，添加 float_range 参数进行筛选
      if (weaponNameFilter.value) {
        params.float_range = weaponNameFilter.value
      }

      const response = await axios.get(apiUrls.stockComponentsData(selectedSteamId.value), {
        params: params
      })


      if (response.data.success) {
        const newData = response.data.data || []

        // 列表模式：替换数据，卡片模式：追加数据
        if (displayMode.value === 'list') {
          componentData.value = newData
        } else {
          componentData.value = [...componentData.value, ...newData]
        }

        totalItems.value = response.data.total

        // 检查是否还有更多数据（仅卡片模式）
        if (displayMode.value === 'card') {
          hasMore.value = newData.length === pageSize.value && componentData.value.length < totalItems.value
          // 更新偏移量
          currentOffset.value += newData.length
        }

        await loadComponentStats()

        if (reset) {
          ElMessage.success(`加载成功，共 ${totalItems.value} 条记录`)
        }


        // 在卡片模式下，数据加载完成后设置观察器
        if (displayMode.value === 'card') {
          setupScrollObserver()
        }
      } else {
        ElMessage.error(response.data.error || '加载数据失败')
        componentData.value = []
        totalItems.value = 0
      }
    } catch (error) {
      console.error('加载组件数据失败:', error)
      ElMessage.error('加载数据失败: ' + (error.response?.data?.error || error.message))
      componentData.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  const loadGroupedData = async (reset = true) => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请选择Steam账号')
      return
    }

    // 如果是重置，清空数据（卡片模式需要）
    if (reset && displayMode.value === 'card') {
      groupedData.value = []
      currentOffset.value = 0
      hasMore.value = true
    }

    loading.value = true
    try {
      // 列表模式：使用 currentPage，卡片模式：使用 offset 计算页码
      const currentPageNum = displayMode.value === 'list'
        ? currentPage.value
        : Math.floor(currentOffset.value / pageSize.value) + 1

      const params = {
        search: searchText.value,
        page: currentPageNum,
        page_size: pageSize.value,
        // 服务端排序：组合模式价格列按"平均价"排序
        order_by: sortBy.value,
        order_dir: sortDir.value
      }
      
      // 如果选择了组件，添加 assetid 参数进行筛选
      if (selectedComponent.value) {
        params.assetid = selectedComponent.value
      }
      
      // 如果选择了武器类型，添加 weapon_type 参数进行筛选
      if (weaponTypeFilter.value) {
        params.weapon_type = weaponTypeFilter.value
      }

      // 如果选择了磨损等级，添加 float_range 参数进行筛选
      if (weaponNameFilter.value) {
        params.float_range = weaponNameFilter.value
      }


      const response = await axios.get(apiUrls.stockComponentsGrouped(selectedSteamId.value), {
        params: params
      })


      if (response.data.success) {
        const newData = (response.data.data || []).map(item => ({
          ...item,
          // weapon_float 必须保持"磨损值"含义，避免列表磨损值列读错
          // 组合模式下如果只有 1 件物品，优先取 weapon_floats[0] 作为该行磨损值展示
          weapon_float: (Array.isArray(item.weapon_floats) && item.weapon_floats.length === 1)
            ? item.weapon_floats[0]
            : (item.weapon_float || ''),
          buy_price: item.total_buy_price,
          yyyp_price: item.total_yyyp_price,
          buff_price: item.total_buff_price,
          steam_price: item.total_steam_price,
          // 使用 classid 作为唯一标识，如果没有则使用 item_name
          goods_assetid: item.classid || item.item_name || item.steam_hash_name || Math.random().toString(36).slice(2)
        }))

        // 列表模式：替换数据，卡片模式：追加数据
        if (displayMode.value === 'list') {
          groupedData.value = newData
        } else {
          groupedData.value = [...groupedData.value, ...newData]
        }

        totalItems.value = response.data.total || 0

        // 检查是否还有更多数据（仅卡片模式）
        if (displayMode.value === 'card') {
          hasMore.value = newData.length === pageSize.value && groupedData.value.length < totalItems.value
          // 更新偏移量
          currentOffset.value += newData.length
        }

        // 加载统计数据
        await loadComponentStats()

        if (reset) {
          ElMessage.success(`组合加载成功，共 ${totalItems.value} 条记录`)
        }


        // 在卡片模式下，数据加载完成后设置观察器
        if (displayMode.value === 'card') {
          setupScrollObserver()
        }
      } else {
        ElMessage.error(response.data.error || '加载组合数据失败')
        groupedData.value = []
        totalItems.value = 0
      }
    } catch (error) {
      console.error('加载组合数据失败:', error)
      ElMessage.error('加载组合数据失败: ' + (error.response?.data?.error || error.message))
      groupedData.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  const loadComponentStats = async () => {
    try {
      // 构建查询参数，包含筛选条件
      const params = {}
      
      // 添加搜索关键词
      if (searchText.value) {
        params.search = searchText.value
      }
      
      // 添加武器类型筛选
      if (weaponTypeFilter.value) {
        params.weapon_type = weaponTypeFilter.value
      }

      // 添加磨损等级筛选
      if (weaponNameFilter.value) {
        params.float_range = weaponNameFilter.value
      }

      // 添加组件assetid筛选
      if (selectedComponent.value) {
        params.assetid = selectedComponent.value
      }

      // 并行请求：统计数据 + 组件数量
      const [statsResponse, countResponse] = await Promise.all([
        axios.get(apiUrls.stockComponentsStats(selectedSteamId.value), {
          params: params
        }),
        axios.get(apiUrls.stockComponentsCount(selectedSteamId.value))
      ])
      
      
      if (statsResponse.data.success) {
        const stats = statsResponse.data.data
        
        const totalCost = parseFloat(stats.totalCost || 0)
        const totalYYYPPrice = parseFloat(stats.totalYYYPPrice || 0)
        const totalBuffPrice = parseFloat(stats.totalBuffPrice || 0)
        const totalSteamPrice = parseFloat(stats.totalSteamPrice || 0)
        
        // 获取真正的组件数量（去重后的assetid数量）
        const componentCount = countResponse.data.success 
          ? (countResponse.data.data.component_count || 0)
          : 0
        
        totalStats.value = {
          componentCount: componentCount,  // 使用去重后的组件数量
          totalCount: stats.totalCount || 0,  // 组件内饰品总数
          totalCost: totalCost.toFixed(2),
          totalYYYPPrice: totalYYYPPrice.toFixed(2),
          totalBuffPrice: totalBuffPrice.toFixed(2),
          totalSteamPrice: totalSteamPrice.toFixed(2),
          yyypDiff: (totalYYYPPrice - totalCost).toFixed(2),
          buffDiff: (totalBuffPrice - totalCost).toFixed(2),
          steamDiff: (totalSteamPrice - totalCost).toFixed(2)
        }
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  const handleSizeChange = (val) => {
    // 卡片模式固定使用100条，列表模式使用用户选择的值
    pageSize.value = displayMode.value === 'card' ? 100 : val
    currentPage.value = 1
    currentOffset.value = 0
    // 列表模式下都需要重新加载数据
    if (displayMode.value === 'list') {
      groupMode.value ? loadGroupedData() : loadComponentData()
    } else {
      // 卡片模式下重新加载数据
      loadComponentData()
    }
  }

  const handleCurrentChange = (val) => {
    currentPage.value = val
    // 列表模式下都需要重新加载数据
    if (displayMode.value === 'list') {
      groupMode.value ? loadGroupedData() : loadComponentData()
    }
    // 卡片模式使用无限滚动，不需要处理页码变化
  }

  // 加载更多数据
  const loadMoreData = async () => {
    if (loadingMore.value || !hasMore.value) {
      return
    }

    loadingMore.value = true
    try {
      // 根据组合模式选择加载方法
      if (groupMode.value) {
        await loadGroupedData(false)
      } else {
        await loadComponentData(false)
      }
    } finally {
      loadingMore.value = false
    }
  }

  // 设置懒加载图片观察器
  const setupLazyImageObserver = () => {
    nextTick(() => {
      // 清理旧的观察器
      if (imageObserver) {
        imageObserver.disconnect()
      }

      // 创建新的观察器
      imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const img = entry.target
          
          if (entry.isIntersecting) {
            // 图片进入视口，加载图片
            const src = img.getAttribute('data-src')
            if (src && !img.src) {
              img.src = src
              img.classList.add('loaded')
            }
          }
        })
      }, {
        root: null,
        rootMargin: '200px',
        threshold: 0.01
      })

      // 观察所有懒加载图片
      const lazyImages = document.querySelectorAll('.lazy-image')
      lazyImages.forEach(img => {
        imageObserver.observe(img)
      })
    })
  }

  // 设置滚动监听
  const setupScrollObserver = () => {
    nextTick(() => {
      const trigger = document.getElementById('load-more-trigger-card')
      if (trigger) {
        // 如果已有观察器，先断开
        if (trigger._observer) {
          trigger._observer.disconnect()
        }
        
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && hasMore.value && !loadingMore.value && !loading.value) {
              loadMoreData()
            }
          })
        }, {
          root: null,
          rootMargin: '100px'
        })
        
        observer.observe(trigger)
        trigger._observer = observer
      }

      // 设置懒加载图片观察器
      setupLazyImageObserver()
    })
  }

  const handleSearch = () => {
    currentPage.value = 1
    currentOffset.value = 0
    selectedComponent.value = ''
    
    // 根据当前显示模式决定加载哪个数据
    if (groupMode.value) {
      loadGroupedData()
    } else {
      loadComponentData()
    }
    
    // 重新加载统计数据
    loadComponentStats()
    // setupScrollObserver 会在 loadComponentData 完成后自动调用
  }

  const handleClearSearch = () => {
    searchText.value = ''
    selectedComponent.value = ''
    weaponTypeFilter.value = ''
    weaponNameFilter.value = ''
    currentPage.value = 1
    currentOffset.value = 0

    // 根据当前显示模式决定加载哪个数据
    if (groupMode.value) {
      loadGroupedData()
    } else {
      loadComponentData()
    }

    // 重新加载统计数据
    loadComponentStats()
    // setupScrollObserver 会在 loadComponentData 完成后自动调用
  }

  const calcAvg = (total, count) => {
    const c = parseFloat(count) || 0
    const t = parseFloat(total) || 0
    if (!c) return '0.00'
    return (t / c).toFixed(2)
  }


  // 表格排序变化（Element Plus：prop / order(ascending|descending|null)）
  const handleSortChange = ({ prop, order }) => {
    // 取消排序则回到默认
    if (!prop || !order) {
      sortBy.value = 'unit_price'
      sortDir.value = 'desc'
    } else {
      // 在组合模式下，价格列（yyyp_price/buff_price/steam_price）按盈亏排序
      if (groupMode.value && (prop === 'yyyp_price' || prop === 'buff_price' || prop === 'steam_price')) {
        // 转换为盈亏排序字段（后端需要支持这些字段）
        const profitLossMap = {
          'yyyp_price': 'yyyp_profit',
          'buff_price': 'buff_profit',
          'steam_price': 'steam_profit'
        }
        sortBy.value = profitLossMap[prop] || prop
      } else {
        sortBy.value = prop
      }
      sortDir.value = order === 'ascending' ? 'asc' : 'desc'
    }

    // 切换排序后回到第一页
    currentPage.value = 1
    currentOffset.value = 0

    // 列表模式：根据组合/明细加载
    groupMode.value ? loadGroupedData() : loadComponentData(true)
  }

  // 卡片模式下手动切换价格排序字段
  const handlePriceSortFieldChange = (field) => {
    sortBy.value = field || 'unit_price'
    currentPage.value = 1
    currentOffset.value = 0
    loadComponentData(true)
  }

  // 卡片模式下切换升/降序
  const togglePriceSortDir = () => {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
    currentPage.value = 1
    currentOffset.value = 0
    loadComponentData(true)
  }

  const handleToggleGroupMode = (val = null) => {
    // 按钮直接传 true，开关传布尔值，默认取反
    if (val === true || val === false) {
      groupMode.value = val
    } else {
      groupMode.value = !groupMode.value
    }
    currentPage.value = 1
    currentOffset.value = 0
    selectedComponent.value = ''

    // 根据显示模式加载数据
    if (groupMode.value) {
      loadGroupedData()
    } else {
      loadComponentData()
    }
  }

  // 监听显示模式变化
  watch(displayMode, (newMode, oldMode) => {
    // 持久化用户选择
    safeSetLocalStorage(STORAGE_KEYS.displayMode, newMode)

    if (newMode === 'card') {
      // 切换到卡片模式
      currentOffset.value = 0
      // 卡片模式：增加单次加载数量以优化无限滚动体验
      pageSize.value = 100
      // 根据组合模式加载数据
      groupMode.value ? loadGroupedData() : loadComponentData()
      // setupScrollObserver 会在 loadComponentData/loadGroupedData 完成后自动调用
    } else if (newMode === 'list' && oldMode === 'card') {
      // 从卡片模式切换回列表模式
      currentPage.value = 1
      // 列表模式：恢复默认分页大小
      if (pageSize.value > 20) {
        pageSize.value = 10
      }
      // 根据组合模式加载数据
      groupMode.value ? loadGroupedData() : loadComponentData()
    }
  })

  // 监听组合模式变化并持久化
  watch(groupMode, (val) => {
    safeSetLocalStorage(STORAGE_KEYS.groupMode, val ? 'true' : 'false')
  })

  // 监听显示模式变化，重新设置观察器
  watch(displayMode, () => {
    if (displayMode.value === 'card') {
      setupScrollObserver()
    }
  })

  const handleUpdateComponent = async () => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }
    
    if (!selectedComponent.value) {
      ElMessage.warning('请先选择要更新的组件')
      return
    }
    
    updateLoading.value = true
    try {
      
      const response = await axios.post(apiUrls.pwGetInventoryComponent(), {
        steamId: selectedSteamId.value,
        assetid: [selectedComponent.value]  // 传递数组
      })
      
      
      if (response.data.success) {
        const itemCount = response.data.total_items || 0
        ElMessage.success(`组件物品更新成功! 共更新 ${itemCount} 个物品（已自动同步购入价格）`)

        // 更新成功后重新加载数据
        await loadComponentData()
      } else {
        ElMessage.error(response.data.message || '更新组件物品失败')
      }
    } catch (error) {
      console.error('更新组件失败:', error)
      ElMessage.error('更新组件失败: ' + (error.response?.data?.message || error.message))
    } finally {
      updateLoading.value = false
    }
  }

  // 开始编辑价格
  const startEdit = (row) => {
    editingGoodsAssetId.value = row.goods_assetid || row.component_id
    originalPrice.value = row.buy_price || ''
    editingPrice.value = row.buy_price || ''

    // 使用nextTick确保input已渲染后聚焦
    nextTick(() => {
      const input = document.getElementById(`price-input-${row.goods_assetid || row.component_id}`)
      if (input) {
        input.focus()
        input.select() // 选中所有文本，方便修改
      }
    })
  }

  // 取消编辑
  const cancelEdit = () => {
    editingGoodsAssetId.value = null
    editingPrice.value = ''
    originalPrice.value = ''
  }

  // 完成编辑价格
  const finishEdit = async (row) => {
    const newPrice = editingPrice.value
    const oldPrice = originalPrice.value

    // 如果价格没有改变，直接取消编辑
    if (newPrice === oldPrice) {
      cancelEdit()
      return
    }

    // 如果价格为空，提示用户
    if (!newPrice || newPrice.trim() === '') {
      ElMessage.warning('请输入有效的价格')
      return
    }

    // 先更新UI（乐观更新）
    row.buy_price = newPrice
    const currentGoodsAssetId = editingGoodsAssetId.value
    cancelEdit()

    // 异步发送请求到后端
    try {
      const response = await axios.put(
        apiUrls.stockComponentsUpdateBuyPrice(selectedSteamId.value, currentGoodsAssetId),
        { buy_price: newPrice }
      )

      if (response.data.success) {
        ElMessage.success('价格更新成功')
        // 重新加载统计数据
        await loadComponentStats()
      } else {
        // 如果失败，恢复原价格
        row.buy_price = oldPrice
        ElMessage.error(response.data.message || '价格更新失败')
      }
    } catch (error) {
      // 如果失败，恢复原价格
      row.buy_price = oldPrice
      console.error('更新价格失败:', error)
      ElMessage.error('更新价格失败: ' + (error.response?.data?.message || error.message))
    }
  }

  const handleUpdateAllComponents = async () => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }
    
    // 筛选出数量非0的组件
    const validComponents = inventoryComponents.value.filter(item => {
      const quantity = parseFloat(item.weapon_float) || 0
      return quantity > 0
    })
    
    if (validComponents.length === 0) {
      ElMessage.warning('没有找到数量大于0的组件')
      return
    }
    
    // 提取所有assetid
    const assetidList = validComponents.map(item => item.assetid)
    
    // 确认操作
    const confirmResult = await ElMessageBox.confirm(
      `即将更新 ${assetidList.length} 个组件的物品数据，此操作可能需要较长时间，是否继续？`,
      '确认更新',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).catch(() => false)
    
    if (!confirmResult) {
      return
    }
    
    updateAllLoading.value = true
    try {
      
      ElMessage.info(`开始更新 ${assetidList.length} 个组件，请稍候...`)
      
      const response = await axios.post(apiUrls.pwGetInventoryComponent(), {
        steamId: selectedSteamId.value,
        assetid: assetidList
      })
      
      
      const successCount = response.data.success_count || 0
      const failedCount = response.data.failed_count || 0
      const totalItems = response.data.total_items || 0

      if (response.data.success) {
        ElMessage.success(`全部组件更新成功! 成功: ${successCount}/${assetidList.length}, 总物品数: ${totalItems}（已自动同步购入价格）`)
      } else {
        ElMessage.warning(`部分组件更新失败! 成功: ${successCount}, 失败: ${failedCount}, 总物品数: ${totalItems}（已自动同步购入价格）`)
      }

      // 更新成功后重新加载数据
      await loadInventoryComponents()
      await loadComponentData()
      
    } catch (error) {
      console.error('批量更新组件失败:', error)
      ElMessage.error('批量更新组件失败: ' + (error.response?.data?.message || error.message))
    } finally {
      updateAllLoading.value = false
    }
  }

  const handleUpdateAbnormalComponents = async () => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }
    
    // 筛选出异常组件（显示数量与实际数量不一致）
    const abnormalComponents = inventoryComponents.value.filter(item => hasCountMismatch(item))
    
    if (abnormalComponents.length === 0) {
      ElMessage.info('没有找到异常组件')
      return
    }
    
    // 提取所有异常组件的assetid
    const assetidList = abnormalComponents.map(item => item.assetid)
    
    // 确认操作
    const confirmResult = await ElMessageBox.confirm(
      `检测到 ${abnormalComponents.length} 个异常组件（显示数量与实际数量不一致），是否更新这些组件的数据？`,
      '确认更新异常组件',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).catch(() => false)
    
    if (!confirmResult) {
      return
    }
    
    updateAbnormalLoading.value = true
    try {
      
      ElMessage.info(`开始更新 ${assetidList.length} 个异常组件，请稍候...`)
      
      const response = await axios.post(apiUrls.pwGetInventoryComponent(), {
        steamId: selectedSteamId.value,
        assetid: assetidList
      })
      
      
      const successCount = response.data.success_count || 0
      const failedCount = response.data.failed_count || 0
      const totalItems = response.data.total_items || 0

      if (response.data.success) {
        ElMessage.success(`异常组件更新成功! 成功: ${successCount}/${assetidList.length}, 总物品数: ${totalItems}（已自动同步购入价格）`)
      } else {
        ElMessage.warning(`部分异常组件更新失败! 成功: ${successCount}, 失败: ${failedCount}, 总物品数: ${totalItems}（已自动同步购入价格）`)
      }

      // 更新成功后重新加载数据
      await loadInventoryComponents()
      await loadComponentData()
      
    } catch (error) {
      console.error('更新异常组件失败:', error)
      ElMessage.error('更新异常组件失败: ' + (error.response?.data?.message || error.message))
    } finally {
      updateAbnormalLoading.value = false
    }
  }

  const handleAutoFillPrices = async () => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }
    
    autoFillLoading.value = true
    try {
      
      ElMessage.info('正在自动获取购入价格，请稍候...')
      
      const response = await axios.post(apiUrls.stockComponentsAutoFillPrices(selectedSteamId.value))
      
      
      if (response.data.success) {
        const data = response.data.data
        const message = `价格自动填充完成！\n总计: ${data.total_count}\n成功填充: ${data.filled_count}\n已有价格: ${data.already_filled_count}\n未找到: ${data.not_found_count}`
        
        ElMessage({
          type: 'success',
          message: message,
          duration: 5000,
          showClose: true
        })
        
        // 重新加载数据和统计
        await loadComponentData()
      } else {
        ElMessage.error(response.data.message || '自动填充价格失败')
      }
    } catch (error) {
      console.error('自动填充价格失败:', error)
      ElMessage.error('自动填充价格失败: ' + (error.response?.data?.message || error.message))
    } finally {
      autoFillLoading.value = false
    }
  }

  const handleFillReferencePrice = async (source) => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }

    const isYyyp = source === 'yyyp'
    const label = isYyyp ? '悠悠有品' : 'BUFF'

    try {
      ElMessage.info(`正在同步${label}价格，请稍候...`)

      const response = await axios.post(
        apiUrls.stockComponentsFillReferencePrice(selectedSteamId.value, source)
      )

      if (response.data.success) {
        const msg = response.data.message || `${label}价格同步完成`
        ElMessage.success({
          message: msg,
          duration: 5000,
          showClose: true
        })

        await loadComponentData()
      } else {
        ElMessage.error(response.data.message || `${label}价格同步失败`)
      }
    } catch (error) {
      console.error(`${label}价格同步失败:`, error)
      ElMessage.error(`${label}价格同步失败: ` + (error.response?.data?.message || error.message))
    }
  }

  // 打开「更新平台价格」选择弹窗
  const handleFillAllPlatformPrices = () => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }
    platformPriceDialogVisible.value = true
  }

  // 从数据库同步：使用 weapon_classID 表的价格更新 steam_stockComponents（原有逻辑）
  const handleFillFromDatabase = async () => {
    platformPriceDialogVisible.value = false
    platformPriceLoading.value = true
    try {
      ElMessage.info('正在从数据库同步平台价格（悠悠有品 + BUFF），请稍候...')
      const yyypResponse = await axios.post(
        apiUrls.stockComponentsFillReferencePrice(selectedSteamId.value, 'yyyp'),
        { force_update: true }
      )
      const buffResponse = await axios.post(
        apiUrls.stockComponentsFillReferencePrice(selectedSteamId.value, 'buff'),
        { force_update: true }
      )
      const yyypSuccess = yyypResponse.data.success
      const buffSuccess = buffResponse.data.success
      if (yyypSuccess && buffSuccess) {
        const yyypData = yyypResponse.data.data
        const buffData = buffResponse.data.data
        ElMessage.success({
          message: `平台价格同步完成！\n悠悠有品：更新 ${yyypData.updated} 条\nBUFF：更新 ${buffData.updated} 条`,
          duration: 5000,
          showClose: true
        })
      } else if (yyypSuccess) {
        ElMessage.warning('悠悠有品价格更新成功，BUFF价格同步失败')
      } else if (buffSuccess) {
        ElMessage.warning('BUFF价格更新成功，悠悠有品价格同步失败')
      } else {
        ElMessage.error('平台价格更新失败')
      }
      await loadComponentStats()
      await (groupMode.value ? loadGroupedData() : loadComponentData())
    } catch (error) {
      console.error('平台价格更新失败:', error)
      ElMessage.error('平台价格更新失败: ' + (error.response?.data?.message || error.message))
    } finally {
      platformPriceLoading.value = false
    }
  }

  // 从 CSQAQ 获取：Spider 调 CSQAQ 查价并写入 Backend steam_stockComponents
  const handleFillFromCsqaq = async () => {
    platformPriceDialogVisible.value = false
    platformPriceLoading.value = true
    try {
      ElMessage.info('正在从 CSQAQ 获取平台价格，请稍候...')
      const res = await axios.post(apiUrls.stockComponentsUpdatePricesFromCsqaq(), {
        steam_id: selectedSteamId.value
      })
      const ok = res.data && res.data.success
      const data = res.data && res.data.data
      if (ok && data) {
        ElMessage.success({
          message: `CSQAQ 价格更新完成！写入 ${data.updated ?? 0} 条`,
          duration: 4000,
          showClose: true
        })
      } else {
        ElMessage.error((res.data && res.data.message) || '从 CSQAQ 更新价格失败')
      }
      await loadComponentStats()
      await (groupMode.value ? loadGroupedData() : loadComponentData())
    } catch (error) {
      console.error('从 CSQAQ 更新价格失败:', error)
      ElMessage.error('从 CSQAQ 更新价格失败: ' + (error.response?.data?.message || error.message))
    } finally {
      platformPriceLoading.value = false
    }
  }

  // 计算每页显示的卡片数量
  const getItemsPerPage = () => {
    return 12
  }

  // 获取展开行的详细数据（带分页）
  const getExpandedItems = (row) => {
    if (!row.goods_assetids || !Array.isArray(row.goods_assetids)) {
      return []
    }

    const allItems = row.goods_assetids.map((goods_assetid, index) => ({
      goods_assetid: goods_assetid,
      weapon_float: row.weapon_floats && row.weapon_floats[index] ? row.weapon_floats[index] : null,
      buy_price: row.buy_prices && row.buy_prices[index] ? row.buy_prices[index] : '0',
      yyyp_price: row.yyyp_prices && row.yyyp_prices[index] ? row.yyyp_prices[index] : '0',
      buff_price: row.buff_prices && row.buff_prices[index] ? row.buff_prices[index] : '0',
      steam_price: row.steam_prices && row.steam_prices[index] ? row.steam_prices[index] : '0',
      sticker: row.stickers && row.stickers[index] ? row.stickers[index] : null,
      pendant: row.pendants && row.pendants[index] ? row.pendants[index] : null,
      rename: row.renames && row.renames[index] ? row.renames[index] : null,
      steam_hash_name: row.steam_hash_name,
      item_name: row.item_name,
      weapon_name: row.weapon_name,
      weapon_type: row.weapon_type,
      float_range: row.float_range
    }))

    const currentPage = expandedRowPages.value[row.goods_assetid] || 1
    const itemsPerPage = getItemsPerPage()
    const totalPages = Math.ceil(allItems.length / itemsPerPage)
    
    if (currentPage > totalPages && totalPages > 0) {
      expandedRowPages.value = {
        ...expandedRowPages.value,
        [row.goods_assetid]: 1
      }
      const start = 0
      const end = itemsPerPage
      return allItems.slice(start, end)
    }
    
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    
    return allItems.slice(start, end)
  }

  // 获取展开行的总数据量
  const getExpandedTotal = (row) => {
    if (!row.goods_assetids || !Array.isArray(row.goods_assetids)) {
      return 0
    }
    return row.goods_assetids.length
  }

  // 处理展开行的分页变化
  const handleExpandPageChange = (row, page) => {
    expandedRowPages.value = {
      ...expandedRowPages.value,
      [row.goods_assetid]: page
    }
    
    if (tableRef.value) {
      const expandedRows = tableRef.value.store.states.expandRows.value || []
      const isExpanded = expandedRows.some(r => r.goods_assetid === row.goods_assetid)
      
      if (!isExpanded) {
        tableRef.value.toggleRowExpansion(row, true)
      }
    }
  }

  // 处理行点击事件
  const handleRowClick = (row, column, event) => {
    // 组合模式下的行为
    if (groupMode.value) {
      // 组合模式：展开/收起行（只有数量大于1才能展开）
      if (row.item_count > 1 && tableRef.value) {
        tableRef.value.toggleRowExpansion(row)
      }
      return
    }

    // 明细模式下的行为
    if (!selectedComponent.value) {
      // 未选择组件时，显示 Popover 跳转
      popoverItem.value = row
      popoverPosition.value = { x: event.clientX, y: event.clientY }
      popoverVisible.value = true
    } else {
      // 已选择组件时，多选物品
      if (isMultiSelectMode.value) {
        toggleItemSelection(row)
      }
    }
  }

  // 处理展开行内的明细项点击事件
  const handleExpandedItemClick = (item, event) => {
    // 如果未选择组件，显示 Popover 跳转
    if (!selectedComponent.value) {
      popoverItem.value = item
      popoverPosition.value = { x: event.clientX, y: event.clientY }
      popoverVisible.value = true
      return
    }

    // 已选择组件时，打开预览
    openPreview(item)
  }

  // 获取行样式
  const getRowStyle = (data) => {
    const style = { backgroundColor: 'transparent' }

    // 组合模式：数量大于1的行可点击（用于展开）
    if (groupMode.value && data.row.item_count > 1) {
      style.cursor = 'pointer'
      return style
    }

    // 明细模式下的样式
    if (!groupMode.value) {
      // 未选择组件时：所有行可点击（用于跳转）
      if (!selectedComponent.value) {
        style.cursor = 'pointer'
        return style
      }

      // 已选择组件时：显示选中状态
      if (isItemSelected(data.row.goods_assetid)) {
        style.backgroundColor = 'rgba(64, 158, 255, 0.1)'
        style.borderLeft = '3px solid #409eff'
      }

      // 多选模式下所有行可点击
      if (isMultiSelectMode.value) {
        style.cursor = 'pointer'
      }
    }

    return style
  }

  // 打开预览弹窗
  const openPreview = (item) => {
    previewItem.value = item
    previewVisible.value = true
  }

  // 判断物品是否被选中
  const isItemSelected = (goods_assetid) => {
    return selectedItems.value.some(item => item.goods_assetid === goods_assetid)
  }

  // 切换物品选择状态
  const toggleItemSelection = (item) => {
    const index = selectedItems.value.findIndex(i => i.goods_assetid === item.goods_assetid)
    if (index > -1) {
      selectedItems.value.splice(index, 1)
    } else {
      // 组合模式下只允许选中一个
      if (groupMode.value) {
        selectedItems.value = [item]
        ElMessage.info('组合模式下只能选择一个组合')
      } else {
        selectedItems.value.push(item)
      }
    }
  }

  // 清空选择
  const clearSelection = () => {
    selectedItems.value = []
  }

  // 全选当前页面
  const selectAllCurrentPage = () => {
    // 只有选择了具体组件时才允许全选
    if (!selectedComponent.value) {
      ElMessage.warning('请先选择要操作的库存组件')
      return
    }

    if (displayMode.value === 'card') {
      // 卡片模式：选择当前加载的所有数据
      const currentData = componentData.value
      if (selectedItems.value.length === currentData.length && currentData.length > 0) {
        // 如果已全选，则取消全选
        clearSelection()
        ElMessage.info('已取消全选')
      } else {
        // 全选当前页面
        selectedItems.value = [...currentData]
        ElMessage.success(`已选择 ${currentData.length} 件物品`)
      }
    } else {
      // 列表模式：选择当前页的数据
      const currentData = groupMode.value ? groupedData.value : componentData.value
      if (selectedItems.value.length === currentData.length && currentData.length > 0) {
        clearSelection()
        ElMessage.info('已取消全选')
      } else {
        selectedItems.value = [...currentData]
        ElMessage.success(`已选择 ${currentData.length} 件物品`)
      }
    }
  }

  // 移出组件
  const removeFromComponent = async () => {
    if (selectedItems.value.length === 0) {
      ElMessage.warning('请先选择要移出的物品')
      return
    }

    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }

    if (!selectedComponent.value) {
      ElMessage.warning('请先选择组件')
      return
    }

    // 组合模式下，弹出数量输入对话框
    if (groupMode.value && selectedItems.value.length === 1) {
      const selectedItem = selectedItems.value[0]
      maxRemoveQuantity.value = selectedItem.item_count || 1
      removeQuantity.value = maxRemoveQuantity.value
      removeQuantityDialogVisible.value = true
      return
    }

    // 明细模式或多选模式，直接确认移出
    try {
      await ElMessageBox.confirm(
        `确定要将选中的 ${selectedItems.value.length} 件物品移出组件吗？`,
        '确认移出',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      await executeRemoveFromComponent(selectedItems.value.map(item => item.goods_assetid))
    } catch (error) {
      if (error !== 'cancel') {
        console.error('移出组件失败:', error)
        ElMessage.error('移出失败：' + (error.response?.data?.message || error.message))
      }
    }
  }

  // 执行移出组件操作
  const executeRemoveFromComponent = async (itemIds) => {
    removeLoading.value = true

    try {
      const response = await axios.post(apiUrls.pwDepositToComponent(), {
        steamId: selectedSteamId.value,
        itemIds: itemIds,
        storageUnitId: selectedComponent.value,
        transferType: 2  // 2表示取出
      })

      if (response.data.success) {
        ElMessage.success(`成功移出 ${itemIds.length} 件物品`)

        // 清空选择
        clearSelection()

        // 重新加载数据
        currentOffset.value = 0
        if (groupMode.value) {
          loadGroupedData()
        } else {
          loadComponentData()
        }

        // 重新加载组件列表
        await loadInventoryComponents()
      } else {
        ElMessage.error(response.data.message || '移出失败')
      }
    } catch (error) {
      console.error('移出组件失败:', error)
      ElMessage.error('移出失败：' + (error.response?.data?.message || error.message))
    } finally {
      removeLoading.value = false
    }
  }

  // 确认移出指定数量
  const confirmRemoveQuantity = async () => {
    if (removeQuantity.value <= 0) {
      ElMessage.warning('移出数量必须大于0')
      return
    }

    if (removeQuantity.value > maxRemoveQuantity.value) {
      ElMessage.warning(`移出数量不能超过 ${maxRemoveQuantity.value}`)
      return
    }

    removeQuantityDialogVisible.value = false

    // 获取选中组合中的物品ID列表
    const selectedItem = selectedItems.value[0]
    const allItemIds = selectedItem.goods_assetids || []

    if (allItemIds.length === 0) {
      ElMessage.error('未找到可移出的物品')
      return
    }

    // 根据数量取前N个物品ID
    const itemIdsToRemove = allItemIds.slice(0, removeQuantity.value)

    await executeRemoveFromComponent(itemIdsToRemove)
  }

  // 设置移出数量百分比
  const setRemoveQuantityPercent = (percent) => {
    removeQuantity.value = Math.ceil(maxRemoveQuantity.value * percent)
  }

  // 处理卡片点击事件
  const handleCardClick = (item, event) => {
    // 只有选择了具体组件时才允许选中
    if (!selectedComponent.value) {
      // 显示 popover，提供跳转到该饰品所属组件的选项
      popoverItem.value = item
      popoverPosition.value = { x: event.clientX, y: event.clientY }
      popoverVisible.value = true
      return
    }
    
    if (isMultiSelectMode.value) {
      toggleItemSelection(item)
    }
  }

  // 跳转到组件
  const jumpToComponent = async () => {
    if (!popoverItem.value) {
      return
    }

    const targetAssetId = popoverItem.value.assetid


    // 检查 assetid 是否存在
    if (!targetAssetId) {
      ElMessage.error('该物品没有所属组件信息，无法跳转')
      console.error('物品缺少 assetid 字段:', popoverItem.value)
      popoverVisible.value = false
      return
    }


    // 如果库存组件列表为空，先加载
    if (inventoryComponents.value.length === 0) {
      await loadInventoryComponents()
    }

    // 验证该组件是否在下拉框列表中
    const component = inventoryComponents.value.find(comp => comp.assetid === targetAssetId)

    if (!component) {
      console.warn('组件未找到 - targetAssetId:', targetAssetId)
      console.warn('可用的组件列表:', inventoryComponents.value.map(c => c.assetid))
    }

    // 直接跳转（无论组件是否在列表中）

    // 清空之前的数据
    componentData.value = []
    groupedData.value = []

    selectedComponent.value = targetAssetId
    popoverVisible.value = false

    // 重置页码和偏移量
    currentPage.value = 1
    currentOffset.value = 0

    // 加载该组件的数据（保持当前的分组模式状态）
    await handleComponentSelect()

    ElMessage.success(`已跳转到组件: ${component?.item_name || targetAssetId}`)
  }

  // 关闭 popover
  const closePopover = () => {
    popoverVisible.value = false
    popoverItem.value = null
  }

  let unwatchDevice = null

  onMounted(async () => {
    const deviceType = applyDeviceClass()

    unwatchDevice = watchDeviceType((newDeviceType) => {
    })

    await loadSteamIdList()
    if (selectedSteamId.value) {
      await loadInventoryComponents()
      await loadWeaponTypes()
      await loadWeaponNames()
      if (displayMode.value === 'list') {
        if (groupMode.value) {
          loadGroupedData()
        } else {
          loadComponentData()
        }
      } else {
        // 卡片模式 - 根据组合模式加载数据
        if (groupMode.value) {
          loadGroupedData()
        } else {
          loadComponentData()
        }
        // setupScrollObserver 会在 loadComponentData/loadGroupedData 完成后自动调用
      }
    }
  })

  onUnmounted(() => {
    if (unwatchDevice) {
      unwatchDevice()
    }
    if (imageObserver) {
      imageObserver.disconnect()
      imageObserver = null
    }
  })

  // 通过印花跳转到商品搜索页面
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

    // 在新标签页打开商品搜索页面
    const searchUrl = `/item-search?keyword=${encodeURIComponent(hashName)}`
    window.open(searchUrl, '_blank')
  }

  // 通过挂件跳转到商品搜索页面
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

    // 在新标签页打开商品搜索页面
    const searchUrl = `/item-search?keyword=${encodeURIComponent(hashName)}`
    window.open(searchUrl, '_blank')
  }

  return {
    loading,
    groupMode,
    displayMode,
    showPriceDiff,
    updateAllLoading,
    updateAbnormalLoading,
    platformPriceLoading,
    platformPriceDialogVisible,
    removeLoading,
    componentData,
    groupedData,
    filteredData,
    totalStats,
    searchText,
    weaponTypeFilter,
    weaponTypes,
    weaponNameFilter,
    weaponNames,
    currentPage,
    pageSize,
    totalItems,
    steamIdList,
    selectedSteamId,
    inventoryComponents,
    selectedComponent,
    abnormalComponentsCount,
    editingGoodsAssetId,
    editingPrice,
    tableRef,
    expandedRowPages,
    isMultiSelectMode,
    selectedItems,
    previewVisible,
    previewItem,
    popoverVisible,
    popoverItem,
    popoverPosition,
    removeQuantityDialogVisible,
    removeQuantity,
    maxRemoveQuantity,
    hasMore,
    loadingMore,
    formatTime,
    formatPrice,
    formatWeaponFloat,
    getQuantityType,
    getWeaponImage,
    getItemTitle,
    hasExtras,
    hasCountMismatch,
    getComponentLabel,
    calcAvg,
    sortBy,
    sortDir,
    handleSortChange,
    handlePriceSortFieldChange,
    togglePriceSortDir,
    parseStickers,
    parsePendant,
    handleSizeChange,
    handleCurrentChange,
    handleSearch,
    handleClearSearch,
    handleWeaponTypeChange,
    handleWeaponNameChange,
    handleSteamIdChange,
    handleComponentSelect,
    handleUpdateAllComponents,
    handleUpdateAbnormalComponents,
    handleToggleGroupMode,
    handleFillReferencePrice,
    handleFillAllPlatformPrices,
    handleFillFromDatabase,
    handleFillFromCsqaq,
    startEdit,
    finishEdit,
    cancelEdit,
    getItemsPerPage,
    getExpandedItems,
    getExpandedTotal,
    handleExpandPageChange,
    handleRowClick,
    handleExpandedItemClick,
    getRowStyle,
    openPreview,
    handleCardClick,
    loadMoreData,
    isItemSelected,
    toggleItemSelection,
    clearSelection,
    selectAllCurrentPage,
    removeFromComponent,
    confirmRemoveQuantity,
    setRemoveQuantityPercent,
    jumpToComponent,
    closePopover,
    handleJumpToItemSearchBySticker,
    handleJumpToItemSearchByPendant
  }
}
