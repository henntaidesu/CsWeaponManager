/**
 * SearchPendant组件的业务逻辑
 * 处理挂件搜索功能
 */
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { API_CONFIG, apiUrls } from '@/config/api.js'

export function useSearchPendant() {
  const router = useRouter()
  const crawlFormRef = ref(null)
  const platformAccountLists = ref({})
  const accountLoadingStates = ref({})
  const isProgrammaticPlatformChange = ref(false)
  const isCrawling = ref(false)
  const crawlResult = ref(null)

  const pollingTimer = ref(null)
  // 轮询间隔（毫秒）：与后端进度更新保持一致，都是3秒
  const POLL_INTERVAL = 3000
  const noDataCount = ref(0)
  const MAX_NO_DATA_COUNT = 60
  const lastPollingTime = ref(0)

  const getItemIconUrl = (item) => {
    if (!item) return ''

    // 使用本地资源（通过 steam_hash_name 或 steamHashName）
    const steamHashName = item.steamHashName || item.steam_hash_name
    if (!steamHashName) {
      console.warn('[武器图标] 缺少 steamHashName:', item)
      return ''
    }

    // 使用本地资源路径，按照 Inventory 页面的命名规则
    // 例如: "AK-47 | Neon Revolution (Factory New)" -> "AK-47___Neon_Revolution_(Factory_New).png"
    const imageName = steamHashName
      .replace(/\s*\|\s*/g, '___')  // " | " -> "___" (竖线及其两侧空格替换为三个下划线)
      .replace(/\s/g, '_')          // 剩余所有空格 -> "_"
      + '.png'

    return apiUrls.weaponImage(imageName)
  }

  const getPendantIconUrl = (pendant) => {
    if (!pendant) return ''

    // 使用 steamHashName 或 hashName
    const steamHashName = pendant.steamHashName || pendant.hashName
    if (!steamHashName) {
      console.warn('[挂件图标] 缺少 steamHashName:', pendant)
      return ''
    }

    // 使用本地资源路径，按照 Inventory 页面的命名规则
    // 例如: "AK-47 | Neon Revolution (Factory New)" -> "AK-47___Neon_Revolution_(Factory_New).png"
    const imageName = steamHashName
      .replace(/\s*\|\s*/g, '___')  // " | " -> "___" (竖线及其两侧空格替换为三个下划线)
      .replace(/\s/g, '_')          // 剩余所有空格 -> "_"
      + '.png'

    return apiUrls.weaponImage(imageName)
  }

  const parsePendants = (rawPendants) => {
    if (!rawPendants) {
      return []
    }
    if (Array.isArray(rawPendants)) {
      // 为每个挂件添加本地图标URL
      return rawPendants.map(pendant => ({
        ...pendant,
        img: getPendantIconUrl(pendant)
      }))
    }
    if (typeof rawPendants === 'string') {
      try {
        const parsed = JSON.parse(rawPendants)
        if (Array.isArray(parsed)) {
          return parsed.map(pendant => ({
            ...pendant,
            img: getPendantIconUrl(pendant)
          }))
        }
        return []
      } catch (error) {
        console.warn('[挂件] 无法解析 pendants 字段:', rawPendants, error)
        return []
      }
    }
    return []
  }

  const normalizeApiItems = (items = []) => {
    return items.map(item => ({
    id: item.commodityId,
    commodityNo: item.commodityNo,
    price: parseFloat(item.price) || 0,
    lowest_price: parseFloat(item.lowestPrice) || 0,
    spread: parseFloat(item.spread) || 0,
    abrade: item.abrade,
    paintSeed: item.paintSeed,
    nameTag: item.nameTag,
    userNickName: item.sellerName,
    assetId: item.assetId,
    steamHashName: item.steamHashName || item.steam_hash_name,
    steam_hash_name: item.steam_hash_name || item.steamHashName,
    weapon_name: item.weaponName,
    weaponName: item.weaponName,
    weaponId: item.weaponId,
    commissionFee: parseFloat(item.commissionFee) || 0,
    priceDiff: parseFloat(item.priceDiff) || 0,
    pendants: parsePendants(item.pendants),
    pendantTotalPrice: parseFloat(item.pendantTotalPrice) || 0,
    priceDiffPercentage: parseFloat(item.priceDiffPercentage) || 0,
    totalCount: parseInt(item.totalCount) || 0  // 添加在售数量
  }))
  }

  const rebuildCrawlResult = (items = []) => {
    const weaponGroups = {}
    items.forEach(item => {
      const weaponDisplayName = item.weapon_name || item.weaponName || '未知饰品'
      if (!weaponGroups[weaponDisplayName]) {
        weaponGroups[weaponDisplayName] = []
      }
      weaponGroups[weaponDisplayName].push(item)
    })

    const weapons = Object.keys(weaponGroups).map(name => ({
      weapon_name: name,
      items: weaponGroups[name]
    }))

    crawlResult.value = { weapons }
  }

  const loadRecentSearchResults = async () => {
  try {
    // 获取搜索结果，根据选中的配置ID过滤
    const params = new URLSearchParams({
      dataType: 'pendant'
    })
    // 如果选中了配置，则只查询该配置的数据
    if (selectedConfigId.value) {
      params.append('configId', selectedConfigId.value.toString())
    }
    const response = await fetch(`${apiUrls.searchPendantItemsList()}?${params.toString()}`)
    if (!response.ok) {
      console.warn('[挂件] 历史数据请求失败')
      return
    }
    const result = await response.json()
    if (result.success && Array.isArray(result.items) && result.items.length > 0) {
      const mappedItems = normalizeApiItems(result.items)
      rebuildCrawlResult(mappedItems)
    } else {
    }
  } catch (error) {
    console.error('[挂件] 加载历史数据失败:', error)
  }
  }

  const updateCrawlResultWithItems = (newItems) => {
    const currentItems = crawlResult.value?.weapons?.flatMap(weapon => weapon.items) || []
    const itemMap = new Map()
    currentItems.forEach(item => itemMap.set(item.id, item))
    newItems.forEach(item => itemMap.set(item.id, item))
    const mergedItems = Array.from(itemMap.values())
    mergedItems.sort((a, b) => {
      const diffA = a.priceDiff !== undefined ? a.priceDiff : -Infinity
      const diffB = b.priceDiff !== undefined ? b.priceDiff : -Infinity
      return diffB - diffA
    })
    rebuildCrawlResult(mergedItems)
  }

  const pollSearchResults = async () => {
  try {
    lastPollingTime.value = Date.now()

    // 1. 轮询进度数据（如果有选中的配置且正在爬取）
    if (selectedConfigId.value && isCrawling.value) {
      try {
        const progressResponse = await fetch(
          `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.YOUPIN_GET_PENDANT_SEARCH_PROGRESS}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              config_id: selectedConfigId.value
            })
          }
        )

        if (progressResponse.ok) {
          const progressResult = await progressResponse.json()

          if (progressResult.success && progressResult.data) {
            const progressData = progressResult.data

            // 处理不同类型的进度事件
            switch (progressData.type) {
              case 'start':
                updateProgress(selectedConfigId.value, {
                  total: progressData.total || 0,
                  current: progressData.current || 0,
                  percentage: 0,
                  currentWeapon: '',
                  isCompleted: false,
                  timestamp: Date.now()
                })
                saveProgressToStorage(selectedConfigId.value)
                break

              case 'processing':
                const total = progressData.total || 0
                const current = progressData.current || 0
                const percentage = total > 0 ? parseFloat(((current / total) * 100).toFixed(2)) : 0
                updateProgress(selectedConfigId.value, {
                  total,
                  current,
                  percentage,
                  currentWeapon: progressData.weapon_name || '',
                  isCompleted: false,
                  timestamp: Date.now()
                })
                saveProgressToStorage(selectedConfigId.value)
                // 定期保存 processing 状态（每10个更新保存一次，避免频繁写入）
                if (current % 10 === 0) {
                  await saveSearchStatusToConfig('processing', {
                    total,
                    current,
                    percentage
                  })
                }
                break

              case 'weapon_complete':
                // 武器完成，仅更新进度
                const totalW = progressData.total || 0
                const currentW = progressData.current || 0
                const percentageW = totalW > 0 ? parseFloat(((currentW / totalW) * 100).toFixed(2)) : 0
                updateProgress(selectedConfigId.value, {
                  total: totalW,
                  current: currentW,
                  percentage: percentageW,
                  currentWeapon: progressData.weapon_name || '',
                  isCompleted: false,
                  timestamp: Date.now()
                })
                saveProgressToStorage(selectedConfigId.value)
                break

              case 'stopped':
                ElMessage.warning(progressData.message || '搜索已停止')
                isCrawling.value = false
                const currentProgress = getProgress(selectedConfigId.value)
                updateProgress(selectedConfigId.value, {
                  total: currentProgress.total,
                  current: currentProgress.current,
                  percentage: 100,
                  currentWeapon: '',
                  isCompleted: true,
                  timestamp: Date.now()
                })
                saveProgressToStorage(selectedConfigId.value)
                stopPolling()
                // 保存搜索状态到配置
                await saveSearchStatusToConfig('stopped', currentProgress)
                break

              case 'complete':
                ElMessage.success(progressData.message || '搜索完成')
                isCrawling.value = false
                const completedProgress = getProgress(selectedConfigId.value)
                updateProgress(selectedConfigId.value, {
                  total: completedProgress.total,
                  current: completedProgress.total,
                  percentage: 100,
                  currentWeapon: '',
                  isCompleted: true,
                  timestamp: Date.now()
                })
                saveProgressToStorage(selectedConfigId.value)
                stopPolling()
                // 保存搜索状态到配置
                await saveSearchStatusToConfig('complete', completedProgress)
                break

              case 'error':
                ElMessage.error(progressData.message || '搜索发生错误')
                isCrawling.value = false
                clearProgress(selectedConfigId.value)
                clearProgressFromStorage(selectedConfigId.value)
                stopPolling()
                break
            }
          }
        }
      } catch (progressError) {
        console.error('[进度轮询] 获取进度失败:', progressError)
      }
    }

    // 2. 轮询搜索结果数据
    const params = new URLSearchParams({
      dataType: 'pendant'
    })
    // 如果选中了配置，则只查询该配置的数据
    if (selectedConfigId.value) {
      params.append('configId', selectedConfigId.value.toString())
    }
    const response = await fetch(`${apiUrls.searchPendantItemsList()}?${params.toString()}`)
    if (!response.ok) {
      console.error('[挂件] 轮询失败: HTTP', response.status)
      return
    }
    const result = await response.json()

    // 如果没有查询到数据，直接返回，不进行其他操作
    if (!result.success || !Array.isArray(result.items) || result.items.length === 0) {
      return
    }

    if (result.items.length > 0) {
      const mappedItems = normalizeApiItems(result.items)
      updateCrawlResultWithItems(mappedItems)
      if (isCrawling.value) {
        noDataCount.value = 0
      }
    }
  } catch (error) {
    console.error('[挂件] 轮询出错:', error)
  }
  }

  const startPolling = () => {
  if (pollingTimer.value) {
    return
  }
  pollingTimer.value = setInterval(pollSearchResults, POLL_INTERVAL)
  pollSearchResults()
  }

  const stopPolling = () => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
  }

  const clearCrawlHistory = async (skipConfirm = false) => {
  try {
    // 如果有选中的配置，只清空该配置的数据；否则清空所有数据
    const clearMessage = selectedConfigId.value
      ? '确定要清空当前配置的挂件搜索结果吗？此操作将删除该配置的所有挂件数据，不可恢复。'
      : '确定要清空所有挂件搜索结果吗？此操作不可恢复。'
    
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
      dataType: 'pendant'
    }
    
    // 如果有选中的配置，只清空该配置的数据
    if (selectedConfigId.value) {
      requestBody.configId = selectedConfigId.value
    }

    const response = await fetch(apiUrls.searchPendantItemsClear(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error('清空失败')
    }

    const result = await response.json()
    if (result.success) {
      crawlResult.value = null
      purchasedItems.value.clear()
      if (!skipConfirm) {
        ElMessage.success(result.message || '已清空挂件数据')
      }
    } else {
      throw new Error(result.message || '清空失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空挂件数据失败:', error)
      if (!skipConfirm) {
        ElMessage.error(error.message || '清空失败')
      }
    }
  }
  }

  // 合并所有武器的items到一个统一列表，并按差价从高到低排序
  const allCrawlItems = computed(() => {
    if (!crawlResult.value || !crawlResult.value.weapons) {
      return []
    }
    
    const items = []
    crawlResult.value.weapons.forEach(weapon => {
      if (weapon.items && weapon.items.length > 0) {
        weapon.items.forEach(item => {
          items.push({
            ...item,
            weapon_name: weapon.weapon_name,  // 添加武器名称
            weapon_id: weapon.weapon_id
          })
        })
      }
    })
    
    // 按差价从高到低排序
    items.sort((a, b) => {
      const diffA = a.priceDiff !== undefined ? a.priceDiff : -Infinity
      const diffB = b.priceDiff !== undefined ? b.priceDiff : -Infinity
      return diffB - diffA  // 从高到低
    })
    
    return items
  })

  // 配置管理相关
  const savedConfigs = ref([])
  const selectedConfigId = ref(null)

  // 饰品搜索相关
  const weaponSearchKeyword = ref('')
  const weaponSearchResults = ref([])
  const isSearchingWeapon = ref(false)
  const isLoadingMore = ref(false)  // 加载更多数据中
  const currentPage = ref(1)  // 当前页码
  const pageSize = ref(50)  // 每页数量
  const hasMore = ref(true)  // 是否还有更多数据
  const weaponSearchFilters = ref({
    weaponType: '',  // 武器类型筛选
    weaponName: '',  // 武器名称筛选
    rarity: '',      // 稀有度筛选
    priceMin: null,  // 最低价格
    priceMax: null,  // 最高价格
    minOnSaleCount: null  // 最小在售数量
  })
  const weaponNameList = ref([])  // 武器名称列表
  const isLoadingWeaponNames = ref(false)  // 加载武器名称中

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

  // 工具与配置区域联动折叠状态
  const isConfigSectionsCollapsed = ref(false)
  const isSearchResultsCollapsed = ref(false)  // 搜索结果列表折叠状态
  const isWeaponListCollapsed = ref(true)  // 饰品列表折叠状态（默认折叠）
  const showConfigForm = ref(false)  // 控制配置表单显示（默认隐藏）

  // 查询进度状态 - 使用 Map 管理多个配置的进度
  // key: configId, value: ProgressData
  const activeProgresses = ref(new Map())

  // 活跃的查询任务控制器
  // key: configId, value: AbortController
  const activeCrawlers = ref(new Map())

  // 当前选中配置的进度（计算属性）
  const crawlProgress = computed(() => {
    if (!selectedConfigId.value) {
      return {
        show: false,
        total: 0,
        current: 0,
        percentage: 0,
        currentWeapon: '',
        isCompleted: false
      }
    }
    return activeProgresses.value.get(selectedConfigId.value) || {
      show: false,
      total: 0,
      current: 0,
      percentage: 0,
      currentWeapon: '',
      isCompleted: false
    }
  })

  // 辅助函数：更新指定配置的进度
  const updateProgress = (configId, progressData) => {
    activeProgresses.value.set(configId, {
      show: true,
      ...progressData
    })
    // 同时更新配置列表中的进度数据
    const config = savedConfigs.value.find(c => c.id === configId)
    if (config) {
      config.crawlProgress = progressData
    }
  }

  // 辅助函数：获取指定配置的进度
  const getProgress = (configId) => {
    return activeProgresses.value.get(configId) || {
      show: false,
      total: 0,
      current: 0,
      percentage: 0,
      currentWeapon: '',
      isCompleted: false
    }
  }

  // 辅助函数：清除指定配置的进度
  const clearProgress = (configId) => {
    activeProgresses.value.delete(configId)
    const config = savedConfigs.value.find(c => c.id === configId)
    if (config) {
      config.crawlProgress = null
    }
  }

  // 查询模式选择对话框
  const showSearchModeDialog = ref(false)
  const selectedSearchMode = ref('by_weapon_id')  // 默认选择按饰品目录

  const createDefaultCustomConfig = () => ({
  '饰品自动查询间隔': 3,
  '是否自动购买': false,
  '自动购买阈值': 50,
  '自动购买阈值': 50,
  '最大溢价': 200,
  '印花板': false,
  '高光': false,
  '收益不少于': 3,
  '在售不少于': 100
})

const booleanOptions = [
  { label: '是', value: true },
  { label: '否', value: false }
]

const customConfigForm = ref(createDefaultCustomConfig())
const isProgrammaticCustomConfigChange = ref(false)

const crawlForm = ref({
  configName: '',      // 对应 dataName
  steamId: '',         // 购买账号
  crawlAccountId: '',  // 爬取账号
  platformType: '',    // 平台类型：youpin 或 buff
  searchMode: 'by_weapon_id',  // 查询模式：by_weapon_id 或 by_price_range
  weaponType: [],      // 武器类型筛选(多选数组)
  weaponId: [],        // 改为数组，存储 {id, name} 对象（按饰品目录模式使用）
  priceMin: null,      // 最低价格（按价格区间模式使用）
  priceMax: null       // 最高价格（按价格区间模式使用）
})

// 武器类型列表（按价格区间查询时可用的类型）
const weaponTypeOptions = ref([
  { label: '手枪', value: '手枪' },
  { label: '步枪', value: '步枪' },
  { label: '冲锋枪', value: '冲锋枪' },
  { label: '散弹枪', value: '散弹枪' },
  { label: '机枪', value: '机枪' }
])

// 计算属性：获取饰品列表
const weaponIdList = computed(() => {
  return crawlForm.value.weaponId || []
})

// 计算是否可以开始爬取
const canStartCrawl = computed(() => {
  if (!crawlForm.value.configName) return false
  if (!crawlForm.value.platformType) return false
  if (!crawlForm.value.crawlAccountId) return false
  if (!crawlForm.value.steamId) return false

  // 根据查询模式验证不同的必填项
  if (crawlForm.value.searchMode === 'by_weapon_id') {
    // 按饰品目录：需要至少一个饰品ID
    if (!crawlForm.value.weaponId || crawlForm.value.weaponId.length === 0) return false
  } else if (crawlForm.value.searchMode === 'by_price_range') {
    // 按价格区间：需要设置价格范围
    if (crawlForm.value.priceMin === null && crawlForm.value.priceMax === null) return false
    // 如果两个都设置了，最低价不能大于最高价
    if (crawlForm.value.priceMin !== null && crawlForm.value.priceMax !== null) {
      if (crawlForm.value.priceMin > crawlForm.value.priceMax) return false
    }
  }

  return true
})

const normalizePlatformKey = (value) => {
  if (!value && value !== 0) return ''
  const normalized = value.toString().trim().toLowerCase()
  if (['youpin', 'yyyp', 'you_pin', 'you-pin', '悠悠有品'].some(k => normalized === k.toLowerCase())) {
    return 'youpin'
  }
  if (['buff', 'buff平台'].some(k => normalized === k.toLowerCase())) {
    return 'buff'
  }
  return normalized
}

const PLATFORM_ACCOUNT_SOURCE_MAP = {
  youpin: { key1: 'youpin', key2: 'config', label: '悠悠有品' },
  buff: { key1: 'buff', key2: 'config', label: 'BUFF' }
}

const filteredSteamIdList = computed(() => {
  const platformKey = normalizePlatformKey(crawlForm.value.platformType || '')
  if (!platformKey) {
    return []
  }
  const accounts = platformAccountLists.value[platformKey] || []
  return accounts
})

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
  '是否自动购买': normalizeBooleanValue(
    customConfigForm.value['是否自动购买'],
    false
  ),
  '自动购买阈值': normalizeNumberValue(
    customConfigForm.value['自动购买阈值'],
    50
  ),
  '最大溢价': normalizeNumberValue(
    customConfigForm.value['最大溢价'],
    200
  ),
  '印花板': normalizeBooleanValue(
    customConfigForm.value['印花板'],
    false
  ),
  '高光': normalizeBooleanValue(
    customConfigForm.value['高光'],
    false
  ),
  '收益不少于': normalizeNumberValue(
    customConfigForm.value['收益不少于'],
    0
  ),
  '在售不少于': normalizeNumberValue(
    customConfigForm.value['在售不少于'],
    100
  ),
  '是否授权': true
})

const validateCustomConfig = () => {
  const config = buildCustomConfig()

  if (config['饰品自动查询间隔'] <= 0) {
    return { valid: false, message: '查询间隔必须大于 0 秒' }
  }
  if (config['最大溢价'] < 0) {
    return { valid: false, message: '最大溢价不能为负数' }
  }
  if (config['自动购买阈值'] < 0) {
    return { valid: false, message: '自动购买阈值不能为负数' }
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
    '是否自动购买': normalizeBooleanValue(
      config['是否自动购买'],
      defaults['是否自动购买']
    ),
    '自动购买阈值': normalizeNumberValue(
      config['自动购买阈值'],
      defaults['自动购买阈值']
    ),
    '最大溢价': normalizeNumberValue(
      config['最大溢价'],
      defaults['最大溢价']
    ),
    '印花板': normalizeBooleanValue(
      config['印花板'],
      defaults['印花板']
    ),
    '高光': normalizeBooleanValue(
      config['高光'],
      defaults['高光']
    ),
    '收益不少于': normalizeNumberValue(
      config['收益不少于'],
      defaults['收益不少于']
    ),
    '在售不少于': normalizeNumberValue(
      config['在售不少于'],
      defaults['在售不少于']
    )
  }
  nextTick(() => {
    isProgrammaticCustomConfigChange.value = false
  })
}

// 联动切换配置管理与爬取配置
const toggleConfigSections = () => {
  isConfigSectionsCollapsed.value = !isConfigSectionsCollapsed.value
}

// 切换搜索结果列表显示/隐藏
const toggleSearchResults = () => {
  isSearchResultsCollapsed.value = !isSearchResultsCollapsed.value
}

// 切换饰品列表显示/隐藏
const toggleWeaponList = () => {
  isWeaponListCollapsed.value = !isWeaponListCollapsed.value
}

const handleSidebarAreaClick = (event) => {
  const target = event.target
  if (!target) return

  if (target.closest && target.closest('.config-item')) {
    return
  }

  toggleConfigSections()
}

// 开始爬取（流式接收）
const startCrawl = async () => {

  // 开始搜索时自动折叠工具与配置区域
  isConfigSectionsCollapsed.value = true
  // 清空已购买记录
  purchasedItems.value.clear()
  // 验证基本配置
  if (!crawlForm.value.configName) {
    ElMessage.warning('请输入配置名称')
    return
  }

  if (!crawlForm.value.platformType) {
    ElMessage.warning('请选择平台类型')
    return
  }
  
  if (!crawlForm.value.crawlAccountId) {
    ElMessage.warning('请选择爬取账号')
    return
  }
  
  if (!crawlForm.value.steamId) {
    ElMessage.warning('请选择购买账号')
    return
  }

  // 根据查询模式验证不同的必填项
  if (crawlForm.value.searchMode === 'by_weapon_id') {
    if (!crawlForm.value.weaponId || crawlForm.value.weaponId.length === 0) {
      ElMessage.warning('请至少添加一个饰品ID')
      return
    }
  } else if (crawlForm.value.searchMode === 'by_price_range') {
    if (crawlForm.value.priceMin === null && crawlForm.value.priceMax === null) {
      ElMessage.warning('请设置价格区间')
      return
    }
    if (crawlForm.value.priceMin !== null && crawlForm.value.priceMax !== null) {
      if (crawlForm.value.priceMin > crawlForm.value.priceMax) {
        ElMessage.warning('最低价格不能大于最高价格')
        return
      }
    }
  }

  // 验证自定义配置
  const customConfigResult = validateCustomConfig()
  if (!customConfigResult.valid) {
    ElMessage.error(customConfigResult.message)
    return
  }
  const customConfig = customConfigResult.config

  // 确认对话框
  try {
    // 获取账号昵称
    const crawlAccount = filteredSteamIdList.value.find(item =>
      (item.steamID || item.steam_id) === crawlForm.value.crawlAccountId
    )
    const buyAccount = filteredSteamIdList.value.find(item =>
      (item.steamID || item.steam_id) === crawlForm.value.steamId
    )
    const crawlAccountName = crawlAccount ? `${crawlAccount.dataName || '未命名'} (${crawlForm.value.crawlAccountId})` : crawlForm.value.crawlAccountId
    const buyAccountName = buyAccount ? `${buyAccount.dataName || '未命名'} (${crawlForm.value.steamId})` : crawlForm.value.steamId

    let confirmMessage = `<div style="text-align: left; line-height: 1.8;">确定要开始查询带挂件饰品吗？<br><br>`
    confirmMessage += `配置名称:&nbsp;&nbsp;${crawlForm.value.configName}<br>`
    confirmMessage += `爬取账号:&nbsp;&nbsp;${crawlAccountName}<br>`
    confirmMessage += `购买账号:&nbsp;&nbsp;${buyAccountName}<br>`
    confirmMessage += `平台类型:&nbsp;&nbsp;${getSourceLabel(crawlForm.value.platformType)}<br>`

    // 根据查询模式显示不同信息
    if (crawlForm.value.searchMode === 'by_weapon_id') {
      confirmMessage += `查询模式:&nbsp;&nbsp;按饰品目录<br>`
      confirmMessage += `监控饰品数量:&nbsp;&nbsp;${crawlForm.value.weaponId.length} 个<br>`
    } else if (crawlForm.value.searchMode === 'by_price_range') {
      confirmMessage += `查询模式:&nbsp;&nbsp;按价格区间<br>`
      const priceMinText = crawlForm.value.priceMin !== null ? `${crawlForm.value.priceMin}元` : '不限'
      const priceMaxText = crawlForm.value.priceMax !== null ? `${crawlForm.value.priceMax}元` : '不限'
      confirmMessage += `价格区间:&nbsp;&nbsp;${priceMinText} ~ ${priceMaxText}<br>`
    }

    confirmMessage += `\n查询间隔: ${customConfig['饰品自动查询间隔']} 秒`
    confirmMessage += `\n自动购买: ${customConfig['是否自动购买'] ? '是' : '否'}`
    // confirmMessage += `\n最大差价百分比: ${customConfig['最大差价百分比']}%`  // 已废弃
    confirmMessage += `\n最大溢价: ${customConfig['最大溢价']} 元`
    confirmMessage += `\n印花板: ${customConfig['印花板'] ? '是' : '否'}`
    confirmMessage += `\n高光: ${customConfig['高光'] ? '是' : '否'}`
    confirmMessage += `\n收益不少于: ${customConfig['收益不少于']} 元`
    if (crawlForm.value.searchMode === 'by_price_range') {
      confirmMessage += `\n在售不少于: ${customConfig['在售不少于']} 件`
    }

    await ElMessageBox.confirm(
      confirmMessage,
      '确认执行',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )
  } catch {
    return
  }

  await clearCrawlHistory(true)
  isCrawling.value = true
  crawlResult.value = { weapons: [] }
  noDataCount.value = 0
  ElMessage.info('正在启动查询任务...')

  try {
    // 如果是按价格区间查询，先从数据库筛选符合条件的饰品
    let filteredWeaponIds = null
    if (crawlForm.value.searchMode === 'by_price_range') {
      try {
        ElMessage.info('正在从数据库筛选符合条件的饰品...')

        // 构建URL参数
        const params = new URLSearchParams()
        if (crawlForm.value.priceMin !== null && crawlForm.value.priceMin !== '') {
          params.append('price_min', crawlForm.value.priceMin)
        }
        if (crawlForm.value.priceMax !== null && crawlForm.value.priceMax !== '') {
          params.append('price_max', crawlForm.value.priceMax)
        }
        if (customConfig['在售不少于']) {
          params.append('min_on_sale_count', customConfig['在售不少于'])
        }
        if (crawlForm.value.weaponType && crawlForm.value.weaponType.length > 0) {
          params.append('weapon_types', crawlForm.value.weaponType.join(','))
        }

        const url = `${apiUrls.searchWeaponByPriceRange()}?${params.toString()}`

        const filterResponse = await axios.get(url)

        if (filterResponse.data.success && filterResponse.data.data) {
          const weapons = filterResponse.data.data

          if (weapons.length === 0) {
            ElMessage.warning('数据库中没有符合条件的饰品')
            isCrawling.value = false
            return
          }

          // 后端返回的数据格式已经是 [{id, name}]
          filteredWeaponIds = weapons.filter(w => w.id)  // 过滤掉没有ID的饰品


          if (filteredWeaponIds.length === 0) {
            ElMessage.warning('筛选后没有有效的饰品ID')
            isCrawling.value = false
            return
          }

          ElMessage.success(`已筛选出 ${filteredWeaponIds.length} 个符合条件的饰品`)
        } else {
          throw new Error(filterResponse.data.message || '数据库筛选失败')
        }
      } catch (filterError) {
        console.error('[挂件搜索] 数据库筛选失败:', filterError)
        ElMessage.error('数据库筛选失败: ' + (filterError.message || '未知错误'))
        isCrawling.value = false
        return
      }
    }

    // 构建基础配置
    const spiderConfig = {
      steam_id: crawlForm.value.crawlAccountId,
      search_mode: crawlForm.value.searchMode,  // 查询模式
      weapon_type: crawlForm.value.weaponType || [],  // 武器类型(多选数组)
      // 最大差价百分比: customConfig['最大差价百分比'],  // 已废弃
      最大溢价: customConfig['最大溢价'],
      饰品自动查询间隔: customConfig['饰品自动查询间隔'],
      是否自动购买: customConfig['是否自动购买'],
      印花板: customConfig['印花板'],
      高光: customConfig['高光'],
      收益不少于: customConfig['收益不少于'],
      在售不少于: customConfig['在售不少于']
    }

    // 根据查询模式添加不同的参数
    if (crawlForm.value.searchMode === 'by_weapon_id') {
      spiderConfig.weapon_id = crawlForm.value.weaponId
    } else if (crawlForm.value.searchMode === 'by_price_range') {
      // 使用筛选后的饰品ID列表
      if (filteredWeaponIds && filteredWeaponIds.length > 0) {
        // 重要：将查询模式改为 by_weapon_id，这样Spider会使用我们提供的饰品ID列表
        spiderConfig.search_mode = 'by_weapon_id'
        spiderConfig.weapon_id = filteredWeaponIds
      } else {
        // 如果没有筛选结果，仍然传递价格区间参数（后端兼容）
        spiderConfig.price_min = crawlForm.value.priceMin
        spiderConfig.price_max = crawlForm.value.priceMax
      }
    }

    // 如果有选中的配置ID，传递给后端
    if (selectedConfigId.value) {
      spiderConfig.config_id = selectedConfigId.value
    }

    const requestData = {
      steamId: crawlForm.value.crawlAccountId,
      spider_config: spiderConfig
    }


    // 使用普通POST接口启动任务
    const response = await fetch(
      `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.YOUPIN_AUTO_BUY_PENDANT_WEAPON}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      }
    )


    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.message || '启动搜索失败')
    }

    // 任务已启动，开始轮询进度
    ElMessage.success('搜索任务已启动')

    // 保存开始搜索的状态
    await saveSearchStatusToConfig('running', {
      total: filteredWeaponIds ? filteredWeaponIds.length : 0,
      current: 0,
      percentage: 0
    })

    startPolling()

  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error(error.message || '搜索失败')
    isCrawling.value = false
  }
}

