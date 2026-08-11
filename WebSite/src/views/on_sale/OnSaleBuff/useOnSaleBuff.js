import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { API_CONFIG, apiUrls } from '@/config/api.js'
import { applyDeviceClass, watchDeviceType } from '@/utils/deviceDetect.js'

export function useOnSaleBuff() {
  const loading = ref(false)
  const updating = ref(false)
  const onSaleData = ref([])
  const accountList = ref([])
  const selectedAccount = ref('')
  const searchText = ref('')
  const weaponTypeFilter = ref('')
  const floatRangeFilter = ref('')
  const displayMode = ref('card')
  
  // 图片404缓存
  const image404Cache = ref(new Set())
  
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

    // 只显示BUFF平台的数据
    filtered = filtered.filter(item => item.platform === 'buff')

    // 账号过滤
    if (selectedAccount.value) {
      filtered = filtered.filter(item => item.account_id === selectedAccount.value)
    }

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
    if (!selectedAccount.value) {
      ElMessage.warning('请选择账号')
      return
    }
    
    loading.value = true
    try {
      const response = await axios.get(apiUrls.getOnSaleItems(), {
        params: {
          platform: 'buff',
          account_id: selectedAccount.value
        }
      })
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

  // 加载账号列表
  const loadAccountList = async () => {
    try {
      const response = await axios.get(apiUrls.getBuffAccounts())
      if (response.data && response.data.success) {
        accountList.value = response.data.data || []
        if (accountList.value.length > 0) {
          selectedAccount.value = accountList.value[0].id
          // 默认查询第一个账号的数据
          loadOnSaleData()
        } else {
          ElMessage.warning('没有找到BUFF账号')
        }
      }
    } catch (error) {
      console.error('加载账号列表失败:', error)
      ElMessage.error('加载账号列表失败: ' + error.message)
    }
  }

  // 处理账号变化
  const handleAccountChange = () => {
    loadOnSaleData()
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

  // 校验价格输入
  const validatePriceInput = () => {
    let value = updatePriceForm.value.newPrice
    
    if (!value) {
      return
    }
    
    // 转换为字符串
    value = String(value)
    
    // 移除非数字和小数点的字符
    value = value.replace(/[^\d.]/g, '')
    
    // 不允许以多个0开头（除非是0.xx）
    if (value.length > 1 && value[0] === '0' && value[1] !== '.') {
      value = value.replace(/^0+/, '0')
    }
    
    // 只保留第一个小数点
    const parts = value.split('.')
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('')
    }
    
    // 限制小数点后最多两位
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    
    updatePriceForm.value.newPrice = value
  }

  // 确认改价
  const confirmUpdatePrice = async () => {
    const price = updatePriceForm.value.newPrice
    
    // 验证价格
    if (!price || price.trim() === '') {
      ElMessage.warning('请输入售价')
      return
    }
    
    const priceFloat = parseFloat(price)
    if (isNaN(priceFloat) || priceFloat <= 0) {
      ElMessage.warning('请输入有效的价格（大于0）')
      return
    }
    
    // 验证小数位数
    const parts = price.split('.')
    if (parts.length === 2 && parts[1].length > 2) {
      ElMessage.warning('价格最多保留两位小数')
      return
    }

    // BUFF 改价尚未打通：apiUrls 里没有 updateSalePrice，直接调用会 TypeError；
    // 后端也没有对应路由。在 Spider 侧实现 BUFF 改价前，这里明确拒绝而不是发请求。
    ElMessage.warning('BUFF 改价功能尚未接入，请前往 BUFF APP 操作')
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
        account_id: selectedAccount.value,
        platform: 'buff'  // 必传：后端据此拒绝把 BUFF 订单发往悠悠有品的下架接口
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
    if (!steamHashName) {
      return null // 如果没有steam_hash_name，返回null，不显示图片
    }
    // 检查是否已经在404缓存中
    if (image404Cache.value.has(steamHashName)) {
      return null // 如果之前404过，直接返回null，不显示图片
    }
    // 将空格和竖线分别替换为下划线，并添加.png扩展名
    // 例如: "AK-47 | Neon Revolution (Factory New)" -> "AK-47___Neon_Revolution_(Factory_New).png"
    const imageName = steamHashName
      .replace(/\s*\|\s*/g, '___')  // " | " -> "___" (竖线及其两侧空格替换为三个下划线)
      .replace(/\s/g, '_')          // 剩余所有空格 -> "_"
      + '.png'

    return apiUrls.weaponImage(imageName)
  }

  const handleImageError = (e, steamHashName) => {
    // 将失败的steam_hash_name添加到404缓存中
    if (steamHashName) {
      image404Cache.value.add(steamHashName)
    }
    
    // 移除错误监听器，防止重复触发
    e.target.onerror = null
    
    // 隐藏图片，不设置data URI，避免将图片数据加载到内存
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

  // 获取价格差异样式类
  const getPriceDiffClass = (salePrice, buyPrice) => {
    if (!salePrice || !buyPrice) return ''
    const diff = parseFloat(salePrice) - parseFloat(buyPrice)
    return diff >= 0 ? 'price-profit' : 'price-loss'
  }

  let unwatchDevice = null

  onMounted(() => {
    const deviceType = applyDeviceClass()
    console.log('[OnSaleBuff] 当前设备类型:', deviceType)

    unwatchDevice = watchDeviceType((newDeviceType) => {
      console.log('[OnSaleBuff] 设备类型已变更:', newDeviceType)
    })

    loadAccountList()
  })

  onUnmounted(() => {
    if (unwatchDevice) {
      unwatchDevice()
    }
  })

  return {
    loading,
    updating,
    onSaleData,
    accountList,
    selectedAccount,
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
    loadAccountList,
    handleAccountChange,
    handleReset,
    handleUpdatePrice,
    validatePriceInput,
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
    formatOnSaleTime,
    getPriceDiffClass
  }
}
