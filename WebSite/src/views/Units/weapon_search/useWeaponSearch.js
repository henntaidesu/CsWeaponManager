import { ref, onMounted, onUnmounted, nextTick, unref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { API_CONFIG } from '@/config/api'

/**
 * Weapon search composable for `views/Units/weapon_search/index.vue`.
 * Note: this is a plain JS module, so it MUST NOT use `<script setup>` macros like `defineProps/defineEmits/defineExpose`.
 */
export function useWeaponSearch(options = {}) {
  const platformTypeRef = options.platformTypeRef
  const emit = options.emit

  // 搜索相关状态
  const keyword = ref('')
  const searchResults = ref([])
  const isSearching = ref(false)
  const filters = ref({
    weaponType: '',
    weaponName: '',
    rarity: '',
    priceMin: null,
    priceMax: null,
    minOnSaleCount: null
  })
  const weaponNameList = ref([])
  const isLoadingWeaponNames = ref(false)
  const isCollapsed = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(50)
  const hasMore = ref(true)
  const isLoadingMore = ref(false)
  let scrollTimer = null
  
  // 切换搜索结果折叠
  const toggleResults = () => {
    isCollapsed.value = !isCollapsed.value
  }
  
  // 武器类型改变时的处理
  const handleWeaponTypeChange = async (value) => {
    // 清空武器名称选择
    filters.value.weaponName = ''
    // 清空武器名称列表
    weaponNameList.value = []
    // 加载对应类型的武器名称
    await loadWeaponNames(value)
  }
  
  // 加载武器名称列表
  const loadWeaponNames = async (weaponType) => {
    isLoadingWeaponNames.value = true
    
    try {
      const params = {}
      
      // 如果指定了武器类型，添加到参数中；否则获取全部
      if (weaponType) {
        params.weaponType = weaponType
      }
      
      const response = await axios.get(apiUrls.weaponNames(), {
        params: params
      })
      
      if (response.data.success) {
        weaponNameList.value = response.data.data || []
      } else {
        ElMessage.error('获取武器名称失败')
      }
    } catch (error) {
      console.error('获取武器名称失败:', error)
      ElMessage.error('获取武器名称失败')
    } finally {
      isLoadingWeaponNames.value = false
    }
  }
  
  // 武器名称下拉框聚焦时，如果列表为空且没有选择武器类型，加载全部武器名称
  const loadWeaponNamesIfNeeded = async () => {
    // 如果已经有数据，不重复加载
    if (weaponNameList.value.length > 0) {
      return
    }
    
    // 如果没有选择武器类型，加载全部武器名称
    if (!filters.value.weaponType) {
      await loadWeaponNames(null)
    }
  }
  
  // 搜索饰品（重置并开始新搜索）
  const handleSearch = async () => {
    // 验证价格区间
    if (filters.value.priceMin !== null && 
        filters.value.priceMax !== null &&
        filters.value.priceMin > filters.value.priceMax) {
      ElMessage.warning('最低价格不能大于最高价格')
      return
    }
    
    // 重置分页状态
    currentPage.value = 1
    searchResults.value = []
    hasMore.value = true
    
    // 执行搜索
    await loadWeaponData()
  }
  
  // 加载饰品数据
  const loadWeaponData = async () => {
    if (!hasMore.value && currentPage.value > 1) {
      return
    }
    
    const loading = currentPage.value === 1
    if (loading) {
      isSearching.value = true
    } else {
      isLoadingMore.value = true
    }
    
    try {
      const params = {
        page: currentPage.value,
        limit: pageSize.value
      }
      
      // 使用传入的平台类型（ref 或 string）
      const platformType = platformTypeRef ? unref(platformTypeRef) : undefined
      params.platformType = platformType || 'youpin'
      
      // 添加关键词（如果有）
      if (keyword.value && keyword.value.trim()) {
        params.keyword = keyword.value.trim()
      }
      
      // 添加武器类型过滤（如果有）
      if (filters.value.weaponType) {
        params.weaponType = filters.value.weaponType
      }
      
      // 添加武器名称过滤（如果有）
      if (filters.value.weaponName) {
        params.weaponName = filters.value.weaponName
      }
      
      // 添加稀有度过滤（如果有）
      if (filters.value.rarity) {
        params.rarity = filters.value.rarity
      }
      
      // 添加价格过滤
      if (filters.value.priceMin !== null && filters.value.priceMin !== '') {
        params.priceMin = filters.value.priceMin
      }
      if (filters.value.priceMax !== null && filters.value.priceMax !== '') {
        params.priceMax = filters.value.priceMax
      }
      
      // 添加最小在售数量过滤
      if (filters.value.minOnSaleCount !== null && filters.value.minOnSaleCount !== '') {
        params.minOnSaleCount = filters.value.minOnSaleCount
      }
      
      const response = await axios.get(apiUrls.weaponDetailBase(), {
        params: params
      })
      
      if (response.data.success) {
        const newData = response.data.data || []
        
        if (currentPage.value === 1) {
          // 首次搜索，替换数据
          searchResults.value = newData
          if (newData.length === 0) {
            ElMessage.info('未找到匹配的饰品')
            hasMore.value = false
          } else {
            ElMessage.success(`找到 ${newData.length} 件饰品`)
          }
        } else {
          // 追加数据
          searchResults.value.push(...newData)
        }
        
        // 判断是否还有更多数据
        hasMore.value = newData.length >= pageSize.value
        
      } else {
        ElMessage.error(response.data.message || '搜索失败')
      }
    } catch (error) {
      console.error('搜索饰品失败:', error)
      const errorMessage = error.response?.data?.message || error.message || '搜索饰品失败'
      ElMessage.error(errorMessage)
    } finally {
      isSearching.value = false
      isLoadingMore.value = false
    }
  }
  
  // 加载更多数据
  const loadMoreWeapons = async () => {
    if (isLoadingMore.value || !hasMore.value) {
      return
    }
    
    
    currentPage.value++
    await loadWeaponData()
    
    // 等待 DOM 更新
    await nextTick()
  }
  
  
  // 清除搜索结果
  const handleClear = () => {
    searchResults.value = []
    keyword.value = ''
    filters.value = {
      weaponType: '',
      weaponName: '',
      rarity: '',
      priceMin: null,
      priceMax: null,
      minOnSaleCount: null
    }
    weaponNameList.value = []
    currentPage.value = 1
    hasMore.value = true
  }
  
  // 添加单个饰品
  const handleAddWeapon = (row) => {
    const id = getWeaponIdByPlatform(row)
    const name = row.market_listing_item_name
    
    if (!id || !name) {
      ElMessage.warning('该饰品没有对应平台的ID')
      return
    }
    
    if (typeof emit === 'function') {
      emit('add-weapon', { id: id.toString(), name })
    }
  }
  
  // 一键添加全部饰品ID
  const handleAddAll = () => {
    if (!searchResults.value || searchResults.value.length === 0) {
      ElMessage.warning('没有可添加的饰品')
      return
    }
    
    const weaponsToAdd = []
    searchResults.value.forEach(row => {
      const id = getWeaponIdByPlatform(row)
      const name = row.market_listing_item_name
      
      if (id && name) {
        weaponsToAdd.push({ id: id.toString(), name })
      }
    })
    
    if (weaponsToAdd.length > 0) {
      if (typeof emit === 'function') {
        emit('add-all-weapons', weaponsToAdd)
      }
    } else {
      ElMessage.warning('没有可添加的饰品ID')
    }
  }
  
  // 根据平台类型获取对应的饰品ID
  const getWeaponIdByPlatform = (row) => {
    const platformType = platformTypeRef ? unref(platformTypeRef) : undefined
    if (platformType === 'buff') {
      return row.buff_id
    } else {
      if (platformType === 'steam') {
        return row.steam_hash_name || row.steamHashName || row.en_weapon_name
      }
      return row.yyyp_id
    }
  }
  
  // 获取稀有度颜色
  const getRarityColor = (rarity) => {
    if (!rarity) return ''
    const rarityColorMap = {
      '违禁': '#e4ae39',      // 金色
      '隐秘': '#eb4b4b',      // 红色
      '保密': '#d32ce6',      // 紫色/粉色
      '受限': '#8847ff',      // 紫色
      '军规级': '#4b69ff',    // 蓝色
      '工业级': '#5e98d9',    // 浅蓝色
      '消费级': '#b0c3d9',    // 灰蓝色
      '普通级': '#b0c3d9'     // 灰蓝色
    }
    return rarityColorMap[rarity] || '#fff'
  }
  
  // 表格行类名
  const getRowClassName = ({ row, rowIndex }) => {
    return rowIndex % 2 === 0 ? 'even-row' : 'odd-row'
  }
  
  // 处理页面滚动事件（监听 window 滚动，因为表格可能没有自己的滚动容器）
  const handlePageScroll = () => {
    // 如果没有搜索结果，不处理滚动
    if (searchResults.value.length === 0) {
      return
    }
    
    // 如果正在加载或没有更多数据，不处理
    if (isLoadingMore.value || !hasMore.value) {
      return
    }
    
    // 如果表格区域被折叠，不处理
    if (isCollapsed.value) {
      return
    }
    
    // 防抖处理
    if (scrollTimer) {
      clearTimeout(scrollTimer)
    }
    
    scrollTimer = setTimeout(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      const distanceToBottom = scrollHeight - scrollTop - clientHeight
      
      
      // 滚动到底部触发加载更多（距离底部200px时触发）
      if (distanceToBottom < 200 && hasMore.value && !isLoadingMore.value) {
        loadMoreWeapons()
      }
    }, 100) // 100ms 防抖延迟
  }
  
  // 组件挂载时添加滚动监听
  onMounted(() => {
    window.addEventListener('scroll', handlePageScroll)
  })
  
  // 组件卸载时移除滚动监听
  onUnmounted(() => {
    window.removeEventListener('scroll', handlePageScroll)
    if (scrollTimer) {
      clearTimeout(scrollTimer)
    }
  })
  
  return {
    keyword,
    searchResults,
    isSearching,
    filters,
    weaponNameList,
    isLoadingWeaponNames,
    isCollapsed,
    hasMore,
    isLoadingMore,
    toggleResults,
    handleWeaponTypeChange,
    loadWeaponNames,
    loadWeaponNamesIfNeeded,
    handleSearch,
    loadMoreWeapons,
    handleClear,
    handleAddWeapon,
    handleAddAll,
    getWeaponIdByPlatform,
    getRarityColor,
    getRowClassName
  }
}
