import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Delete, Refresh, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { API_CONFIG, apiUrls } from '@/config/api.js'
import WeaponSearch from '@/views/Units/weapon_search/index.vue'

export function useSearchWeaponRename() {
const router = useRouter()
const crawlFormRef = ref(null)
const platformAccountLists = ref({})
const isProgrammaticPlatformChange = ref(false)
const isApplyingConfigState = ref(false)
const accountLoadingStates = ref({})
const isCrawling = ref(false)
const crawlResult = ref(null)
const referencePriceCache = ref({})
const referencePriceSources = [
  { label: '悠悠有品', value: 'youpin' },
  { label: 'BUFF', value: 'buff' }
]

// 轮询相关变量
const pollingTimer = ref(null) // 轮询定时器
const lastItemId = ref(0) // 最后一条记录的ID（用于增量更新）
const POLL_INTERVAL = 1000 // 轮询间隔（毫秒）- 1秒
const noDataCount = ref(0) // 连续无数据次数
const MAX_NO_DATA_COUNT = 60 // 连续60次无数据（60秒/1分钟）后认为完成
const lastPollingTime = ref(0) // 最后轮询时间

// 将 weapons 转换为扁平列表，与 SearchPendant 保持一致
const allCrawlItems = computed(() => {
  
  if (!crawlResult.value || !crawlResult.value.weapons) {
    return []
  }


  const items = []
  crawlResult.value.weapons.forEach(weapon => {
    if (weapon.items && weapon.items.length > 0) {
      weapon.items.forEach(item => {
        // 计算手续费（通常为价格的 2.5%）
        const commissionRate = 0.025 // 2.5% 手续费率
        const price = item.price || 0
        const commissionFee = price * commissionRate

        // 计算收益（溢价 - 手续费）
        const spread = item.spread || 0
        const priceDiff = spread - commissionFee

        const weaponDisplayName = weapon.weapon_name || weapon.weaponName || '未知饰品'
        items.push({
          ...item,
          weapon_name: weaponDisplayName,
          weaponName: weaponDisplayName,  // 兼容旧字段
          yyyp_id: weapon.yyyp_id || weapon.weapon_id,
          commissionFee: commissionFee,  // 手续费
          priceDiff: priceDiff  // 收益
        })
      })
    }
  })

  // 按溢价从小到大排序（溢价最小的在最上面）
  items.sort((a, b) => {
    const spreadA = a.spread !== undefined ? a.spread : Infinity
    const spreadB = b.spread !== undefined ? b.spread : Infinity
    return spreadA - spreadB  // 从小到大
  })

  if (items.length > 0) {
  }

  return items
})

// 配置管理相关
const savedConfigs = ref([])
const selectedConfigId = ref(null)

// 本地存储相关
const STORAGE_KEY = 'spider_weapon_rename_result'

// 保存爬虫结果到 localStorage
const saveCrawlResultToStorage = (result) => {
  try {
    if (result && result.weapons) {
      const dataToSave = {
        result: result,
        timestamp: Date.now(),
        configName: crawlForm.value.configName || '未命名配置'
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    }
  } catch (error) {
    console.error('保存爬虫结果失败:', error)
  }
}

// 从 localStorage 恢复爬虫结果
const loadCrawlResultFromStorage = () => {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      const parsed = JSON.parse(savedData)
      crawlResult.value = parsed.result
      
      // 显示提示信息
      ElMessage.info(`已恢复上次查询结果 (${new Date(parsed.timestamp).toLocaleString()})`)
      return true
    }
  } catch (error) {
    console.error('恢复爬虫结果失败:', error)
  }
  return false
}