// 停止搜索
const stopCrawl = async () => {
  if (!isCrawling.value) {
    ElMessage.warning('当前没有正在进行的搜索任务')
    return
  }

  if (!selectedConfigId.value) {
    ElMessage.error('无法停止：未找到配置ID')
    return
  }

  try {
    ElMessage.info('正在停止搜索...')

    const url = `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.YOUPIN_STOP_PENDANT_SEARCH}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config_id: selectedConfigId.value
      })
    })


    // 检查响应类型
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error('[停止搜索] 收到非JSON响应:', text.substring(0, 200))
      throw new Error(`服务器返回了非JSON响应 (${response.status})`)
    }

    const result = await response.json()

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || `HTTP ${response.status}`)
    }

    ElMessage.success('停止信号已发送')
    // 延迟一下再设置状态，等待后端响应
    setTimeout(async () => {
      isCrawling.value = false
      // 保存停止状态到配置
      const currentProgress = getProgress(selectedConfigId.value)
      await saveSearchStatusToConfig('stopped', currentProgress)
    }, 500)

  } catch (error) {
    console.error('[停止搜索] 失败:', error)
    ElMessage.error(`停止失败: ${error.message}`)
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
    searchMode: 'by_weapon_id',
    weaponType: [],
    weaponId: [],
    priceMin: null,
    priceMax: null
  }
  crawlResult.value = null
  resetCustomConfigForm()
}

const getSourceLabel = (source) => {
  const labels = {
    youpin: '悠悠有品',
    buff: 'BUFF',
    steam: 'Steam库存'
  }
  if (!source) {
    return '未设置'
  }
  return labels[source] || source
}

// 加载配置列表
const loadConfigList = async () => {
  try {
    // 只加载 key1 = 'spider_pendant' 的配置
    const response = await axios.get(apiUrls.configList(), {
      params: {
        key1: 'spider_pendant'
      }
    })


    // 保存平台类型
    savedConfigs.value = (response.data.data || []).map(config => ({
      ...config,
      platformType: config.key2 || ''
    }))

    // 按ID降序排序
    savedConfigs.value.sort((a, b) => b.id - a.id)


    // 恢复所有配置的进度
    loadAllProgresses()
  } catch (error) {
    console.error('加载配置列表失败:', error)
  }
}

// 选择并加载配置
const selectConfig = async (configId) => {

  if (!configId) {
    console.warn('配置ID为空')
    return
  }

  selectedConfigId.value = configId

  // 选中配置后显示配置表单
  showConfigForm.value = true

  // 切换配置时，先清空当前结果，避免显示混合数据
  crawlResult.value = { weapons: [] }

      // 尝试恢复进度（包含从本地配置或后端进度接口恢复）
      await loadProgressFromStorage()

  try {
    const config = savedConfigs.value.find(c => c.id === configId)
    
    if (config && config.value) {
      const platformType = config.platformType || ''
      if (platformType) {
        await loadAccountsForPlatform(platformType)
      }
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
      
      // 从 value 对象中提取数据
      const searchMode = valueObj.search_mode || 'by_weapon_id'  // 默认按饰品目录
      const weaponType = Array.isArray(valueObj.weapon_type) ? valueObj.weapon_type : (valueObj.weapon_type ? [valueObj.weapon_type] : [])  // 武器类型(多选数组)
      const weaponId = valueObj.weapon_id || []
      const priceMin = valueObj.price_min !== undefined ? valueObj.price_min : null
      const priceMax = valueObj.price_max !== undefined ? valueObj.price_max : null
      const steamId = valueObj.steam_id || ''


      // 移除已提取的字段，剩余的作为自定义配置
      const { weapon_id, steam_id, crawl_account_id, search_mode, weapon_type, price_min, price_max, ...restConfig } = valueObj

      // 构建新的表单数据
      const newFormData = {
        configName: config.dataName || '',
        steamId: steamId,
        crawlAccountId: crawl_account_id || steamId || '',
        platformType: platformType,
        searchMode: searchMode,
        weaponType: weaponType,
        weaponId: Array.isArray(weaponId) ? weaponId : [],
        priceMin: priceMin,
        priceMax: priceMax
      }
      
      
      // 加载配置数据到表单
      isProgrammaticPlatformChange.value = true
      crawlForm.value = newFormData
      applyCustomConfig(restConfig)
      
      // 等待下一个tick确保数据已更新
      await new Promise(resolve => setTimeout(resolve, 50))
      

      // 检查搜索状态，判断是否需要轮询
      // 首先尝试从后端获取实时状态
      let isSearching = false
      try {
        const progressResp = await fetch(
          `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.YOUPIN_GET_PENDANT_SEARCH_PROGRESS}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config_id: configId })
          }
        )

        if (progressResp.ok) {
          const progressResult = await progressResp.json()
          if (progressResult.success && progressResult.data) {
            const progressType = progressResult.data.type
            // 如果后端返回 processing、start 等状态，说明正在搜索
            if (progressType === 'processing' || progressType === 'start') {
              isSearching = true
            } else {
            }
          }
        }
      } catch (err) {
      }

      // 如果后端没有返回搜索中状态，检查本地配置中的状态
      if (!isSearching) {
        const lastSearchStatus = valueObj.last_search_status
        isSearching = lastSearchStatus &&
                     (lastSearchStatus.status === 'running' || lastSearchStatus.status === 'processing') &&
                     (Date.now() - lastSearchStatus.timestamp < 24 * 60 * 60 * 1000)  // 24小时内
        if (isSearching) {
        }
      }

      if (isSearching) {
        isCrawling.value = true
        startPolling()
      } else {
        isCrawling.value = false
        // 只请求一次结果列表
        await pollSearchResults()
      }

      ElMessage.success(`已加载配置: ${config.dataName}`)
    } else {
      console.warn('配置缺少value字段:', config)
      ElMessage.warning('配置数据为空')
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    console.error('错误堆栈:', error.stack)
    ElMessage.error(`加载配置失败: ${error.message}`)
  }
}

