import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { API_CONFIG, apiUrls } from '@/config/api.js'

export function useOnSaleIGXE() {
  // 状态管理
  const loading = ref(false)
  const updating = ref(false)
  const onSaleData = ref([])
  const searchText = ref('')
  const weaponTypeFilter = ref('')
  const floatRangeFilter = ref('')
  const displayMode = ref('card')

  // 弹窗相关
  const updatePriceDialogVisible = ref(false)
  const previewVisible = ref(false)
  const selectedItem = ref(null)
  const previewItem = ref(null)
  const updatePriceForm = ref({
    newPrice: ''
  })

  // 统计数据
  const onSaleStats = computed(() => {
    const totalCount = onSaleData.value.length
    const totalPrice = onSaleData.value.reduce((sum, item) => sum + parseFloat(item.sale_price || 0), 0)
    const avgPrice = totalCount > 0 ? (totalPrice / totalCount) : 0
    const expectedProfit = onSaleData.value.reduce((sum, item) => {
      if (item.buy_price) {
        return sum + (parseFloat(item.sale_price) - parseFloat(item.buy_price))
      }
      return sum
    }, 0)

    return {
      totalCount,
      totalPrice: totalPrice.toFixed(2),
      avgPrice: avgPrice.toFixed(2),
      expectedProfit: expectedProfit.toFixed(2)
    }
  })

  // 当前显示数据
  const currentDisplayData = computed(() => {
    let filtered = onSaleData.value

    // 搜索过滤
    if (searchText.value) {
      const search = searchText.value.toLowerCase()
      filtered = filtered.filter(item =>
        item.item_name?.toLowerCase().includes(search) ||
        item.steam_hash_name?.toLowerCase().includes(search)
      )
    }

    // 只显示IGXE平台的数据
    filtered = filtered.filter(item => item.platform === 'igxe')

    // 武器类型过滤
    if (weaponTypeFilter.value) {
      filtered = filtered.filter(item => item.weapon_type === weaponTypeFilter.value)
    }

    // 磨损等级过滤
    if (floatRangeFilter.value) {
      filtered = filtered.filter(item => item.float_range === floatRangeFilter.value)
    }

    return filtered
  })

  // 加载在售数据
  const loadOnSaleData = async () => {
    loading.value = true
    try {
      const response = await axios.get(apiUrls.getOnSaleItems())
      if (response.data && response.data.success) {
        onSaleData.value = response.data.data || []
        ElMessage.success('加载成功')
      } else {
        ElMessage.error(response.data?.message || '加载失败')
      }
    } catch (error) {
      console.error('加载在售数据失败:', error)
      ElMessage.error('加载失败: ' + error.message)
    } finally {
      loading.value = false
    }
  }

  // 重置筛选
  const handleReset = () => {
    searchText.value = ''
    weaponTypeFilter.value = ''
    floatRangeFilter.value = ''
    loadOnSaleData()
  }

  // 打开改价弹窗
  const handleUpdatePrice = (item) => {
    selectedItem.value = item
    updatePriceForm.value.newPrice = item.sale_price
    updatePriceDialogVisible.value = true
    previewVisible.value = false
  }

  // 确认改价
  const confirmUpdatePrice = async () => {
    if (!updatePriceForm.value.newPrice || parseFloat(updatePriceForm.value.newPrice) <= 0) {
      ElMessage.warning('请输入有效的价格')
      return
    }

    // 与 BUFF 同理：apiUrls 没有 updateSalePrice，调用会 TypeError，后端也无对应路由
    ElMessage.warning('IGXE 改价功能尚未接入，请前往 IGXE 平台操作')
    updatePriceDialogVisible.value = false
  }

  // 下架商品
  const handleRemoveFromSale = async (item) => {
    try {
      await ElMessageBox.confirm(
        `确定要下架 "${getCardTitle(item)}" 吗？`,
        '确认下架',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      loading.value = true
      const response = await axios.post(apiUrls.removeFromSale(), {
        id: item.id,
        platform: 'igxe'  // 必传：后端据此拒绝把 IGXE 订单发往悠悠有品的下架接口
      })

      if (response.data && response.data.success) {
        ElMessage.success('下架成功')
        previewVisible.value = false
        loadOnSaleData()
      } else {
        ElMessage.error(response.data?.message || '下架失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('下架失败:', error)
        ElMessage.error('下架失败: ' + error.message)
      }
    } finally {
      loading.value = false
    }
  }

  // 打开预览
  const openPreview = (item) => {
    previewItem.value = item
    previewVisible.value = true
  }

  // 工具函数
  const getWeaponImage = (steamHashName) => {
    if (!steamHashName) return null
    return `${API_CONFIG.baseURL}/weapon_imgs/${encodeURIComponent(steamHashName)}.png`
  }

  const handleImageError = (e, steamHashName) => {
    e.target.style.display = 'none'
  }

  const getCardTitle = (item) => {
    if (!item) return ''
    return item.item_name || item.steam_hash_name || '未知物品'
  }

  const getItemTitle = (item) => {
    return getCardTitle(item)
  }

  const hasExtras = (item) => {
    return item.sticker || item.pendant || item.rename
  }

  const parseStickers = (stickerData) => {
    if (!stickerData) return []
    try {
      if (typeof stickerData === 'string') {
        return JSON.parse(stickerData)
      }
      return Array.isArray(stickerData) ? stickerData : []
    } catch (e) {
      return []
    }
  }

  const parsePendant = (pendantData) => {
    if (!pendantData) return null
    try {
      if (typeof pendantData === 'string') {
        return JSON.parse(pendantData)
      }
      return pendantData
    } catch (e) {
      return null
    }
  }

  const getPlatformLabel = (platform) => {
    const labels = {
      'yyyp': '悠悠有品',
      'buff': 'BUFF',
      'csfloat': 'CSFloat'
    }
    return labels[platform] || platform
  }

  const getPlatformTagType = (platform) => {
    const types = {
      'yyyp': 'success',
      'buff': 'warning',
      'csfloat': 'info'
    }
    return types[platform] || 'default'
  }

  const formatOnSaleTime = (time) => {
    if (!time) return ''
    const date = new Date(time)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天上架'
    if (days === 1) return '昨天上架'
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  onMounted(() => {
    loadOnSaleData()
  })

  return {
    loading,
    updating,
    onSaleData,
    searchText,
    weaponTypeFilter,
    floatRangeFilter,
    displayMode,
    updatePriceDialogVisible,
    previewVisible,
    selectedItem,
    previewItem,
    updatePriceForm,
    onSaleStats,
    currentDisplayData,
    loadOnSaleData,
    handleReset,
    handleUpdatePrice,
    confirmUpdatePrice,
    handleRemoveFromSale,
    openPreview,
    getWeaponImage,
    handleImageError,
    getCardTitle,
    getItemTitle,
    hasExtras,
    parseStickers,
    parsePendant,
    getPlatformLabel,
    getPlatformTagType,
    formatOnSaleTime
  }
}
