/**
 * InventoryMining组件的业务逻辑
 * 处理库存挖掘功能
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { API_CONFIG, apiUrls } from '@/config/api.js'

export function useInventoryMining() {
  const inputSteamId = ref('')
  const historyList = ref([])  // 历史搜索记录列表
  const isMining = ref(false)
  const miningAbortController = ref(null)  // 用于取消挖掘请求
  const miningProgress = ref(null)
  const lastMiningTime = ref('')
  const miningResult = ref(null)
  const miningItems = ref([])
  const userTreeData = ref([])
  const selectedUser = ref('')
  const selectedWeaponType = ref('')
  const pollingTimer = ref(null)
  const currentMiningId = ref('')
  const groupMode = ref(true)  // 默认组合模式
  const groupedData = ref([])  // 组合后的数据
  const expandedRowPages = ref({})  // 展开行的分页状态
  const tableRef = ref(null)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const totalItems = ref(0)

  // Tree组件配置
  const treeProps = {
    children: 'children',
    label: 'label'
  }

  // 从URL中提取Steam ID或自定义ID
  const extractSteamId = (input) => {
    const trimmed = input.trim()
    
    // 尝试从URL中提取
    // 匹配 https://steamcommunity.com/profiles/数字ID
    const profileMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/)
    if (profileMatch) {
      return profileMatch[1]
    }
    
    // 匹配 https://steamcommunity.com/id/自定义ID
    const customIdMatch = trimmed.match(/steamcommunity\.com\/id\/([a-zA-Z0-9_-]+)/)
    if (customIdMatch) {
      return customIdMatch[1]
    }
    
    // 如果不是URL，直接返回输入值
    return trimmed
  }

  // 开始挖掘
  const startMining = async () => {
    // 提取Steam ID
    const input = inputSteamId.value.trim()
    if (!input) {
      ElMessage.warning('请输入 Steam ID、自定义ID 或 Steam个人资料链接')
      return
    }
    
    const steamId = extractSteamId(input)
    
    if (!steamId) {
      ElMessage.warning('无法识别输入的内容')
      return
    }

    // 验证格式：17位数字或自定义ID（字母数字组合）
    const isNumericId = /^\d{17}$/.test(steamId)
    const isCustomId = /^[a-zA-Z0-9_-]+$/.test(steamId)
    
    if (!isNumericId && !isCustomId) {
      ElMessage.warning('ID 格式不正确，请输入17位数字Steam ID、自定义ID 或完整的Steam链接')
      return
    }

    try {
      const idType = isNumericId ? 'Steam ID' : '自定义ID'
      await ElMessageBox.confirm(
        `确定要开始挖掘 ${idType}: ${steamId} 及其好友的库存吗？\n\n⚠️ 注意：此操作将清空该ID的历史挖掘数据！\n\n此操作将访问公开库存数据，可能需要几分钟时间。`,
        '确认挖掘',
        {
          confirmButtonText: '开始',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }

    isMining.value = true
    currentMiningId.value = steamId
    miningProgress.value = {
      percentage: 0,
      processed: 0,
      total: 100,
      found: 0,
      status: 'success'
    }
    ElMessage.info('开始挖掘库存...')

    // 创建 AbortController 用于取消请求
    miningAbortController.value = new AbortController()

    // 启动实时轮询更新
    startPolling(steamId)

    try {
      // 调用Spider的挖掘接口（异步执行）
      const response = await axios.post(apiUrls.steamMineInventory(), {
        steamId: steamId,
        include_friends: true,
        max_friends: 999  // 获取所有好友的库存
      }, {
        signal: miningAbortController.value.signal
      })

      if (response.data.success) {
        const data = response.data.data
        miningResult.value = {
          total_analyzed: data.total_items,
        potential_items: data.total_items,
        estimated_profit: 0,
        total_value: 0,
        self_value: 0,
        friends_value: 0
      }
      lastMiningTime.value = new Date().toLocaleString('zh-CN')
      
      miningProgress.value = {
        percentage: 100,
        processed: data.total_items,
        total: data.total_items,
        found: data.total_items,
        status: 'success'
      }
      
      // 最后一次加载完整数据
      await loadMiningResults(steamId)
      await loadMiningStats(steamId)
      
      ElMessage.success(`挖掘完成！共挖掘 ${data.total_users} 个用户，获取 ${data.total_items} 件物品`)
    } else {
      ElMessage.error(`挖掘失败: ${response.data.message}`)
      miningProgress.value.status = 'exception'
    }
  } catch (error) {
    console.error('挖掘失败:', error)
    
    // 检查是否是用户主动取消
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      miningProgress.value.status = 'warning'
      ElMessage.warning('挖掘已停止')
      return
    }
    
    miningProgress.value.status = 'exception'
    
    let errorMessage = '挖掘失败'
    if (error.response) {
      // 检查 HTTP 状态码
      if (error.response.status === 401) {
        errorMessage = '该用户的库存当前为私密状态，无法获取'
      } else {
        errorMessage = error.response.data?.message || errorMessage
      }
    } else if (error.request) {
      errorMessage = '无法连接到服务器'
    }
    ElMessage.error(errorMessage)
  } finally {
    isMining.value = false
    stopPolling()
    miningAbortController.value = null
  }
  }

  // 启动轮询
  const startPolling = (steamId) => {
  // 清除之前的定时器
  stopPolling()
  
  // 立即执行一次
  pollMiningData(steamId)
  
  // 每2秒轮询一次
  pollingTimer.value = setInterval(() => {
    pollMiningData(steamId)
  }, 2000)
  }

  // 停止轮询
  const stopPolling = () => {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
  }

  // 轮询挖掘数据
  const pollMiningData = async (steamId) => {
  try {
    // 同时获取数据和统计信息
    const [dataResponse, statsResponse] = await Promise.all([
      axios.post(apiUrls.miningQuery(), {
        source_steam_id: steamId
        // 不传limit参数，获取所有数据
      }),
      axios.post(apiUrls.miningStats(), {
        source_steam_id: steamId
      })
    ])

    if (dataResponse.data.success) {
      const items = dataResponse.data.data.items || []
      miningItems.value = items
      
      // 更新进度
      if (isMining.value && items.length > 0) {
        miningProgress.value.processed = items.length
        miningProgress.value.found = items.length
        // 估算进度（假设最多500件物品）
        miningProgress.value.percentage = Math.min(95, Math.floor((items.length / 500) * 100))
      }
      
      // 构建用户树形数据
      buildUserTree(items, steamId)
      
      // 更新显示数据
      updateDisplayData()
    }
    
    if (statsResponse.data.success) {
      const stats = statsResponse.data.data
      // 更新统计信息
      if (miningResult.value) {
        miningResult.value.total_analyzed = stats.total_items
        miningResult.value.total_value = stats.total_value
        miningResult.value.self_value = stats.self_value
        miningResult.value.friends_value = stats.friends_value
      } else {
        miningResult.value = {
          total_analyzed: stats.total_items,
          potential_items: stats.total_items,
          estimated_profit: 0,
          total_value: stats.total_value,
          self_value: stats.self_value,
          friends_value: stats.friends_value
        }
      }
    }
  } catch (error) {
    console.error('轮询数据失败:', error)
  }
  }

  // 加载挖掘结果
  const loadMiningResults = async (steamId) => {
  try {
    const response = await axios.post(apiUrls.miningQuery(), {
      source_steam_id: steamId
      // 不传limit参数，获取所有数据
    })

    if (response.data.success) {
      const items = response.data.data.items || []
      miningItems.value = items
      
      // 构建用户树形数据
      buildUserTree(items, steamId)
      
      // 更新显示数据
      updateDisplayData()
    }
  } catch (error) {
    console.error('加载挖掘结果失败:', error)
  }
  }

  // 加载挖掘统计信息
  const loadMiningStats = async (steamId) => {
  try {
    const response = await axios.post(apiUrls.miningStats(), {
      source_steam_id: steamId
    })

    if (response.data.success) {
      const stats = response.data.data
      // 更新结果统计
      if (miningResult.value) {
        miningResult.value.total_value = stats.total_value
        miningResult.value.self_value = stats.self_value
        miningResult.value.friends_value = stats.friends_value
      }
    }
  } catch (error) {
    console.error('加载统计信息失败:', error)
  }
  }

  // 构建用户树形数据（包含价值信息）
  const buildUserTree = (items, sourceSteamId) => {
  // 按用户分组并计算价值
  const userMap = new Map()
  
  items.forEach(item => {
    const steamId = item.target_steam_id
    if (!userMap.has(steamId)) {
      userMap.set(steamId, {
        steam_id: steamId,
        persona_name: item.persona_name || `用户_${steamId.slice(-4)}`,
        avatar_url: item.avatar_url,
        relationship: item.relationship,
        items: [],
        total_value: 0
      })
    }
    const user = userMap.get(steamId)
    user.items.push(item)
    
    // 累加价值
    if (item.market_price && item.market_price !== '0') {
      user.total_value += parseFloat(item.market_price)
    }
  })
  
  // 构建树形结构
  const treeData = []
  
  // 计算总价值
  let totalValue = 0
  items.forEach(item => {
    if (item.market_price && item.market_price !== '0') {
      totalValue += parseFloat(item.market_price)
    }
  })
  
  // 获取主用户信息
  const selfUsers = Array.from(userMap.values()).filter(u => u.relationship === 'self')
  let rootLabel = `Steam ID: ${sourceSteamId}`
  let rootAvatar = null
  
  // 如果有主用户数据，使用主用户的名称
  if (selfUsers.length > 0 && selfUsers[0].persona_name) {
    const mainUser = selfUsers[0]
    // 检查是否是默认的"用户_xxxx"格式
    if (!mainUser.persona_name.startsWith('用户_')) {
      rootLabel = mainUser.persona_name
      rootAvatar = mainUser.avatar_url
    }
  }
  
  // 根节点
  const rootNode = {
    id: 'root',
    label: rootLabel,
    count: items.length,
    value: totalValue.toFixed(2),
    type: 'primary',
    avatar: rootAvatar,
    children: []
  }
  
  // 自己的库存
  if (selfUsers.length > 0) {
    selfUsers.forEach(user => {
      rootNode.children.push({
        id: `self_${user.steam_id}`,
        label: user.persona_name,
        count: user.items.length,
        value: user.total_value.toFixed(2),
        avatar: user.avatar_url,
        type: 'success',
        steam_id: user.steam_id
      })
    })
  }
  
  // 好友的库存
  const friendUsers = Array.from(userMap.values()).filter(u => u.relationship === 'friend')
  if (friendUsers.length > 0) {
    const friendsTotalValue = friendUsers.reduce((sum, u) => sum + u.total_value, 0)
    const friendsNode = {
      id: 'friends',
      label: `好友库存 (${friendUsers.length}人)`,
      count: friendUsers.reduce((sum, u) => sum + u.items.length, 0),
      value: friendsTotalValue.toFixed(2),
      type: 'info',
      children: []
    }
    
    // 按价值排序好友
    friendUsers.sort((a, b) => b.total_value - a.total_value)
    
    friendUsers.forEach(user => {
      friendsNode.children.push({
        id: `friend_${user.steam_id}`,
        label: user.persona_name,
        count: user.items.length,
        value: user.total_value.toFixed(2),
        avatar: user.avatar_url,
        type: 'warning',
        steam_id: user.steam_id,
        relationship: 'friend'
      })
    })
    
    rootNode.children.push(friendsNode)
  }
  
  userTreeData.value = [rootNode]
  }

  // 用户列表（用于筛选）
  const userList = computed(() => {
  const users = new Map()
  miningItems.value.forEach(item => {
    const steamId = item.target_steam_id
    if (!users.has(steamId)) {
      users.set(steamId, {
        steam_id: steamId,
        name: item.persona_name || `用户_${steamId.slice(-4)}`,
        count: 0
      })
    }
    users.get(steamId).count++
  })
  return Array.from(users.values())
  })

  // 武器类型列表（用于筛选）
  const weaponTypes = computed(() => {
  const types = new Set()
  miningItems.value.forEach(item => {
    if (item.weapon_type) {
      types.add(item.weapon_type)
    }
  })
  return Array.from(types)
  })

  // 筛选后的物品列表
  const filteredItems = computed(() => {
  let items = miningItems.value
  
  if (selectedUser.value) {
    items = items.filter(item => item.target_steam_id === selectedUser.value)
  }
  
  if (selectedWeaponType.value) {
    items = items.filter(item => item.weapon_type === selectedWeaponType.value)
  }
  
  // 按价格从大到小排序
  return items.sort((a, b) => {
    const priceA = parseFloat(a.market_price) || 0
    const priceB = parseFloat(b.market_price) || 0
    return priceB - priceA
  })
  })

  // 按武器类型筛选
  const filterByWeaponType = () => {
  currentPage.value = 1
  updateDisplayData()
  }

  // 更新显示数据（组合或明细）
  const updateDisplayData = () => {
  if (groupMode.value) {
    const grouped = groupItemsByHashName(filteredItems.value)
    totalItems.value = grouped.length
    groupedData.value = grouped
  } else {
    totalItems.value = filteredItems.value.length
  }
  }

  // 分页后的当前显示数据
  const paginatedData = computed(() => {
    const data = groupMode.value ? groupedData.value : filteredItems.value
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return data.slice(start, end)
  })

  // 删除单个历史记录
  const deleteHistory = async (steamId) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${steamId} 的历史记录吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await axios.delete(apiUrls.miningHistoryDelete(steamId))
    
    if (response.data.success) {
      ElMessage.success('删除成功')
      // 如果删除的是当前选中的记录，清空显示
      if (currentMiningId.value === steamId) {
        currentMiningId.value = ''
        miningItems.value = []
        miningResult.value = null
        userTreeData.value = []
      }
      // 重新加载历史列表
      await loadHistoryList()
    } else {
      ElMessage.error('删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除历史记录失败:', error)
      ElMessage.error('删除失败')
    }
  }
  }

  // 停止挖掘
  const stopMining = async () => {
  if (!isMining.value) {
    return
  }
  
  try {
    await ElMessageBox.confirm(
      '确定要停止当前的挖掘任务吗？',
      '确认停止',
      {
        confirmButtonText: '停止',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    ElMessage.info('正在停止挖掘...')
    
    // 1. 调用后端取消接口
    try {
      await axios.post(apiUrls.steamCancelMining(), {
        steamId: currentMiningId.value
      })
    } catch (error) {
      console.error('调用后端取消接口失败:', error)
    }
    
    // 2. 取消前端请求
    if (miningAbortController.value) {
      miningAbortController.value.abort()
    }
    
  } catch (error) {
    // 用户取消了停止操作
    if (error !== 'cancel') {
      console.error('停止挖掘失败:', error)
    }
  }
  }

  // 从树形结构中挖掘用户
  const mineUserFromTree = async (steamId) => {
  // 检查是否有正在进行的挖掘
  if (isMining.value) {
    ElMessage.warning('当前有挖掘任务正在进行，请等待完成后再试')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要挖掘用户 ${steamId} 及其好友的库存吗？\n\n⚠️ 注意：此操作将清空该用户的历史挖掘数据！`,
      '确认挖掘',
      {
        confirmButtonText: '开始',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  // 设置输入框的值并开始挖掘
  inputSteamId.value = steamId
  await startMining()
  }

  // 获取建议类型
  const getRecommendationType = (recommendation) => {
    const typeMap = {
      '持有': 'info',
      '出售': 'success',
      '观察': 'warning',
      '谨慎': 'danger'
    }
    return typeMap[recommendation] || 'info'
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

  // 组合数据 - 按steam_hash_name分组
  const groupItemsByHashName = (items) => {
  const grouped = new Map()
  
  items.forEach(item => {
    const key = item.steam_hash_name || item.item_name
    if (!grouped.has(key)) {
      grouped.set(key, {
        steam_hash_name: item.steam_hash_name,
        item_name: item.item_name,
        weapon_name: item.weapon_name,
        weapon_type: item.weapon_type,
        float_range: item.float_range,
        item_count: 0,
        items: [],
        assetids: [],
        weapon_floats: [],
        market_prices: [],
        stickers: [],
        pendants: [],
        renames: [],
        rarities: [],
        tradables: [],
        persona_names: [],
        total_value: 0
      })
    }
    
    const group = grouped.get(key)
    group.item_count++
    group.items.push(item)
    group.assetids.push(item.assetid)
    group.weapon_floats.push(item.weapon_float)
    group.market_prices.push(item.market_price)
    group.stickers.push(item.sticker)
    group.pendants.push(item.pendant)
    group.renames.push(item.rename)
    group.rarities.push(item.rarity)
    group.tradables.push(item.tradable)
    group.persona_names.push(item.persona_name)
    
    if (item.market_price && item.market_price !== '0') {
      group.total_value += parseFloat(item.market_price)
    }
  })
  
  // 转换为数组并按总价值从大到小排序
  return Array.from(grouped.values()).sort((a, b) => b.total_value - a.total_value)
  }

  // 当数据更新时，重新组合
  const updateGroupedData = () => {
    if (groupMode.value) {
      groupedData.value = groupItemsByHashName(filteredItems.value)
    }
  }

  // 切换组合模式
  const handleToggleGroupMode = () => {
    currentPage.value = 1
    updateDisplayData()
  }

  // 分页处理
  const handleSizeChange = (val) => {
    pageSize.value = val
  currentPage.value = 1
  }

  const handleCurrentChange = (val) => {
    currentPage.value = val
  }

  // 点击树节点筛选用户
  const handleTreeNodeClick = (data) => {
    if (data.steam_id) {
      selectedUser.value = data.steam_id
    } else if (data.id === 'root' || data.id === 'friends') {
      selectedUser.value = ''
    }
    currentPage.value = 1
    updateDisplayData()
  }

  // 按数量排序
  const sortByCount = (a, b) => {
    const countA = groupMode.value ? (a.item_count || 0) : 1
    const countB = groupMode.value ? (b.item_count || 0) : 1
    return countA - countB
  }

  // 按价格排序
  const sortByPrice = (a, b) => {
    let priceA = 0
    let priceB = 0
    
    if (groupMode.value) {
      priceA = a.total_value || 0
      priceB = b.total_value || 0
    } else {
      priceA = parseFloat(a.market_price) || 0
      priceB = parseFloat(b.market_price) || 0
    }
    
    return priceA - priceB
  }

  // 获取展开行的详细数据（带分页）
  const getExpandedItems = (row) => {
    if (!row.items || !Array.isArray(row.items)) {
      return []
    }

    const currentPage = expandedRowPages.value[row.steam_hash_name] || 1
    const itemsPerPage = 10
    const totalPages = Math.ceil(row.items.length / itemsPerPage)
    
    if (currentPage > totalPages && totalPages > 0) {
      expandedRowPages.value = {
        ...expandedRowPages.value,
        [row.steam_hash_name]: 1
      }
      return row.items.slice(0, itemsPerPage)
    }
    
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    
    return row.items.slice(start, end)
  }

  // 获取展开行的总数据量
  const getExpandedTotal = (row) => {
    if (!row.items || !Array.isArray(row.items)) {
      return 0
    }
    return row.items.length
  }

  // 每页显示数量
  const getItemsPerPage = () => {
    return 10
  }

  // 处理展开行的分页变化
  const handleExpandPageChange = (row, page) => {
    expandedRowPages.value = {
      ...expandedRowPages.value,
      [row.steam_hash_name]: page
    }
    
    if (tableRef.value) {
      const expandedRows = tableRef.value.store.states.expandRows.value || []
      const isExpanded = expandedRows.some(r => r.steam_hash_name === row.steam_hash_name)
      
      if (!isExpanded) {
        tableRef.value.toggleRowExpansion(row, true)
      }
    }
  }

  // 处理行点击事件
  const handleRowClick = (row, column, event) => {
    if (!groupMode.value) return
    if (row.item_count <= 1) return
    
    if (tableRef.value) {
      tableRef.value.toggleRowExpansion(row)
    }
  }

  // 获取物品标题
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

  // 检查是否有额外信息
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
      let pendantObj = Array.isArray(parsed) ? parsed[0] : parsed

      if (!pendantObj || typeof pendantObj !== 'object') return null

      const hashName = pendantObj.hashName || pendantObj.steam_hash_name || pendantObj.steamHashName

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

  // 加载历史记录列表
  const loadHistoryList = async () => {
    try {
      const response = await axios.get(apiUrls.miningHistory())
      
      if (response.data.success) {
        historyList.value = response.data.data || []
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
    }
  }

  // 选择历史记录
  const selectHistory = async (steamId) => {
    currentMiningId.value = steamId
    await loadMiningResults(steamId)
    await loadMiningStats(steamId)
  }

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  // 加载最新的挖掘数据
  const loadLatestMiningData = async () => {
    try {
      // 获取最新的source_steam_id
      const response = await axios.get(apiUrls.miningLatest())

      if (response.data.success) {
        const sourceSteamId = response.data.data.source_steam_id
        
        if (sourceSteamId) {
          // 不自动填充Steam ID，只加载数据
          currentMiningId.value = sourceSteamId
          lastMiningTime.value = response.data.data.latest_time || ''
          
          // 加载该Steam ID的所有数据
          await loadMiningResults(sourceSteamId)
          await loadMiningStats(sourceSteamId)
          
          ElMessage.success('已加载最新的挖掘数据')
        }
      }
    } catch (error) {
      console.error('加载最新挖掘数据失败:', error)
      // 不显示错误提示，因为可能是首次使用，没有数据
    }
  }

  // 页面加载时获取数据
  onMounted(() => {
    loadLatestMiningData()
    loadHistoryList()
  })

  // 组件卸载时清理定时器
  onUnmounted(() => {
    stopPolling()
  })

  return {
    inputSteamId,
    isMining,
    miningProgress,
    lastMiningTime,
    miningResult,
    miningItems,
    userTreeData,
    treeProps,
    selectedUser,
    selectedWeaponType,
    userList,
    weaponTypes,
    filteredItems,
    groupMode,
    groupedData,
    paginatedData,
    expandedRowPages,
    tableRef,
    currentPage,
    pageSize,
    totalItems,
    startMining,
    getRecommendationType,
    filterByWeaponType,
    getWeaponImage,
    handleToggleGroupMode,
    handleSizeChange,
    handleCurrentChange,
    handleTreeNodeClick,
    getExpandedItems,
    getExpandedTotal,
    getItemsPerPage,
    handleExpandPageChange,
    handleRowClick,
    getItemTitle,
    hasExtras,
    parseStickers,
    parsePendant,
    sortByCount,
    sortByPrice,
    extractSteamId,
    historyList,
    loadHistoryList,
    selectHistory,
  }
}