// 创建新配置（显示选择查询模式对话框）
const createNewConfig = () => {
  selectedConfigId.value = null
  selectedSearchMode.value = 'by_weapon_id'  // 默认选择按饰品目录
  showSearchModeDialog.value = true  // 显示对话框
}

// 确认查询模式选择
const confirmSearchMode = () => {
  showSearchModeDialog.value = false
  resetForm()
  crawlForm.value.searchMode = selectedSearchMode.value
  // 创建新配置后显示配置表单
  showConfigForm.value = true
  ElMessage.info(`已选择查询模式: ${selectedSearchMode.value === 'by_weapon_id' ? '按饰品目录' : '按价格区间'}`)
}

// 平台类型改变处理
const handlePlatformTypeChange = async () => {
  if (isProgrammaticPlatformChange.value) {
    isProgrammaticPlatformChange.value = false
  } else {
    crawlForm.value.crawlAccountId = ''
    crawlForm.value.steamId = ''
  }
  
  if (crawlForm.value.platformType) {
    await loadAccountsForPlatform(crawlForm.value.platformType)
  }
  
  if (selectedConfigId.value) {
    autoSaveConfig()
  }
}

// 自动保存配置
const autoSaveConfig = async () => {
  if (!selectedConfigId.value) {
    return
  }

  if (!crawlForm.value.configName || !crawlForm.value.platformType) {
    return
  }

  try {
    const customConfigResult = validateCustomConfig()
    if (!customConfigResult.valid) {
      return
    }

    const valueObj = {
      steam_id: crawlForm.value.steamId,
      crawl_account_id: crawlForm.value.crawlAccountId,
      search_mode: crawlForm.value.searchMode,
      weapon_type: crawlForm.value.weaponType || [],
      ...customConfigResult.config
    }

    // 根据查询模式添加不同字段
    if (crawlForm.value.searchMode === 'by_weapon_id') {
      valueObj.weapon_id = crawlForm.value.weaponId
    } else if (crawlForm.value.searchMode === 'by_price_range') {
      valueObj.price_min = crawlForm.value.priceMin
      valueObj.price_max = crawlForm.value.priceMax
    }

    const key2 = crawlForm.value.platformType

    const configData = {
      id: selectedConfigId.value,
      dataName: crawlForm.value.configName,
      key1: 'spider_pendant',
      key2: key2,
      value: JSON.stringify(valueObj)
    }

    const response = await axios.post(apiUrls.configUpdate(), configData)
    
    if (response.data.success) {
    }
  } catch (error) {
    console.error('自动保存失败:', error)
  }
}