// 清空爬虫历史
const clearCrawlHistory = async (skipConfirm = false) => {
  try {
    // 如果有选中的配置，只清空该配置的数据；否则清空所有数据
    const clearMessage = selectedConfigId.value
      ? '确定要清空当前配置的查询结果吗？此操作将删除该配置的所有改名饰品数据，不可恢复。'
      : '确定要清空所有查询结果吗？此操作将删除数据库中所有改名饰品数据，不可恢复。'
    
    if (!skipConfirm) {
      await ElMessageBox.confirm(
        clearMessage,
        '确认清空',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    }
    
    // 构建请求体
    const requestBody = {
      dataType: 'rename'
    }
    
    // 如果有选中的配置，只清空该配置的数据
    if (selectedConfigId.value) {
      requestBody.configId = selectedConfigId.value
    }
    
    // 调用后端 API 清空数据库
    const response = await fetch(apiUrls.searchRenameItemsClear(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      throw new Error('清空失败')
    }
    
    const result = await response.json()
    
    if (result.success) {
      // 清空前端数据
      crawlResult.value = null
      localStorage.removeItem(STORAGE_KEY)
      if (!skipConfirm) {
        ElMessage.success(result.message || `已清空 ${result.count} 条数据`)
      }
    } else {
      throw new Error(result.message || '清空失败')
    }
  } catch (error) {
    if (error !== 'cancel' && !skipConfirm) {
      console.error('清空失败:', error)
      ElMessage.error(error.message || '清空失败')
    }
  }
}



// 饰品搜索相关
const weaponSearchKeyword = ref('')
const weaponSearchResults = ref([])
const isSearchingWeapon = ref(false)
const weaponSearchFilters = ref({
  weaponType: '',
  weaponName: '',
  rarity: '',
  priceMin: null,
  priceMax: null,
  minOnSaleCount: null
})
const weaponNameList = ref([])
const isLoadingWeaponNames = ref(false)
const isSearchResultsCollapsed = ref(false)
const currentPage = ref(1)
const pageSize = ref(50)
const hasMore = ref(true)
const isLoadingMore = ref(false)

// 购买相关
const buyingItems = ref({})  // 正在购买的商品 {itemId: true/false}
const purchasedItems = ref(new Set())  // 已成功购买的商品ID集合

// 悠悠有品购买确认对话框相关状态
const yyypBuyDialogVisible = ref(false)
const yyypBuyDetail = ref(null)
const yyypBuyDetailLoading = ref(false)
const buyingYYYP = ref(false)
const currentYYYPItem = ref(null)

// 悠悠有品购买表单
const yyypBuyForm = ref({
  autoConfirmPayment: true,
  pollPayment: true,
  paymentChannel: 'balance'
})

// 过滤支付方式列表，只显示有品余额
const filteredYYYPPayList = computed(() => {
  if (!yyypBuyDetail.value?.payList) return []
  return yyypBuyDetail.value.payList.filter(pay => pay.channelId === 100)
})

// 判断悠悠有品余额是否充足
const isYYYPBalanceSufficient = computed(() => {
  if (!yyypBuyDetail.value?.commodity) return false
  if (filteredYYYPPayList.value.length === 0) return false

  const balance = filteredYYYPPayList.value[0].balance || 0
  const price = yyypBuyDetail.value.commodity.commodityConversionPrice ||
                (yyypBuyDetail.value.commodity.commodityPrice / 100) || 0

  return balance >= price
})

const normalizeReferencePriceSource = (value, defaultValue = 'youpin') => {
  const normalized = (value || '').toString().trim().toLowerCase()
  if (normalized === 'buff') {
    return 'buff'
  }
  if (normalized === 'youpin') {
    return 'youpin'
  }
  return defaultValue
}

const ensureCacheBucket = (sourceKey) => {
  if (!referencePriceCache.value[sourceKey]) {
    referencePriceCache.value = {
      ...referencePriceCache.value,
      [sourceKey]: {}
    }
  }
  return referencePriceCache.value[sourceKey]
}

const normalizeReferencePrice = (value) => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

const applyReferencePricesToItems = (items) => {
  if (!items || items.length === 0) {
    return
  }
  const sourceKey = referencePriceSource.value
  const cacheBucket = ensureCacheBucket(sourceKey)
  items.forEach(item => {
    const hashName = item.steam_hash_name || item.steamHashName
    if (!hashName) {
      return
    }
    const cachedValue = cacheBucket[hashName]
    if (cachedValue !== undefined) {
      item.referencePrice = normalizeReferencePrice(cachedValue)
    }
  })
}

// 批量查询参考价（Steam Hash Name -> weapon_classID.yyyp_Price）
const loadReferencePrices = async (items = []) => {
  const targetItems = items && items.length > 0 ? items : allCrawlItems.value
  if (!targetItems || targetItems.length === 0) {
    return
  }
  const sourceKey = referencePriceSource.value
  const cacheBucket = ensureCacheBucket(sourceKey)

  const steamHashNames = targetItems
    .map(item => item.steam_hash_name || item.steamHashName)
    .filter(name => !!(name && name.trim()))

  if (steamHashNames.length === 0) {
    return
  }

  const uniqueHashNames = Array.from(new Set(steamHashNames))
  const namesToFetch = uniqueHashNames.filter(name => cacheBucket[name] === undefined)

  // 先尝试应用已有缓存，避免界面闪烁
  applyReferencePricesToItems(targetItems)

  if (namesToFetch.length === 0) {
    return
  }

  try {
    const response = await axios.post(
      apiUrls.weaponReferencePrices(),
      {
        steamHashNames: namesToFetch,
        referencePriceSource: sourceKey
      }
    )

    if (response.data.success && response.data.data) {
      const priceMap = response.data.data
      const normalizedPriceMap = {}

      Object.keys(priceMap).forEach(key => {
        normalizedPriceMap[key] = normalizeReferencePrice(priceMap[key])
      })

      namesToFetch.forEach(name => {
        if (normalizedPriceMap[name] === undefined) {
          normalizedPriceMap[name] = 0
        }
      })

      referencePriceCache.value = {
        ...referencePriceCache.value,
        [sourceKey]: {
          ...cacheBucket,
          ...normalizedPriceMap
        }
      }

      applyReferencePricesToItems(targetItems)
    }
  } catch (error) {
    console.error('[参考价] 查询失败:', error)
    // 不影响主流程，静默失败
  }
}

const getSteamBottomPrice = (item) => {
  if (!item) return 0
  const lowest = Number(item.lowest_price ?? item.lowestPrice)
  if (Number.isFinite(lowest)) {
    return lowest
  }
  const price = Number(item.price)
  const spread = Number(item.spread)
  if (Number.isFinite(price) && Number.isFinite(spread)) {
    return price - spread
  }
  return 0
}

// 获取购买按钮类型
const getBuyButtonType = (item) => {
  if (purchasedItems.value.has(item.id)) {
    return 'success'  // 已购买：绿色
  }
  if (item.priceDiff < 0) {
    return 'danger'   // 亏损：红色
  }
  if (item.priceDiff < 3) {
    return 'warning'  // 收益低：黄色
  }
  return 'primary'    // 正常：蓝色
}

const getWeaponDisplayName = (item) => {
  if (!item) return ''
  return item.weapon_name || item.weaponName || item.market_listing_item_name || item.name || ''
}

// 工具与配置区域联动折叠状态
const isConfigSectionsCollapsed = ref(false)
// 饰品列表折叠状态（默认折叠）
const isWeaponListCollapsed = ref(true)

const crawlForm = ref({
  configName: '',      // 对应 dataName
  steamId: '',         // 购买账号
  crawlAccountId: '',  // 爬取账号
  platformType: '',    // 平台类型：youpin 或 buff
  weaponId: []         // 改为数组，存储 {id, name} 对象
})

const booleanOptions = [
  { label: '是', value: true },
  { label: '否', value: false }
]

const createDefaultCustomConfig = () => ({
  '饰品自动查询间隔': 3,
  '最大差价': 8,
  '是否自动购买': false,
  '只查询中文改名': true,
  '参考价来源': 'youpin',
  '搜索参数': ''
})

const customConfigForm = ref(createDefaultCustomConfig())
const referencePriceSource = computed(() => normalizeReferencePriceSource(customConfigForm.value['参考价来源']))
const isProgrammaticCustomConfigChange = ref(false)

const weaponIdList = computed(() => {
  return crawlForm.value.weaponId || []
})

const normalizePlatformKey = (value) => {
  if (!value && value !== 0) return ''
  const normalized = value.toString().trim().toLowerCase()
  if (['youpin', 'yyyp', 'yyp', 'you_pin', 'you-pin', '悠悠有品'].some(k => normalized === k.toLowerCase())) {
    return 'youpin'
  }
  if (['buff', 'buff平台'].some(k => normalized === k.toLowerCase())) {
    return 'buff'
  }
  if (['steam', 'steam市场', 'steam-market'].some(k => normalized === k.toLowerCase())) {
    return 'steam'
  }
  return normalized
}

const filteredSteamIdList = computed(() => {
  const platformKey = normalizePlatformKey(crawlForm.value.platformType || '')
  if (!platformKey) {
    return []
  }
  const accounts = platformAccountLists.value[platformKey] || []
  return accounts
})

// 计算是否可以开始爬取
const canStartCrawl = computed(() => {
  if (!crawlForm.value.configName) return false
  if (!crawlForm.value.platformType) return false
  const platformKey = normalizePlatformKey(crawlForm.value.platformType)
  const requiresCrawler = platformKey !== 'steam'
  if (requiresCrawler && !crawlForm.value.crawlAccountId) return false
  if (!crawlForm.value.steamId) return false
  if (!crawlForm.value.weaponId || crawlForm.value.weaponId.length === 0) return false
  return true
})

const resetCustomConfigForm = () => {
  isProgrammaticCustomConfigChange.value = true
  customConfigForm.value = createDefaultCustomConfig()
  nextTick(() => {
    isProgrammaticCustomConfigChange.value = false
  })
}

const normalizeBooleanValue = (value, defaultValue) => {
  if (value === true || value === false) return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', '是', 'yes', 'y'].includes(normalized)) return true
    if (['false', '0', '否', 'no', 'n'].includes(normalized)) return false
  }
  return defaultValue
}

const normalizeNumberValue = (value, defaultValue) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : defaultValue
}

const buildCustomConfig = () => ({
  '饰品自动查询间隔': normalizeNumberValue(
    customConfigForm.value['饰品自动查询间隔'],
    3
  ),
  '最大差价': normalizeNumberValue(
    customConfigForm.value['最大差价'],
    8
  ),
  '是否自动购买': normalizeBooleanValue(
    customConfigForm.value['是否自动购买'],
    false
  ),
  '只查询中文改名': normalizeBooleanValue(
    customConfigForm.value['只查询中文改名'],
    true
  ),
  '参考价来源': normalizeReferencePriceSource(
    customConfigForm.value['参考价来源'],
    'youpin'
  ),
  '搜索参数': (customConfigForm.value['搜索参数'] || '').trim(),
  '是否授权': true
})

const validateCustomConfig = () => {
  const config = buildCustomConfig()

  if (config['饰品自动查询间隔'] <= 0) {
    return { valid: false, message: '饰品自动查询间隔必须大于 0 秒' }
  }
  if (config['最大差价'] < 0) {
    return { valid: false, message: '最大差价不能为负数' }
  }

  return { valid: true, config }
}

const applyCustomConfig = (config = {}) => {
  const defaults = createDefaultCustomConfig()
  isProgrammaticCustomConfigChange.value = true
  customConfigForm.value = {
    '饰品自动查询间隔': normalizeNumberValue(
      config['饰品自动查询间隔'],
      defaults['饰品自动查询间隔']
    ),
    '最大差价': normalizeNumberValue(
      config['最大差价'],
      defaults['最大差价']
    ),
    '是否自动购买': normalizeBooleanValue(
      config['是否自动购买'],
      defaults['是否自动购买']
    ),
    '只查询中文改名': normalizeBooleanValue(
      config['只查询中文改名'],
      defaults['只查询中文改名']
    ),
    '参考价来源': normalizeReferencePriceSource(
      config['参考价来源'],
      defaults['参考价来源']
    ),
    '搜索参数': typeof config['搜索参数'] === 'string'
      ? config['搜索参数']
      : (config['搜索参数'] ?? defaults['搜索参数'] ?? '')
  }
  nextTick(() => {
    isProgrammaticCustomConfigChange.value = false
  })
}

const PLATFORM_ACCOUNT_SOURCE_MAP = {
  youpin: { key1: 'youpin', key2: 'config', label: '悠悠有品' },
  buff: { key1: 'buff', key2: 'config', label: 'BUFF' },
  steam: { key1: 'steam', key2: 'config', label: 'Steam市场' }
}

const PLATFORM_SPIDER_ENDPOINT_MAP = {
  youpin: `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.ENDPOINTS.AUTO_BUY_RENAMED_WEAPON}`,
  steam: `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.ENDPOINTS.STEAM_SEARCH_RENAME}`
}

