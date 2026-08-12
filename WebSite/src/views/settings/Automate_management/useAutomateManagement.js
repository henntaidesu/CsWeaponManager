import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { API_CONFIG, apiUrls } from '@/config/api.js'


export function useAutomateManagement() {
  // 表单数据
  const automateForm = ref({
    taskName: '', // 任务名称
    automateType: '',
    selectedTask: '',
    selectedSteamConfig: '', // Steam配置的dataID
    selectedDataSource: '', // 单选数据源
    selectedSearchConfig: '', // 搜索配置
    interval: 30,
    syncHistory: true // 是否同步历史数据，默认为true
  })
  
  const customInterval = ref(automateForm.value.interval)
  
  // 执行状态
  const executing = ref(false)
  const bulkStarting = ref(false)
  const bulkStopping = ref(false)

  // 编辑状态
  const isEditing = ref(false)
  const editingTaskId = ref(null)
  
  // Steam配置列表（key1='steam' 的配置，用于"更新Steam库存"）
  const steamConfigList = ref([])
  
  // 悠悠有品配置列表（key1='youpin' 的配置，用于"获取悠悠有品价格"）
  const youpinConfigList = ref([])
  
  // BUFF配置列表（key1='buff' 的配置，用于"获取BUFF价格"）
  const buffConfigList = ref([])
  
  // 数据源列表
  const dataSources = ref([])
  
  // 运行中的任务
  const runningTasks = ref([])
  
  // 全部自动化方法目录（卡片详情据此展示：已创建/未创建/不可用）
  const AUTOMATION_CATALOG = [
    { automateType: 'auto_update', taskType: 'update_steam_inventory', typeLabel: '更新steam库存价格', methodLabel: '更新Steam库存', source: 'steam' },
    { automateType: 'auto_update', taskType: 'fetch_yyyp_price', typeLabel: '更新steam库存价格', methodLabel: '获取悠悠有品价格', source: 'youpin' },
    { automateType: 'auto_update', taskType: 'fetch_buff_price', typeLabel: '更新steam库存价格', methodLabel: '获取BUFF价格', source: 'buff' },
    { automateType: 'auto_refresh_auth', taskType: '', typeLabel: '更新steam认证', methodLabel: '更新Steam认证', source: 'steam' },
    { automateType: 'auto_fetch', taskType: 'collect_buff', typeLabel: '获取平台交易记录', methodLabel: 'BUFF数据采集', source: 'buff' },
    { automateType: 'auto_fetch', taskType: 'collect_youpin', typeLabel: '获取平台交易记录', methodLabel: '悠悠有品数据采集', source: 'youpin' },
    { automateType: 'auto_fetch', taskType: 'collect_igxe', typeLabel: '获取平台交易记录', methodLabel: 'IGXE数据采集', source: 'igxe' },
    { automateType: 'auto_platform_price', taskType: 'platform_youpin_price', typeLabel: '更新饰品平台映射价格', methodLabel: '更新悠悠有品饰品价格', source: 'youpin' },
    { automateType: 'auto_platform_price', taskType: 'platform_buff_price', typeLabel: '更新饰品平台映射价格', methodLabel: '更新BUFF饰品价格', source: 'buff' },
    { automateType: 'auto_search_weapon', taskType: 'search_weapon_rename', typeLabel: '自动搜素饰品', methodLabel: '自动搜素饰品改名', source: 'rename' },
    { automateType: 'auto_search_weapon', taskType: 'search_weapon_pendant', typeLabel: '自动搜素饰品', methodLabel: '自动搜素饰品挂件', source: 'pendant' }
  ]

  // 从搜索配置中提取爬取账号(SteamID)
  const crawlAccountId = (searchConfig) => {
    const v = searchConfig?.config || {}
    return v.crawl_account_id || v.steam_id || v.steamId || ''
  }

  // 解析某账号下某自动化方法对应的配置/数据源：是否可用 + 配置ID + 写入字段
  const resolveCatalogConfig = (entry, steamId) => {
    const sid = String(steamId)
    if (entry.source === 'steam') {
      const c = steamConfigList.value.find(x => String(x.steamID) === sid)
      return { available: !!c, configId: c?.dataID || '', field: 'selectedSteamConfig' }
    }
    if (entry.source === 'youpin') {
      if (entry.automateType === 'auto_update') {
        const c = youpinConfigList.value.find(x => String(x.steamID) === sid)
        return { available: !!c, configId: c?.dataID || '', field: 'selectedSteamConfig' }
      }
      const c = dataSources.value.find(x => x.type === 'youpin' && String(x.steamID) === sid)
      return { available: !!c, configId: c?.dataID || '', field: 'selectedDataSource' }
    }
    if (entry.source === 'buff') {
      if (entry.automateType === 'auto_update') {
        const c = buffConfigList.value.find(x => String(x.steamID) === sid)
        return { available: !!c, configId: c?.dataID || '', field: 'selectedSteamConfig' }
      }
      const c = dataSources.value.find(x => x.type === 'buff' && String(x.steamID) === sid)
      return { available: !!c, configId: c?.dataID || '', field: 'selectedDataSource' }
    }
    if (entry.source === 'rename') {
      const c = renameSearchConfigList.value.find(x => String(crawlAccountId(x)) === sid)
      return { available: !!c, configId: c?.dataID || '', field: 'selectedSearchConfig' }
    }
    if (entry.source === 'pendant') {
      const c = pendantSearchConfigList.value.find(x => String(crawlAccountId(x)) === sid)
      return { available: !!c, configId: c?.dataID || '', field: 'selectedSearchConfig' }
    }
    return { available: false, configId: '', field: '' }
  }

  // 计算某账号下某自动化方法的状态：running / stopped / uncreated / unavailable
  const buildAutomationStatus = (entry, steamId) => {
    const { available, configId, field } = resolveCatalogConfig(entry, steamId)
    const task = runningTasks.value.find(t =>
      t.automateType === entry.automateType &&
      (t.config.selectedTask || '') === entry.taskType &&
      String(resolveAccount(t.automateType, t.config).steamId) === String(steamId)
    ) || null

    let status
    if (task) {
      status = task.status === '已停止' ? 'stopped' : 'running'
    } else {
      status = available ? 'uncreated' : 'unavailable'
    }

    return {
      key: `${entry.automateType}:${entry.taskType}`,
      automateType: entry.automateType,
      taskType: entry.taskType,
      typeLabel: entry.typeLabel,
      methodLabel: entry.methodLabel,
      available,
      configId,
      field,
      task,
      status
    }
  }

  // 卡片：按账号(SteamID)聚合已配置账号，并附带每个账号的全部自动化状态
  const accountCards = computed(() => {
    const map = new Map()
    const addAccount = (steamId, name) => {
      if (!steamId) return
      const key = String(steamId)
      if (!map.has(key)) {
        map.set(key, { steamId: key, name: name || '' })
      } else if (name && !map.get(key).name) {
        map.get(key).name = name
      }
    }

    steamConfigList.value.forEach(c => addAccount(c.steamID, c.dataName))
    dataSources.value.forEach(c => addAccount(c.steamID, c.dataName))
    renameSearchConfigList.value.forEach(c => addAccount(crawlAccountId(c), c.dataName))
    pendantSearchConfigList.value.forEach(c => addAccount(crawlAccountId(c), c.dataName))

    return Array.from(map.values()).map(acc => {
      const automations = AUTOMATION_CATALOG.map(entry => buildAutomationStatus(entry, acc.steamId))
      const running = automations.filter(a => a.status === 'running').length
      const stopped = automations.filter(a => a.status === 'stopped').length
      const uncreated = automations.filter(a => a.status === 'uncreated').length
      return {
        steamId: acc.steamId,
        name: acc.name || acc.steamId,
        automations,
        running,
        stopped,
        uncreated,
        created: running + stopped
      }
    })
  })

  // 在卡片详情中直接创建某项自动化（默认停止状态）
  const createAutomation = async (steamId, entry, interval = 30, syncHistory = true) => {
    const { available, configId, field } = resolveCatalogConfig(entry, steamId)
    if (!available) {
      ElMessage.warning('该账号未配置对应数据源，无法创建')
      return false
    }
    try {
      const config = {
        selectedTask: entry.taskType,
        selectedSteamConfig: field === 'selectedSteamConfig' ? configId : '',
        selectedDataSource: field === 'selectedDataSource' ? configId : '',
        selectedSearchConfig: field === 'selectedSearchConfig' ? configId : '',
        interval: Number(interval) || 30,
        syncHistory
      }
      const response = await axios.post(apiUrls.autoManagerCreateTask(), {
        taskName: entry.methodLabel,
        automateType: entry.automateType,
        config,
        enabled: false
      })
      if (response.data.success) {
        ElMessage.success(`已创建「${entry.methodLabel}」(停止状态)`)
        await loadSavedTasks()
        return true
      }
      ElMessage.error('创建失败: ' + (response.data.message || '未知错误'))
      return false
    } catch (error) {
      console.error('创建自动化失败:', error)
      ElMessage.error('创建失败: ' + error.message)
      return false
    }
  }

  // 独立更新任务（不绑定单个账号，对全部账号执行）
  const STOCK_PRICE_SOURCE_LABELS = {
    database: '从数据库同步(悠悠+BUFF)',
    csqaq: '从CSQAQ获取'
  }
  const stockPriceSourceLabel = (source) => STOCK_PRICE_SOURCE_LABELS[source] || source || '-'

  // 所有独立更新任务（auto_stock_price）
  const independentTasks = computed(() =>
    runningTasks.value.filter(t => t.automateType === 'auto_stock_price')
  )

  // 是否已在数据源页面配置了 CSQAQ 类型（用于校验能否选择 CSQAQ 同步）
  const hasCsqaqSource = computed(() =>
    dataSources.value.some(s => s.type === 'csqaq')
  )

  // 创建独立更新任务（停止状态）
  const createIndependentTask = async ({ taskName, source = 'database', interval = 60 }) => {
    if (source === 'csqaq' && !hasCsqaqSource.value) {
      ElMessage.warning('请先在「数据源」页面配置 CSQAQ 类型后再选择 CSQAQ 同步')
      return false
    }
    try {
      const response = await axios.post(apiUrls.autoManagerCreateTask(), {
        taskName: taskName || '更新库存组件价格',
        automateType: 'auto_stock_price',
        config: { source, interval: Number(interval) || 60 },
        enabled: false
      })
      if (response.data.success) {
        ElMessage.success('已创建独立更新任务(停止状态)')
        await loadSavedTasks()
        return true
      }
      ElMessage.error('创建失败: ' + (response.data.message || '未知错误'))
      return false
    } catch (error) {
      console.error('创建独立更新任务失败:', error)
      ElMessage.error('创建失败: ' + error.message)
      return false
    }
  }

  // 更新独立更新任务
  const updateIndependentTask = async (taskId, { taskName, source = 'database', interval = 60 }) => {
    if (source === 'csqaq' && !hasCsqaqSource.value) {
      ElMessage.warning('请先在「数据源」页面配置 CSQAQ 类型后再选择 CSQAQ 同步')
      return false
    }
    try {
      const response = await axios.put(apiUrls.autoManagerUpdateTask(taskId), {
        taskName: taskName || '更新库存组件价格',
        automateType: 'auto_stock_price',
        config: { source, interval: Number(interval) || 60 }
      })
      if (response.data.success) {
        ElMessage.success('独立更新任务已更新')
        await loadSavedTasks()
        return true
      }
      ElMessage.error('更新失败: ' + (response.data.message || '未知错误'))
      return false
    } catch (error) {
      console.error('更新独立更新任务失败:', error)
      ElMessage.error('更新失败: ' + error.message)
      return false
    }
  }

  // 搜索配置列表
  const renameSearchConfigList = ref([])
  const pendantSearchConfigList = ref([])
  
  // 自动更新数据的任务选项
  const updateTasks = [
    { label: '更新Steam库存', value: 'update_steam_inventory' },
    { label: '获取悠悠有品价格', value: 'fetch_yyyp_price' },
    { label: '获取BUFF价格', value: 'fetch_buff_price' }
  ]
  
  // 自动获取数据的任务选项
  const fetchTasks = [
    { label: 'BUFF数据采集', value: 'collect_buff' },
    { label: '悠悠有品数据采集', value: 'collect_youpin' },
    { label: 'IGXE数据采集', value: 'collect_igxe' }
  ]
  
  // 更新饰品平台映射价格任务
  const platformPriceTasks = [
    { label: '更新悠悠有品饰品价格', value: 'platform_youpin_price' },
    { label: '更新BUFF饰品价格', value: 'platform_buff_price' }
  ]
  
  // 自动搜索饰品任务
  const searchWeaponTasks = [
    { label: '自动搜素饰品改名', value: 'search_weapon_rename' },
    { label: '自动搜素饰品挂件', value: 'search_weapon_pendant' }
  ]
  
  const typeLabelMap = {
    auto_update: '更新steam库存价格',
    auto_fetch: '获取平台交易记录',
    auto_platform_price: '更新饰品平台映射价格',
    auto_search_weapon: '自动搜素饰品',
    auto_refresh_auth: '更新steam认证',
    auto_stock_price: '更新库存组件价格'
  }
  
  const labelToTypeMap = Object.entries(typeLabelMap).reduce((acc, [key, label]) => {
    acc[label] = key
    return acc
  }, {})
  
  const getExecutionTypeLabel = (type) => {
    if (type === 'auto_update') return '自动更新数据'
    if (type === 'auto_platform_price') return '更新饰品平台映射价格'
    if (type === 'auto_search_weapon') return '自动搜素饰品'
    return '自动获取数据'
  }
  
  // 第二个选择框标签
  const secondSelectLabel = computed(() => {
    if (automateForm.value.automateType === 'auto_update') {
      return '更新任务'
    }
    if (automateForm.value.automateType === 'auto_platform_price') {
      return '价格更新任务'
    }
    if (automateForm.value.automateType === 'auto_search_weapon') {
      return '采集任务'
    }
    if (automateForm.value.automateType === 'auto_fetch') {
      return '采集任务'
    }
    return '任务'
  })
  
  // 根据所选任务类型返回对应的Steam配置列表
  const currentSteamConfigList = computed(() => {
    const selectedTask = automateForm.value.selectedTask
    const automateType = automateForm.value.automateType
  
    // 更新Steam认证直接使用Steam配置列表
    if (automateType === 'auto_refresh_auth') {
      return steamConfigList.value
    }
  
    if (selectedTask === 'update_steam_inventory') {
      // 更新Steam库存 - 使用 key1='steam' 的配置
      return steamConfigList.value
    } else if (selectedTask === 'fetch_yyyp_price') {
      // 获取悠悠有品价格 - 使用 key1='youpin' 的配置
      return youpinConfigList.value
    } else if (selectedTask === 'fetch_buff_price') {
      // 获取BUFF价格 - 使用 key1='buff' 的配置
      return buffConfigList.value
    }
  
    return []
  })
  
  const currentSearchConfigList = computed(() => {
    const selectedTask = automateForm.value.selectedTask
    if (selectedTask === 'search_weapon_rename') {
      return renameSearchConfigList.value
    }
    if (selectedTask === 'search_weapon_pendant') {
      return pendantSearchConfigList.value
    }
    return []
  })
  
  const findSearchConfigById = (taskType, configId) => {
    if (!configId) return null
    const sourceList = taskType === 'search_weapon_pendant'
      ? pendantSearchConfigList.value
      : renameSearchConfigList.value
    return sourceList.find(config => String(config.dataID) === String(configId)) || null
  }
  
  const findByDataId = (list, dataId) => {
    if (!dataId || !Array.isArray(list)) return null
    return list.find(item => String(item.dataID) === String(dataId)) || null
  }

  // 解析任务对应的账号(SteamID + 名称)，用于按账号分组与唯一性校验
  const resolveAccount = (automateType, config) => {
    if (!automateType || !config) return { steamId: '', name: '' }
    const taskType = config.selectedTask

    if (automateType === 'auto_update') {
      let configList = []
      if (taskType === 'update_steam_inventory') configList = steamConfigList.value
      else if (taskType === 'fetch_yyyp_price') configList = youpinConfigList.value
      else if (taskType === 'fetch_buff_price') configList = buffConfigList.value
      const found = findByDataId(configList, config.selectedSteamConfig)
      return {
        steamId: found?.steamID || config.selectedSteamId || config.steamId || '',
        name: found?.dataName || ''
      }
    }

    if (automateType === 'auto_refresh_auth') {
      const found = findByDataId(steamConfigList.value, config.selectedSteamConfig)
      return {
        steamId: found?.steamID || config.selectedSteamId || config.steamId || '',
        name: found?.dataName || ''
      }
    }

    if (['auto_fetch', 'auto_platform_price'].includes(automateType)) {
      const found = findByDataId(dataSources.value, config.selectedDataSource)
      return {
        steamId: found?.steamID || config.selectedSteamId || config.steamId || '',
        name: found?.dataName || ''
      }
    }

    if (automateType === 'auto_search_weapon') {
      const searchConfig = findSearchConfigById(config.selectedTask, config.selectedSearchConfig)
      const value = searchConfig?.config || {}
      return {
        steamId: value.crawl_account_id || value.steam_id || value.steamId || '',
        name: searchConfig?.dataName || ''
      }
    }

    return { steamId: '', name: '' }
  }

  // 可用的任务列表
  const availableTasks = computed(() => {
    if (automateForm.value.automateType === 'auto_update') {
      return updateTasks
    }
    if (automateForm.value.automateType === 'auto_platform_price') {
      return platformPriceTasks
    }
    if (automateForm.value.automateType === 'auto_search_weapon') {
      return searchWeaponTasks
    }
    if (automateForm.value.automateType === 'auto_fetch') {
      return fetchTasks
    }
    return []
  })
  
  // 过滤后的数据源 (根据选择的任务类型)
  const filteredDataSources = computed(() => {
    
    if (automateForm.value.selectedTask === 'collect_buff') {
      const filtered = dataSources.value.filter(s => s.type === 'buff' && s.enabled)
      return filtered
    } else if (automateForm.value.selectedTask === 'collect_youpin') {
      const filtered = dataSources.value.filter(s => s.type === 'youpin' && s.enabled)
      return filtered
    } else if (automateForm.value.selectedTask === 'collect_igxe') {
      const filtered = dataSources.value.filter(s => s.type === 'igxe' && s.enabled)
      return filtered
    } else if (automateForm.value.selectedTask === 'platform_buff_price') {
      const filtered = dataSources.value.filter(s => s.type === 'buff' && s.enabled)
      return filtered
    } else if (automateForm.value.selectedTask === 'platform_youpin_price') {
      const filtered = dataSources.value.filter(s => s.type === 'youpin' && s.enabled)
      return filtered
    }
    return []
  })
  
  // 加载 Steam 配置列表（key1='steam'，用于"更新Steam库存"）
  const loadSteamConfigs = async () => {
    try {
      const response = await axios.get(apiUrls.autoManagerSteamAccounts())
      
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        // 保存完整的对象数组（包含 dataID, dataName, steamID, item_count）
        steamConfigList.value = response.data.data
      }
    } catch (error) {
      console.error('加载Steam配置列表失败:', error)
      ElMessage.error('加载Steam账号列表失败: ' + error.message)
    }
  }
  
  // 加载悠悠有品配置列表（key1='youpin'）
  const loadYoupinConfigs = async () => {
    try {
      const response = await axios.get(apiUrls.dataSourceList())

      if (response.data.success && Array.isArray(response.data.data)) {
        // 筛选 key1='youpin' 的配置
        youpinConfigList.value = response.data.data
          .filter(item => item.type === 'youpin')
          .map(item => ({
            dataID: item.dataID,
            dataName: item.dataName,
            steamID: item.steamID
          }))
      }
    } catch (error) {
      console.error('加载悠悠有品配置列表失败:', error)
      ElMessage.error('加载悠悠有品配置列表失败: ' + error.message)
    }
  }
  
  // 加载BUFF配置列表（key1='buff'）
  const loadBuffConfigs = async () => {
    try {
      const response = await axios.get(apiUrls.dataSourceList())

      if (response.data.success && Array.isArray(response.data.data)) {
        // 筛选 key1='buff' 的配置
        buffConfigList.value = response.data.data
          .filter(item => item.type === 'buff')
          .map(item => ({
            dataID: item.dataID,
            dataName: item.dataName,
            steamID: item.steamID
          }))
      }
    } catch (error) {
      console.error('加载BUFF配置列表失败:', error)
      ElMessage.error('加载BUFF配置列表失败: ' + error.message)
    }
  }
  
  const normalizeConfigValue = (value) => {
    if (!value) return {}
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch (error) {
        console.warn('解析配置JSON失败:', error)
        return {}
      }
    }
    return value
  }
  
  const fetchSearchConfigs = async (key1) => {
    try {
      const response = await axios.get(apiUrls.autoManagerSearchConfigs(), {
        params: { key1 }
      })
  
      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data.map(item => ({
          dataID: item.id,
          dataName: item.dataName,
          platformType: item.key2 || '',
          config: normalizeConfigValue(item.value)
        }))
      }
    } catch (error) {
      console.error(`加载${key1}配置列表失败:`, error)
      ElMessage.error(`加载配置失败: ${error.message}`)
    }
    return []
  }
  
  const loadRenameSearchConfigs = async () => {
    renameSearchConfigList.value = await fetchSearchConfigs('spider_rename')
  }
  
  const loadPendantSearchConfigs = async () => {
    pendantSearchConfigList.value = await fetchSearchConfigs('spider_pendant')
  }
  
  // 加载数据源列表
  const loadDataSources = async () => {
    try {
      const response = await axios.get(apiUrls.dataSourceList())
      if (response.data.success && Array.isArray(response.data.data)) {
        dataSources.value = response.data.data
      }
    } catch (error) {
      console.error('加载数据源列表失败:', error)
    }
  }
  
  // 处理类型变化
  const handleTypeChange = () => {
    automateForm.value.selectedTask = ''
    automateForm.value.selectedSteamConfig = ''
    automateForm.value.selectedDataSource = ''
    automateForm.value.selectedSearchConfig = ''
  }
  
  const applyCustomInterval = () => {
    if (!customInterval.value || customInterval.value < 1) {
      ElMessage.warning('请输入大于0的分钟数')
      return
    }
    automateForm.value.interval = Number(customInterval.value)
    ElMessage.success('已应用自定义执行间隔')
  }
  
  watch(
    () => automateForm.value.interval,
    (val) => {
      if (typeof val === 'number' && val > 0) {
        customInterval.value = val
      }
    }
  )
  
  
  // 执行任务
  const handleExecute = async () => {
    // 验证表单
    if (!automateForm.value.taskName || !automateForm.value.taskName.trim()) {
      ElMessage.warning('请输入任务名称')
      return
    }
    
    if (!automateForm.value.automateType) {
      ElMessage.warning('请选择自动化类型')
      return
    }
    
    // 更新Steam认证不需要选择任务
    if (automateForm.value.automateType !== 'auto_refresh_auth' && !automateForm.value.selectedTask) {
      ElMessage.warning('请选择任务')
      return
    }
  
    if (automateForm.value.automateType === 'auto_update') {
      if (!automateForm.value.selectedSteamConfig) {
        ElMessage.warning('请选择Steam账号')
        return
      }
    } else if (automateForm.value.automateType === 'auto_refresh_auth') {
      if (!automateForm.value.selectedSteamConfig) {
        ElMessage.warning('请选择Steam账号')
        return
      }
    } else if (['auto_fetch', 'auto_platform_price'].includes(automateForm.value.automateType)) {
      if (!automateForm.value.selectedDataSource) {
        ElMessage.warning('请选择数据源')
        return
      }
    } else if (automateForm.value.automateType === 'auto_search_weapon') {
      if (!automateForm.value.selectedSearchConfig) {
        ElMessage.warning('请选择搜索配置')
        return
      }
    } else {
      ElMessage.warning('请选择有效的自动化类型')
      return
    }
  
    // 如果是编辑模式,执行更新;否则创建新任务
    if (isEditing.value) {
      updateTask()
    } else {
      startScheduledTask()
    }
  }
  
  // 执行具体任务
  const executeTask = async () => {
    executing.value = true
    const startTime = new Date().toLocaleString()
    const automateType = automateForm.value.automateType
    const executionType = getExecutionTypeLabel(automateType)
    
    try {
      let result
      const taskType = automateForm.value.selectedTask
      
      if (automateType === 'auto_update') {
        const selectedConfigId = automateForm.value.selectedSteamConfig
        const config = currentSteamConfigList.value.find(c => c.dataID === selectedConfigId)
        const steamId = config?.steamID
  
        if (!steamId) {
          throw new Error('未找到对应的 Steam ID，请重新选择账号后重试')
        }
  
        if (taskType === 'update_steam_inventory') {
          result = await updateSteamInventory(steamId)
        } else if (taskType === 'fetch_yyyp_price') {
          result = await fetchYYYPPrice(steamId)
        } else if (taskType === 'fetch_buff_price') {
          result = await fetchBuffPrice(steamId)
        }
      } else if (automateType === 'auto_refresh_auth') {
        const selectedConfigId = automateForm.value.selectedSteamConfig
        const config = steamConfigList.value.find(c => c.dataID === selectedConfigId)
        const steamId = config?.steamID
  
        if (!steamId) {
          throw new Error('未找到对应的 Steam ID，请重新选择账号后重试')
        }
  
        result = await refreshSteamAuth(steamId)
      } else if (automateType === 'auto_platform_price') {
        const selectedSource = dataSources.value.find(s => s.dataID === automateForm.value.selectedDataSource)

        if (!selectedSource || !selectedSource.steamID) {
          throw new Error('未找到有效的数据源或缺少 Steam ID')
        }

        if (taskType === 'platform_youpin_price') {
          result = await syncYoupinPriceMapping(selectedSource.steamID, automateForm.value.syncHistory)
        } else if (taskType === 'platform_buff_price') {
          result = await syncBuffPriceMapping(selectedSource.steamID)
        }
      } else if (automateType === 'auto_fetch') {
        const selectedSource = dataSources.value.find(s => s.dataID === automateForm.value.selectedDataSource)
        
        if (!selectedSource) {
          throw new Error('未找到有效的数据源')
        }
        
        if (taskType === 'collect_buff') {
          result = await collectBuffData(selectedSource)
        } else if (taskType === 'collect_youpin') {
          result = await collectYoupinData(selectedSource)
        } else if (taskType === 'collect_igxe') {
          result = await collectIgxeData(selectedSource)
        }
      } else if (automateType === 'auto_search_weapon') {
        const selectedConfig = currentSearchConfigList.value.find(
          config => config.dataID === automateForm.value.selectedSearchConfig
        )
  
        if (!selectedConfig) {
          throw new Error('未找到对应的搜索配置，请重新选择')
        }
  
        if (taskType === 'search_weapon_rename') {
          result = await executeSearchRenameTask(selectedConfig)
        } else if (taskType === 'search_weapon_pendant') {
          result = await executeSearchPendantTask(selectedConfig)
        }
      }
      
      if (!result) {
        throw new Error('未能执行所选任务，请检查配置后重试')
      }
      
      addExecutionHistory({
        time: startTime,
        type: executionType,
        taskName: availableTasks.value.find(t => t.value === taskType)?.label || taskType,
        targetInfo: getTargetInfo(),
        result: result.success ? '成功' : '失败',
        message: result.message
      })
      
    } catch (error) {
      console.error('执行任务失败:', error)
      addExecutionHistory({
        time: startTime,
        type: executionType,
        taskName: availableTasks.value.find(t => t.value === automateForm.value.selectedTask)?.label || automateForm.value.selectedTask,
        targetInfo: getTargetInfo(),
        result: '失败',
        message: error.message
      })
    } finally {
      executing.value = false
    }
  }
  
  // 更新Steam库存
  const updateSteamInventory = async (steamId) => {
    try {
      const response = await axios.post(
        apiUrls.steamGetInventory(),
        { steamId }
      )
      
      if (response.data.success) {
        ElMessage.success(response.data.message || 'Steam库存更新成功')
        return { success: true, message: response.data.message || '库存更新成功' }
      } else {
        ElMessage.error(response.data.message || 'Steam库存更新失败')
        return { success: false, message: response.data.message || '库存更新失败' }
      }
    } catch (error) {
      ElMessage.error('更新失败: ' + error.message)
      throw error
    }
  }
  
  // 获取悠悠有品价格（V2 API）
  const fetchYYYPPrice = async (steamId) => {
    try {
      const response = await axios.post(
        `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/settings/dev_tools/syncWeaponPrice`,
        { steamId }
      )
      
      if (response.data.success) {
        ElMessage.success(response.data.message || '悠悠有品价格获取成功')
        return { success: true, message: response.data.message || '价格获取成功' }
      } else {
        ElMessage.error(response.data.message || '悠悠有品价格获取失败')
        return { success: false, message: response.data.message || '价格获取失败' }
      }
    } catch (error) {
      ElMessage.error('获取失败: ' + error.message)
      throw error
    }
  }
  
  // 获取BUFF价格
  const fetchBuffPrice = async (steamId) => {
    try {
      const response = await axios.post(
        apiUrls.buffGetPrice(),
        { steamId }
      )
  
      if (response.data.success) {
        ElMessage.success(response.data.message || 'BUFF价格获取成功')
        return { success: true, message: response.data.message || '价格获取成功' }
      } else {
        ElMessage.error(response.data.message || 'BUFF价格获取失败')
        return { success: false, message: response.data.message || '价格获取失败' }
      }
    } catch (error) {
      ElMessage.error('获取失败: ' + error.message)
      throw error
    }
  }
  
  // 更新Steam认证
  const refreshSteamAuth = async (steamId) => {
    try {
      const response = await axios.post(
        apiUrls.steamLoginRefreshAuto(),
        { steam_id: steamId }
      )
  
      if (response.data.success) {
        ElMessage.success(response.data.message || 'Steam认证更新成功')
        return { success: true, message: response.data.message || 'Steam认证更新成功' }
      } else {
        ElMessage.error(response.data.message || 'Steam认证更新失败')
        return { success: false, message: response.data.message || 'Steam认证更新失败' }
      }
    } catch (error) {
      ElMessage.error('更新失败: ' + error.message)
      throw error
    }
  }
  
  // 采集BUFF数据
  const collectBuffData = async (dataSource) => {
    try {
      const response = await axios.post(
        apiUrls.buffSyncNewData(),
        { steamID: dataSource.steamID || '' }
      )
      
      if (response.status === 200) {
        ElMessage.success(`${dataSource.dataName} BUFF数据采集完成`)
        return { success: true, message: 'BUFF数据采集完成' }
      } else {
        ElMessage.error('BUFF数据采集失败')
        return { success: false, message: 'BUFF数据采集失败' }
      }
    } catch (error) {
      ElMessage.error('采集失败: ' + error.message)
      throw error
    }
  }
  
  // 采集IGXE数据
  const collectIgxeData = async (dataSource) => {
    try {
      const response = await axios.post(
        apiUrls.igxeSyncNewData(),
        { steamID: dataSource.steamID || '' }
      )

      if (response.status === 200) {
        ElMessage.success(`${dataSource.dataName} IGXE数据采集完成`)
        return { success: true, message: 'IGXE数据采集完成' }
      } else {
        ElMessage.error('IGXE数据采集失败')
        return { success: false, message: 'IGXE数据采集失败' }
      }
    } catch (error) {
      ElMessage.error('采集失败: ' + error.message)
      throw error
    }
  }

  // 采集悠悠有品数据
  const collectYoupinData = async (dataSource) => {
    try {
      const spiderData = {
        phone: dataSource.config?.yyyp_phone || '',
        sessionid: dataSource.config?.yyyp_Sessionid || '',
        token: dataSource.config?.yyyp_token || '',
        app_version: dataSource.config?.yyyp_app_version || '',
        app_type: dataSource.config?.yyyp_app_type || '',
        userId: dataSource.config?.yyyp_userId || '',
        steamId: dataSource.config?.yyyp_steamId || ''
      }
      
      const response = await axios.post(
        `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.ENDPOINTS.YOUPIN_SYNC_NEW_DATA}`,
        spiderData
      )
      
      if (response.status === 200) {
        ElMessage.success(`${dataSource.dataName} 悠悠有品数据采集完成`)
        return { success: true, message: '悠悠有品数据采集完成' }
      } else {
        ElMessage.error('悠悠有品数据采集失败')
        return { success: false, message: '悠悠有品数据采集失败' }
      }
    } catch (error) {
      ElMessage.error('采集失败: ' + error.message)
      throw error
    }
  }
  
  // 更新悠悠有品饰品价格
  const syncYoupinPriceMapping = async (steamId, syncHistory = true) => {
    try {
      const response = await axios.post(
        apiUrls.youpinSyncWeaponTemplates(),
        { steamId, syncHistory }
      )

      if (response.data.success) {
        ElMessage.success(response.data.message || '悠悠有品饰品价格更新成功')
        return { success: true, message: response.data.message || '更新成功' }
      } else {
        ElMessage.error(response.data.message || '悠悠有品饰品价格更新失败')
        return { success: false, message: response.data.message || '更新失败' }
      }
    } catch (error) {
      ElMessage.error('更新失败: ' + error.message)
      throw error
    }
  }
  
  // 更新BUFF饰品价格
  const syncBuffPriceMapping = async (steamId) => {
    try {
      const response = await axios.post(
        apiUrls.buffSyncTemplates(),
        { steamId }
      )
      
      if (response.data.success) {
        ElMessage.success(response.data.message || 'BUFF饰品价格更新成功')
        return { success: true, message: response.data.message || '更新成功' }
      } else {
        ElMessage.error(response.data.message || 'BUFF饰品价格更新失败')
        return { success: false, message: response.data.message || '更新失败' }
      }
    } catch (error) {
      ElMessage.error('更新失败: ' + error.message)
      throw error
    }
  }
  
  const runSearchTask = async (configOption, endpointUrl, successFallback) => {
    if (!configOption) {
      throw new Error('请选择有效的搜索配置')
    }
  
    const configValue = JSON.parse(JSON.stringify(configOption.config || {}))
    const steamId = configValue.crawl_account_id || configValue.steam_id || configValue.steamId
  
    if (!steamId) {
      throw new Error('配置中缺少爬取账号，请检查配置内容')
    }
  
    if (!configValue.weapon_id || configValue.weapon_id.length === 0) {
      throw new Error('配置中未包含监控的饰品ID')
    }
  
    const requestBody = {
      steamId,
      spider_config: configValue
    }
  
    const response = await axios.post(endpointUrl, requestBody)
  
    if (response.data.success) {
      ElMessage.success(response.data.message || successFallback)
      return { success: true, message: response.data.message || successFallback }
    } else {
      ElMessage.error(response.data.message || '搜索任务启动失败')
      return { success: false, message: response.data.message || '搜索任务启动失败' }
    }
  }
  
  const executeSearchRenameTask = async (configOption) => {
    return runSearchTask(
      configOption,
      `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.YOUPIN_AUTO_BUY_RENAMED_WEAPON}`,
      '改名饰品搜索任务已启动'
    )
  }

  const executeSearchPendantTask = async (configOption) => {
    return runSearchTask(
      configOption,
      `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.YOUPIN_AUTO_BUY_PENDANT_WEAPON}`,
      '挂件饰品搜索任务已启动'
    )
  }
  
  // 启动定时任务
  const startScheduledTask = async () => {
    // 校验：同一账号(SteamID)下，同一自动化类型只能有一个
    const newAccount = resolveAccount(automateForm.value.automateType, automateForm.value)
    const isDuplicate = runningTasks.value.some(task => {
      if (task.config.selectedTask !== automateForm.value.selectedTask) {
        return false
      }
      const existingSteamId = resolveAccount(task.automateType, task.config).steamId
      return existingSteamId && newAccount.steamId && existingSteamId === newAccount.steamId
    })

    if (isDuplicate) {
      ElMessage.warning('该账号已存在相同类型的自动化任务，每个账号每种自动化类型只能创建一个')
      return
    }
    
    // 先保存任务配置到数据库
    try {
      const config = {
        selectedTask: automateForm.value.selectedTask,
        selectedSteamConfig: automateForm.value.selectedSteamConfig, // Steam配置的dataID
        selectedDataSource: automateForm.value.selectedDataSource, // 单个数据源
        selectedSearchConfig: automateForm.value.selectedSearchConfig,
        interval: automateForm.value.interval,
        syncHistory: automateForm.value.syncHistory // 是否同步历史数据
      }
      
      const response = await axios.post(
        apiUrls.autoManagerCreateTask(),
        {
          taskName: automateForm.value.taskName, // 使用用户输入的任务名称
          automateType: automateForm.value.automateType,
          config: config,
          enabled: false // 创建时默认停止状态
        }
      )
      
      if (!response.data.success) {
        ElMessage.error('保存任务配置失败: ' + response.data.message)
        return
      }
      
      const taskId = response.data.taskId
      
      const taskInfo = {
        id: taskId,
        type: typeLabelMap[automateForm.value.automateType] || '-',
        taskName: automateForm.value.taskName, // 使用用户输入的任务名称
        targetInfo: getTargetInfo(),
        interval: automateForm.value.interval,
        status: '已停止',
        lastRun: '-',
        nextRun: '-',
        config: config // 保存配置以便后续启动
      }
      
      ElMessage.success('定时任务已保存(停止状态)')
      
      // 清空表单
      handleReset()
      
      // 重新加载任务列表,获取完整的任务信息(包括真实ID)
      await loadSavedTasks()
    } catch (error) {
      console.error('保存定时任务失败:', error)
      ElMessage.error('保存任务失败: ' + error.message)
    }
  }
  
  // 启动单个任务
  // 启动任务 (后端执行)
  const startTask = async (task, options = {}) => {
    const { silent = false } = options
    try {
      // 验证任务ID
      if (!task.id || task.id === 0) {
        if (!silent) {
          ElMessage.warning('任务正在初始化,请稍后再试')
        }
        return false
      }
      
      // 调用后端API切换状态为启用
      const response = await axios.post(apiUrls.autoManagerToggleTask(task.id))
      
      if (response.data.success) {
        // 更新前端显示
        task.status = '运行中'
        
        // 使用后端返回的执行时间
        if (response.data.nextRun) {
          task.nextRun = response.data.nextRun
        } else {
          task.nextRun = '即将执行'
        }
        
        if (response.data.lastRun) {
          task.lastRun = response.data.lastRun
        }
        
        if (!silent) {
          ElMessage.success('任务已启用,后台将立即执行一次')
        }
        return true
      } else {
        if (!silent) {
          ElMessage.error('启动任务失败: ' + response.data.message)
        }
        return false
      }
    } catch (error) {
      console.error('启动任务失败:', error)
      
      if (error.response && error.response.status === 404) {
        if (!silent) {
          ElMessage.error('任务不存在,请刷新页面')
        }
      } else {
        if (!silent) {
          ElMessage.error('启动任务失败: ' + (error.response?.data?.message || error.message))
        }
      }
      return false
    }
  }
  
  // 停止任务 (后端执行)
  const stopTask = async (taskId, options = {}) => {
    const { silent = false } = options
    try {
      // 调用后端API停止任务
      const response = await axios.post(apiUrls.autoManagerToggleTask(taskId))
      
      if (response.data.success) {
        // 更新前端显示
        const task = runningTasks.value.find(t => t.id === taskId)
        if (task) {
          task.status = '已停止'
          task.nextRun = '-'
        }
        
        if (!silent) {
          ElMessage.success('任务已停止')
        }
        return true
      } else {
        if (!silent) {
          ElMessage.error('停止任务失败: ' + response.data.message)
        }
        return false
      }
    } catch (error) {
      console.error('停止任务失败:', error)
      if (!silent) {
        ElMessage.error('停止任务失败: ' + error.message)
      }
      return false
    }
  }
  
  const startAllTasks = async () => {
    const stoppedTasks = runningTasks.value.filter(task => task.status === '已停止')
    
    if (stoppedTasks.length === 0) {
      ElMessage.info('暂无需要启动的任务')
      return
    }
    
    bulkStarting.value = true
    let successCount = 0
    
    try {
      for (const task of stoppedTasks) {
        const success = await startTask(task, { silent: true })
        if (success) {
          successCount++
        }
      }
      
      await loadSavedTasks()
      ElMessage.success(`已启动 ${successCount}/${stoppedTasks.length} 个任务`)
    } catch (error) {
      console.error('批量启动任务失败:', error)
      ElMessage.error('批量启动任务失败: ' + error.message)
    } finally {
      bulkStarting.value = false
    }
  }
  
  const stopAllTasks = async () => {
    // 包含"运行中"和"执行中"（已启用但正在执行）的任务
    const running = runningTasks.value.filter(task => task.status !== '已停止')
    
    if (running.length === 0) {
      ElMessage.info('暂无运行中的任务')
      return
    }
    
    bulkStopping.value = true
    let successCount = 0
    
    try {
      for (const task of running) {
        const success = await stopTask(task.id, { silent: true })
        if (success) {
          successCount++
        }
      }
      
      await loadSavedTasks()
      ElMessage.success(`已停止 ${successCount}/${running.length} 个任务`)
    } catch (error) {
      console.error('批量停止任务失败:', error)
      ElMessage.error('批量停止任务失败: ' + error.message)
    } finally {
      bulkStopping.value = false
    }
  }
  
  // 编辑任务
  const editTask = (task) => {
    // 填充表单
    automateForm.value = {
      taskName: task.taskName,
      automateType: labelToTypeMap[task.type] || 'auto_fetch',
      selectedTask: task.config.selectedTask,
      selectedSteamConfig: task.config.selectedSteamConfig || '',
      selectedDataSource: task.config.selectedDataSource || '',
      selectedSearchConfig: task.config.selectedSearchConfig || '',
      interval: task.interval,
      syncHistory: task.config.syncHistory !== undefined ? task.config.syncHistory : true
    }
    
    // 设置编辑状态
    isEditing.value = true
    editingTaskId.value = task.id
    
    // 滚动到表单顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    ElMessage.info('已加载任务配置,修改后点击"更新任务"保存')
  }
  
  // 更新任务配置
  const updateTask = async () => {
    executing.value = true
    
    // 校验：同一账号(SteamID)下，同一自动化类型只能有一个（排除当前正在编辑的任务）
    const newAccount = resolveAccount(automateForm.value.automateType, automateForm.value)
    const isDuplicate = runningTasks.value.some(task => {
      if (task.id === editingTaskId.value) {
        return false
      }
      if (task.config.selectedTask !== automateForm.value.selectedTask) {
        return false
      }
      const existingSteamId = resolveAccount(task.automateType, task.config).steamId
      return existingSteamId && newAccount.steamId && existingSteamId === newAccount.steamId
    })

    if (isDuplicate) {
      ElMessage.warning('该账号已存在相同类型的自动化任务，每个账号每种自动化类型只能创建一个')
      executing.value = false
      return
    }
    
    try {
      const taskConfig = {
        taskName: automateForm.value.taskName,
        automateType: automateForm.value.automateType,
        config: {
          selectedTask: automateForm.value.selectedTask,
          selectedSteamConfig: automateForm.value.selectedSteamConfig,
          selectedDataSource: automateForm.value.selectedDataSource,
          selectedSearchConfig: automateForm.value.selectedSearchConfig,
          interval: automateForm.value.interval,
          syncHistory: automateForm.value.syncHistory
        }
      }
      
      const response = await axios.put(
        apiUrls.autoManagerUpdateTask(editingTaskId.value),
        taskConfig
      )
      
      if (response.data.success) {
        // 更新任务列表中的任务信息
        const taskIndex = runningTasks.value.findIndex(t => t.id === editingTaskId.value)
        if (taskIndex !== -1) {
          const task = runningTasks.value[taskIndex]
          
          task.taskName = automateForm.value.taskName
          task.type = typeLabelMap[automateForm.value.automateType] || task.type
          task.targetInfo = getTaskTargetInfo({
            automateType: automateForm.value.automateType,
            config: taskConfig.config
          })
          task.interval = automateForm.value.interval
          task.config = taskConfig.config
          
          // 后端会自动重新加载任务(如果正在运行会重启)
          if (task.status === '运行中') {
            task.nextRun = calculateNextRun(automateForm.value.interval)
          }
        }
        
        ElMessage.success('任务配置已更新,后端已自动重新加载')
        handleReset()
      } else {
        ElMessage.error('更新任务失败: ' + (response.data.message || '未知错误'))
      }
    } catch (error) {
      console.error('更新任务失败:', error)
      ElMessage.error('更新任务失败: ' + error.message)
    } finally {
      executing.value = false
    }
  }

  // 仅更新任务执行间隔（下拉修改后立即生效，无需保存按钮）
  const updateTaskInterval = async (task, interval) => {
    const newInterval = Number(interval)
    if (!newInterval || newInterval < 1) return false
    const newConfig = { ...task.config, interval: newInterval }
    try {
      const response = await axios.put(
        apiUrls.autoManagerUpdateTask(task.id),
        {
          taskName: task.taskName,
          automateType: task.automateType,
          config: newConfig
        }
      )
      if (response.data.success) {
        task.interval = newInterval
        task.config = newConfig
        if (task.status === '运行中') {
          task.nextRun = calculateNextRun(newInterval)
        }
        ElMessage.success('执行间隔已更新')
        return true
      }
      ElMessage.error('更新失败: ' + (response.data.message || '未知错误'))
      return false
    } catch (error) {
      console.error('更新执行间隔失败:', error)
      ElMessage.error('更新失败: ' + error.message)
      return false
    }
  }

  // 删除任务
  const deleteTask = async (taskId) => {
    // 二次确认
    ElMessageBox.confirm(
      '确定要删除这个定时任务吗？删除后将无法恢复。',
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        buttonSize: 'default'
      }
    ).then(async () => {
      try {
        // 调用后端API删除任务 (后端会自动停止定时器)
        const response = await axios.delete(apiUrls.autoManagerDeleteTask(taskId))
        
        // 从列表中移除
        runningTasks.value = runningTasks.value.filter(t => t.id !== taskId)
        
        ElMessage.success('任务已删除')
      } catch (error) {
        console.error('删除任务失败:', error)
        
        // 如果是404错误,说明任务已经不存在了
        if (error.response && error.response.status === 404) {
          // 仍然从前端列表中移除
          runningTasks.value = runningTasks.value.filter(t => t.id !== taskId)
          ElMessage.warning('任务已不存在,已从列表中移除')
        } else {
          ElMessage.error('删除任务失败: ' + (error.response?.data?.message || error.message))
        }
      }
    }).catch(() => {
      // 用户取消删除
      ElMessage.info('已取消删除')
    })
  }
  
  // 移除：停止所有任务功能已从UI中删除
  
  // 计算下次执行时间
  const calculateNextRun = (intervalMinutes) => {
    const nextTime = new Date()
    nextTime.setMinutes(nextTime.getMinutes() + intervalMinutes)
    return nextTime.toLocaleString()
  }
  
  // 获取目标信息
  const getTargetInfo = () => {
    if (automateForm.value.automateType === 'auto_update') {
      // 根据选择的任务类型从对应的配置列表查找
      const selectedTask = automateForm.value.selectedTask
      let configList = []
  
      if (selectedTask === 'update_steam_inventory') {
        configList = steamConfigList.value
      } else if (selectedTask === 'fetch_yyyp_price') {
        configList = youpinConfigList.value
      } else if (selectedTask === 'fetch_buff_price') {
        configList = buffConfigList.value
      }
  
      const config = findByDataId(configList, automateForm.value.selectedSteamConfig)
      return config ? `${config.dataName} (${config.steamID || '无SteamID'})` : '-'
    } else if (automateForm.value.automateType === 'auto_refresh_auth') {
      const config = findByDataId(steamConfigList.value, automateForm.value.selectedSteamConfig)
      return config ? `${config.dataName} (${config.steamID || '无SteamID'})` : '-'
    } else if (['auto_fetch', 'auto_platform_price'].includes(automateForm.value.automateType)) {
      const source = findByDataId(dataSources.value, automateForm.value.selectedDataSource)
      return source ? `${source.dataName} (${source.steamID || '无SteamID'})` : '-'
    } else if (automateForm.value.automateType === 'auto_search_weapon') {
      const config = findSearchConfigById(automateForm.value.selectedTask, automateForm.value.selectedSearchConfig)
      if (!config) return '-'
      return config.platformType
        ? `${config.dataName} (${config.platformType})`
        : config.dataName
    }
    return '-'
  }
  
  const formatInterval = (interval) => {
    if (!interval && interval !== 0) return '-'
    if (interval < 60) {
      return `${interval} 分钟`
    }
    const hours = Math.floor(interval / 60)
    const minutes = interval % 60
    if (minutes === 0) {
      return `${hours} 小时`
    }
    return `${hours} 小时 ${minutes} 分钟`
  }
  
  
  // 重置表单
  const handleReset = () => {
    automateForm.value = {
      taskName: '',
      automateType: '',
      selectedTask: '',
      selectedSteamConfig: '',
      selectedDataSource: '',
      selectedSearchConfig: '',
      interval: 30,
      syncHistory: true
    }

    // 清除编辑状态
    isEditing.value = false
    editingTaskId.value = null
  }
  
  // 加载正在执行的任务
  const loadExecutingTasks = async () => {
    try {
      const response = await axios.get(apiUrls.autoManagerExecutingTasks())

      if (response.data.success && Array.isArray(response.data.data)) {
        return response.data.data
      }
      return []
    } catch (error) {
      console.error('加载正在执行的任务失败:', error)
      return []
    }
  }

  // 加载已保存的任务 (任务在后端运行)
  const loadSavedTasks = async () => {
    try {
      // 同时加载任务列表和正在执行的任务
      const [tasksResponse, executingTasks] = await Promise.all([
        axios.get(apiUrls.autoManagerTaskList()),
        loadExecutingTasks()
      ])

      if (tasksResponse.data.success && Array.isArray(tasksResponse.data.data)) {
        let enabledCount = 0

        // 清空现有任务列表
        runningTasks.value = []

        // 创建正在执行的任务ID集合，方便快速查找
        const executingTaskIds = new Set(executingTasks.map(t => t.taskId))

        // 加载所有任务 (包括已停止的)
        for (const savedTask of tasksResponse.data.data) {
          // 判断任务是否正在执行
          const isExecuting = executingTaskIds.has(savedTask.taskId)
          const executingInfo = executingTasks.find(t => t.taskId === savedTask.taskId)

          const taskInfo = {
            id: savedTask.taskId,
            automateType: savedTask.automateType,
            type: typeLabelMap[savedTask.automateType] || savedTask.automateType,
            taskName: savedTask.taskName,
            targetInfo: getTaskTargetInfo(savedTask),
            interval: savedTask.config.interval,
            status: isExecuting ? '执行中' : (savedTask.enabled ? '运行中' : '已停止'),
            lastRun: savedTask.lastRun || '-',
            nextRun: savedTask.nextRun || (savedTask.enabled ? calculateNextRun(savedTask.config.interval) : '-'),
            config: savedTask.config, // 保存配置供后续使用
            isExecuting: isExecuting,
            executingDuration: executingInfo ? Math.floor(executingInfo.duration) : 0
          }

          runningTasks.value.push(taskInfo)

          if (savedTask.enabled) {
            enabledCount++
          }
        }

        // 只在首次加载时显示成功消息
        if (runningTasks.value.length > 0 && !isEditing.value) {
          const executingCount = executingTaskIds.size
        }
      }
    } catch (error) {
      console.error('加载已保存任务失败:', error)
    }
  }
  
  // 使用配置执行任务 (支持从数据库加载的任务和手动启动的任务)
  const executeTaskWithConfig = async (taskOrSavedTask) => {
    const startTime = new Date().toLocaleString()
    const savedTask = taskOrSavedTask
    const config = savedTask.config || taskOrSavedTask.config || taskOrSavedTask
    const taskType = config.selectedTask
    const automateType = savedTask.automateType || config.automateType
    const executionType = getExecutionTypeLabel(automateType)
    
    try {
      let result
      
      if (automateType === 'auto_update') {
        const selectedConfigId = config.selectedSteamConfig
        let steamId = config.selectedSteamId
  
        if (!steamId && selectedConfigId) {
          let configList = []
          if (taskType === 'update_steam_inventory') {
            configList = steamConfigList.value
          } else if (taskType === 'fetch_yyyp_price') {
            configList = youpinConfigList.value
          } else if (taskType === 'fetch_buff_price') {
            configList = buffConfigList.value
          }
          const foundConfig = configList.find(item => item.dataID === selectedConfigId)
          steamId = foundConfig?.steamID
        }
  
        if (!steamId) {
          throw new Error('未找到对应的 Steam ID')
        }
  
        if (taskType === 'update_steam_inventory') {
          result = await updateSteamInventory(steamId)
        } else if (taskType === 'fetch_yyyp_price') {
          result = await fetchYYYPPrice(steamId)
        } else if (taskType === 'fetch_buff_price') {
          result = await fetchBuffPrice(steamId)
        }
      } else if (automateType === 'auto_refresh_auth') {
        const selectedConfigId = config.selectedSteamConfig
        let steamId = config.selectedSteamId
  
        if (!steamId && selectedConfigId) {
          const foundConfig = steamConfigList.value.find(item => item.dataID === selectedConfigId)
          steamId = foundConfig?.steamID
        }
  
        if (!steamId) {
          throw new Error('未找到对应的 Steam ID')
        }
  
        result = await refreshSteamAuth(steamId)
      } else if (automateType === 'auto_platform_price') {
        const dataSourceId = config.selectedDataSource
        const dataSource = dataSources.value.find(s => s.dataID === dataSourceId)

        if (!dataSource || !dataSource.steamID) {
          throw new Error('未找到有效的数据源或缺少 Steam ID')
        }

        if (taskType === 'platform_youpin_price') {
          const syncHistory = config.syncHistory !== undefined ? config.syncHistory : true
          result = await syncYoupinPriceMapping(dataSource.steamID, syncHistory)
        } else if (taskType === 'platform_buff_price') {
          result = await syncBuffPriceMapping(dataSource.steamID)
        }
      } else if (automateType === 'auto_fetch') {
        const dataSourceIds = config.selectedDataSources?.length ? config.selectedDataSources : [config.selectedDataSource].filter(Boolean)
        const results = []
        
        for (const dataSourceId of dataSourceIds) {
          const dataSource = dataSources.value.find(s => s.dataID === dataSourceId)
          
          if (dataSource) {
            let singleResult
            if (taskType === 'collect_buff') {
              singleResult = await collectBuffData(dataSource)
            } else if (taskType === 'collect_youpin') {
              singleResult = await collectYoupinData(dataSource)
            } else if (taskType === 'collect_igxe') {
              singleResult = await collectIgxeData(dataSource)
            }
            if (singleResult) {
              results.push({ source: dataSource.dataName, ...singleResult })
            }
          }
        }
        
        if (results.length > 0) {
          const successCount = results.filter(r => r.success).length
          const totalCount = results.length
          result = {
            success: successCount > 0,
            message: `完成 ${successCount}/${totalCount} 个数据源采集`
          }
        }
      } else if (automateType === 'auto_search_weapon') {
        const selectedConfig = findSearchConfigById(config.selectedTask, config.selectedSearchConfig)
        if (!selectedConfig) {
          throw new Error('未找到对应的搜索配置，请在设置页刷新后重试')
        }
  
        if (taskType === 'search_weapon_rename') {
          result = await executeSearchRenameTask(selectedConfig)
        } else if (taskType === 'search_weapon_pendant') {
          result = await executeSearchPendantTask(selectedConfig)
        }
      }
      
      if (result) {
        addExecutionHistory({
          time: startTime,
          type: executionType,
          taskName: savedTask.taskName,
          targetInfo: getTaskTargetInfo(savedTask),
          result: result.success ? '成功' : '失败',
          message: result.message
        })
      }
    } catch (error) {
      console.error('执行定时任务失败:', error)
      addExecutionHistory({
        time: startTime,
        type: executionType,
        taskName: savedTask.taskName,
        targetInfo: getTaskTargetInfo(savedTask),
        result: '失败',
        message: error.message
      })
    }
  }
  
  // 获取任务目标信息 (详细显示)
  const getTaskTargetInfo = (savedTask) => {
    if (savedTask.automateType === 'auto_update') {
      // 更新类型:显示Steam配置名称和ID
      const selectedId = savedTask.config.selectedSteamConfig
      const selectedTask = savedTask.config.selectedTask
  
      if (!selectedId) {
        return '-'
      }
  
      // 根据任务类型从对应的配置列表查找
      let configList = []
      if (selectedTask === 'update_steam_inventory') {
        configList = steamConfigList.value
      } else if (selectedTask === 'fetch_yyyp_price') {
        configList = youpinConfigList.value
      } else if (selectedTask === 'fetch_buff_price') {
        configList = buffConfigList.value
      }
  
      const config = findByDataId(configList, selectedId)
      if (!config) {
        const steamId = savedTask.config.selectedSteamId || savedTask.config.steamId
        return steamId ? `Steam账号 (${steamId})` : '-'
      }
  
      // 显示格式: 配置名称 (SteamID)
      return config.steamID ? `${config.dataName} (${config.steamID})` : config.dataName
    } else if (savedTask.automateType === 'auto_refresh_auth') {
      // 更新Steam认证类型
      const selectedId = savedTask.config.selectedSteamConfig
  
      if (!selectedId) {
        return '-'
      }
  
      const config = findByDataId(steamConfigList.value, selectedId)
      if (!config) {
        const steamId = savedTask.config.selectedSteamId || savedTask.config.steamId
        return steamId ? `Steam账号 (${steamId})` : '-'
      }
  
      return config.steamID ? `${config.dataName} (${config.steamID})` : config.dataName
    } else if (['auto_fetch', 'auto_platform_price'].includes(savedTask.automateType)) {
      // 获取数据类型:只显示数据源名称和SteamID
      const selectedIds = savedTask.config.selectedDataSources?.length
        ? savedTask.config.selectedDataSources
        : [savedTask.config.selectedDataSource].filter(Boolean)
      
      if (selectedIds.length === 0) {
        return '-'
      }
      
      // 查找数据源（兼容历史多选字段）
      const sourceNames = selectedIds
        .map(id => findByDataId(dataSources.value, id))
        .filter(Boolean)
        .map(source => source.steamID ? `${source.dataName} (${source.steamID})` : source.dataName)
      
      if (sourceNames.length > 0) {
        return sourceNames.join(', ')
      }
  
      const steamId = savedTask.config.selectedSteamId || savedTask.config.steamId
      return steamId ? `数据源账号 (${steamId})` : '-'
    } else if (savedTask.automateType === 'auto_search_weapon') {
      const config = findSearchConfigById(savedTask.config.selectedTask, savedTask.config.selectedSearchConfig)
      if (!config) {
        return '-'
      }
      return config.platformType
        ? `${config.dataName} (${config.platformType})`
        : config.dataName
    } else {
      return '-'
    }
  }
  
  // 格式化"xx前"（距离上次执行已过去的时间）
  const formatTimeAgo = (lastRunStr) => {
    if (!lastRunStr || lastRunStr === '-') return '-'
    const lastRun = new Date(lastRunStr.replace(/-/g, '/'))
    if (isNaN(lastRun.getTime())) return lastRunStr
    const diff = Math.floor((Date.now() - lastRun) / 1000)
    if (diff < 0) return '刚刚'
    if (diff < 60) return `${diff}秒前`
    if (diff < 3600) {
      const m = Math.floor(diff / 60)
      const s = diff % 60
      return s > 0 ? `${m}分${s}秒前` : `${m}分前`
    }
    if (diff < 86400) {
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      return m > 0 ? `${h}小时${m}分前` : `${h}小时前`
    }
    const d = Math.floor(diff / 86400)
    return `${d}天前`
  }

  // 格式化倒计时（距离下次执行的剩余时间）
  const formatCountdown = (nextRunStr) => {
    if (!nextRunStr || nextRunStr === '-') return '-'
    const nextRun = new Date(nextRunStr.replace(/-/g, '/'))
    if (isNaN(nextRun.getTime())) return nextRunStr
    const diff = Math.floor((nextRun - Date.now()) / 1000)
    if (diff <= 0) return '即将执行'
    if (diff < 60) return `${diff}秒后`
    if (diff < 3600) {
      const m = Math.floor(diff / 60)
      const s = diff % 60
      return s > 0 ? `${m}分${s}秒后` : `${m}分后`
    }
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    return m > 0 ? `${h}小时${m}分后` : `${h}小时后`
  }

  // 格式化执行时长
  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${seconds}秒`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      return `${minutes}分`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`
    }
  }

  // 定时刷新正在执行的任务状态
  let refreshTimer = null

  const startAutoRefresh = () => {
    // 每5秒刷新一次
    refreshTimer = setInterval(() => {
      loadSavedTasks()
    }, 5000)
  }

  const stopAutoRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  // 组件挂载时加载数据
  onMounted(async () => {
    await loadSteamConfigs()
    await loadYoupinConfigs()
    await loadBuffConfigs()
    await loadDataSources()
    await loadRenameSearchConfigs()
    await loadPendantSearchConfigs()
    await loadSavedTasks()
    startAutoRefresh()
  })

  onUnmounted(() => {
    stopAutoRefresh()
  })
  
  return {
    automateForm,
    customInterval,
    executing,
    bulkStarting,
    bulkStopping,
    isEditing,
    editingTaskId,
    steamConfigList,
    youpinConfigList,
    buffConfigList,
    dataSources,
    runningTasks,
    accountCards,
    createAutomation,
    independentTasks,
    hasCsqaqSource,
    createIndependentTask,
    updateIndependentTask,
    stockPriceSourceLabel,
    renameSearchConfigList,
    pendantSearchConfigList,
    updateTasks,
    fetchTasks,
    platformPriceTasks,
    searchWeaponTasks,
    secondSelectLabel,
    currentSteamConfigList,
    currentSearchConfigList,
    availableTasks,
    filteredDataSources,
    formatInterval,
    formatDuration,
    formatCountdown,
    formatTimeAgo,
    handleTypeChange,
    applyCustomInterval,
    handleExecute,
    handleReset,
    startTask,
    stopTask,
    startAllTasks,
    stopAllTasks,
    editTask,
    updateTaskInterval,
    deleteTask
  }
}