watch(
  customConfigForm,
  () => {
    if (isProgrammaticCustomConfigChange.value) {
      return
    }
    if (selectedConfigId.value) {
      autoSaveConfig()
    }
  },
  { deep: true }
)

// 保存搜索状态到配置
const saveSearchStatusToConfig = async (status, progressInfo) => {
  if (!selectedConfigId.value) {
    return
  }

  try {

    // 获取当前配置
    const config = savedConfigs.value.find(c => c.id === selectedConfigId.value)
    if (!config) {
      console.error('[保存状态] 未找到配置')
      return
    }

    // 解析现有的 value
    let valueObj = {}
    try {
      valueObj = typeof config.value === 'string' ? JSON.parse(config.value) : config.value
    } catch (e) {
      console.error('[保存状态] 解析配置失败:', e)
      valueObj = {}
    }

    // 添加搜索状态信息
    valueObj.last_search_status = {
      status: status,  // 'stopped', 'complete', 'error'
      timestamp: Date.now(),
      total: progressInfo?.total || 0,
      current: progressInfo?.current || 0,
      percentage: progressInfo?.percentage || 0
    }

    // 更新配置
    const configData = {
      id: selectedConfigId.value,
      dataName: config.dataName,
      key1: config.key1,
      key2: config.key2,
      value: JSON.stringify(valueObj)
    }

    const response = await axios.post(apiUrls.configUpdate(), configData)

    if (response.data.success) {
      // 更新本地配置列表
      await loadConfigList()
    } else {
      console.error('[保存状态] 保存失败:', response.data.message)
    }
  } catch (error) {
    console.error('[保存状态] 保存失败:', error)
  }
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

    // 添加查询模式和武器类型
    valueObj.search_mode = crawlForm.value.searchMode
    valueObj.weapon_type = crawlForm.value.weaponType || []

    // 根据查询模式保存不同的字段
    if (crawlForm.value.searchMode === 'by_weapon_id') {
      // 将饰品列表添加到 value 对象中
      if (crawlForm.value.weaponId && crawlForm.value.weaponId.length > 0) {
        valueObj.weapon_id = crawlForm.value.weaponId
      }
    } else if (crawlForm.value.searchMode === 'by_price_range') {
      // 保存价格区间
      valueObj.price_min = crawlForm.value.priceMin
      valueObj.price_max = crawlForm.value.priceMax
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
      key1: 'spider_pendant',
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
      } else if (!isUpdating) {
        const newId = response.data.data?.id
        if (newId) {
          selectedConfigId.value = newId
          await selectConfig(newId)
        }
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

// 武器类型改变时，加载对应的武器名称列表
const handleWeaponTypeChange = async (weaponType) => {
  // 清空武器名称选择
  weaponSearchFilters.value.weaponName = ''
  weaponNameList.value = []
  
  // 无论是否选择武器类型，都加载武器名称列表
  await loadWeaponNames(weaponType)
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
    if (weaponSearchKeyword.value.trim()) {
      params.keyword = weaponSearchKeyword.value.trim()
    }
    
    // 如果选择了武器类型，添加到查询参数
    if (weaponSearchFilters.value.weaponType) {
      params.weaponType = weaponSearchFilters.value.weaponType
    }
    
    // 如果选择了武器名称，添加到查询参数
    if (weaponSearchFilters.value.weaponName) {
      params.weaponName = weaponSearchFilters.value.weaponName
    }
    
    // 如果选择了稀有度，添加到查询参数
    if (weaponSearchFilters.value.rarity) {
      params.rarity = weaponSearchFilters.value.rarity
    }
    
    // 如果设置了最低价格，添加到查询参数
    if (weaponSearchFilters.value.priceMin !== null && weaponSearchFilters.value.priceMin !== '') {
      params.priceMin = weaponSearchFilters.value.priceMin
    }
    
    // 如果设置了最高价格，添加到查询参数
    if (weaponSearchFilters.value.priceMax !== null && weaponSearchFilters.value.priceMax !== '') {
      params.priceMax = weaponSearchFilters.value.priceMax
    }
    
    // 如果设置了最小在售数量，添加到查询参数
    if (weaponSearchFilters.value.minOnSaleCount !== null && weaponSearchFilters.value.minOnSaleCount !== '') {
      params.minOnSaleCount = weaponSearchFilters.value.minOnSaleCount
    }
    
    const response = await axios.get(apiUrls.weaponDetailBase(), {
      params: params
    })
    
    if (response.data.success) {
      const newData = response.data.data || []
      const total = response.data.total || 0
      
      
      if (currentPage.value === 1) {
        weaponSearchResults.value = newData
        if (newData.length === 0) {
          ElMessage.info('未找到匹配的饰品')
          hasMore.value = false
        } else {
          ElMessage.success(`找到 ${total} 件饰品，已加载 ${newData.length} 件`)
        }
      } else {
        weaponSearchResults.value.push(...newData)
      }
      
      // 判断是否还有更多数据
      const hasMoreData = newData.length >= pageSize.value
      hasMore.value = hasMoreData
      
      
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

// 加载更多数据
const loadMoreWeapons = async () => {
  if (isLoadingMore.value || !hasMore.value) {
    return
  }
  
  // 记录加载前的滚动位置和页面高度
  const oldScrollHeight = document.documentElement.scrollHeight
  const oldScrollTop = window.pageYOffset || document.documentElement.scrollTop
  
  
  currentPage.value++
  await loadWeaponData()
  
  // 等待 DOM 更新后调整滚动位置
  await nextTick()
  
  // 加载完成后，将滚动位置向上调整，避免立即触发下一次加载
  const newScrollHeight = document.documentElement.scrollHeight
  const addedHeight = newScrollHeight - oldScrollHeight
  
  if (addedHeight > 0 && hasMore.value) {
    // 将滚动位置设置到距离底部 300px 的位置
    const clientHeight = window.innerHeight
    const targetScrollTop = newScrollHeight - clientHeight - 300
    
    // 确保新的滚动位置不会小于原来的位置
    if (targetScrollTop > oldScrollTop) {
      window.scrollTo({
        top: targetScrollTop,
        behavior: 'auto'  // 使用 auto 立即跳转，不使用平滑滚动
      })
      
    }
  }
}

// 页面滚动事件处理
let scrollTimer = null
const handlePageScroll = () => {
  // 如果没有搜索结果，不处理滚动
  if (weaponSearchResults.value.length === 0) {
    return
  }
  
  // 只有在爬取配置区域是展开状态时，才触发自动加载
  if (isConfigSectionsCollapsed.value) {
    return
  }
  
  // 防抖处理，避免频繁触发
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
    } else {
    }
  }, 100) // 100ms 防抖延迟
}

// 清除搜索结果
const clearWeaponSearch = () => {
  weaponSearchResults.value = []
  weaponSearchKeyword.value = ''
  weaponSearchFilters.value.weaponType = ''
  weaponSearchFilters.value.weaponName = ''
  weaponSearchFilters.value.rarity = ''
  weaponSearchFilters.value.priceMin = null
  weaponSearchFilters.value.priceMax = null
  weaponNameList.value = []
  currentPage.value = 1
  hasMore.value = true
}

// 根据平台类型获取对应的饰品ID
const getWeaponIdByPlatform = (row) => {
  if (crawlForm.value.platformType === 'buff') {
    return row.buff_id || row.yyyp_id || row.id || ''
  }
  if (crawlForm.value.platformType === 'youpin') {
    return row.yyyp_id || row.buff_id || row.id || ''
  }
  return row.yyyp_id || row.buff_id || row.id || ''
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

// 一键添加全部饰品ID
const addAllWeaponIds = async () => {
  if (!crawlForm.value.platformType) {
    ElMessage.warning('请先选择平台类型')
    return
  }

  if (!weaponSearchResults.value || weaponSearchResults.value.length === 0) {
    ElMessage.warning('没有可添加的饰品')
    return
  }

  try {
    const platformName = getSourceLabel(crawlForm.value.platformType) || '当前平台'
    
    await ElMessageBox.confirm(
      `确定要添加全部 ${weaponSearchResults.value.length} 个饰品吗？`,
      '确认添加',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    let addedCount = 0
    let skippedCount = 0
    let noIdCount = 0

    weaponSearchResults.value.forEach(row => {
      const weaponId = getWeaponIdByPlatform(row)
      
      // 没有ID的跳过
      if (!weaponId) {
        noIdCount++
        return
      }

      // 已存在的跳过
      if (crawlForm.value.weaponId.some(w => w.id === weaponId.toString())) {
        skippedCount++
        return
      }
      
      // 添加饰品对象
      crawlForm.value.weaponId.push({
        id: weaponId.toString(),
        name: row.market_listing_item_name || row.name || '未知饰品'
      })
      
      addedCount++
    })

    let message = `添加完成！成功添加 ${addedCount} 个饰品`
    if (skippedCount > 0) {
      message += `，跳过 ${skippedCount} 个已存在的饰品`
    }
    if (noIdCount > 0) {
      message += `，${noIdCount} 个饰品没有${platformName}ID`
    }
    
    ElMessage.success(message)
  } catch {
    // 用户取消操作
  }
}

// 删除饰品ID
const removeWeaponId = (idToRemove) => {
  crawlForm.value.weaponId = crawlForm.value.weaponId.filter(w => w.id !== idToRemove)
  ElMessage.success('已删除饰品')
}

// 一键清空饰品列表
const clearAllWeaponIds = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要清空所有饰品吗？此操作将清除 ${weaponIdList.value.length} 个饰品。`,
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    crawlForm.value.weaponId = []
    ElMessage.success('已清空所有饰品')
  } catch {
    // 用户取消操作
  }
}

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
          apiUrls.searchPendantItemUpdateStatus(),
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

// 购买饰品
const handleBuyWeapon = async (item) => {

  // 设置购买中状态
  buyingItems.value[item.id] = true

  // 开始购买流程 - 显示loading消息
  const loadingMessage = ElMessage({
    message: '正在加载商品详情...',
    type: 'info',
    duration: 0
  })

  try {
    // 打开购买确认对话框
    await openYYYPBuyDialog(item)

    // 关闭loading消息
    loadingMessage.close()
  } catch (error) {
    // 关闭loading消息
    loadingMessage.close()
    console.error('[购买] 打开对话框失败:', error)
  } finally {
    // 重置购买中状态
    buyingItems.value[item.id] = false
  }

  // 购买流程由对话框接管，直接返回
  return
}

// 表格行样式
const getRowClassName = () => {
  return 'weapon-row'
}

// 判断挂件是否包含"高光时刻"
const hasHighlightMoment = (item) => {
  if (!item.pendants || item.pendants.length === 0) {
    return false
  }
  // 检查任意一个挂件名称是否包含"高光时刻"
  return item.pendants.some(pendant => 
    pendant.name && pendant.name.includes('高光时刻')
  )
}

// 获取购买按钮类型
const getBuyButtonType = (item) => {
  if (purchasedItems.value.has(item.id)) {
    return 'success'  // 已购买：绿色
  }
  if (hasHighlightMoment(item)) {
    return 'warning'  // 包含高光时刻：黄色
  }
  if (item.priceDiff < 0) {
    return 'danger'   // 亏损：红色
  }
  if (item.priceDiff < 3) {
    return 'warning'  // 低收益：黄色
  }
  return 'success'    // 高收益：绿色
}

// 保存进度到config（同时写入后端配置表，以便后续恢复）
const saveProgressToStorage = async (configId) => {
  if (!configId) return

  try {
    const progress = getProgress(configId)
    const progressData = {
      total: progress.total,
      current: progress.current,
      percentage: progress.percentage,
      currentWeapon: progress.currentWeapon,
      isCompleted: progress.isCompleted,
      timestamp: progress.timestamp || Date.now(),
      isCrawling: isCrawling.value
    }

    // 查找配置
    const config = savedConfigs.value.find(c => c.id === configId)
    if (!config) return

    // 更新配置中的进度数据（本地内存中）
    const updatedConfig = {
      ...config,
      crawlProgress: progressData
    }

    const idx = savedConfigs.value.findIndex(c => c.id === configId)
    if (idx !== -1) {
      savedConfigs.value[idx] = updatedConfig
    }

    // 同步保存到后端（使用独立的挂件配置进度API）
    try {
      const response = await fetch(apiUrls.searchPendantConfigSave(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: configId,
          crawlProgress: progressData
        })
      })

      if (!response.ok) {
        console.error('[进度保存] 后端保存失败:', response.status, response.statusText)
      }
    } catch (err) {
      console.error('[进度保存] 后端保存异常:', err)
    }
  } catch (error) {
    console.error('[进度保存] 保存异常:', error)
  }
}

// 从config或后端进度接口恢复进度（单个配置）
const loadProgressFromStorage = async (configId) => {
  if (!configId) configId = selectedConfigId.value
  if (!configId) return

  try {
    // 查找配置
    const config = savedConfigs.value.find(c => c.id === configId)
    if (!config) {
      return
    }

    let progressData = config.crawlProgress

    // 如果本地配置中没有进度数据，尝试从后端进度接口恢复
    if (!progressData) {
      try {
        const resp = await fetch(
          `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.YOUPIN_GET_PENDANT_SEARCH_PROGRESS}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config_id: configId })
          }
        )

        if (resp.ok) {
          const result = await resp.json()
          if (result.success && result.data) {
            const d = result.data
            const total = d.total || 0
            const current = d.current || 0
            const percentage = total > 0 ? parseFloat(((current / total) * 100).toFixed(2)) : 0
            progressData = {
              total,
              current,
              percentage,
              currentWeapon: d.weapon_name || '',
              isCompleted: d.type === 'complete',
              timestamp: Date.now(),
              isCrawling: d.type === 'processing'
            }
          } else {
          }
        } else {
          console.error(`[进度恢复] 后端进度接口请求失败: HTTP ${resp.status}`)
        }
      } catch (err) {
        console.error('[进度恢复] 从后端进度接口恢复异常:', err)
      }

      // 如果依然没有进度数据，则直接返回
      if (!progressData) {
        return
      }
    }


    // 检查时间戳，如果超过24小时则清除
    const now = Date.now()
    const elapsed = now - (progressData.timestamp || 0)
    const maxAge = 24 * 60 * 60 * 1000 // 24小时

    if (elapsed < maxAge) {
      // 如果任务已完成，强制显示100%
      if (progressData.isCompleted) {
        updateProgress(configId, {
          total: progressData.total,
          current: progressData.total,  // 已完成，设置为总数
          percentage: 100,               // 已完成，设置为100%
          currentWeapon: '',
          isCompleted: true,
          timestamp: progressData.timestamp
        })
      } else {
        // 任务未完成，保留进度显示（通过轮询数据库继续更新）
        updateProgress(configId, {
          total: progressData.total,
          current: progressData.current,
          percentage: progressData.percentage,
          currentWeapon: progressData.currentWeapon || '',
          isCompleted: false,
          timestamp: progressData.timestamp
        })
        // 如果是当前选中的配置，设置爬取状态为true并启动轮询
        if (configId === selectedConfigId.value) {
          isCrawling.value = true
          startPolling()
        }
      }
    } else {
      // 过期，清除
      clearProgress(configId)
      clearProgressFromStorage(configId)
    }
  } catch (e) {
    console.error('[进度恢复] 恢复失败:', e)
  }
}