const loadAccountsForPlatform = async (platformType) => {
  const platformKey = normalizePlatformKey(platformType)
  if (!platformKey) {
    return
  }

  const sourceConfig = PLATFORM_ACCOUNT_SOURCE_MAP[platformKey]
  if (!sourceConfig) {
    console.warn(`[平台账号] 未配置平台 ${platformKey} 的数据源`)
    return
  }

  if (accountLoadingStates.value[platformKey]) {
    return
  }

  const cachedList = platformAccountLists.value[platformKey]
  if (cachedList && cachedList.length > 0) {
    return
  }

  accountLoadingStates.value = {
    ...accountLoadingStates.value,
    [platformKey]: true
  }

  try {
    const response = await axios.get(apiUrls.configList(), {
      params: {
        key1: sourceConfig.key1,
        key2: sourceConfig.key2
      }
    })
    if (response.data.success && Array.isArray(response.data.data)) {
      const mappedList = response.data.data.map(item => {
        let parsedValue = {}
        if (item.value) {
          try {
            parsedValue = typeof item.value === 'string'
              ? JSON.parse(item.value)
              : (item.value || {})
          } catch (parseError) {
            console.error(`[平台账号] 解析配置 value 失败 (${platformKey}):`, parseError)
          }
        }

        const steamId = parsedValue.steam_id || parsedValue.steamId || item.steamId || item.steamID || ''
        const displayName = item.dataName || parsedValue.accountName || parsedValue.name || `配置账号 #${item.id}`

        return {
          ...item,
          steamID: steamId,
          steam_id: steamId,
          dataName: displayName,
          platformKey,
          platformLabel: sourceConfig.label,
          rawConfig: parsedValue
        }
      })

      platformAccountLists.value = {
        ...platformAccountLists.value,
        [platformKey]: mappedList
      }
    }
  } catch (error) {
    console.error(`[平台账号] 加载 ${platformKey} 账号配置失败:`, error)
  } finally {
    accountLoadingStates.value = {
      ...accountLoadingStates.value,
      [platformKey]: false
    }
  }
}

// 平台类型改变处理
const handlePlatformTypeChange = async () => {
  if (isProgrammaticPlatformChange.value) {
    isProgrammaticPlatformChange.value = false
  } else {
    crawlForm.value.crawlAccountId = ''
    crawlForm.value.steamId = ''
  }
  
  if (!crawlForm.value.platformType) {
    return
  }
  
  await loadAccountsForPlatform(crawlForm.value.platformType)
}

// 验证JSON配置
// 联动切换配置管理与爬取配置区域
const toggleConfigSections = () => {
  isConfigSectionsCollapsed.value = !isConfigSectionsCollapsed.value
}

const toggleWeaponList = () => {
  isWeaponListCollapsed.value = !isWeaponListCollapsed.value
}

const clearAllWeaponIds = () => {
  crawlForm.value.weaponId = []
}

// 加载数据库中最近的搜索结果（页面加载时）
const loadRecentSearchResults = async () => {
  try {
    
    // 获取搜索结果，根据选中的配置ID过滤
    const params = new URLSearchParams({
      dataType: 'rename'
    })
    // 如果选中了配置，则只查询该配置的数据
    if (selectedConfigId.value) {
      params.append('configId', selectedConfigId.value.toString())
    }
    const url = `${apiUrls.searchRenameItemsList()}?${params.toString()}`
    const response = await fetch(url)
    
    if (!response.ok) {
      return
    }

    const result = await response.json()
    
    if (result.success && result.items && result.items.length > 0) {
      
      // 后端已通过 to_dict() 返回驼峰命名，直接使用
      const historyItems = result.items.map(item => {
        // 后端返回的已经是驼峰命名，直接使用
        const mappedItem = {
          id: item.id,  // 数据库主键，用于后端查询商品详情
          commodityId: item.commodityId,  // Steam的listing_id或悠悠有品的商品ID
          commodityNo: item.commodityNo,
          price: parseFloat(item.price) || 0,
          lowest_price: parseFloat(item.lowestPrice) || 0,
          spread: parseFloat(item.spread) || 0,
          abrade: item.abrade,
          paintSeed: item.paintSeed,
          nameTag: item.nameTag,
          userNickName: item.sellerName,
          assetId: item.assetId,
          iconUrl: item.iconUrl || item.icon_url || '',
          weapon_name: item.weaponName,
          weaponName: item.weaponName,
          weaponId: item.weaponId,
          commissionFee: parseFloat(item.commissionFee) || 0,
          priceDiff: parseFloat(item.priceDiff) || 0,
          steam_hash_name: item.steamHashName || item.steam_hash_name || '',
          // 关键字段：用于判断数据来源和购买逻辑
          dataType: item.dataType,  // 数据类型，Steam搜索结果可能为空或特定值
          listing_id: item.listingId || item.listing_id || '',  // Steam市场的listing_id
          listingId: item.listingId || item.listing_id || '',   // 兼容驼峰命名
          configId: item.configId,  // 配置ID
          referencePrice: null // 参考价，稍后通过查询填充
        }
        return mappedItem
      })
      
      // 按溢价从小到大排序（溢价最小的在最上面）
      historyItems.sort((a, b) => (a.spread || 0) - (b.spread || 0))
      
      // 按武器名称分组显示历史数据
      const weaponGroups = {}
      historyItems.forEach(item => {
        const weaponDisplayName = item.weapon_name || item.weaponName || '未知武器'
        if (!weaponGroups[weaponDisplayName]) {
          weaponGroups[weaponDisplayName] = []
        }
        weaponGroups[weaponDisplayName].push(item)
      })
      
      // 转换为weapons数组格式
      const weapons = Object.keys(weaponGroups).map(name => ({
        weapon_name: name,
        items: weaponGroups[name]
      }))
      
      crawlResult.value = { weapons }
      
      // 查询参考价
      await loadReferencePrices(historyItems)
      
      await nextTick()
    } else {
    }
  } catch (error) {
    console.error('[页面加载] 加载历史数据失败:', error)
  }
}

