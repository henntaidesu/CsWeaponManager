import { ref, onMounted, onUnmounted, computed, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { CaretRight, CaretBottom, Refresh, Check, Loading } from '@element-plus/icons-vue'
import { API_CONFIG, apiUrls } from '@/config/api.js'
import { applyDeviceClass, watchDeviceType } from '@/utils/deviceDetect.js'

export function useItemSearch() {
  const route = useRoute()

  const steamIdList = ref([])
  const selectedSteamId = ref('')
  const selectedExterior = ref('') // 选择的外观筛选
  const selectedStatTrak = ref('') // 选择的StatTrak筛选，默认全部
  const showSearchResults = ref(false) // 是否展开搜索结果
  const displayMode = ref('card') // 显示模式：'list' 或 'card'，默认卡片模式
  const image404Cache = ref(new Set()) // 图片404缓存
  const activePopoverRow = ref(null) // 当前激活的 popover 行
  
  // 卡片模式弹出框
  const showCardPopover = ref(false)
  const cardPopoverPosition = ref({ x: 0, y: 0 })
  const selectedCardItem = ref(null)
  
  // 商品详情弹窗
  const commodityPreviewVisible = ref(false)
  const commodityPreviewItem = ref(null)
  const commodityPreviewType = ref('') // 'buff' 或 'yyyp'
  
  // 印花/挂件放大预览
  const stickerPreviewVisible = ref(false)
  const stickerPreviewData = ref({
    name: '',
    imageUrl: '',
    type: ''
  })
  
  // BUFF商品列表
  const buffCommodities = ref([])
  const buffCurrentWeapon = ref(null)
  const buffTotalCount = ref(0)  // 在售总数量
  const buffBuyNum = ref(0)  // 求购数量
  const buffRentNum = ref(0)  // 租赁数量
  const showBuffList = ref(false)
  const showBuffTable = ref(true)  // 控制BUFF表格的展开/折叠
  const buffCurrentPage = ref(1)  // BUFF分页当前页
  const buffPageSize = ref(5)  // BUFF每页显示5条
  const buffLoadingMore = ref(false)  // BUFF是否正在加载更多
  const buffHasMore = ref(true)  // BUFF是否还有更多数据
  const buffTotalPage = ref(1)  // BUFF总页数
  
  // 悠悠有品商品列表
  const yyypCommodities = ref([])
  const yyypCurrentWeapon = ref(null)
  const yyypTotalCount = ref(0)  // 在售总数量
  const showYYYPList = ref(false)
  const showYYYPTable = ref(true)  // 控制悠悠有品表格的展开/折叠
  const yyypCurrentPage = ref(1)  // 悠悠有品分页当前页
  const yyypPageSize = ref(50)  // 悠悠有品每页显示50条
  const yyypLoadingMore = ref(false)  // 是否正在加载更多
  const yyypHasMore = ref(true)  // 是否还有更多数据
  const yyypFilterType = ref('on_sale')  // 悠悠有品当前筛选类型
  // 在售列表配置（来自接口 BuyPriceSortList / AbradeRangeList / Filters）
  const yyypListConfig = ref(null)
  // 在售排序、磨损区间、高级筛选参数（仅 on_sale 时生效）
  const yyypSortTypeKey = ref('')
  const yyypWearRange = ref('')  // '' 或 'minVal_maxVal'，如 '0.00-0.01'
  const yyypExterior = ref('')  // 表头外观筛选，值为 'id=xxx' 或 ''
  const yyypExtraParams = ref({})
  /** 当前生效的模板 id：选中外观时用外观 id，否则用当前武器 yyyp_id（供 getTemplateInfo 等使用） */
  const yyypEffectiveTemplateId = computed(() => {
    const id = getExteriorIdFromValue(yyypExterior.value)
    if (id != null) return id
    return yyypCurrentWeapon.value?.yyyp_id ?? ''
  })

  /** 是否已应用「高级筛选」弹窗内的条件（仅 extraParams），用于「筛选」按钮高亮；排序/磨损/外观不算筛选 */
  const yyypHasFilterActive = computed(() => {
    if (yyypFilterType.value !== 'on_sale' && yyypFilterType.value !== 'on_lease') return false
    const extra = yyypExtraParams.value || {}
    return Object.keys(extra).length > 0
  })

  // 表头展示的存世量（由 CSQAQ 子组件加载完成后通过事件写入，切换饰品时清空）
  const headerStatisticValue = ref(null)
  // 触发 CSQAQ 子组件打开存世量曲线对话框的计数器
  const statisticDialogTrigger = ref(0)

  // 多选模式相关
  const isMultiSelectMode = ref(false)  // 是否开启多选模式
  const selectedCommodities = ref([])   // 选中的商品列表
  const selectedCommodityType = ref('') // 选中商品的类型 'buff' 或 'yyyp'

  // 供应相关状态
  const supplyDialogVisible = ref(false)  // 供应对话框是否显示
  const supplyInventoryList = ref([])  // 可供应的库存列表
  const selectedSupplyItems = ref([])  // 选中的供应物品
  const currentPurchaseOrder = ref(null)  // 当前求购订单信息
  const maxSupplyQuantity = ref(0)  // 最大供应数量
  const supplyLoading = ref(false)  // 供应加载状态
  const supplyPriceInfo = ref(new Map())  // 供应物品的印花/挂件价格信息，key为steamAssetId

  // 图片缓存 - 存储已加载的图片URL
  const imageCache = new Set()
  
  // API 基础地址（已迁移至 apiUrls，保留兼容变量）
  // const API_BASE = `${API_CONFIG.BASE_URL}/webInventoryV1`  // V1 已废弃

  // 搜索相关
  const searchKeyword = ref('')
  const searchResults = ref([])
  const isSearching = ref(false)
  const searchSource = ref('') // 'weapon' 或其他来源
  const currentPage = ref(1)
  const pageSize = ref(10)

  // 计算属性 - 筛选后的结果
  const filteredResults = computed(() => {
    let results = searchResults.value
    
    // 根据选择的外观筛选（从 market_listing_item_name 中提取磨损等级）
    if (selectedExterior.value) {
      results = results.filter(item => {
        const floatRange = extractFloatRangeFromName(item.market_listing_item_name)
        return floatRange === selectedExterior.value
      })
    }
    
    // 根据选择的StatTrak筛选
    if (selectedStatTrak.value === 'stattrak') {
      // 只显示StatTrak™饰品
      results = results.filter(item => {
        const itemName = item.market_listing_item_name || ''
        return itemName.includes('StatTrak™') || itemName.includes('（StatTrak™）')
      })
    } else if (selectedStatTrak.value === 'normal') {
      // 只显示非StatTrak™饰品
      results = results.filter(item => {
        const itemName = item.market_listing_item_name || ''
        return !itemName.includes('StatTrak™') && !itemName.includes('（StatTrak™）')
      })
    }
    // 如果是空值''，显示全部
    
    return results
  })

  // 计算属性 - 分页结果
  const paginatedResults = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    const end = start + pageSize.value
    return filteredResults.value.slice(start, end)
  })

  // 计算属性 - BUFF商品分页结果
  const paginatedBuffCommodities = computed(() => {
    const start = (buffCurrentPage.value - 1) * buffPageSize.value
    const end = start + buffPageSize.value
    return buffCommodities.value.slice(start, end)
  })

  // 计算属性 - 悠悠有品商品分页结果
  const paginatedYYYPCommodities = computed(() => {
    const start = (yyypCurrentPage.value - 1) * yyypPageSize.value
    const end = start + yyypPageSize.value
    return yyypCommodities.value.slice(start, end)
  })

  // 预加载图片（相同URL只加载一次）
  const preloadImages = (commodityList) => {
    const uniqueUrls = new Set()
    
    // 收集所有唯一的图片URL
    commodityList.forEach(item => {
      if (item.iconUrl && !imageCache.has(item.iconUrl)) {
        uniqueUrls.add(item.iconUrl)
      }
    })
    
    // 预加载未缓存的图片
    uniqueUrls.forEach(url => {
      const img = new Image()
      img.onload = () => {
        imageCache.add(url)
      }
      img.onerror = () => {
        console.error(`图片加载失败: ${url}`)
      }
      img.src = url
    })
    
  }

  // 实时搜索武器名称
  const querySearchAsync = async (queryString, cb) => {
    if (!queryString || queryString.trim().length === 0) {
      cb([])
      return
    }

    try {
      const response = await axios.get(apiUrls.searchWeapon(queryString.trim()))
      if (response.data.success && response.data.data) {
        const results = response.data.data.map(name => ({
          value: name
        }))
        cb(results)
      } else {
        cb([])
      }
    } catch (error) {
      console.error('搜索武器名称失败:', error)
      cb([])
    }
  }

  // 选择搜索建议
  const handleSelect = (item) => {
    searchKeyword.value = item.value
  }

  // 搜索武器详情
  const handleSearchWeapon = async (autoSearchAll = false, exactMatch = false) => {
    if (!searchKeyword.value.trim()) {
      ElMessage.warning('请输入搜索关键词')
      return
    }

    isSearching.value = true
    searchSource.value = 'weapon'
    currentPage.value = 1

    try {

      const response = await axios.get(apiUrls.searchWeaponDetail(searchKeyword.value.trim(), exactMatch))

      if (response.data.success) {
        searchResults.value = response.data.data || []

        if (searchResults.value.length === 0) {
          ElMessage.info('未找到匹配的武器')
          showSearchResults.value = false
        } else {
          ElMessage.success(`找到 ${searchResults.value.length} 件武器`)
          showSearchResults.value = true  // 搜索成功后自动展开

          // 如果启用自动搜索全部，且只有一个结果，自动触发全部搜索
          if (autoSearchAll && searchResults.value.length === 1) {
            const firstResult = searchResults.value[0]

            // 延迟500ms执行，确保搜索结果已渲染
            setTimeout(() => {
              selectPlatform(firstResult, 'all')
            }, 500)
          }
        }
      } else {
        ElMessage.error('搜索失败: ' + (response.data.error || '未知错误'))
        searchResults.value = []
        showSearchResults.value = false
      }

    } catch (error) {
      console.error('搜索武器失败:', error)
      ElMessage.error('搜索失败: ' + (error.response?.data?.error || error.message))
      searchResults.value = []
      showSearchResults.value = false
    } finally {
      isSearching.value = false
    }
  }

  // 刷新搜索结果
  const handleRefreshSearch = async () => {
    if (!searchKeyword.value.trim()) {
      ElMessage.warning('请先输入搜索关键词')
      return
    }

    ElMessage.info('正在刷新数据...')
    await handleSearchWeapon()
  }

  // 加载Steam ID列表
  const loadSteamIdList = async () => {
    try {
      const response = await axios.get(apiUrls.inventorySteamIds())
      if (response.data.success) {
        steamIdList.value = response.data.data
        if (steamIdList.value.length > 0) {
          // 默认选择第一个 - 使用新格式 steamID（大写）
          selectedSteamId.value = steamIdList.value[0].steamID
        } else {
          ElMessage.warning('没有找到库存数据，请先获取Steam库存')
        }
      }
    } catch (error) {
      console.error('加载Steam ID列表失败:', error)
      ElMessage.error('加载Steam ID列表失败: ' + (error.response?.data?.error || error.message))
    }
  }

  // Steam ID 改变处理
  const handleSteamIdChange = (value) => {
    selectedSteamId.value = value
  }

  // 外观筛选改变处理
  const handleExteriorChange = (value) => {
    selectedExterior.value = value
    currentPage.value = 1 // 重置到第一页
  }

  // StatTrak筛选改变处理
  const handleStatTrakChange = (value) => {
    selectedStatTrak.value = value
    currentPage.value = 1 // 重置到第一页
  }

  // 处理从高级搜索组件选择单个武器
  const handleSelectWeaponFromSearch = (weapon) => {
    // 将选中的武器添加到搜索结果中
    const exists = searchResults.value.some(item => 
      item.market_listing_item_name === weapon.market_listing_item_name
    )
    
    if (!exists) {
      searchResults.value.push(weapon)
      ElMessage.success(`已添加: ${weapon.market_listing_item_name}`)
    } else {
      ElMessage.warning('该武器已在列表中')
    }
    
    showSearchResults.value = true
  }

  // 处理从高级搜索组件选择全部武器
  const handleSelectAllWeaponsFromSearch = (weapons) => {
    let addedCount = 0
    
    weapons.forEach(weapon => {
      const exists = searchResults.value.some(item => 
        item.market_listing_item_name === weapon.market_listing_item_name
      )
      
      if (!exists) {
        searchResults.value.push(weapon)
        addedCount++
      }
    })
    
    if (addedCount > 0) {
      ElMessage.success(`成功添加 ${addedCount} 件武器`)
      showSearchResults.value = true
    } else {
      ElMessage.info('所有武器已在列表中')
    }
  }

  // 刷新悠悠有品商品列表
  const handleRefreshYYYP = async () => {
    if (!yyypCurrentWeapon.value) {
      ElMessage.warning('无法刷新，请重新选择武器')
      return
    }

    yyypCurrentPage.value = 1  // 重置分页到第一页
    ElMessage.info('正在刷新悠悠有品商品数据...')
    await handleSearchYYYPByRow(yyypCurrentWeapon.value)
  }
  
  // 刷新BUFF商品列表
  const handleRefreshBuff = async () => {
    if (!buffCurrentWeapon.value) {
      ElMessage.warning('无法刷新，请重新选择武器')
      return
    }

    buffCurrentPage.value = 1  // 重置分页到第一页
    ElMessage.info('正在刷新BUFF商品数据...')
    await handleSearchBuffByRow(buffCurrentWeapon.value)
  }
  
  // 切换BUFF表格的展开/折叠
  const toggleBuffList = () => {
    showBuffTable.value = !showBuffTable.value
  }
  
  // 购买BUFF商品：先预览拿真实价格与可用支付方式，用户确认后再下单
  const buffBuying = ref(false)

  const handleBuyBuffCommodity = async (commodity) => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择BUFF账号')
      return
    }
    if (buffBuying.value) return

    buffBuying.value = true
    const loading = ElLoading.service({
      lock: true,
      text: '正在获取支付方式...',
      background: 'rgba(0, 0, 0, 0.7)'
    })

    try {
      // 1. 预览：校验挂单仍有效，拿到真实价格与支付方式
      const previewResp = await axios.post(apiUrls.buffPreviewBuy(), {
        steamID: selectedSteamId.value,
        sellOrderId: commodity.id,
        price: commodity.price
      })
      loading.close()

      if (!previewResp.data.success) {
        ElMessage.error(previewResp.data.message || '获取支付方式失败')
        return
      }

      const preview = previewResp.data.data || {}
      const payMethods = (preview.pay_methods || []).filter(m => m.enabled !== false && m.id)
      if (!payMethods.length) {
        ElMessage.error('没有可用的支付方式，请前往BUFF APP处理')
        return
      }

      const actualPrice = preview.discounted_price || preview.original_price || commodity.price

      // 2. 让用户挑支付方式并确认价格，不自动选
      const { value: payMethod } = await ElMessageBox.prompt(
        `实付 ¥${actualPrice}\n请输入支付方式编号：\n` +
          payMethods.map((m, i) => `${i + 1}. ${m.text || m.id}`).join('\n'),
        '确认购买',
        {
          confirmButtonText: '确认购买',
          cancelButtonText: '取消',
          inputValue: '1',
          inputValidator: (v) => {
            const idx = Number(v)
            return (Number.isInteger(idx) && idx >= 1 && idx <= payMethods.length) || '请输入有效编号'
          }
        }
      )

      // 3. 下单。expectedPrice 用预览返回的价，服务端会再核对一次
      const buyLoading = ElLoading.service({ lock: true, text: '正在下单...' })
      try {
        const resp = await axios.post(apiUrls.buffBuyCommodity(), {
          steamID: selectedSteamId.value,
          sellOrderId: commodity.id,
          expectedPrice: actualPrice,
          payMethod: payMethods[Number(payMethod) - 1].id
        })
        if (resp.data.success) {
          ElMessage.success(resp.data.message || '购买已提交')
        } else {
          ElMessage.error(resp.data.message || '购买失败')
        }
      } finally {
        buyLoading.close()
      }
    } catch (error) {
      loading.close()
      if (error === 'cancel' || error === 'close') return
      console.error('BUFF购买失败:', error)
      ElMessage.error(error.response?.data?.message || `购买失败: ${error.message || '网络错误'}`)
    } finally {
      buffBuying.value = false
    }
  }

  // 发布BUFF求购：预览 → 选支付方式并确认总价 → 创建
  const handlePublishBuffBuyOrder = async (goodsId, price, num = 1) => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择BUFF账号')
      return
    }
    if (!goodsId) {
      ElMessage.warning('缺少商品ID，无法发布求购')
      return
    }

    const loading = ElLoading.service({ lock: true, text: '正在获取求购信息...' })
    try {
      const previewResp = await axios.post(apiUrls.buffPreviewBuyOrder(), {
        steamID: selectedSteamId.value,
        goodsId,
        price,
        num
      })
      loading.close()

      if (!previewResp.data.success) {
        ElMessage.error(previewResp.data.message || '获取求购信息失败')
        return
      }

      const preview = previewResp.data.data || {}
      const payMethods = (preview.pay_methods || []).filter(m => m.enabled !== false && m.id)
      if (!payMethods.length) {
        ElMessage.error('没有可用的支付方式，请前往BUFF APP处理')
        return
      }

      const total = preview.total_price || preview.discounted_price || preview.original_price

      const { value: choice } = await ElMessageBox.prompt(
        `求购 ${num} 件，单价 ¥${price}，共需 ¥${total}\n请输入支付方式编号：\n` +
          payMethods.map((m, i) => `${i + 1}. ${m.text || m.id}`).join('\n'),
        '确认发布求购',
        {
          confirmButtonText: '确认发布',
          cancelButtonText: '取消',
          inputValue: '1',
          inputValidator: (v) => {
            const idx = Number(v)
            return (Number.isInteger(idx) && idx >= 1 && idx <= payMethods.length) || '请输入有效编号'
          }
        }
      )

      const createLoading = ElLoading.service({ lock: true, text: '正在发布求购...' })
      try {
        const resp = await axios.post(apiUrls.buffCreateBuyOrder(), {
          steamID: selectedSteamId.value,
          goodsId,
          price,
          num,
          expectedTotal: total,
          payMethod: payMethods[Number(choice) - 1].id
        })
        if (resp.data.success) {
          ElMessage.success(resp.data.message || '求购已创建')
        } else {
          ElMessage.error(resp.data.message || '发布求购失败')
        }
      } finally {
        createLoading.close()
      }
    } catch (error) {
      loading.close()
      if (error === 'cancel' || error === 'close') return
      console.error('BUFF发布求购失败:', error)
      ElMessage.error(error.response?.data?.message || `发布求购失败: ${error.message || '网络错误'}`)
    }
  }

  // 查询BUFF账户余额
  const buffBalance = ref(null)
  const fetchBuffBalance = async () => {
    if (!selectedSteamId.value) return
    try {
      const resp = await axios.post(apiUrls.buffGetBalance(), { steamID: selectedSteamId.value })
      if (resp.data.success) {
        buffBalance.value = resp.data.data
      }
    } catch (error) {
      console.error('查询BUFF余额失败:', error)
    }
  }

  // 获取稀有度类型（根据CS:GO品质颜色）
  const getRarityType = (rarity) => {
    if (!rarity) return ''
    // 不使用Element Plus的type，使用自定义颜色
    return ''
  }
  
  // 获取稀有度颜色样式
  const getRarityColor = (rarity) => {
    if (!rarity) return ''
    
    // 移除"级"后缀进行匹配
    const normalizedRarity = rarity.replace(/级$/, '')
    
    const rarityColorMap = {
      '违禁': '#e4ae39',      // 金色
      '非凡': '#e4ae39',      // 金色
      '隐秘': '#eb4b4b',      // 红色
      '保密': '#d32ce6',      // 紫色/粉色
      '受限': '#8847ff',      // 紫色
      '军规': '#4b69ff',      // 蓝色
      '工业': '#5e98d9',      // 浅蓝色
      '消费': '#b0c3d9',      // 灰蓝色
      '普通': '#b0c3d9'       // 灰蓝色
    }
    return rarityColorMap[normalizedRarity] || '#fff'
  }

  // 获取武器类型颜色样式
  const getWeaponTypeColor = (weaponType) => {
    if (!weaponType) return '#909399'
    const typeColorMap = {
      '手枪': '#67c23a',        // 绿色
      '步枪': '#409eff',        // 蓝色
      '狙击步枪': '#e6a23c',    // 橙色
      '冲锋枪': '#909399',      // 灰色
      '霰弹枪': '#f56c6c',      // 红色
      '机枪': '#c45656',        // 深红色
      '挂件': '#d4a5ff',        // 浅紫色
      '挂件（纪念品）': '#ffd700', // 金色
      '匕首': '#ff4757',        // 亮红色
      '手套': '#ffa502',        // 橙黄色
      '探员': '#5f27cd',        // 紫色
      '印花': '#48dbfb',        // 青色
      '涂鸦': '#ff6348',        // 珊瑚红
      '音乐盒': '#1dd1a1',      // 青绿色
      '收藏品': '#ee5a6f',      // 粉红色
      '容器': '#c8d6e5'         // 浅灰蓝色
    }
    return typeColorMap[weaponType] || '#909399'
  }

  // 获取磨损等级的标签类型
  const getFloatRangeType = (floatRange) => {
    if (!floatRange) return ''
    const typeMap = {
      '崭新出厂': 'success',
      '略有磨损': 'success',
      '久经沙场': 'warning',
      '破损不堪': 'warning',
      '战痕累累': 'danger'
    }
    return typeMap[floatRange] || ''
  }

  // 从 market_listing_item_name 中提取磨损等级
  const extractFloatRangeFromName = (itemName) => {
    if (!itemName) return ''
    
    const wearLevels = ['崭新出厂', '略有磨损', '久经沙场', '破损不堪', '战痕累累']
    
    for (const wear of wearLevels) {
      if (itemName.includes(`(${wear})`) || itemName.includes(wear)) {
        return wear
      }
    }
    
    return ''
  }

  // 获取磨损等级的颜色
  const getFloatRangeColor = (floatRange) => {
    if (!floatRange) return '#fff'
    const colorMap = {
      '崭新出厂': '#4caf50',      // 绿色 - Factory New
      '略有磨损': '#8bc34a',      // 浅绿色 - Minimal Wear
      '久经沙场': '#ffc107',      // 黄色 - Field-Tested
      '破损不堪': '#ff9800',      // 橙色 - Well-Worn
      '战痕累累': '#f44336'       // 红色 - Battle-Scarred
    }
    return colorMap[floatRange] || '#fff'
  }

  // 根据磨损值返回颜色（用于进度条）
  const getWearColor = (abrade) => {
    if (!abrade) return '#4caf50'
    const wear = parseFloat(abrade)
    if (wear <= 0.07) return '#4caf50'      // 崭新出厂 - 绿色
    if (wear <= 0.15) return '#8bc34a'      // 略有磨损 - 浅绿色
    if (wear <= 0.38) return '#ffc107'      // 久经沙场 - 黄色
    if (wear <= 0.45) return '#ff9800'      // 破损不堪 - 橙色
    return '#f44336'                        // 战痕累累 - 红色
  }

  // 根据磨损值返回磨损等级名称
  const getWearRange = (abrade) => {
    if (!abrade) return ''
    const wear = parseFloat(abrade)
    if (wear <= 0.07) return '崭新出厂'
    if (wear <= 0.15) return '略有磨损'
    if (wear <= 0.38) return '久经沙场'
    if (wear <= 0.45) return '破损不堪'
    return '战痕累累'
  }

  // 获取外观（磨损）颜色样式
  const getExteriorColor = (itemName) => {
    if (!itemName) return '#fff'
    
    const exteriorColorMap = {
      '崭新出厂': '#4caf50',      // 绿色 - Factory New
      '略有磨损': '#8bc34a',      // 浅绿色 - Minimal Wear
      '久经沙场': '#ffc107',      // 黄色 - Field-Tested
      '破损不堪': '#ff9800',      // 橙色 - Well-Worn
      '战痕累累': '#f44336'       // 红色 - Battle-Scarred
    }
    
    // 检查饰品名称中是否包含外观关键词
    for (const [exterior, color] of Object.entries(exteriorColorMap)) {
      if (itemName.includes(exterior) || itemName.includes(`(${exterior})`)) {
        return color
      }
    }
    
    return '#fff' // 默认白色
  }

  // 解析外观参数字符串（如 "id=1944"）得到 id 值，用于切换列表
  const getExteriorIdFromValue = (exteriorValue) => {
    if (!exteriorValue || typeof exteriorValue !== 'string') return null
    for (const pair of exteriorValue.split('&')) {
      const [k, v] = pair.split('=').map((s) => (s || '').trim())
      if (k === 'id' && v) return v
    }
    return null
  }

  // 构建悠悠有品在售列表请求体（排序、磨损区间、高级筛选）；选中外观时用其 id 作为 yyypId 请求对应列表
  const buildYYYPListRequest = (yyypId, pageIndex, pageSize) => {
    const exteriorId = getExteriorIdFromValue(yyypExterior.value)
    const effectiveYyypId = exteriorId != null ? exteriorId : yyypId
    const payload = {
      steamId: selectedSteamId.value || '',
      yyypId: effectiveYyypId,
      pageIndex,
      pageSize: pageSize || yyypPageSize.value
    }
    if (yyypFilterType.value === 'on_sale') {
      if (yyypSortTypeKey.value) payload.sortTypeKey = yyypSortTypeKey.value
      const wr = yyypWearRange.value
      if (wr && wr !== '') {
        const [low, high] = wr.split('-').map(s => s?.trim())
        if (low !== undefined && low !== '') payload.lowAbrade = low
        if (high !== undefined && high !== '') payload.highAbrade = high
      }
      const extra = { ...(yyypExtraParams.value || {}) }
      if (yyypExterior.value) {
        yyypExterior.value.split('&').forEach((pair) => {
          const [k, v] = pair.split('=').map((s) => (s || '').trim())
          if (k) extra[k] = v
        })
      }
      if (Object.keys(extra).length > 0) payload.extraParams = extra
    }
    if (yyypFilterType.value === 'on_lease') {
      if (yyypSortTypeKey.value) payload.sortTypeKey = yyypSortTypeKey.value
      const wr = yyypWearRange.value
      if (wr && wr !== '') {
        const [low, high] = wr.split('-').map(s => s?.trim())
        if (low !== undefined && low !== '') payload.lowAbrade = low
        if (high !== undefined && high !== '') payload.highAbrade = high
      }
      if (Object.keys(yyypExtraParams.value || {}).length > 0) payload.extraParams = yyypExtraParams.value
    }
    return payload
  }

  // 通过行数据搜索悠悠有品
  const handleSearchYYYPByRow = async (row) => {
    
    if (!row.yyyp_id) {
      ElMessage.warning('该武器没有悠悠有品ID')
      return
    }

    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }

    isSearching.value = true
    searchSource.value = 'yyyp'
    
    try {
      
      // 构建请求数据（在售时带上排序、磨损、筛选参数）
      const requestData = buildYYYPListRequest(row.yyyp_id, 1, 50)

      // 根据筛选类型选择对应的V2 API
      let apiUrl
      switch (yyypFilterType.value) {
        case 'on_sale':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getCommodityList`
          break
        case 'on_lease':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_lease/getCommodityList`
          break
        case 'presale':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/presale/getCommodityList`
          break
        case 'wanted':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/purchase_order/getCommodityList`
          break
        default:
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getCommodityList`
      }
      
      
      // 调用悠悠有品商品列表API（使用Spider服务器地址）
      const response = await axios.post(apiUrl, requestData)
      
      
      if (response.data.success) {
        const parsedData = response.data.data
        
        // 直接使用Spider解析后的数据
        const commodityList = parsedData.commodityList || []
        const totalCount = parsedData.totalCount || 0
        
        // 在售时保存列表配置（排序选项、磨损区间、筛选字段）供前端动态渲染
        if (yyypFilterType.value === 'on_sale' && (parsedData.buyPriceSortList?.length || parsedData.abradeRangeList?.length || parsedData.filters?.length)) {
          yyypListConfig.value = {
            buyPriceSortList: parsedData.buyPriceSortList || [],
            abradeRangeList: parsedData.abradeRangeList || [],
            filters: parsedData.filters || []
          }
          if (!yyypSortTypeKey.value && parsedData.buyPriceSortList?.[0]?.sortTypeKey) {
            yyypSortTypeKey.value = parsedData.buyPriceSortList[0].sortTypeKey
          }
        }
        
        // 更新状态，显示商品列表
        yyypCurrentWeapon.value = row
        yyypCommodities.value = commodityList
        yyypTotalCount.value = totalCount
        yyypCurrentPage.value = 1  // 重置分页到第一页
        yyypHasMore.value = commodityList.length < totalCount  // 判断是否还有更多
        showYYYPList.value = true
        showSearchResults.value = false  // 折叠搜索结果
        
        ElMessage.success(`成功获取 ${commodityList.length} 条商品数据，在售总数: ${totalCount}`)
        
        // 预加载图片（相同URL只加载一次）
        preloadImages(commodityList)
        
        // 批量获取印花/挂件价格
        fetchStickerPrices(commodityList)
        
        // 滚动到商品列表区域
        setTimeout(() => {
          const listElement = document.querySelector('.yyyp-commodity-list')
          if (listElement) {
            listElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
        
        // 改名信息不自动获取，由用户手动触发
        // fetchAllNameTags(commodityList)
      } else {
        console.error('API返回失败:', response.data)
        ElMessage.error(response.data.message || '获取商品列表失败')
      }
      
    } catch (error) {
      console.error('搜索悠悠有品失败 - 完整错误:', error)
      console.error('错误响应:', error.response)
      console.error('错误数据:', error.response?.data)
      
      const errorMessage = error.response?.data?.message || error.message || '搜索失败，请检查网络连接'
      ElMessage.error(errorMessage)
    } finally {
      isSearching.value = false
      searchSource.value = ''
    }
  }

  // 悠悠有品加载更多
  const loadMoreYYYPCommodities = async () => {
    if (yyypLoadingMore.value || !yyypHasMore.value || !yyypCurrentWeapon.value) {
      return
    }
    
    yyypLoadingMore.value = true
    const nextPage = yyypCurrentPage.value + 1
    
    try {
      
      const requestData = buildYYYPListRequest(yyypCurrentWeapon.value.yyyp_id, nextPage, 50)

      // 根据筛选类型选择对应的V2 API
      let apiUrl
      switch (yyypFilterType.value) {
        case 'on_sale':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getCommodityList`
          break
        case 'on_lease':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_lease/getCommodityList`
          break
        case 'presale':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/presale/getCommodityList`
          break
        case 'wanted':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/purchase_order/getCommodityList`
          break
        default:
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getCommodityList`
      }
      const response = await axios.post(apiUrl, requestData)
      
      if (response.data.success) {
        const parsedData = response.data.data
        const newCommodities = parsedData.commodityList || []
        
        if (newCommodities.length > 0) {
          // 追加到现有列表
          yyypCommodities.value = [...yyypCommodities.value, ...newCommodities]
          yyypCurrentPage.value = nextPage
          
          // 判断是否还有更多
          yyypHasMore.value = yyypCommodities.value.length < yyypTotalCount.value
          
          
          // 预加载新图片
          preloadImages(newCommodities)
          
          // 批量获取新商品的印花/挂件价格
          fetchStickerPrices(newCommodities)
          
          // 改名信息不自动获取，由用户手动触发
          // fetchAllNameTags(newCommodities)
        } else {
          yyypHasMore.value = false
        }
      }
    } catch (error) {
      console.error('加载更多失败:', error)
      ElMessage.error('加载更多失败')
    } finally {
      yyypLoadingMore.value = false
    }
  }

  // 悠悠有品滚动事件处理
  const handleYYYPScroll = (event) => {
    const target = event.target
    const scrollTop = target.scrollTop
    const scrollHeight = target.scrollHeight
    const clientHeight = target.clientHeight
    
    // 当滚动到底部附近时（距离底部50px）加载更多
    if (scrollHeight - scrollTop - clientHeight < 50) {
      loadMoreYYYPCommodities()
    }
  }

  // BUFF加载更多
  const loadMoreBuffCommodities = async () => {
    if (buffLoadingMore.value || !buffHasMore.value || !buffCurrentWeapon.value) {
      return
    }
    
    buffLoadingMore.value = true
    const nextPage = buffCurrentPage.value + 1
    
    try {
      
      const requestData = {
        steamId: selectedSteamId.value || '',
        goodsId: buffCurrentWeapon.value.buff_id,
        pageIndex: nextPage
      }
      
      const apiUrl = apiUrls.buffGetCommodities()
      const response = await axios.post(apiUrl, requestData)
      
      if (response.data.success) {
        const parsedData = response.data.data
        const newCommodities = parsedData.commodityList || []
        
        if (newCommodities.length > 0) {
          // 追加到现有列表
          buffCommodities.value = [...buffCommodities.value, ...newCommodities]
          buffCurrentPage.value = nextPage
          
          // 判断是否还有更多
          buffHasMore.value = nextPage < buffTotalPage.value
          
          
          // 预加载新图片
          preloadImages(newCommodities)
          
          // 批量获取新商品的印花/挂件价格
          fetchStickerPrices(newCommodities)
        } else {
          buffHasMore.value = false
        }
      }
    } catch (error) {
      console.error('BUFF加载更多失败:', error)
      ElMessage.error('加载更多失败')
    } finally {
      buffLoadingMore.value = false
    }
  }

  // BUFF滚动事件处理
  const handleBuffScroll = (event) => {
    const target = event.target
    const scrollTop = target.scrollTop
    const scrollHeight = target.scrollHeight
    const clientHeight = target.clientHeight
    
    // 当滚动到底部附近时（距离底部50px）加载更多
    if (scrollHeight - scrollTop - clientHeight < 50) {
      loadMoreBuffCommodities()
    }
  }

  // 查看商品详情（暂未对接）
  const handleViewDetail = (commodity) => {
    ElMessage.info(`查看详情功能开发中... 商品ID: ${commodity.id}`)
    // TODO: 对接查看详情接口
  }

  // 购买商品
  const handleBuyCommodity = async (commodity) => {

    // 判断是求购供应还是普通购买
    if (commodity.isPurchaseOrder) {
      await handleSupplyToPurchaseOrder(commodity)
      return
    }

    // 步骤1：弹出初步确认框
    try {
      await ElMessageBox.confirm(
        `确认购买该商品吗？\n\n商品：${commodity.commodityName}\n价格：¥${commodity.price}\n磨损：${commodity.abrade || '-'}`,
        '确认购买',
        {
          confirmButtonText: '下一步',
          cancelButtonText: '取消',
          type: 'warning',
          distinguishCancelAndClose: true
        }
      )
    } catch {
      ElMessage.info('已取消购买')
      return
    }

    // 步骤2：创建订单并查询支付渠道
    const loadingMessage = ElMessage({
      message: '正在创建订单...',
      type: 'info',
      duration: 0
    })

    let orderNo = null
    let waitPaymentDataNo = null
    let payList = []

    try {
      const createResponse = await axios.post(
        apiUrls.yyypCreateOrder(),
        {
          steamId: selectedSteamId.value,
          commodityId: commodity.id,
          price: commodity.price
        }
      )

      loadingMessage.close()

      if (!createResponse.data.success) {
        ElMessageBox.alert(
          `创建订单失败：${createResponse.data.message || '未知错误'}`,
          '创建失败',
          { confirmButtonText: '知道了', type: 'error' }
        )
        return
      }

      const orderData = createResponse.data.data
      orderNo = orderData.orderNo
      waitPaymentDataNo = orderData.waitPaymentDataNo
      payList = orderData.payList || []
    } catch (error) {
      loadingMessage.close()
      const errorMessage = error.response?.data?.message || error.message || '网络错误'
      ElMessageBox.alert(`创建订单失败：${errorMessage}`, '创建失败', {
        confirmButtonText: '知道了', type: 'error'
      })
      return
    }

    // 步骤3：展示支付方式和余额，等待用户确认支付
    const balanceChannel = payList.find(p => p.channelId === 100)
    const balance = balanceChannel ? parseFloat(balanceChannel.balance || 0).toFixed(2) : '未知'
    const price = parseFloat(commodity.price || 0).toFixed(2)
    const balanceAfter = balanceChannel
      ? (parseFloat(balanceChannel.balance || 0) - parseFloat(price)).toFixed(2)
      : '未知'

    // 构建支付方式列表文本
    const payMethodLines = payList.map(p => {
      const balanceStr = p.balance !== undefined ? `  余额：¥${parseFloat(p.balance).toFixed(2)}` : ''
      return `• ${p.channelName || p.channelId}${balanceStr}`
    }).join('\n')

    const confirmMsg =
      `订单号：${orderNo}\n` +
      `商品：${commodity.commodityName}\n` +
      `支付金额：¥${price}\n\n` +
      `可用支付方式：\n${payMethodLines || '无'}\n\n` +
      `有品余额：¥${balance}\n` +
      `支付后余额：¥${balanceAfter}\n\n` +
      `确认使用有品余额支付？`

    try {
      await ElMessageBox.confirm(
        confirmMsg,
        '确认支付',
        {
          confirmButtonText: '确认支付',
          cancelButtonText: '取消订单',
          type: 'warning',
          distinguishCancelAndClose: true
        }
      )
    } catch (action) {
      // 用户点取消或关闭 → 取消订单
      if (orderNo) {
        try {
          await axios.post(apiUrls.yyypCancelOrder(), {
            steamId: selectedSteamId.value,
            orderNo
          })
          ElMessage.info('已取消订单')
        } catch {
          ElMessage.warning('订单取消请求失败，请前往悠悠有品APP手动取消')
        }
      }
      return
    }

    // 步骤4：确认支付
    const payLoadingMessage = ElMessage({
      message: '正在确认支付...',
      type: 'info',
      duration: 0
    })

    try {
      const payResponse = await axios.post(
        apiUrls.yyypConfirmPayment(),
        {
          steamId: selectedSteamId.value,
          commodityId: commodity.id,
          price: commodity.price
        }
      )

      payLoadingMessage.close()

      if (payResponse.data.success) {
        ElMessageBox.alert(
          `购买成功！\n\n订单号：${payResponse.data.data?.orderNo || orderNo}\n金额：¥${price}\n状态：支付成功 ✅\n\n饰品将发送至您的库存。`,
          '购买成功',
          {
            confirmButtonText: '知道了',
            type: 'success',
            callback: () => ElMessage.success('购买成功！')
          }
        )
        if (yyypCurrentWeapon.value) {
          setTimeout(async () => { await handleRefreshYYYP() }, 1000)
        }
      } else {
        ElMessageBox.alert(
          `支付失败：${payResponse.data.message || '未知错误'}`,
          '支付失败',
          { confirmButtonText: '知道了', type: 'error' }
        )
      }
    } catch (error) {
      payLoadingMessage.close()
      const errorMessage = error.response?.data?.message || error.message || '网络错误'
      ElMessageBox.alert(`支付失败：${errorMessage}`, '支付失败', {
        confirmButtonText: '知道了', type: 'error'
      })
    }
  }

  // ==================== 求购供应相关函数 ====================

  // 处理供应到求购订单
  const handleSupplyToPurchaseOrder = async (purchaseOrder) => {

    // 检查是否选择了 Steam ID
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择 Steam ID')
      return
    }

    supplyLoading.value = true
    const loadingMessage = ElMessage({
      message: '正在获取可供应物品...',
      type: 'info',
      duration: 0
    })

    try {
      // 调用获取供应列表接口
      const response = await axios.post(
        apiUrls.youpinGetSupplyList(),
        {
          purchaseNo: purchaseOrder.purchaseNo,
          steamId: selectedSteamId.value
        }
      )

      loadingMessage.close()

      if (response.data.success) {
        const data = response.data.data

        // 保存当前求购订单信息
        currentPurchaseOrder.value = {
          purchaseNo: purchaseOrder.purchaseNo,
          purchasePrice: purchaseOrder.purchasePrice,
          commodityName: data.commodityName || purchaseOrder.commodityName,
          surplusQuantity: purchaseOrder.surplusQuantity
        }

        // 保存可供应列表
        supplyInventoryList.value = data.responseList || []
        maxSupplyQuantity.value = data.maxSupplyQuantity || 0

        // 重置选中项
        selectedSupplyItems.value = []

        // 如果没有可供应物品
        if (supplyInventoryList.value.length === 0) {
          ElMessageBox.alert(
            '您的库存中没有可供应的物品',
            '无可供应物品',
            {
              confirmButtonText: '知道了',
              type: 'warning'
            }
          )
          return
        }

        // 显示供应对话框
        supplyDialogVisible.value = true

        // 异步加载所有物品的印花/挂件价格（不阻塞UI）
        supplyInventoryList.value.forEach(item => {
          loadSupplyItemPrices(item).catch(error => {
            console.error(`加载物品价格失败 (${item.steamAssetId}):`, error)
          })
        })

      } else {
        ElMessageBox.alert(
          `获取供应列表失败：${response.data.message || '未知错误'}`,
          '获取失败',
          {
            confirmButtonText: '知道了',
            type: 'error'
          }
        )
      }
    } catch (error) {
      loadingMessage.close()
      console.error('获取供应列表失败:', error)

      const errorMessage = error.response?.data?.message || error.message || '网络错误'
      ElMessageBox.alert(
        `获取供应列表失败：${errorMessage}`,
        '获取失败',
        {
          confirmButtonText: '知道了',
          type: 'error'
        }
      )
    } finally {
      supplyLoading.value = false
    }
  }

  // 发送报价
  const handleSendOffer = async (orderNo) => {
    const loadingMessage = ElMessage({
      message: '正在发送报价...',
      type: 'info',
      duration: 0
    })

    try {
      const response = await axios.post(
        apiUrls.youpinSendOffer(),
        {
          orderNo: orderNo,
          steamId: selectedSteamId.value
        }
      )

      loadingMessage.close()

      if (response.data.success) {
        ElMessage.success('发送报价成功！')
      } else {
        ElMessage.error(`发送报价失败：${response.data.message || '未知错误'}`)
      }
    } catch (error) {
      loadingMessage.close()
      console.error('发送报价失败:', error)
      const errorMessage = error.response?.data?.message || error.message || '网络错误'
      ElMessage.error(`发送报价失败：${errorMessage}`)
    }
  }

  // 确认供应
  const handleConfirmSupply = async () => {
    if (selectedSupplyItems.value.length === 0) {
      ElMessage.warning('请至少选择一件物品')
      return
    }

    if (selectedSupplyItems.value.length > maxSupplyQuantity.value) {
      ElMessage.warning(`最多只能选择 ${maxSupplyQuantity.value} 件物品`)
      return
    }

    supplyLoading.value = true
    const loadingMessage = ElMessage({
      message: '正在提交供应...',
      type: 'info',
      duration: 0
    })

    try {
      // 步骤1: 提交供应，查询手续费
      const submitResponse = await axios.post(
        apiUrls.youpinSubmitSupply(),
        {
          purchaseOrderNo: currentPurchaseOrder.value.purchaseNo,
          inventoryList: selectedSupplyItems.value,
          purchasePrice: currentPurchaseOrder.value.purchasePrice,
          steamId: selectedSteamId.value
        }
      )

      if (!submitResponse.data.success) {
        throw new Error(submitResponse.data.message || '提交供应失败')
      }

      const feeData = submitResponse.data.data
      const serviceFee = feeData.serviceFee || 0
      const expectedRevenue = feeData.expectedRevenue || 0

      // 确认供应信息
      try {
        await ElMessageBox.confirm(
          `确认供应以下物品吗？\n\n` +
          `商品：${currentPurchaseOrder.value.commodityName}\n` +
          `单价：¥${currentPurchaseOrder.value.purchasePrice}\n` +
          `数量：${selectedSupplyItems.value.length} 件\n` +
          `总价：¥${(parseFloat(currentPurchaseOrder.value.purchasePrice) * selectedSupplyItems.value.length).toFixed(2)}\n` +
          `服务费：¥${serviceFee}\n` +
          `预期收益：¥${expectedRevenue}`,
          '确认供应',
          {
            confirmButtonText: '确认供应',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
      } catch {
        loadingMessage.close()
        ElMessage.info('已取消供应')
        supplyLoading.value = false
        return
      }

      // 步骤2: 确认供应
      const commodityList = selectedSupplyItems.value.map(item => ({
        assetId: item.steamAssetId,
        commodityId: item.commodityId
      }))

      const confirmResponse = await axios.post(
        apiUrls.youpinConfirmSupply(),
        {
          purchaseNo: currentPurchaseOrder.value.purchaseNo,
          commodityList: commodityList,
          unitPrice: currentPurchaseOrder.value.purchasePrice,
          steamId: selectedSteamId.value
        }
      )

      loadingMessage.close()

      if (confirmResponse.data.success) {
        // 获取订单号
        const orderNo = confirmResponse.data.data?.orderNo

        // 供应成功后，弹出发送报价对话框（确认按钮 3 秒倒计时后才可点击）
        const COUNTDOWN = 3
        let remaining = COUNTDOWN
        let countdownTimer = null

        const msgBoxInstance = ElMessageBox.confirm(
          `供应成功！\n\n` +
          `已供应 ${selectedSupplyItems.value.length} 件物品\n` +
          `预期收益：¥${expectedRevenue}\n\n` +
          `是否立即发送报价？`,
          '供应成功',
          {
            confirmButtonText: `发送报价 (${remaining}s)`,
            cancelButtonText: '稍后发送',
            type: 'success',
            distinguishCancelAndClose: true,
            beforeClose: (action, instance, done) => {
              if (countdownTimer) {
                clearInterval(countdownTimer)
                countdownTimer = null
              }
              done()
            }
          }
        )

        // 倒计时逻辑：通过 DOM 操作更新按钮文字并控制禁用状态
        const startCountdown = () => {
          // 找到 MessageBox 的确认按钮
          const confirmBtn = document.querySelector('.el-message-box__btns .el-button--primary')
          if (confirmBtn) {
            confirmBtn.disabled = true
            confirmBtn.classList.add('is-disabled')
          }

          countdownTimer = setInterval(() => {
            remaining -= 1
            const btn = document.querySelector('.el-message-box__btns .el-button--primary')
            if (btn) {
              if (remaining > 0) {
                btn.textContent = `发送报价 (${remaining}s)`
              } else {
                btn.textContent = '发送报价'
                btn.disabled = false
                btn.classList.remove('is-disabled')
                clearInterval(countdownTimer)
                countdownTimer = null
              }
            } else {
              clearInterval(countdownTimer)
              countdownTimer = null
            }
          }, 1000)
        }

        // 等待 DOM 渲染后启动倒计时
        setTimeout(startCountdown, 50)

        msgBoxInstance.then(() => {
          // 用户点击"发送报价"
          if (orderNo) {
            handleSendOffer(orderNo)
          } else {
            ElMessage.warning('未获取到订单号，无法发送报价')
          }

          // 关闭对话框
          supplyDialogVisible.value = false

          // 刷新列表
          if (yyypCurrentWeapon.value) {
            setTimeout(async () => {
              await handleRefreshYYYP()
            }, 1000)
          }
        }).catch((action) => {
          // 用户点击"稍后发送"或关闭
          if (action === 'cancel') {
            ElMessage.info('稍后发送报价')
          }

          // 关闭对话框
          supplyDialogVisible.value = false

          // 刷新列表
          if (yyypCurrentWeapon.value) {
            setTimeout(async () => {
              await handleRefreshYYYP()
            }, 1000)
          }
        })
      } else {
        ElMessageBox.alert(
          `供应失败：${confirmResponse.data.message || '未知错误'}`,
          '供应失败',
          {
            confirmButtonText: '知道了',
            type: 'error'
          }
        )
      }
    } catch (error) {
      loadingMessage.close()
      console.error('供应失败:', error)

      const errorMessage = error.response?.data?.message || error.message || '网络错误'
      ElMessageBox.alert(
        `供应失败：${errorMessage}`,
        '供应失败',
        {
          confirmButtonText: '知道了',
          type: 'error'
        }
      )
    } finally {
      supplyLoading.value = false
    }
  }

  // 切换物品选中状态
  const toggleSupplyItemSelection = (item) => {
    const index = selectedSupplyItems.value.findIndex(
      selected => selected.steamAssetId === item.steamAssetId
    )

    if (index > -1) {
      // 已选中，取消选中
      selectedSupplyItems.value.splice(index, 1)
    } else {
      // 未选中，检查是否超过最大数量
      if (selectedSupplyItems.value.length >= maxSupplyQuantity.value) {
        ElMessage.warning(`最多只能选择 ${maxSupplyQuantity.value} 件物品`)
        return
      }
      // 添加到选中列表
      selectedSupplyItems.value.push(item)
    }
  }

  // 检查物品是否已选中
  const isSupplyItemSelected = (item) => {
    return selectedSupplyItems.value.some(
      selected => selected.steamAssetId === item.steamAssetId
    )
  }

  // 全选供应物品
  const selectAllSupplyItems = () => {
    const maxSelectableCount = Math.min(supplyInventoryList.value.length, maxSupplyQuantity.value)

    if (selectedSupplyItems.value.length === maxSelectableCount) {
      // 已全选，清空选择
      selectedSupplyItems.value = []
    } else {
      // 选择前 maxSupplyQuantity 个物品
      const itemsToSelect = supplyInventoryList.value.slice(0, maxSupplyQuantity.value)
      selectedSupplyItems.value = [...itemsToSelect]

      if (supplyInventoryList.value.length > maxSupplyQuantity.value) {
        ElMessage.info(`已选择前 ${maxSupplyQuantity.value} 件物品（最大供应数量限制）`)
      }
    }
  }

  // 计算全选按钮状态
  const isAllSupplyItemsSelected = computed(() => {
    if (supplyInventoryList.value.length === 0) return false
    const maxSelectableCount = Math.min(supplyInventoryList.value.length, maxSupplyQuantity.value)
    return selectedSupplyItems.value.length === maxSelectableCount
  })

  // 查询单个印花/挂件的价格
  const fetchAccessoryPrice = async (steamHashName) => {
    if (!steamHashName) return null

    try {
      const url = apiUrls.buyYyypPriceInfo(steamHashName)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn(`价格查询失败 (${steamHashName}): ${response.status}`)
        return null
      }

      const result = await response.json()
      if (result.success && result.data) {
        return {
          yyyp_price: result.data.yyyp_price,
          yyyp_on_sale_count: result.data.yyyp_on_sale_count,
          buff_price: result.data.buff_price,
          buff_on_sale_count: result.data.buff_on_sale_count,
          market_listing_item_name: result.data.market_listing_item_name
        }
      }
    } catch (error) {
      console.error(`查询价格失败 (${steamHashName}):`, error.message || error)
    }
    return null
  }

  // 查询供应物品的印花和挂件价格
  const loadSupplyItemPrices = async (item) => {
    const steamAssetId = item.steamAssetId
    const priceData = {
      stickers: [],
      pendant: null
    }

    // 查询印花价格
    if (item.stickerList && item.stickerList.length > 0) {
      const stickerPricePromises = item.stickerList.map(async (sticker) => {
        const steamHashName = sticker.steamHashName
        if (!steamHashName) return null

        const priceInfo = await fetchAccessoryPrice(`Sticker | ${steamHashName}`)
        if (priceInfo) {
          return {
            name: sticker.name,
            steamHashName: steamHashName,
            ...priceInfo
          }
        }
        return null
      })

      const stickerResults = await Promise.all(stickerPricePromises)
      priceData.stickers = stickerResults.filter(item => item !== null)
    }

    // 查询挂件价格
    if (item.hasPendant && item.pendants && item.pendants.length > 0) {
      const pendant = item.pendants[0]
      const steamHashName = pendant.steamHashName
      if (steamHashName) {
        const priceInfo = await fetchAccessoryPrice(steamHashName)
        if (priceInfo) {
          priceData.pendant = {
            name: pendant.name,
            steamHashName: steamHashName,
            ...priceInfo
          }
        }
      }
    }

    // 存储价格信息
    supplyPriceInfo.value.set(steamAssetId, priceData)
  }

  // 获取供应物品的价格信息
  const getSupplyItemPriceInfo = (steamAssetId) => {
    return supplyPriceInfo.value.get(steamAssetId) || { stickers: [], pendant: null }
  }

  // 批量获取改名信息（自动调用，只获取第一条）
  const fetchAllNameTags = async (commodityList) => {
    // 筛选出有改名标签的商品
    const commoditiesWithNameTag = commodityList.filter(item => item.haveNameTag === 1)
    
    if (commoditiesWithNameTag.length === 0) {
      return
    }

    // 只自动获取第一条
    
    const commodity = commoditiesWithNameTag[0]
    
    try {
      
      // 调用接口获取详细信息 - 使用V2 API
      const response = await axios.post(
        `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getWeaponDetail`,
        {
          steamId: selectedSteamId.value,
          id: commodity.id
        }
      )

      if (response.data.success && response.data.data) {
        const detailData = response.data.data.Data
        const nameTags = detailData.NameTags || []
        
        // 缓存改名信息到商品对象中
        commodity.nameTags = nameTags
        commodity.nameTagText = nameTags.length > 0 ? nameTags[0].replace(/^名称标签：[""]?|[""]$/g, '') : ''
        
      } else {
        console.error(`获取商品 ${commodity.id} 改名信息失败:`, response.data.message)
      }
    } catch (error) {
      console.error(`获取商品 ${commodity.id} 改名信息异常:`, error)
    }
    
  }

  // 获取单个商品的改名信息（点击按钮时调用）
  const fetchSingleNameTag = async (commodity) => {
    try {
      // 设置加载状态
      commodity.nameTagLoading = true


      // 调用接口获取详细信息 - 使用V2 API
      const response = await axios.post(
        `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getWeaponDetail`,
        {
          steamId: selectedSteamId.value,
          id: commodity.id
        }
      )


      if (response.data.success && response.data.data) {
        const detailData = response.data.data.Data
        const nameTags = detailData.NameTags || []
        
        // 缓存改名信息到商品对象中
        commodity.nameTags = nameTags
        commodity.nameTagText = nameTags.length > 0 ? nameTags[0].replace(/^名称标签：[""]?|[""]$/g, '') : ''

        if (nameTags.length === 0) {
          ElMessage.info('该商品没有改名信息')
        }
      } else {
        ElMessage.error('获取改名信息失败: ' + (response.data.message || '未知错误'))
      }
    } catch (error) {
      console.error('获取改名信息失败:', error)
      ElMessage.error('获取改名信息失败: ' + (error.response?.data?.message || error.message))
    } finally {
      commodity.nameTagLoading = false
    }
  }

  // 批量获取印花/挂件价格
  const fetchStickerPrices = async (commodityList) => {
    if (!commodityList || commodityList.length === 0) {
      return
    }


    // 收集所有需要查询的 steam_hash_name
    const steamHashNames = new Set()
    
    commodityList.forEach(item => {
      // 设置加载状态
      item.priceLoading = true
      
      // 收集印花的 steam_hash_name（优先 TemplateHashName，回退 SteamHashName）
      if (item.stickers && item.stickers.length > 0) {
        item.stickers.forEach(sticker => {
          const hashName = sticker.TemplateHashName || sticker.SteamHashName || sticker.steam_hash_name
          if (hashName) {
            steamHashNames.add(hashName)
          }
        })
      }
      
      // 收集挂件的 steam_hash_name
      if (item.pendants && item.pendants.length > 0) {
        item.pendants.forEach(pendant => {
          const hashName = pendant.steamHashName || pendant.steam_hash_name
          if (hashName) {
            steamHashNames.add(hashName)
          }
        })
      }
    })

    if (steamHashNames.size === 0) {
      commodityList.forEach(item => {
        item.priceLoading = false
      })
      return
    }


    try {
      // 调用批量查询接口
      const apiUrl = apiUrls.itemSearchBatchStickerPrices()
      const response = await axios.post(
        apiUrl,
        {
          steam_hash_names: Array.from(steamHashNames)
        }
      )

      if (response.data.success) {
        const priceMap = response.data.data

        // 更新每个商品的印花/挂件价格信息
        commodityList.forEach(item => {
          let stickerTotalValue = 0
          let pendantTotalValue = 0

          // 处理印花价格
          if (item.stickers && item.stickers.length > 0) {
            item.stickers.forEach(sticker => {
              const hashName = sticker.TemplateHashName || sticker.SteamHashName || sticker.steam_hash_name
              if (hashName && priceMap[hashName]) {
                const priceInfo = priceMap[hashName]
                sticker.priceInfo = priceInfo
                
                // 累加价格（优先使用悠悠有品价格）
                const price = parseFloat(priceInfo.yyyp_price || priceInfo.buff_price || 0)
                stickerTotalValue += price
              }
            })
          }

          // 处理挂件价格
          if (item.pendants && item.pendants.length > 0) {
            item.pendants.forEach(pendant => {
              const hashName = pendant.steamHashName || pendant.steam_hash_name
              if (hashName && priceMap[hashName]) {
                const priceInfo = priceMap[hashName]
                pendant.priceInfo = priceInfo
                
                // 累加价格（优先使用悠悠有品价格）
                const price = parseFloat(priceInfo.yyyp_price || priceInfo.buff_price || 0)
                pendantTotalValue += price
              }
            })
          }

          // 设置总价值
          item.stickerTotalValue = stickerTotalValue.toFixed(2)
          item.pendantTotalValue = pendantTotalValue.toFixed(2)
          item.priceLoading = false
        })

      } else {
        console.error('批量查询价格失败:', response.data.message)
        commodityList.forEach(item => {
          item.priceLoading = false
        })
      }
    } catch (error) {
      console.error('批量查询价格异常:', error)
      commodityList.forEach(item => {
        item.priceLoading = false
      })
    }
  }

  // 显示印花信息对话框
  const showStickersDialog = (commodity) => {
    const stickers = commodity.stickers || []
    
    if (stickers.length === 0) {
      ElMessage.info('该商品没有印花')
      return
    }

    // 最多显示5个印花
    const displayStickers = stickers.slice(0, 5)

    // 构建印花信息HTML - 横向平铺展示（自适应宽度）
    let stickersHtml = `
      <div style="padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #303133; font-size: 16px;">${commodity.commodityName}</h4>
          <p style="margin: 0; color: #909399; font-size: 14px;">印花数量：${stickers.length} 个${stickers.length > 5 ? '（显示前5个）' : ''}</p>
        </div>
        
        <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: nowrap;">
    `
    
    displayStickers.forEach((sticker, index) => {
      stickersHtml += `
        <div style="text-align: center; min-width: 110px; flex-shrink: 0;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="background: white; border-radius: 8px; padding: 8px; margin-bottom: 8px;">
              <img src="${sticker.ImgUrl}" style="width: 70px; height: 52px; object-fit: contain; display: block; margin: 0 auto;" />
            </div>
            <div style="color: white; font-size: 11px; margin-bottom: 4px;">
              <strong>位置 ${sticker.RawIndex !== null ? sticker.RawIndex + 1 : '-'}</strong>
            </div>
            <div style="background: rgba(255,255,255,0.2); border-radius: 4px; padding: 3px 6px; font-size: 11px; color: white;">
              磨损: ${sticker.Abrade || '-'}
            </div>
            ${sticker.priceV1 ? `
              <div style="margin-top: 6px; background: rgba(255,255,255,0.9); border-radius: 4px; padding: 3px 6px; font-size: 12px; color: #f56c6c; font-weight: 600;">
                ${sticker.priceV1}
              </div>
            ` : ''}
          </div>
          <div style="margin-top: 6px; font-size: 11px; color: #606266; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${sticker.Name || '-'}">
            ${sticker.Name || '-'}
          </div>
        </div>
      `
    })
    
    stickersHtml += `
        </div>
      </div>
    `
    
    // 根据印花数量计算对话框宽度（最多5个印花）
    // 每个卡片宽度110px，间距15px，加上对话框内边距和额外空间
    // 计算公式：卡片数量*110 + (卡片数量-1)*15 + 对话框边距和额外空间
    const dialogWidth = displayStickers.length * 110 + (displayStickers.length - 1) * 15 + 160
    
    ElMessageBox({
      title: '印花信息',
      message: stickersHtml,
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
      customClass: 'stickers-dialog',
      width: `${dialogWidth}px`
    }).catch(() => {
      // 用户点击关闭或取消时，忽略错误
    })
  }

  // 关闭悠悠有品商品列表，返回搜索结果
  const closeYYYPList = () => {
    showYYYPList.value = false
    showSearchResults.value = true
    yyypCommodities.value = []
    yyypCurrentWeapon.value = null
  }

  // 切换搜索结果的展开/折叠
  const toggleSearchResults = () => {
    showSearchResults.value = !showSearchResults.value
  }

  // 切换悠悠有品表格的展开/折叠
  const toggleYYYPList = () => {
    showYYYPTable.value = !showYYYPTable.value
  }

  // 当前正在查看的饰品名称（用于“搜索结果”标题处展示）
  const currentViewingWeaponName = computed(() => {
    if (showYYYPList.value && yyypCurrentWeapon.value?.market_listing_item_name) {
      return yyypCurrentWeapon.value.market_listing_item_name
    }
    if (showBuffList.value && buffCurrentWeapon.value?.market_listing_item_name) {
      return buffCurrentWeapon.value.market_listing_item_name
    }
    return ''
  })

  // 旧的对话框函数（已废弃，保留以防需要）
  const showYYYPCommoditiesDialog_OLD = (row, commodities, total) => {
    // 构建商品列表HTML
    let commoditiesHtml = `
      <div style="max-height: 500px; overflow-y: auto;">
        <p style="margin-bottom: 15px; color: #606266;">
          <strong>武器名称：</strong>${row.market_listing_item_name}<br/>
          <strong>悠悠有品ID：</strong>${row.yyyp_id}<br/>
          <strong>商品总数：</strong>${total} 条
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f5f7fa; border-bottom: 2px solid #dcdfe6;">
              <th style="padding: 10px; text-align: left; border: 1px solid #dcdfe6;">商品名称</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #dcdfe6; width: 100px;">价格</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #dcdfe6; width: 80px;">磨损</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #dcdfe6; width: 100px;">操作</th>
            </tr>
          </thead>
          <tbody>
    `
    
    if (commodities.length === 0) {
      commoditiesHtml += `
        <tr>
          <td colspan="4" style="padding: 20px; text-align: center; color: #909399;">暂无商品数据</td>
        </tr>
      `
    } else {
      commodities.forEach((item, index) => {
        const price = item.price ? (item.price / 100).toFixed(2) : '-'
        const abrade = item.abrade ? item.abrade.toFixed(4) : '-'
        const commodityUrl = `https://www.youpin898.com/goodInfo?id=${item.id}`
        
        commoditiesHtml += `
          <tr style="border-bottom: 1px solid #ebeef5; ${index % 2 === 0 ? 'background-color: #fafafa;' : ''}">
            <td style="padding: 10px; border: 1px solid #ebeef5;">
              <div style="display: flex; align-items: center;">
                ${item.iconUrl ? `<img src="${item.iconUrl}" style="width: 40px; height: 30px; margin-right: 10px; object-fit: contain;" />` : ''}
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.commodityName || '-'}</span>
              </div>
            </td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ebeef5;">
              <span style="color: #f56c6c; font-weight: bold;">¥${price}</span>
            </td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ebeef5;">${abrade}</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ebeef5;">
              <a href="${commodityUrl}" target="_blank" style="color: #409eff; text-decoration: none;">查看详情</a>
            </td>
          </tr>
        `
      })
    }
    
    commoditiesHtml += `
          </tbody>
        </table>
      </div>
    `
    
    ElMessageBox({
      title: '悠悠有品商品列表',
      message: commoditiesHtml,
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
      customClass: 'yyyp-commodities-dialog',
      width: '900px'
    })
  }
  
  // 切换popover显示
  const togglePopover = (row) => {
    if (activePopoverRow.value === row) {
      activePopoverRow.value = null
    } else {
      activePopoverRow.value = row
    }
  }
  
  // 选择平台并搜索
  const selectPlatform = (row, platform) => {
    activePopoverRow.value = null // 关闭popover
    
    if (platform === 'yyyp') {
      handleSearchYYYPByRow(row)
    } else if (platform === 'buff') {
      handleSearchBuffByRow(row)
    } else if (platform === 'csfloat') {
      handleSearchCsFloatByRow(row)
    } else if (platform === 'all') {
      handleSearchAllPlatforms(row)
    }
  }

  // 同时搜索悠悠有品和BUFF
  const handleSearchAllPlatforms = async (row) => {
    
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }

    // 检查是否有悠悠有品ID或BUFF ID
    const hasYYYPId = row.yyyp_id
    const hasBuffId = row.buff_id
    
    if (!hasYYYPId && !hasBuffId) {
      ElMessage.warning('该武器没有悠悠有品ID和BUFF ID')
      return
    }

    isSearching.value = true
    searchSource.value = 'all'
    
    try {
      ElMessage.info('正在同时搜索悠悠有品和BUFF...')
      
      // 并行请求悠悠有品和BUFF
      const promises = []
      
      if (hasYYYPId) {
        promises.push(handleSearchYYYPByRow(row))
      }
      
      if (hasBuffId) {
        promises.push(handleSearchBuffByRow(row))
      }
      
      await Promise.all(promises)
      
      ElMessage.success('全部平台搜索完成！')
      
    } catch (error) {
      console.error('搜索全部平台失败:', error)
      ElMessage.error('搜索失败，请重试')
    } finally {
      setTimeout(() => {
        isSearching.value = false
        searchSource.value = ''
      }, 300)
    }
  }

  // 通过行数据搜索BUFF
  const handleSearchBuffByRow = async (row) => {
    
    if (!row.buff_id) {
      ElMessage.warning('该武器没有BUFF ID')
      return
    }

    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }

    isSearching.value = true
    searchSource.value = 'buff'
    
    try {
      
      // 构建请求数据
      const requestData = {
        steamId: selectedSteamId.value || '',
        goodsId: row.buff_id
      }
      
      const apiUrl = apiUrls.buffGetCommodities()
      
      
      // 调用BUFF商品列表API
      const response = await axios.post(apiUrl, requestData)
      
      
      if (response.data.success) {
        const parsedData = response.data.data
        
        // 直接使用Spider解析后的数据
        const commodityList = parsedData.commodityList || []
        const totalCount = parsedData.totalCount || 0
        const buyNum = parsedData.buy_num || 0
        const sellNum = parsedData.sell_num || 0
        const rentNum = parsedData.rent_num || 0
        const totalPage = parsedData.totalPage || 1
        
        
        // 更新BUFF状态，显示商品列表
        buffCurrentWeapon.value = row
        buffCommodities.value = commodityList
        buffTotalCount.value = totalCount
        buffBuyNum.value = buyNum
        buffRentNum.value = rentNum
        buffCurrentPage.value = 1  // 重置分页到第一页
        buffTotalPage.value = totalPage  // 设置总页数
        buffHasMore.value = totalPage > 1  // 判断是否还有更多
        showBuffList.value = true
        // showYYYPList.value = false  // 允许同时显示两个列表
        showSearchResults.value = false  // 折叠搜索结果
        
        ElMessage.success(`成功获取 ${commodityList.length} 条商品数据，在售总数: ${totalCount}（求购:${buyNum}, 租赁:${rentNum}）`)
        
        // 预加载图片（相同URL只加载一次）
        preloadImages(commodityList)
        
        // 批量获取印花/挂件价格
        fetchStickerPrices(commodityList)
        
        // 滚动到商品列表区域
        setTimeout(() => {
          const listElement = document.querySelector('.buff-commodity-list')
          if (listElement) {
            listElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
        
      } else {
        console.error('API返回失败:', response.data)
        ElMessage.error(response.data.message || '获取商品列表失败')
      }
      
    } catch (error) {
      console.error('搜索BUFF失败 - 完整错误:', error)
      console.error('错误响应:', error.response)
      console.error('错误数据:', error.response?.data)
      
      const errorMessage = error.response?.data?.message || error.message || '搜索失败，请检查网络连接'
      ElMessage.error(errorMessage)
    } finally {
      isSearching.value = false
      searchSource.value = ''
    }
  }

  // 通过行数据搜索CsFloat
  const handleSearchCsFloatByRow = async (row) => {
    if (!row.steam_hash_name) {
      ElMessage.warning('该武器没有Steam Hash Name')
      return
    }

    isSearching.value = true
    searchSource.value = 'csfloat'
    
    try {
      
      // 对hash name进行URL编码
      const encodedName = encodeURIComponent(row.steam_hash_name)
      
      // 构建CsFloat搜索URL
      const csfloatUrl = `https://csfloat.com/search?name=${encodedName}`
      
      // 在新窗口中打开CsFloat搜索页面
      window.open(csfloatUrl, '_blank')
      
      ElMessage.success(`正在跳转到CsFloat: ${row.market_listing_item_name}`)
      
    } catch (error) {
      console.error('搜索CsFloat失败:', error)
      ElMessage.error('跳转失败,请检查浏览器设置是否允许弹出窗口')
    } finally {
      // 延迟关闭加载状态,给用户反馈
      setTimeout(() => {
        isSearching.value = false
      }, 300)
    }
  }

  const handleClearSearch = () => {
    searchKeyword.value = ''
    searchResults.value = []
    searchSource.value = ''
    selectedExterior.value = ''
    selectedStatTrak.value = 'normal' // 重置为默认值：非StatTrak™
    currentPage.value = 1
    ElMessage.info('已重置搜索')
  }

  const handleViewDetails = (item) => {
    ElMessage.info(`查看详情: ${item.name}`)
    // TODO: 实现详情查看功能
  }

  const handleSizeChange = (val) => {
    pageSize.value = val
    currentPage.value = 1
  }

  const handleCurrentChange = (val) => {
    currentPage.value = val
  }

  // BUFF分页切换
  const handleBuffPageChange = (val) => {
    buffCurrentPage.value = val
  }

  // 悠悠有品分页切换
  const handleYYYPPageChange = (val) => {
    yyypCurrentPage.value = val
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
    // 将失败的steam_hash_name添加到404缓存中
    if (steamHashName) {
      image404Cache.value.add(steamHashName)
    }
    // 设置默认图片或隐藏
    event.target.style.display = 'none'
  }

  // 获取图片URL（用于印花、挂件等）
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return ''
    // 如果已经是完整URL，直接返回
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }
    // 如果是相对路径，返回原路径
    return imageUrl
  }

  // 获取印花图片URL
  const getStickerImageUrl = (sticker) => {
    if (!sticker) return ''

    // 优先使用 steamHashName，本地请求时需要拼接 "Sticker | " 前缀
    if (sticker.steamHashName) {
      const localPath = getWeaponImage(`Sticker | ${sticker.steamHashName}`)
      if (localPath) return localPath
    }

    // 直接降级到远程URL
    return sticker.imgUrl || sticker.img || sticker.imageUrl || ''
  }

  // 获取挂件图片URL
  const getPendantImageUrl = (pendant) => {
    if (!pendant) return ''

    // 优先使用 steamHashName
    if (pendant.steamHashName) {
      const localPath = getWeaponImage(pendant.steamHashName)
      if (localPath) return localPath
    }

    // 降级使用 hashName
    if (pendant.hashName) {
      const localPath = getWeaponImage(pendant.hashName)
      if (localPath) return localPath
    }

    // 最后降级到远程URL
    return pendant.imgUrl || pendant.img || pendant.imageUrl || ''
  }

  // 处理卡片点击
  const handleCardClick = (item, event) => {
    // 获取鼠标点击位置
    const x = event.clientX
    const y = event.clientY
    
    // 设置弹出框位置和内容
    cardPopoverPosition.value = { x, y }
    selectedCardItem.value = item
    showCardPopover.value = true
  }

  // 处理商品卡片点击
  const handleCommodityCardClick = (item, type, event) => {
    if (isMultiSelectMode.value) {
      // 多选模式下切换选中状态
      toggleCommoditySelection(item, type)
    } else {
      // 非多选模式打开详情弹窗
      commodityPreviewItem.value = item
      commodityPreviewType.value = type
      commodityPreviewVisible.value = true
      
      // 如果商品有印花或挂件，且还没有价格信息，则获取价格
      const needsFetch = (item.stickers && item.stickers.length > 0 && !item.stickers[0].priceInfo) ||
                        (item.pendants && item.pendants.length > 0 && !item.pendants[0].priceInfo)
      
      if (needsFetch) {
        fetchStickerPrices([item])
      }
    }
  }

  // 切换多选模式
  const toggleMultiSelectMode = () => {
    isMultiSelectMode.value = !isMultiSelectMode.value
    if (!isMultiSelectMode.value) {
      // 退出多选模式时清空选择
      selectedCommodities.value = []
      selectedCommodityType.value = ''
    }
  }

  // 判断商品是否被选中
  const isCommoditySelected = (item) => {
    return selectedCommodities.value.some(c => c.id === item.id)
  }

  // 切换商品选中状态
  const toggleCommoditySelection = (item, type) => {
    // 如果切换了平台类型，清空之前的选择
    if (selectedCommodityType.value && selectedCommodityType.value !== type) {
      selectedCommodities.value = []
    }
    selectedCommodityType.value = type
    
    const index = selectedCommodities.value.findIndex(c => c.id === item.id)
    if (index > -1) {
      selectedCommodities.value.splice(index, 1)
    } else {
      selectedCommodities.value.push(item)
    }
  }

  // 清空选择
  const clearCommoditySelection = () => {
    selectedCommodities.value = []
    selectedCommodityType.value = ''
  }

  // 全选当前列表
  const selectAllCommodities = (type) => {
    selectedCommodityType.value = type
    if (type === 'buff') {
      selectedCommodities.value = [...buffCommodities.value]
    } else if (type === 'yyyp') {
      selectedCommodities.value = [...yyypCommodities.value]
    }
    ElMessage.success(`已选择 ${selectedCommodities.value.length} 件商品`)
  }

  // 批量购买
  const handleBatchBuy = async () => {
    if (selectedCommodities.value.length === 0) {
      ElMessage.warning('请先选择要购买的商品')
      return
    }
    
    const totalPrice = selectedCommodities.value.reduce((sum, item) => {
      return sum + parseFloat(item.price || 0)
    }, 0)
    
    try {
      await ElMessageBox.confirm(
        `确定要批量购买 ${selectedCommodities.value.length} 件商品吗？\n总价: ¥${totalPrice.toFixed(2)}\n\n购买将自动执行，无需再次确认。`,
        '批量购买确认',
        {
          confirmButtonText: '确定购买',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      // 显示批量购买进度
      const loadingMessage = ElMessage({
        message: `正在批量购买 0/${selectedCommodities.value.length} 件商品...`,
        type: 'info',
        duration: 0,
        customClass: 'batch-buy-loading-message'
      })
      
      let successCount = 0
      let failCount = 0
      const failedItems = []
      
      // 执行批量购买
      if (selectedCommodityType.value === 'buff') {
        for (let i = 0; i < selectedCommodities.value.length; i++) {
          const item = selectedCommodities.value[i]
          loadingMessage.message = `正在购买 ${i + 1}/${selectedCommodities.value.length} 件商品...\n${item.commodityName || item.name || '商品'}`
          
          try {
            // BUFF购买逻辑（暂未实现）
            // TODO: 实现BUFF购买
            successCount++
          } catch (error) {
            console.error('购买失败:', error)
            failCount++
            failedItems.push(item.commodityName || item.name || '未知商品')
          }
          
          // 添加延迟避免请求过快
          if (i < selectedCommodities.value.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      } else if (selectedCommodityType.value === 'yyyp') {
        for (let i = 0; i < selectedCommodities.value.length; i++) {
          const item = selectedCommodities.value[i]
          loadingMessage.message = `正在购买 ${i + 1}/${selectedCommodities.value.length} 件商品...\n${item.commodityName || '商品'}`
          
          try {
            // 静默购买悠悠有品商品
            const requestData = {
              steamId: selectedSteamId.value,
              commodityId: item.id,
              buyQuantity: 1,
              price: item.price,
              autoConfirmPayment: true,
              pollPayment: true
            }
            
            const response = await axios.post(
              `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/buyCommodity`,
              requestData
            )
            
            if (response.data.success) {
              successCount++
            } else {
              failCount++
              failedItems.push(item.commodityName || '未知商品')
              console.error(`购买失败 [${i + 1}/${selectedCommodities.value.length}]:`, response.data.message)
            }
          } catch (error) {
            console.error('购买失败:', error)
            failCount++
            failedItems.push(item.commodityName || '未知商品')
          }
          
          // 添加延迟避免请求过快
          if (i < selectedCommodities.value.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
      
      loadingMessage.close()
      
      // 显示批量购买结果
      let resultMessage = `批量购买完成！\n\n`
      resultMessage += `成功：${successCount} 件\n`
      resultMessage += `失败：${failCount} 件\n`
      resultMessage += `总价：¥${totalPrice.toFixed(2)}`
      
      if (failedItems.length > 0) {
        resultMessage += `\n\n失败商品：\n${failedItems.slice(0, 5).join('\n')}`
        if (failedItems.length > 5) {
          resultMessage += `\n... 还有 ${failedItems.length - 5} 件`
        }
      }
      
      ElMessageBox.alert(
        resultMessage,
        '批量购买结果',
        {
          confirmButtonText: '知道了',
          type: successCount > 0 ? 'success' : 'warning',
          callback: () => {
            if (successCount > 0) {
              ElMessage.success(`成功购买 ${successCount} 件商品`)
            }
          }
        }
      )
      
      clearCommoditySelection()
      
      // 如果有成功购买的商品，自动刷新列表
      if (successCount > 0) {
        setTimeout(async () => {
          if (selectedCommodityType.value === 'yyyp' && yyypCurrentWeapon.value) {
            await handleRefreshYYYP()
          } else if (selectedCommodityType.value === 'buff' && buffCurrentWeapon.value) {
            await handleRefreshBuff()
          }
        }, 1000) // 延迟1秒刷新，确保后端数据已更新
      }
      
    } catch (e) {
      if (e !== 'cancel') {
        console.error('批量购买失败:', e)
        ElMessage.error('批量购买失败: ' + (e.message || '未知错误'))
      }
    }
  }

  // 获取商品标题
  const getCommodityTitle = (item) => {
    if (!item) return ''
    return item.itemName || item.name || '商品详情'
  }

  // 显示印花放大预览
  const showStickerPreview = (sticker) => {
    let imageUrl = ''
    let name = ''
    
    if (sticker.TemplateHashName) {
      imageUrl = getWeaponImage(sticker.TemplateHashName)
      name = sticker.Name || '印花'
    } else if (sticker.ImgUrl || sticker.img_url) {
      imageUrl = sticker.ImgUrl || sticker.img_url
      name = sticker.Name || sticker.name || '印花'
    }
    
    if (imageUrl) {
      stickerPreviewData.value = {
        name: name,
        imageUrl: imageUrl,
        type: '印花'
      }
      stickerPreviewVisible.value = true
    }
  }

  // 显示挂件放大预览
  const showPendantPreview = (pendant) => {
    let imageUrl = ''
    let name = ''
    
    if (pendant.steamHashName) {
      imageUrl = getWeaponImage(pendant.steamHashName)
      name = pendant.name || '挂件'
    } else if (pendant.imgUrl) {
      imageUrl = pendant.imgUrl
      name = pendant.name || '挂件'
    }
    
    if (imageUrl) {
      stickerPreviewData.value = {
        name: pendant.pendantSourceName || name,
        imageUrl: imageUrl,
        type: '挂件'
      }
      stickerPreviewVisible.value = true
    }
  }

  // 从详情弹窗购买商品
  const handleBuyCommodityFromPreview = () => {
    commodityPreviewVisible.value = false
    if (commodityPreviewType.value === 'buff') {
      handleBuyBuffCommodity(commodityPreviewItem.value)
    } else if (commodityPreviewType.value === 'yyyp') {
      handleBuyCommodity(commodityPreviewItem.value)
    }
  }

  // 获取商品预览按钮文本
  const getPreviewButtonText = computed(() => {
    if (commodityPreviewType.value === 'yyyp' && yyypFilterType.value === 'on_lease') {
      return '租用'
    }
    return '购买'
  })

  // 获取商品预览按钮类型
  const getPreviewButtonType = computed(() => {
    if (commodityPreviewType.value === 'yyyp' && yyypFilterType.value === 'on_lease') {
      return 'primary'  // 蓝色 - 租用
    }
    return 'success'  // 绿色 - 购买
  })

  // 判断商品预览按钮是否禁用
  const isPreviewButtonDisabled = computed(() => {
    return commodityPreviewType.value === 'yyyp' && yyypFilterType.value === 'on_lease'
  })

  // 打开 CSQAQ 网站
  const openCSQAQ = async (item) => {
    try {
      // 获取武器名称（market_listing_item_name 格式）
      const weaponName = item.market_listing_item_name
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
      const steamHashName = item.steam_hash_name
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

  // 当前选中的武器（供 CSQAQ 组件使用）：仅在选择悠悠有品或 BUFF 并加载对应列表后有值，不因搜索而自动取第一条
  const chartWeapon = computed(() => yyypCurrentWeapon.value || buffCurrentWeapon.value)
  watch(chartWeapon, () => {
    headerStatisticValue.value = null
  })

  const openStatisticFromHeader = () => {
    document.querySelector('.chart-card')?.scrollIntoView({ behavior: 'smooth' })
    // 通知 CSQAQ 子组件打开存世量曲线对话框
    statisticDialogTrigger.value++
  }

  // 悠悠有品筛选处理
  const handleYYYPFilterChange = async (filterType) => {

    // 更新筛选类型
    yyypFilterType.value = filterType

    // 如果当前没有选中的武器，不执行操作
    if (!yyypCurrentWeapon.value) {
      ElMessage.warning('请先选择武器')
      return
    }

    // 重新加载商品列表（在售/在租均用 buildYYYPListRequest，以便点击外观 bar 时列表按选中外观的 templateId 切换）
    try {
      isSearching.value = true

      const requestData = (filterType === 'on_sale' || filterType === 'on_lease')
        ? buildYYYPListRequest(yyypCurrentWeapon.value.yyyp_id, 1, 50)
        : {
            steamId: selectedSteamId.value || '',
            yyypId: yyypCurrentWeapon.value.yyyp_id,
            pageIndex: 1,
            pageSize: 50
          }

      // 根据筛选类型选择对应的V2 API
      let apiUrl
      switch (filterType) {
        case 'on_sale':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getCommodityList`
          break
        case 'on_lease':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_lease/getCommodityList`
          break
        case 'presale':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/presale/getCommodityList`
          break
        case 'wanted':
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/purchase_order/getCommodityList`
          break
        default:
          apiUrl = `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/item_search/on_sale/getCommodityList`
      }
      const response = await axios.post(apiUrl, requestData)

      if (response.data.success) {
        const parsedData = response.data.data
        const commodityList = parsedData.commodityList || []
        const totalCount = parsedData.totalCount || 0

        if (filterType === 'on_sale' && (parsedData.buyPriceSortList?.length || parsedData.abradeRangeList?.length || parsedData.filters?.length)) {
          yyypListConfig.value = {
            buyPriceSortList: parsedData.buyPriceSortList || [],
            abradeRangeList: parsedData.abradeRangeList || [],
            filters: parsedData.filters || []
          }
          if (!yyypSortTypeKey.value && parsedData.buyPriceSortList?.[0]?.sortTypeKey) {
            yyypSortTypeKey.value = parsedData.buyPriceSortList[0].sortTypeKey
          }
        }

        // 更新商品列表
        yyypCommodities.value = commodityList
        yyypTotalCount.value = totalCount
        yyypCurrentPage.value = 1
        yyypHasMore.value = commodityList.length < totalCount

        const filterTypeText = {
          'on_sale': '在售',
          'on_lease': '在租',
          'presale': '预售',
          'wanted': '求购',
          'sold': '成交',
          'price_trend': '价格走势'
        }[filterType] || filterType

        ElMessage.success(`成功获取${filterTypeText}数据: ${commodityList.length} 条，总数: ${totalCount}`)

        // 预加载图片和价格
        preloadImages(commodityList)
        fetchStickerPrices(commodityList)
        // 改名信息不自动获取，由用户手动触发
        // fetchAllNameTags(commodityList)
      } else {
        ElMessage.error(response.data.message || '获取数据失败')
      }
    } catch (error) {
      console.error('切换筛选类型失败:', error)
      ElMessage.error(error.response?.data?.message || '切换筛选类型失败')
    } finally {
      isSearching.value = false
    }
  }

  // 排序变更（在售列表）：更新 sortTypeKey 并重新请求第一页
  const handleYYYPSortChange = async (sortTypeKey) => {
    if (yyypFilterType.value !== 'on_sale' || !yyypCurrentWeapon.value) return
    yyypSortTypeKey.value = sortTypeKey || ''
    await handleYYYPFilterChange('on_sale')
  }

  // 磨损区间变更（在售/在租）：更新 wearRange 并重新请求第一页；在租时红框点击也走此逻辑
  const handleYYYPWearRangeChange = async (wearRangeValue) => {
    if (!yyypCurrentWeapon.value) return
    if (yyypFilterType.value !== 'on_sale' && yyypFilterType.value !== 'on_lease') return
    yyypWearRange.value = wearRangeValue || ''
    await handleYYYPFilterChange(yyypFilterType.value)
  }

  // 表头外观变更（在售/在租）：更新 exterior 并重新请求第一页；红框点击外观标签均走此逻辑
  const handleYYYPExteriorChange = async (exteriorValue) => {
    if (!yyypCurrentWeapon.value) return
    if (yyypFilterType.value !== 'on_sale' && yyypFilterType.value !== 'on_lease') return
    yyypExterior.value = exteriorValue || ''
    await handleYYYPFilterChange(yyypFilterType.value)
  }

  // getTemplateInfo 返回的列表配置（Filters/BuyPriceSortList/AbradeRangeList）用于排序、磨损、外观
  const handleTemplateInfoConfig = (payload) => {
    if (payload && (payload.buyPriceSortList?.length || payload.abradeRangeList?.length || payload.filters?.length)) {
      yyypListConfig.value = {
        buyPriceSortList: payload.buyPriceSortList || [],
        abradeRangeList: payload.abradeRangeList || [],
        filters: payload.filters || []
      }
    }
  }

  // 高级筛选应用：payload 为 { extraParams, wearRange }；在售/在租均支持，样式一致
  const handleYYYPAdvancedFilter = async (payload) => {
    if (!yyypCurrentWeapon.value) {
      ElMessage.warning('请先选择武器')
      return
    }
    if (yyypFilterType.value !== 'on_sale' && yyypFilterType.value !== 'on_lease') return
    const isObj = payload && typeof payload === 'object' && !Array.isArray(payload)
    const extra = isObj && payload.extraParams !== undefined ? payload.extraParams : (isObj ? payload : {})
    const wearRange = isObj ? payload.wearRange : undefined
    yyypExtraParams.value = extra && typeof extra === 'object' ? extra : {}
    if (wearRange !== undefined) yyypWearRange.value = wearRange
    await handleYYYPFilterChange(yyypFilterType.value)
    ElMessage.success('筛选条件已应用')
  }

  // 重置筛选：清空排序、磨损、外观、高级筛选并重新请求列表（在售/在租均支持）
  const handleResetYYYPFilter = async () => {
    if (!yyypCurrentWeapon.value) return
    if (yyypFilterType.value !== 'on_sale' && yyypFilterType.value !== 'on_lease') return
    yyypSortTypeKey.value = ''
    yyypWearRange.value = ''
    yyypExterior.value = ''
    yyypExtraParams.value = {}
    await handleYYYPFilterChange(yyypFilterType.value)
    ElMessage.success('已重置筛选')
  }

  // 向子组件提供共享方法
  provide('isCommoditySelected', isCommoditySelected)
  provide('getWeaponImage', getWeaponImage)

  let unwatchDevice = null

  // 页面加载时获取Steam ID列表
  onMounted(async () => {
    const deviceType = applyDeviceClass()

    unwatchDevice = watchDeviceType((newDeviceType) => {
    })

    await loadSteamIdList()

    // 检查 URL 参数中是否有 keyword，如果有则自动搜索
    const keyword = route.query.keyword
    if (keyword) {
      searchKeyword.value = decodeURIComponent(keyword)
      // 延迟执行搜索，确保页面已完全加载
      setTimeout(() => {
        // 从URL参数跳转时，启用自动"全部搜索"功能，并使用精确匹配
        handleSearchWeapon(true, true)  // autoSearchAll=true, exactMatch=true
      }, 300)
    }
  })

  onUnmounted(() => {
    if (unwatchDevice) {
      unwatchDevice()
    }
  })

  return {
    // Icons
    CaretRight,
    CaretBottom,
    Refresh,
    Check,
    Loading,
    // 搜索与分页
    searchKeyword,
    searchResults,
    isSearching,
    searchSource,
    currentPage,
    pageSize,
    paginatedResults,
    filteredResults,
    steamIdList,
    selectedSteamId,
    selectedExterior,
    selectedStatTrak,
    showSearchResults,
    displayMode,
    toggleSearchResults,
    currentViewingWeaponName,
    headerStatisticValue,
    statisticDialogTrigger,
    handleSearchWeapon,
    handleRefreshSearch,
    handleSteamIdChange,
    handleExteriorChange,
    handleStatTrakChange,
    querySearchAsync,
    handleSelect,
    getWeaponImage,
    handleImageError,
    getImageUrl,
    getStickerImageUrl,
    getPendantImageUrl,
    handleCardClick,
    // 卡片弹出框
    showCardPopover,
    cardPopoverPosition,
    selectedCardItem,
    // 商品详情弹窗
    commodityPreviewVisible,
    commodityPreviewItem,
    commodityPreviewType,
    handleCommodityCardClick,
    getCommodityTitle,
    handleBuyCommodityFromPreview,
    getPreviewButtonText,
    getPreviewButtonType,
    isPreviewButtonDisabled,
    // 印花/挂件预览
    stickerPreviewVisible,
    stickerPreviewData,
    showStickerPreview,
    showPendantPreview,
    // 多选模式
    isMultiSelectMode,
    selectedCommodities,
    selectedCommodityType,
    toggleMultiSelectMode,
    isCommoditySelected,
    toggleCommoditySelection,
    clearCommoditySelection,
    selectAllCommodities,
    handleBatchBuy,
    // BUFF商品列表
    buffCommodities,
    buffCurrentWeapon,
    buffTotalCount,
    buffBuyNum,
    buffRentNum,
    showBuffList,
    showBuffTable,
    buffCurrentPage,
    buffPageSize,
    buffLoadingMore,
    buffHasMore,
    buffTotalPage,
    paginatedBuffCommodities,
    toggleBuffList,
    handleRefreshBuff,
    handleBuyBuffCommodity,
    handlePublishBuffBuyOrder,
    buffBalance,
    fetchBuffBalance,
    handleBuffPageChange,
    loadMoreBuffCommodities,
    handleBuffScroll,
    // 悠悠有品商品列表
    yyypCommodities,
    yyypCurrentWeapon,
    yyypTotalCount,
    showYYYPList,
    showYYYPTable,
    yyypCurrentPage,
    yyypPageSize,
    yyypLoadingMore,
    yyypHasMore,
    yyypFilterType,
    yyypListConfig,
    yyypSortTypeKey,
    yyypWearRange,
    yyypExterior,
    yyypEffectiveTemplateId,
    yyypHasFilterActive,
    paginatedYYYPCommodities,
    toggleYYYPList,
    handleBuyCommodity,
    fetchSingleNameTag,
    fetchStickerPrices,
    showStickersDialog,
    closeYYYPList,
    handleYYYPPageChange,
    handleRefreshYYYP,
    handleSearchYYYPByRow,
    loadMoreYYYPCommodities,
    handleYYYPScroll,
    handleSearchBuffByRow,
    handleSearchCsFloatByRow,
    handleSearchAllPlatforms,
    activePopoverRow,
    togglePopover,
    selectPlatform,
    handleClearSearch,
    handleViewDetails,
    getRarityType,
    getRarityColor,
    getWeaponTypeColor,
    getFloatRangeType,
    getFloatRangeColor,
    extractFloatRangeFromName,
    getWearColor,
    getWearRange,
    getExteriorColor,
    handleSizeChange,
    handleCurrentChange,
    // 第三方网站跳转
    openCSQAQ,
    openStatisticFromHeader,
    openSteamDT,
    chartWeapon,
    // 悠悠有品筛选
    handleYYYPFilterChange,
    handleYYYPAdvancedFilter,
    handleYYYPSortChange,
    handleYYYPWearRangeChange,
    handleYYYPExteriorChange,
    handleTemplateInfoConfig,
    handleResetYYYPFilter,
    // 求购供应
    supplyDialogVisible,
    supplyInventoryList,
    selectedSupplyItems,
    currentPurchaseOrder,
    maxSupplyQuantity,
    supplyLoading,
    supplyPriceInfo,
    handleConfirmSupply,
    handleSendOffer,
    toggleSupplyItemSelection,
    isSupplyItemSelected,
    selectAllSupplyItems,
    isAllSupplyItemsSelected,
    getSupplyItemPriceInfo
  }
}