// 恢复所有配置的进度
const loadAllProgresses = () => {
  savedConfigs.value.forEach(config => {
    if (config.id) {
      // 异步恢复，每个配置单独处理
      loadProgressFromStorage(config.id)
    }
  })
}

// 清除config中的进度
const clearProgressFromStorage = async (configId) => {
  if (!configId) configId = selectedConfigId.value
  if (!configId) return

  try {
    // 查找配置
    const config = savedConfigs.value.find(c => c.id === configId)
    if (!config) return

    // 更新配置，移除进度数据
    const updatedConfig = {
      ...config,
      crawlProgress: null
    }

    // 同时更新本地配置列表
    const configIndex = savedConfigs.value.findIndex(c => c.id === configId)
    if (configIndex !== -1) {
      savedConfigs.value[configIndex] = updatedConfig
    }

    // 通知后端清除该配置的进度（保存为空对象）
    try {
      const response = await fetch(apiUrls.searchPendantConfigSave(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: configId,
          crawlProgress: null
        })
      })

      if (response.ok) {
      } else {
        console.error('[进度清除] 后端清除失败:', response.status, response.statusText)
      }
    } catch (err) {
      console.error('[进度清除] 后端清除异常:', err)
    }
  } catch (error) {
    console.error('[进度清除] 清除异常:', error)
  }
}