// 轮询获取数据库中的搜索结果（页面打开期间持续执行）
const pollSearchResults = async () => {
  // 如果搜索已完成，停止轮询
  if (!isCrawling.value && pollingTimer.value) {
    stopPolling()
    return
  }
  
  try {
    lastPollingTime.value = Date.now()
    
    // 获取所有数据，根据选中的配置ID过滤
    const params = new URLSearchParams({
      dataType: 'rename'
    })
    // 如果选中了配置，则只查询该配置的数据
    if (selectedConfigId.value) {
      params.append('configId', selectedConfigId.value.toString())
    }
    const url = `${apiUrls.searchRenameItemsList()}?${params.toString()}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('[轮询] HTTP错误:', response.status)
      return
    }

    const result = await response.json()
    
    // 如果没有查询到数据，直接返回，不进行其他操作
    if (!result.success || !result.items || result.items.length === 0) {
      return
    }
    
    if (result.items.length > 0) {
      
      // 如果正在搜索，重置无数据计数
      if (isCrawling.value) {
        noDataCount.value = 0
      }
      
      // 获取当前的所有商品列表
      const currentItems = crawlResult.value?.weapons?.[0]?.items || []
      
      // 后端已通过 to_dict() 返回驼峰命名，直接使用
      const newItems = result.items.map(item => {
        return {
          id: item.id,  // 数据库主键，用于后端查询商品详情
          commodityId: item.commodityId,  // Steam的listing_id或悠悠有品的商品ID
          commodityNo: item.commodityNo,
          price: parseFloat(item.price) || 0,
          lowest_price: parseFloat(item.lowestPrice) || 0,
          spread: parseFloat(item.spread) || 0,
          abrade: item.abrade,
          paintSeed: item.paintSeed,
          nameTag: item.nameTag,
          userNickName: item.sellerName,
          assetId: item.assetId,
          iconUrl: item.iconUrl || item.icon_url || '',
          weapon_name: item.weaponName,
          weaponName: item.weaponName,
          weaponId: item.weaponId,
          commissionFee: parseFloat(item.commissionFee) || 0,
          priceDiff: parseFloat(item.priceDiff) || 0,
          steam_hash_name: item.steamHashName || item.steam_hash_name || '',
          // 关键字段：用于判断数据来源和购买逻辑
          dataType: item.dataType,
          listing_id: item.listingId || item.listing_id || '',
          listingId: item.listingId || item.listing_id || '',
          configId: item.configId,
          referencePrice: null // 参考价，稍后通过查询填充
        }
      })
      
      // 去重合并（基于 commodityId）
      const itemMap = new Map()
      currentItems.forEach(item => itemMap.set(item.id, item))
      newItems.forEach(item => itemMap.set(item.id, item))
      const allItems = Array.from(itemMap.values())
      
      // 按溢价从小到大排序（溢价最小的在最上面）
      allItems.sort((a, b) => (a.spread || 0) - (b.spread || 0))
      
      // 按武器名称分组显示数据
      const weaponGroups = {}
      allItems.forEach(item => {
        const weaponDisplayName = item.weapon_name || item.weaponName || '未知武器'
        if (!weaponGroups[weaponDisplayName]) {
          weaponGroups[weaponDisplayName] = []
        }
        weaponGroups[weaponDisplayName].push(item)
      })
      
      // 转换为weapons数组格式
      const weapons = Object.keys(weaponGroups).map(name => ({
        weapon_name: name,
        items: weaponGroups[name]
      }))
      
      crawlResult.value = { weapons }
      
      // 更新lastItemId
      if (result.items.length > 0) {
        const maxId = Math.max(...result.items.map(item => item.id))
        if (maxId > lastItemId.value) {
          lastItemId.value = maxId
        }
      }
      
      // 查询参考价
      await loadReferencePrices(allItems)
      
      await nextTick()
    }
  } catch (error) {
    console.error('[轮询] 请求失败:', error)
  }
}

// 启动轮询（页面在前台时持续轮询）
const startPolling = () => {
  if (pollingTimer.value) {
    return // 已经在轮询中
  }
  
  pollingTimer.value = setInterval(pollSearchResults, POLL_INTERVAL)
  
  // 立即执行一次
  pollSearchResults()
}

// 停止轮询
const stopPolling = () => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

// 开始爬取（流式接收）- 全新重构版本
const startCrawl = async () => {
  // 开始搜索时自动折叠工具区域与配置栏
  isConfigSectionsCollapsed.value = true
  
  // 验证基本配置
  if (!crawlForm.value.configName) {
    ElMessage.warning('请输入配置名称')
    return
  }

  if (!crawlForm.value.platformType) {
    ElMessage.warning('请选择平台类型')
    return
  }
  const platformKey = normalizePlatformKey(crawlForm.value.platformType)
  if (!platformKey) {
    ElMessage.warning('请选择有效的平台类型')
    return
  }
  
  const requiresCrawler = platformKey !== 'steam'
  if (requiresCrawler && !crawlForm.value.crawlAccountId) {
    ElMessage.warning('请选择爬取账号')
    return
  }
  
  if (!crawlForm.value.steamId) {
    ElMessage.warning('请选择购买账号')
    return
  }
  
  if (!crawlForm.value.weaponId || crawlForm.value.weaponId.length === 0) {
    ElMessage.warning('请至少添加一个饰品ID')
    return
  }

  const customConfigResult = validateCustomConfig()
  if (!customConfigResult.valid) {
    ElMessage.error(customConfigResult.message)
    return
  }
  const customConfig = customConfigResult.config

  const spiderEndpoint = PLATFORM_SPIDER_ENDPOINT_MAP[platformKey]
  if (!spiderEndpoint) {
    ElMessage.error('该平台暂不支持自动查询')
    return
  }

  // 确认对话框
  try {
    const weaponNames = crawlForm.value.weaponId.map(w => w.name).join('、')
    let confirmMessage = `确定要开始查询改名饰品吗？\n\n`
    confirmMessage += `配置名称: ${crawlForm.value.configName}\n`
    confirmMessage += `爬取账号: ${crawlForm.value.crawlAccountId || (platformKey === 'steam' ? '（无需选择）' : '')}\n`
    confirmMessage += `购买账号: ${crawlForm.value.steamId}\n`
    const platformLabel = getSourceLabel(crawlForm.value.platformType) || '未选择'
    confirmMessage += `平台类型: ${platformLabel}\n`
    confirmMessage += `监控饰品: ${weaponNames}\n`
    confirmMessage += `饰品数量: ${crawlForm.value.weaponId.length} 个`
    
    confirmMessage += `\n最大差价: ${customConfig['最大差价']} 元`
    confirmMessage += `\n查询间隔: ${customConfig['饰品自动查询间隔']} 秒`
    confirmMessage += `\n是否自动购买: ${customConfig['是否自动购买'] ? '是' : '否'}`

    await ElMessageBox.confirm(
      confirmMessage,
      '确认执行',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  // 自动清空历史结果列表（无需确认）
  await clearCrawlHistory(true)

  // 初始化状态
  isCrawling.value = true
  crawlResult.value = { weapons: [] }
  lastItemId.value = 0 // 重置lastItemId
  noDataCount.value = 0 // 重置无数据计数

  try {
    // 构建请求
    const spiderConfig = {
      weapon_id: crawlForm.value.weaponId,
      ...customConfig
    }

    // 如果有选中的配置ID，传递给后端
    if (selectedConfigId.value) {
      spiderConfig.config_id = selectedConfigId.value
    }

    if (platformKey === 'steam') {
      spiderConfig.steam_id = crawlForm.value.steamId
    } else {
      spiderConfig.steam_id = crawlForm.value.crawlAccountId
    }
    if (crawlForm.value.crawlAccountId) {
      spiderConfig.crawl_account_id = crawlForm.value.crawlAccountId
    }

    const requestSteamId = platformKey === 'steam'
      ? crawlForm.value.steamId
      : crawlForm.value.crawlAccountId
    
    const requestData = {
      steamId: requestSteamId,
      spider_config: spiderConfig
    }
    

    // 启动轮询（只有在开始搜索时才启动）
    startPolling()
    pollSearchResults()

    // 发起搜索请求（后台执行）
    fetch(
      spiderEndpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      }
    ).then(async response => {
      let result = null
      try {
        result = await response.json()
      } catch (parseError) {
        console.warn('[前端] 响应解析失败:', parseError)
      }

      if (!response.ok || !result?.success) {
        const errMsg = result?.message || `HTTP ${response.status}`
        throw new Error(errMsg)
      }

    }).catch(error => {
      console.error('[前端] 启动搜索任务失败:', error)
      console.error(`[前端] 启动搜索任务失败: ${error.message}`)
      ElMessage.error(`启动搜索失败: ${error.message}`)
      isCrawling.value = false
      stopPolling() // 停止轮询
    })

    // 设置最大搜索时间（5分钟后自动停止搜索状态和轮询）
    setTimeout(() => {
      if (isCrawling.value) {
        isCrawling.value = false
        stopPolling() // 停止轮询
        const totalItems = crawlResult.value?.weapons?.[0]?.items?.length || 0
        ElMessage.warning(`搜索已超时结束，找到 ${totalItems} 个商品`)
        
        if (crawlResult.value) {
          saveCrawlResultToStorage(crawlResult.value)
        }
      }
    }, 5 * 60 * 1000) // 5分钟

  } catch (error) {
    console.error('搜索失败:', error)
    let errorMessage = '搜索失败'

    if (error.message) {
      errorMessage = error.message
    }

    ElMessage.error(errorMessage)
    console.error(`[前端] 搜索失败: ${errorMessage}`)
    isCrawling.value = false
    stopPolling() // 停止轮询
  }
}

// 重置表单
const resetForm = () => {
  isProgrammaticPlatformChange.value = true
  crawlForm.value = {
    configName: '',
    steamId: '',
    crawlAccountId: '',
    platformType: '',
    weaponId: []
  }
  crawlResult.value = null
  resetCustomConfigForm()
}

// 获取模式标签
const getModeLabel = (mode) => {
  const labels = {
    all: '爬取所有已改名饰品',
    new: '仅爬取新改名饰品',
    incremental: '增量更新'
  }
  return labels[mode] || mode
}

// 获取来源标签
const getSourceLabel = (source) => {
  const labels = {
    youpin: '悠悠有品',
    buff: 'BUFF',
    steam: 'Steam市场'
  }
  if (!source) {
    return '未设置'
  }
  return labels[source] || source
}

const getPlatformTagType = (platform) => {
  const key = normalizePlatformKey(platform)
  if (key === 'youpin') return 'success'
  if (key === 'buff') return 'warning'
  if (key === 'steam') return 'info'
  return ''
}

// 加载配置列表
const loadConfigList = async () => {
  try {
    // 只加载 key1 = 'spider_rename' 的配置
    const response = await axios.get(apiUrls.configList(), {
      params: {
        key1: 'spider_rename'
      }
    })
    
    
    // 根据 key2 字段判断平台类型
    savedConfigs.value = (response.data.data || []).map(config => ({
      ...config,
      platformType: config.key2 || ''
    }))
    
    // 按ID降序排序
    savedConfigs.value.sort((a, b) => b.id - a.id)
    
  } catch (error) {
    console.error('加载配置列表失败:', error)
    // ElMessage.error('加载配置列表失败')
  }
}

// 选择并加载配置
const selectConfig = async (configId) => {
  
  if (!configId) {
    console.warn('配置ID为空')
    return
  }

  selectedConfigId.value = configId
  
  // 切换配置时，先清空当前结果，避免显示混合数据
  crawlResult.value = { weapons: [] }
  lastItemId.value = 0

  try {
    isApplyingConfigState.value = true
    const config = savedConfigs.value.find(c => c.id === configId)
    
    if (config && config.value) {
      await loadAccountsForPlatform(config.platformType || crawlForm.value.platformType)
      // 解析 value 字段（JSON字符串）
      let valueObj
      try {
        valueObj = typeof config.value === 'string' 
          ? JSON.parse(config.value) 
          : config.value
      } catch (parseError) {
        console.error('JSON解析失败:', parseError)
        ElMessage.error('配置数据格式错误')
        return
      }
      
      // 从 value 对象中提取饰品列表和Steam ID
      const weaponId = valueObj.weapon_id || []
      const steamId = valueObj.steam_id || ''
      
      
      // 移除 weapon_id 和 steam_id，剩余的作为自定义配置
      const { weapon_id, steam_id, crawl_account_id, ...restConfig } = valueObj
      
      // 构建新的表单数据
      const newFormData = {
        configName: config.dataName || '',
        steamId: steamId,
        crawlAccountId: crawl_account_id || steamId || '',
        platformType: config.platformType || '',
        weaponId: Array.isArray(weaponId) ? weaponId : []
      }
      
      
      // 加载配置数据到表单
      isProgrammaticPlatformChange.value = true
      crawlForm.value = newFormData
      applyCustomConfig(restConfig)
      
      // 等待下一个tick确保数据已更新
      await new Promise(resolve => setTimeout(resolve, 50))
      
      
      // 选择配置后，启动轮询并立即刷新结果列表（显示该配置的数据）
      startPolling()
      await pollSearchResults()
      
      ElMessage.success(`已加载配置: ${config.dataName}`)
    } else {
      console.warn('配置缺少value字段:', config)
      ElMessage.warning('配置数据为空')
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    console.error('错误堆栈:', error.stack)
    ElMessage.error(`加载配置失败: ${error.message}`)
  } finally {
    isApplyingConfigState.value = false
  }
}

const autoSaveConfig = async () => {
  if (!selectedConfigId.value) {
    return
  }
  if (!crawlForm.value.configName) {
    return
  }
  if (!crawlForm.value.platformType) {
    return
  }

  try {
    const customConfigResult = validateCustomConfig()
    if (!customConfigResult.valid) {
      console.warn('自动保存跳过，自定义配置错误:', customConfigResult.message)
      return
    }
    let valueObj = { ...customConfigResult.config }

    if (crawlForm.value.weaponId && crawlForm.value.weaponId.length > 0) {
      valueObj.weapon_id = crawlForm.value.weaponId
    }

    if (crawlForm.value.steamId) {
      valueObj.steam_id = crawlForm.value.steamId
    }

    if (crawlForm.value.crawlAccountId) {
      valueObj.crawl_account_id = crawlForm.value.crawlAccountId
    }

    const configData = {
      id: selectedConfigId.value,
      dataName: crawlForm.value.configName,
      key1: 'spider_rename',
      key2: crawlForm.value.platformType,
      value: JSON.stringify(valueObj)
    }

    await axios.post(apiUrls.configSave(), configData)
  } catch (error) {
    console.error('自动保存配置失败:', error)
  }
}

const autoSaveTimer = ref(null)
const scheduleAutoSave = () => {
  if (isApplyingConfigState.value) {
    return
  }
  if (!selectedConfigId.value) {
    return
  }

  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }

  autoSaveTimer.value = setTimeout(() => {
    autoSaveTimer.value = null
    autoSaveConfig()
  }, 800)
}

watch(
  () => [
    crawlForm.value.configName,
    crawlForm.value.platformType,
    crawlForm.value.steamId,
    crawlForm.value.crawlAccountId
  ],
  () => {
    scheduleAutoSave()
  }
)

watch(
  customConfigForm,
  () => {
    if (isProgrammaticCustomConfigChange.value) {
      return
    }
    scheduleAutoSave()
  },
  { deep: true }
)

watch(
  () => allCrawlItems.value,
  (items) => {
    if (items && items.length > 0) {
      loadReferencePrices(items)
    }
  },
  { immediate: true, deep: false }
)

watch(
  referencePriceSource,
  () => {
    applyReferencePricesToItems(allCrawlItems.value)
    loadReferencePrices()
  }
)

watch(
  () => crawlForm.value.weaponId,
  () => {
    scheduleAutoSave()
  },
  { deep: true }
)

// 创建新配置（清空表单）
const createNewConfig = () => {
  selectedConfigId.value = null
  resetForm()
  ElMessage.info('已清空表单，可以创建新配置')
}

// 保存配置（直接保存，不弹窗）
const saveConfig = async () => {
  if (!crawlForm.value.configName) {
    ElMessage.warning('请输入配置名称')
    return
  }

  if (!crawlForm.value.platformType) {
    ElMessage.warning('请选择平台类型')
    return
  }

  try {
    const customConfigResult = validateCustomConfig()
    if (!customConfigResult.valid) {
      ElMessage.error(customConfigResult.message)
      return
    }

    // 构建 value 对象
    let valueObj = { ...customConfigResult.config }
    
    // 将饰品列表添加到 value 对象中
    if (crawlForm.value.weaponId && crawlForm.value.weaponId.length > 0) {
      valueObj.weapon_id = crawlForm.value.weaponId
    }
    
    // 添加其他必要字段
    if (crawlForm.value.steamId) {
      valueObj.steam_id = crawlForm.value.steamId
    }
    if (crawlForm.value.crawlAccountId) {
      valueObj.crawl_account_id = crawlForm.value.crawlAccountId
    }

    // 根据平台类型设置 key2
    const key2 = crawlForm.value.platformType

    const configData = {
      dataName: crawlForm.value.configName,
      key1: 'spider_rename',
      key2: key2,
      value: JSON.stringify(valueObj)
    }

    const isUpdating = !!selectedConfigId.value
    let response

    if (isUpdating) {
      configData.id = selectedConfigId.value
      response = await axios.post(apiUrls.configUpdate(), configData)
    } else {
      response = await axios.post(apiUrls.configSave(), configData)
    }
    
    if (response.data.success) {
      ElMessage.success(isUpdating ? '更新配置成功' : '保存配置成功')
      
      // 重新加载配置列表
      await loadConfigList()

      if (isUpdating && selectedConfigId.value) {
        await selectConfig(selectedConfigId.value)
      } else if (!isUpdating && response.data.data?.id) {
        selectedConfigId.value = response.data.data.id
        await selectConfig(selectedConfigId.value)
      }
    } else {
      throw new Error(response.data.message || '保存配置失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    const errorMessage = error.response?.data?.message || error.message || '保存配置失败'
    ElMessage.error(errorMessage)
  }
}

// 删除配置
// 删除当前配置
const deleteCurrentConfig = async () => {
  if (!selectedConfigId.value) {
    ElMessage.warning('请先选择一个配置')
    return
  }
  await deleteConfig(selectedConfigId.value)
}

const deleteConfig = async (configId) => {
  if (!configId) {
    return
  }

  try {
    const config = savedConfigs.value.find(c => c.id === configId)
    
    await ElMessageBox.confirm(
      `确定要删除配置 "${config.dataName}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await axios.delete(apiUrls.configDelete(configId))
    
    if (response.data.success) {
      ElMessage.success('删除配置成功')
      
      // 如果删除的是当前选中的配置，清空选中状态
      if (selectedConfigId.value === configId) {
        selectedConfigId.value = null
      }
      
      // 重新加载配置列表
      await loadConfigList()
    } else {
      throw new Error(response.data.message || '删除配置失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除配置失败:', error)
      const errorMessage = error.response?.data?.message || error.message || '删除配置失败'
      ElMessage.error(errorMessage)
    }
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 切换搜索结果折叠
const toggleSearchResults = () => {
  isSearchResultsCollapsed.value = !isSearchResultsCollapsed.value
}

// 武器类型改变时的处理
const handleWeaponTypeChange = async (value) => {
  // 清空武器名称选择
  weaponSearchFilters.value.weaponName = ''
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
  if (!weaponSearchFilters.value.weaponType) {
    await loadWeaponNames(null)
  }
}

// 搜索饰品（重置并开始新搜索）
const handleSearchWeapon = async () => {
  if (!crawlForm.value.platformType) {
    ElMessage.warning('请先选择平台类型')
    return
  }

  // 验证价格区间
  if (weaponSearchFilters.value.priceMin !== null && 
      weaponSearchFilters.value.priceMax !== null &&
      weaponSearchFilters.value.priceMin > weaponSearchFilters.value.priceMax) {
    ElMessage.warning('最低价格不能大于最高价格')
    return
  }
  
  // 重置分页状态
  currentPage.value = 1
  weaponSearchResults.value = []
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
    isSearchingWeapon.value = true
  } else {
    isLoadingMore.value = true
  }
  
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    }
    
    // 使用爬取配置中的平台类型
    params.platformType = crawlForm.value.platformType
    
    // 添加关键词（如果有）
    if (weaponSearchKeyword.value && weaponSearchKeyword.value.trim()) {
      params.keyword = weaponSearchKeyword.value.trim()
    }
    
    // 添加武器类型过滤（如果有）
    if (weaponSearchFilters.value.weaponType) {
      params.weaponType = weaponSearchFilters.value.weaponType
    }
    
    // 添加武器名称过滤（如果有）
    if (weaponSearchFilters.value.weaponName) {
      params.weaponName = weaponSearchFilters.value.weaponName
    }
    
    // 添加稀有度过滤（如果有）
    if (weaponSearchFilters.value.rarity) {
      params.rarity = weaponSearchFilters.value.rarity
    }
    
    // 添加价格过滤
    if (weaponSearchFilters.value.priceMin !== null && weaponSearchFilters.value.priceMin !== '') {
      params.priceMin = weaponSearchFilters.value.priceMin
    }
    if (weaponSearchFilters.value.priceMax !== null && weaponSearchFilters.value.priceMax !== '') {
      params.priceMax = weaponSearchFilters.value.priceMax
    }
    
    // 添加最小在售数量过滤
    if (weaponSearchFilters.value.minOnSaleCount !== null && weaponSearchFilters.value.minOnSaleCount !== '') {
      params.minOnSaleCount = weaponSearchFilters.value.minOnSaleCount
    }
    
    const response = await axios.get(apiUrls.weaponDetailBase(), {
      params: params
    })
    
    if (response.data.success) {
      const newData = response.data.data || []
      
      if (currentPage.value === 1) {
        // 首次搜索，替换数据
        weaponSearchResults.value = newData
        if (newData.length === 0) {
          ElMessage.info('未找到匹配的饰品')
        } else {
          ElMessage.success(`找到 ${newData.length} 件饰品`)
        }
      } else {
        // 追加数据
        weaponSearchResults.value.push(...newData)
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
    isSearchingWeapon.value = false
    isLoadingMore.value = false
  }
}

// 清除搜索结果
const clearWeaponSearch = () => {
  weaponSearchResults.value = []
  weaponSearchKeyword.value = ''
  weaponSearchFilters.value = {
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

// 一键添加全部饰品ID
const addAllWeaponIds = () => {
  if (!crawlForm.value.platformType) {
    ElMessage.warning('请先选择平台类型')
    return
  }

  if (!weaponSearchResults.value || weaponSearchResults.value.length === 0) {
    ElMessage.warning('没有可添加的饰品')
    return
  }
  
  let addedCount = 0
  weaponSearchResults.value.forEach(row => {
    const id = getWeaponIdByPlatform(row)
    const name = row.market_listing_item_name
    
    if (id && name) {
      // 检查是否已存在
      const exists = crawlForm.value.weaponId.some(w => w.id === id)
      if (!exists) {
        crawlForm.value.weaponId.push({ id, name })
        addedCount++
      }
    }
  })
  
  if (addedCount > 0) {
    ElMessage.success(`成功添加 ${addedCount} 个饰品ID`)
    
    // 自动保存配置
    if (selectedConfigId.value) {
      autoSaveConfig()
    }
  } else {
    ElMessage.info('所有饰品ID已存在')
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

// 根据平台类型获取对应的饰品ID
const getWeaponIdByPlatform = (row) => {
  const platformKey = normalizePlatformKey(crawlForm.value.platformType)
  if (platformKey === 'buff') {
    return row.buff_id || row.yyyp_id || row.id || ''
  }
  if (platformKey === 'steam') {
    return row.steam_hash_name || row.steamHashName || row.en_weapon_name || row.id || ''
  }
  // 默认返回悠悠有品 ID
  return row.yyyp_id || row.buff_id || row.id || row.steam_hash_name || ''
}

// 添加饰品ID到表单
// 从搜索组件添加单个饰品
const handleAddWeaponFromSearch = ({ id, name }) => {
  if (!id || !name) {
    ElMessage.warning('无效的饰品数据')
    return
  }

  // 检查是否已存在
  if (crawlForm.value.weaponId.some(w => w.id === id.toString())) {
    ElMessage.warning('该饰品已存在')
    return
  }

  // 添加饰品对象
  crawlForm.value.weaponId.push({
    id: id.toString(),
    name: name
  })

  ElMessage.success('饰品已添加')

  // 自动保存配置
  if (selectedConfigId.value) {
    autoSaveConfig()
  }
}

// 从搜索组件一键添加全部饰品
const handleAddAllWeaponsFromSearch = (weaponsToAdd) => {
  if (!weaponsToAdd || weaponsToAdd.length === 0) {
    ElMessage.warning('没有可添加的饰品')
    return
  }

  let addedCount = 0
  weaponsToAdd.forEach(({ id, name }) => {
    if (id && name) {
      // 检查是否已存在
      const exists = crawlForm.value.weaponId.some(w => w.id === id.toString())
      if (!exists) {
        crawlForm.value.weaponId.push({ id: id.toString(), name })
        addedCount++
      }
    }
  })

  if (addedCount > 0) {
    ElMessage.success(`成功添加 ${addedCount} 个饰品ID`)

    // 自动保存配置
    if (selectedConfigId.value) {
      autoSaveConfig()
    }
  } else {
    ElMessage.info('所有饰品ID已存在')
  }
}

const addWeaponId = (row) => {
  if (!crawlForm.value.platformType) {
    ElMessage.warning('请先选择平台类型')
    return
  }

  const weaponId = getWeaponIdByPlatform(row)
  
  if (!weaponId) {
    const platformName = getSourceLabel(crawlForm.value.platformType) || '当前平台'
    ElMessage.warning(`该饰品没有${platformName}ID`)
    return
  }

  // 检查是否已存在
  if (crawlForm.value.weaponId.some(w => w.id === weaponId.toString())) {
    ElMessage.warning('该饰品已存在')
    return
  }
  
  // 添加饰品对象（包含ID和名称）
  crawlForm.value.weaponId.push({
    id: weaponId.toString(),
    name: row.market_listing_item_name || row.name || '未知饰品'
  })
  
  const platformName = getSourceLabel(crawlForm.value.platformType) || '当前平台'
  ElMessage.success(`已添加${platformName}饰品: ${row.market_listing_item_name || row.name}`)
}

// 删除饰品ID
const removeWeaponId = (idToRemove) => {
  crawlForm.value.weaponId = crawlForm.value.weaponId.filter(w => w.id !== idToRemove)
  ElMessage.success('已删除饰品')
}

// 购买饰品
const handleBuyWeapon = async (item) => {
  // 输出完整的 item 数据用于调试
  
  // 检查购买账号
  if (!crawlForm.value.steamId) {
    ElMessage.warning('请先选择购买账号')
    return
  }
  
  // 根据平台类型选择不同的购买流程
  // 1. 优先从选中的配置中获取平台类型
  let configPlatformType = ''
  if (selectedConfigId.value) {
    const selectedConfig = savedConfigs.value.find(c => c.id === selectedConfigId.value)
    if (selectedConfig) {
      configPlatformType = (selectedConfig.platformType || selectedConfig.key2 || '').toLowerCase().trim()
    }
  }
  
  // 2. 检查表单中的平台类型（支持多种可能的格式）
  const formPlatformType = (crawlForm.value.platformType || '').toLowerCase().trim()
  
  // 3. 使用配置中的平台类型（如果存在），否则使用表单中的平台类型
  const platformType = configPlatformType || formPlatformType
  const isSteamPlatform = platformType === 'steam' || platformType === 'steam市场' || platformType.includes('steam')
  
  // 4. 检查 item 中的关键字段
  const hasListingId = !!(item.listing_id || item.listingId)
  const hasAssetId = !!(item.assetId)
  
  // 5. 综合判断：优先使用配置中的平台类型，其次检查是否有 listing_id
  // 注意：不能仅用 steam_hash_name 判断，因为悠悠有品数据也可能包含此字段
  let isSteam = false
  
  // 判断逻辑：
  // 1. 如果配置指定为 Steam 平台，则使用 Steam 购买
  // 2. 如果 item 有 listing_id 和 assetId，说明来自 Steam 市场搜索
  if (isSteamPlatform) {
    isSteam = true
  } else if (hasListingId && hasAssetId) {
    isSteam = true
  }

  // 调试日志：确认平台类型
  
  // 开始购买流程
  const loadingMessage = ElMessage({
    message: isSteam ? '正在购买Steam市场物品...' : '正在创建订单...',
    type: 'info',
    duration: 0
  })
  
  try {
    // 使用之前判断的结果（isSteam），确保一致性
    // 如果之前判断是 Steam，这里也应该是 Steam
    
    if (isSteam) {
      // Steam市场购买流程
      const marketHashName = item.steam_hash_name || item.steamHashName || ''
      const listingId = item.listing_id || item.listingId || ''
      
      
      if (!marketHashName && !listingId) {
        loadingMessage.close()
        ElMessageBox.alert(
          '无法购买：缺少Steam市场物品信息\n\n请确保物品包含 market_hash_name 或 listing_id 字段。\n\n如果这是 Steam 市场的查询结果，请联系开发者检查数据格式。',
          '购买失败',
          {
            confirmButtonText: '知道了',
            type: 'error'
          }
        )
        return
      }
      
      const requestData = {
        steamId: crawlForm.value.steamId,
        commodityId: item.id, // 传递商品ID，用于从数据库获取 listing_id 和 token（与悠悠有品方法一致）
        market_hash_name: marketHashName,
        listing_id: listingId,
        price: item.price,
        currency: 'USD',
        max_price: item.price ? item.price * 1.2 : undefined  // 允许20%的价格波动
      }
      
      
      let confirmationTipTimer = null
      let confirmationTipMessage = null
      
      const stopConfirmationTip = () => {
        if (confirmationTipTimer) {
          clearTimeout(confirmationTipTimer)
          confirmationTipTimer = null
        }
        if (confirmationTipMessage) {
          confirmationTipMessage.close?.()
          confirmationTipMessage = null
        }
      }
      
      confirmationTipTimer = setTimeout(() => {
        confirmationTipMessage = ElMessage({
          type: 'warning',
          message: '请在 Steam 手机令牌中确认本次交易，系统会自动轮询直到成功。',
          duration: 0,
          showClose: true
        })
      }, 1200)
      
      // 调用Steam市场购买接口 - 对接 market_buy.py 中的 SteamMarketBuyer
      // 接口路径: /spiderApiV2/.../steam/units/market/buy/buyMarketItem -> buy.py -> SteamMarketBuyer (market_buy.py)
      let response
      try {
        response = await axios.post(
          `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.ENDPOINTS.STEAM_BUY_MARKET_ITEM}`,
          requestData
        )
      } finally {
        stopConfirmationTip()
      }
      
      
      loadingMessage.close()
      
      if (response.data.success) {
        // 购买成功 - 标记为已购买
        purchasedItems.value.add(item.id)
        
        // 更新数据库中的状态为 buyed
        try {
          await axios.post(
            apiUrls.searchRenameItemUpdateStatus(),
            {
              commodityId: item.id,
              status: 'buyed'
            }
          )
        } catch (updateError) {
          console.error('更新数据库状态失败:', updateError)
          // 不影响购买成功的提示
        }
        
        const buyData = response.data.data || {}
        if (buyData.confirmation_waited) {
          ElMessage.info('已检测到手机令牌确认，系统完成后已自动继续。')
        }
        const message = `购买成功！\n\n商品：${item.nameTag || '改名饰品'}\n价格：$${buyData.price || item.price}\n状态：购买成功✅\n\n物品将发送至您的Steam库存。`
        
        ElMessageBox.alert(
          message,
          '购买完成',
          {
            confirmButtonText: '知道了',
            type: 'success',
            callback: () => {
              ElMessage.success('购买成功！')
            }
          }
        )
      } else {
        ElMessageBox.alert(
          `购买失败：${response.data.message || '未知错误'}\n\n请检查配置或稍后重试。`,
          '购买失败',
          {
            confirmButtonText: '知道了',
            type: 'error'
          }
        )
      }
    } else {
      // 悠悠有品购买流程 - 打开购买确认对话框

      // 关闭loading消息
      loadingMessage.close()

      // 打开购买确认对话框
      await openYYYPBuyDialog(item)

      // 重置购买中状态
      buyingItems.value[item.id] = false

      // 购买流程由对话框接管，直接返回
      return
      
      
      loadingMessage.close()
      
      if (response.data.success) {
        const orderData = response.data.data?.order || {}
        const paymentStatus = response.data.data?.payment_status || {}
        const orderNo = orderData.orderNo || '未知'
        const paymentAmount = item.price || '未知'
        
        // 检查支付状态
        const payStatus = paymentStatus.payStatus
        let message = ''
        
        if (payStatus === 2) {
          // 支付成功 - 标记为已购买
          purchasedItems.value.add(item.id)
          
          // 更新数据库中的状态为 buyed
          try {
            await axios.post(
              apiUrls.searchRenameItemUpdateStatus(),
              {
                commodityId: item.id,
                status: 'buyed'
              }
            )
          } catch (updateError) {
            console.error('更新数据库状态失败:', updateError)
            // 不影响购买成功的提示
          }
          
          message = `购买成功！\n\n商品：${item.nameTag || '改名饰品'}\n订单号：${orderNo}\n金额：¥${paymentAmount}\n状态：支付成功✅\n\n饰品将发送至您的库存。`
        } else if (payStatus === 1) {
          // 支付处理中
          message = `订单已创建！\n\n订单号：${orderNo}\n金额：¥${paymentAmount}\n状态：支付处理中⏳\n\n请稍后查看订单状态。`
        } else {
          // 订单创建成功但支付未完成
          message = `订单创建成功！\n\n订单号：${orderNo}\n金额：¥${paymentAmount}\n\n已自动使用余额支付，请稍后查看订单状态。`
        }
        
        // 显示购买成功信息
        ElMessageBox.alert(
          message,
          '购买完成',
          {
            confirmButtonText: '知道了',
            type: 'success',
            callback: () => {
              ElMessage.success(payStatus === 2 ? '购买成功！' : '订单已创建')
            }
          }
        )
      } else {
        ElMessageBox.alert(
          `购买失败：${response.data.message || '未知错误'}\n\n请检查配置或稍后重试。`,
          '购买失败',
          {
            confirmButtonText: '知道了',
            type: 'error'
          }
        )
      }
    }
  } catch (error) {
    loadingMessage.close()
    console.error('购买商品失败:', error)
    
    const errorMessage = error.response?.data?.message || error.message || '网络错误，请稍后重试'
    
    ElMessageBox.alert(
      `购买失败：${errorMessage}`,
      '购买失败',
      {
        confirmButtonText: '知道了',
        type: 'error'
      }
    )
  } finally {
    // 移除购买中状态
    buyingItems.value[item.id] = false
  }
}

// 表格行样式
const getRowClassName = () => {
  return 'weapon-row'
}

const tableHeaderStyle = () => {
  return {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontWeight: 600,
    borderBottom: '1px solid #3a3a3a'
  }
}

const handleSidebarAreaClick = (event) => {
  const target = event.target
  if (!target) return

  // 点击配置卡片时不触发折叠
  if (target.closest && target.closest('.config-item')) {
    return
  }

  toggleConfigSections()
}

// 组件挂载时加载数据（不自动启动搜索和轮询）
// 打开购买确认对话框（根据平台类型调用不同的接口）
const openYYYPBuyDialog = async (item) => {
  if (!item || !item.id) {
    ElMessage.warning('商品信息不完整')
    return
  }

  // 检查平台类型
  const platformType = crawlForm.value.platformType
  if (!platformType) {
    ElMessage.warning('未选择平台类型')
    return
  }

  currentYYYPItem.value = item
  yyypBuyDialogVisible.value = true
  yyypBuyDetailLoading.value = true
  yyypBuyDetail.value = null

  try {
    let response

    if (platformType === 'youpin') {
      // 悠悠有品：使用在售商品详情API
      response = await axios.post(
        `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getWeaponDetail`,
        {
          steamId: '',
          commodityId: item.id.toString()
        }
      )
    } else if (platformType === 'buff') {
      // BUFF：接口待实现
      ElMessage.warning('BUFF购买接口暂未实现')
      yyypBuyDialogVisible.value = false
      return
    } else {
      ElMessage.warning(`不支持的平台类型: ${platformType}`)
      yyypBuyDialogVisible.value = false
      return
    }

    if (response.data.success) {
      yyypBuyDetail.value = response.data.data
    } else {
      throw new Error(response.data.message || '获取商品详情失败')
    }
  } catch (error) {
    console.error('获取商品详情失败:', error)
    ElMessage.error(error.message || '获取商品详情失败')
    yyypBuyDialogVisible.value = false
  } finally {
    yyypBuyDetailLoading.value = false
  }
}

// 确认购买商品（根据平台类型调用不同的接口）
const confirmYYYPBuy = async () => {
  if (!currentYYYPItem.value || !yyypBuyDetail.value) {
    ElMessage.error('商品信息不完整')
    return
  }

  // 检查平台类型
  const platformType = crawlForm.value.platformType
  if (!platformType) {
    ElMessage.error('未选择平台类型')
    return
  }

  const commodity = yyypBuyDetail.value.commodity
  if (!commodity) {
    ElMessage.error('商品详情缺失')
    return
  }

  // 获取商品价格
  const price = commodity.commodityConversionPrice || commodity.commodityPrice
  if (!price) {
    ElMessage.error('商品价格缺失')
    return
  }

  // 确认对话框
  try {
    await ElMessageBox.confirm(
      `确认购买 ${commodity.commodityName}？\n价格: ¥${price}`,
      '确认购买',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  buyingYYYP.value = true

  try {
    let response

    if (platformType === 'youpin') {
      // 悠悠有品：在售商品购买流程
      const orderNo = yyypBuyDetail.value.orderNo
      const waitPaymentDataNo = yyypBuyDetail.value.waitPaymentDataNo

      if (!orderNo || !waitPaymentDataNo) {
        ElMessage.error('订单信息不完整')
        return
      }

      const url = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/confirmPayment`
      response = await axios.post(url, {
        steamId: crawlForm.value.steamId || '',
        orderNo: orderNo,
        waitPaymentDataNo: waitPaymentDataNo,
        paymentAmount: price,
        autoConfirmPayment: yyypBuyForm.value.autoConfirmPayment,
        paymentChannel: yyypBuyForm.value.paymentChannel || 'balance',
        pollPayment: yyypBuyForm.value.pollPayment
      })
    } else if (platformType === 'buff') {
      // BUFF：接口待实现
      ElMessage.warning('BUFF购买接口暂未实现')
      buyingYYYP.value = false
      return
    } else {
      ElMessage.error(`不支持的平台类型: ${platformType}`)
      buyingYYYP.value = false
      return
    }

    if (response.data.success) {
      // 购买成功 - 标记为已购买
      purchasedItems.value.add(currentYYYPItem.value.id)

      // 更新数据库状态
      try {
        await axios.post(
          apiUrls.searchRenameItemUpdateStatus(),
          {
            commodityId: currentYYYPItem.value.id,
            status: 'buyed'
          }
        )
      } catch (updateError) {
        console.error('更新数据库状态失败:', updateError)
      }

      ElMessage.success('购买成功！')
      yyypBuyDialogVisible.value = false
    } else {
      throw new Error(response.data.message || '购买失败')
    }
  } catch (error) {
    console.error('购买悠悠有品商品失败:', error)
    const errorMsg = error.response?.data?.message || error.message || '购买失败，请稍后重试'
    ElMessage.error(errorMsg)
  } finally {
    buyingYYYP.value = false
  }
}

// 取消订单
const cancelYYYPOrder = async () => {
  // 检查订单号是否存在
  if (!orderNo || !waitPaymentDataNo) {
    ElMessage.warning('订单信息不完整，无法取消')
    yyypBuyDialogVisible.value = false
    return
  }

  // 检查平台类型
  const platformType = crawlForm.value.platformType
  if (platformType !== 'youpin') {
    ElMessage.warning('只有悠悠有品平台支持取消订单')
    return
  }

  try {
    // 确认取消订单
    await ElMessageBox.confirm(
      `确认取消订单 ${orderNo}？`,
      '取消订单',
      {
        confirmButtonText: '确认',
        cancelButtonText: '返回',
        type: 'warning'
      }
    )

    // 调用取消订单API
    const url = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/cancelOrder`
    const response = await axios.post(url, {
      steamId: crawlForm.value.steamId || '',
      orderNo: orderNo
    })

    if (response.data.success) {
      ElMessage.success('订单已取消')
      yyypBuyDialogVisible.value = false

      // 清空订单信息
      orderNo = null
      waitPaymentDataNo = null
    } else {
      throw new Error(response.data.message || '取消订单失败')
    }
  } catch (error) {
    // 如果用户点击了"返回"，不显示错误
    if (error === 'cancel') {
      return
    }

    console.error('取消订单失败:', error)
    const errorMsg = error.response?.data?.message || error.message || '取消订单失败，请稍后重试'
    ElMessage.error(errorMsg)
  }
}

onMounted(() => {
  if (crawlForm.value.platformType) {
    loadAccountsForPlatform(crawlForm.value.platformType)
  }
  loadConfigList()

  // 不再自动加载搜索结果和启动轮询，需要点击配置卡片后才进行搜索
})

// 组件卸载时停止轮询
onUnmounted(() => {
  stopPolling()
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
    autoSaveTimer.value = null
  }
})

return {
  crawlFormRef,
  filteredSteamIdList,
  isCrawling,
  crawlForm,
  customConfigForm,
  booleanOptions,
  referencePriceSources,
  crawlResult,
  allCrawlItems,
  canStartCrawl,
  startCrawl,
  resetForm,
  getModeLabel,
  getSourceLabel,
  getPlatformTagType,
  handlePlatformTypeChange,
  // 配置管理
  savedConfigs,
  selectedConfigId,
  loadConfigList,
  selectConfig,
  createNewConfig,
  saveConfig,
  autoSaveConfig,
  deleteConfig,
  deleteCurrentConfig,
  formatTime,
  // 饰品搜索
  weaponSearchKeyword,
  weaponSearchResults,
  isSearchingWeapon,
  weaponSearchFilters,
  weaponNameList,
  isLoadingWeaponNames,
  isSearchResultsCollapsed,
  currentPage,
  pageSize,
  hasMore,
  isLoadingMore,
  handleSearchWeapon,
  handleWeaponTypeChange,
  loadWeaponNames,
  loadWeaponNamesIfNeeded,
  loadWeaponData,
  clearWeaponSearch,
  toggleSearchResults,
  addAllWeaponIds,
  getRarityColor,
  getWeaponIdByPlatform,
  addWeaponId,
  removeWeaponId,
  weaponIdList,
  isWeaponListCollapsed,
  toggleWeaponList,
  clearAllWeaponIds,
  getRowClassName,
  // 购买相关
  buyingItems,
  purchasedItems,
  handleBuyWeapon,
  getBuyButtonType,
  getSteamBottomPrice,
  // 悠悠有品购买对话框
  yyypBuyDialogVisible,
  yyypBuyDetail,
  yyypBuyDetailLoading,
  buyingYYYP,
  yyypBuyForm,
  filteredYYYPPayList,
  isYYYPBalanceSufficient,
  openYYYPBuyDialog,
  confirmYYYPBuy,
  cancelYYYPOrder,
  // 历史结果管理
  clearCrawlHistory,
  // 工具区域折叠
  isConfigSectionsCollapsed,
  toggleConfigSections,
  resetCustomConfigForm,
  // 从搜索组件添加饰品
  handleAddWeaponFromSearch,
  handleAddAllWeaponsFromSearch,
  getWeaponDisplayName,
  tableHeaderStyle,
  handleSidebarAreaClick
}
}
