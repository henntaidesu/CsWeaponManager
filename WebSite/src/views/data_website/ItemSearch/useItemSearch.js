import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Close } from '@element-plus/icons-vue'
import axios from 'axios'
import { API_CONFIG, apiUrls } from '@/config/api.js'

export function useItemSearch() {
  const keyword = ref('')
  const isSearching = ref(false)
  const searchResults = ref([])
  const hasSearched = ref(false)
  const weaponNameList = ref([])
  const isLoadingWeaponNames = ref(false)
  const searchingItems = ref({})
  const currentItemDetail = ref(null)
  const loadingDetail = ref(false)
  const displayMode = ref('card') // 'list' 或 'card' - 默认卡片模式
  const image404Cache = ref(new Set()) // 图片404缓存

  const filters = reactive({
    weaponType: '',
    weaponName: '',
    rarity: '',
    priceMin: null,
    priceMax: null
  })

  // 稀有度颜色映射
  const getRarityColor = (rarity) => {
    const colorMap = {
      '违禁': '#e4ae39',
      '隐秘': '#eb4b4b',
      '保密': '#d32ce6',
      '受限': '#8847ff',
      '军规级': '#4b69ff',
      '工业级': '#5e98d9',
      '消费级': '#b0c3d9',
      '普通级': '#b0c3d9'
    }
    return colorMap[rarity] || '#909399'
  }
  
  // 搜索饰品（重命名为 performSearch 避免冲突）
  const performSearch = async () => {
    if (!keyword.value.trim() && !filters.weaponType && !filters.weaponName && !filters.rarity) {
      ElMessage.warning('请输入搜索关键词或选择筛选条件')
      return
    }
  
    isSearching.value = true
    hasSearched.value = true
  
    try {
      const response = await axios.post(
        apiUrls.itemSearchSearch(),
        {
          keyword: keyword.value.trim(),
          weaponType: filters.weaponType,
          weaponName: filters.weaponName,
          rarity: filters.rarity
        }
      )
  
      if (response.data.success) {
        searchResults.value = response.data.data || []
        if (searchResults.value.length === 0) {
          ElMessage.info('未找到相关饰品')
        } else {
          ElMessage.success(`找到 ${searchResults.value.length} 件饰品`)
        }
      } else {
        throw new Error(response.data.message || '搜索失败')
      }
    } catch (error) {
      console.error('搜索失败:', error)
      ElMessage.error(error.message || '搜索失败，请稍后重试')
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }
  
  // 加载武器名称列表
  const loadWeaponNamesIfNeeded = async () => {
    if (weaponNameList.value.length > 0 || isLoadingWeaponNames.value) {
      return
    }
  
    if (!filters.weaponType) {
      return
    }
  
    isLoadingWeaponNames.value = true
  
    try {
      const response = await axios.post(
        apiUrls.itemSearchWeaponNames(),
        {
          weaponType: filters.weaponType
        }
      )
  
      if (response.data.success) {
        weaponNameList.value = response.data.data || []
      }
    } catch (error) {
      console.error('加载武器名称失败:', error)
    } finally {
      isLoadingWeaponNames.value = false
    }
  }
  
  // 武器类型变化时重新加载武器名称
  const handleWeaponTypeChange = () => {
    filters.weaponName = ''
    weaponNameList.value = []
    if (filters.weaponType) {
      loadWeaponNamesIfNeeded()
    }
  }
  
  // 清除搜索结果
  const handleClear = () => {
    searchResults.value = []
    hasSearched.value = false
  }
  
  // 跳转到 CSQAQ 网站
  const handleOpenCSQAQ = (row) => {
    if (!row.csqaq_id) {
      ElMessage.warning('该饰品未映射 CSQAQ ID')
      return
    }
    
    const url = `https://www.csqaq.com/goods/${row.csqaq_id}`
    window.open(url, '_blank')
  }
  
  // 搜索 CSQAQ 详细数据
  const handleSearchCSQAQ = async (row) => {
    if (!row.csqaq_id) {
      ElMessage.warning('该饰品未映射 CSQAQ ID')
      return
    }
    
    loadingDetail.value = true
    currentItemDetail.value = { loading: true }
    
    try {
      const response = await axios.get(
        apiUrls.itemSearchCsqaqDetail(),
        {
          params: {
            id: row.csqaq_id
          }
        }
      )
      
      if (response.data.success && response.data.data) {
        currentItemDetail.value = response.data.data
        ElMessage.success('数据加载成功')
        
        // 滚动到详细信息区域
        setTimeout(() => {
          const detailElement = document.querySelector('.detail-section-wrapper')
          if (detailElement) {
            detailElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      } else {
        throw new Error(response.data.message || '获取详细信息失败')
      }
    } catch (error) {
      console.error('获取CSQAQ详细信息失败:', error)
      ElMessage.error(error.message || '获取详细信息失败，请稍后重试')
      currentItemDetail.value = null
    } finally {
      loadingDetail.value = false
    }
  }
  
  // 获取武器图片路径
  const getWeaponImage = (steamHashName) => {
    if (!steamHashName) {
      return null
    }
    // steam_hash_name 应当是 Steam 市场名；历史数据里可能残留平台图床 URL，
    // 那种值拼不出本地文件名，直接放弃，避免刷一片 404
    if (/^https?:\/\//i.test(steamHashName)) {
      return null
    }
    // 检查是否已经在404缓存中
    if (image404Cache.value.has(steamHashName)) {
      return null
    }
    // 将空格和竖线分别替换为下划线，并添加.png扩展名
    const imageName = steamHashName
      .replace(/\s*\|\s*/g, '___')  // " | " -> "___"
      .replace(/\s/g, '_')          // 剩余所有空格 -> "_"
      + '.png'
  
    return apiUrls.weaponImage(imageName)
  }
  
  // 处理图片加载错误
  const handleImageError = (event, steamHashName) => {
    if (steamHashName) {
      image404Cache.value.add(steamHashName)
    }
    event.target.style.display = 'none'
  }
  
  // 关闭详细信息
  const closeDetail = () => {
    currentItemDetail.value = null
  }

  return {
    keyword,
    isSearching,
    searchResults,
    hasSearched,
    weaponNameList,
    isLoadingWeaponNames,
    searchingItems,
    currentItemDetail,
    loadingDetail,
    displayMode,
    image404Cache,
    filters,
    getRarityColor,
    performSearch,
    handleWeaponTypeChange,
    loadWeaponNamesIfNeeded,
    handleClear,
    handleSearchCSQAQ,
    handleOpenCSQAQ,
    getWeaponImage,
    handleImageError,
    closeDetail,
    Loading,
    Close
  }
}