// 获取稀有度颜色样式（与ItemSearch保持一致）
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

  // 组件挂载时加载数据，并启动轮询
  onMounted(() => {
    if (crawlForm.value.platformType) {
      loadAccountsForPlatform(crawlForm.value.platformType)
    }
    loadConfigList()
    // 进入页面后立即启动轮询（进度 + 列表），每 POLL_INTERVAL 轮询一次
    startPolling()
    // 添加页面滚动监听
    window.addEventListener('scroll', handlePageScroll)
  })

  onUnmounted(() => {
    // 移除页面滚动监听
    window.removeEventListener('scroll', handlePageScroll)
    stopPolling()
  })

  // 打开 CSQAQ 网站
  const openCSQAQ = async (item) => {
    try {
      // 获取武器名称（market_listing_item_name 格式，如 "P2000 | Dispatch (Factory New)"）
      const weaponName = item.weapon_name || item.weaponName
      if (!weaponName) {
        ElMessage.warning('无法获取武器名称')
        return
      }

      // 调用后端接口查询 csqaq_id
      const response = await fetch(apiUrls.weaponCsqaqId(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          market_listing_item_name: weaponName
        })
      })

      if (!response.ok) {
        throw new Error('查询 CSQAQ ID 失败')
      }

      const result = await response.json()

      if (result.success && result.csqaq_id) {
        // 组合 URL 并打开新窗口
        const url = `https://csqaq.com/goods/${result.csqaq_id}`
        window.open(url, '_blank')
      } else {
        ElMessage.warning(result.message || '未找到对应的 CSQAQ ID')
      }
    } catch (error) {
      console.error('打开 CSQAQ 失败:', error)
      ElMessage.error('打开 CSQAQ 失败')
    }
  }

  // 打开 SteamDT 网站
  const openSteamDT = (item) => {
    try {
      // 获取 steam_hash_name
      const steamHashName = item.steam_hash_name || item.steamHashName
      if (!steamHashName) {
        ElMessage.warning('无法获取 Steam Hash Name')
        return
      }

      // 组合 URL（需要对 steamHashName 进行 URL 编码）
      const encodedName = encodeURIComponent(steamHashName)
      const url = `https://steamdt.com/cs2/${encodedName}`

      // 打开新窗口
      window.open(url, '_blank')
    } catch (error) {
      console.error('打开 SteamDT 失败:', error)
      ElMessage.error('打开 SteamDT 失败')
    }
  }

  return {
    crawlFormRef,
    filteredSteamIdList,
    isCrawling,
    crawlForm,
    customConfigForm,
    booleanOptions,
    weaponTypeOptions,
    crawlResult,
    allCrawlItems,
    canStartCrawl,
    crawlProgress,
    startCrawl,
    stopCrawl,
    resetForm,
    // 配置管理
    savedConfigs,
    selectedConfigId,
    loadConfigList,
    selectConfig,
    createNewConfig,
    saveConfig,
    autoSaveConfig,
    handlePlatformTypeChange,
    deleteConfig,
    deleteCurrentConfig,
    formatTime,
    // 饰品搜索
    weaponSearchKeyword,
    weaponSearchResults,
    isSearchingWeapon,
    isLoadingMore,
    hasMore,
    weaponSearchFilters,
    weaponNameList,
    isLoadingWeaponNames,
    handleWeaponTypeChange,
    loadWeaponNames,
    loadWeaponNamesIfNeeded,
    handleSearchWeapon,
    loadMoreWeapons,
    clearWeaponSearch,
    handleAddWeaponFromSearch,
    handleAddAllWeaponsFromSearch,
    getWeaponIdByPlatform,
    getSourceLabel,
    addWeaponId,
    addAllWeaponIds,
    removeWeaponId,
    clearAllWeaponIds,
    weaponIdList,
    getRowClassName,
    getRarityColor,
    // 购买相关
    buyingItems,
    purchasedItems,
    handleBuyWeapon,
    hasHighlightMoment,
    getBuyButtonType,
    getItemIconUrl,
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
    isSearchResultsCollapsed,
    toggleSearchResults,
    isWeaponListCollapsed,
    toggleWeaponList,
    showConfigForm,
    // 查询模式选择
    showSearchModeDialog,
    selectedSearchMode,
    confirmSearchMode,
    handleSidebarAreaClick,
    // 第三方网站跳转
    openCSQAQ,
    openSteamDT,
  }
}
