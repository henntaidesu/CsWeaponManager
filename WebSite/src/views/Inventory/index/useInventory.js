import { ref, computed, onMounted, onUnmounted, nextTick, watch, h } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { ArrowDown, ArrowLeft, ArrowRight, Loading, Close, Star, Box, Upload, InfoFilled } from '@element-plus/icons-vue'
import axios from 'axios'
import { API_CONFIG, apiUrls } from '@/config/api.js'
import PlatformSelectDialog from '../PlatformSelectDialog/index.vue'
import RentFormYYYP from '../RentFormYYYP/index.vue'
import { applyDeviceClass, watchDeviceType } from '@/utils/deviceDetect.js'
import { buffNetPrice } from '@/utils/platformFee.js'

export function useInventory() {
  const loading = ref(false)
  const fetchingInventory = ref(false) // 获取库存中
  const fetchingYYYPPrice = ref(false) // 获取悠悠有品价格中
  const fetchingBuffPrice = ref(false) // 获取BUFF价格中
  const inventoryData = ref([])
  const searchText = ref('')
  const weaponTypeFilter = ref('')
  const floatRangeFilter = ref('')
  const pendantFilter = ref('')
  const stickerFilter = ref('')
  const renameFilter = ref('')
  const tradeRestrictionFilter = ref('')
  const displayMode = ref('card') // 默认卡片显示
  const groupMode = ref(true) // 组合模式开关，默认开启
  const groupedData = ref([]) // 组合后的数据
  const tableRef = ref(null) // 表格引用
  const expandedRowPages = ref({}) // 展开行的分页状态 { assetid: currentPage }
  const showPriceDiff = ref(true) // 是否显示差价（true=差价，false=价格）
  const editingAssetId = ref(null) // 正在编辑的资产ID
  const editingPrice = ref('') // 编辑中的价格
  const originalPrice = ref('') // 原始价格
  // 懒加载相关
  const pageSize = ref(50) // 每页加载数量
  const currentOffset = ref(0) // 当前偏移量
  const hasMore = ref(true) // 是否还有更多数据
  const loadingMore = ref(false) // 是否正在加载更多
  // 图片404缓存，避免重复请求
  const image404Cache = ref(new Set())
  const statsData = ref({
    total_count: 0,
    by_type: [],
    by_wear: [],
    price_stats: {
      priced_count: 0,
      total_price: 0,
      avg_price: 0,
      min_price: 0,
      max_price: 0
    }
  })
  const steamIdList = ref([])
  const selectedSteamId = ref('')
  const sortConfig = ref({ prop: 'item_count', order: 'desc' }) // 默认按数量降序排序（组合模式）

  // 预览弹窗相关
  const previewVisible = ref(false)
  const previewItem = ref(null)
  const stickersPriceInfo = ref([]) // 印花价格信息
  const pendantPriceInfo = ref(null) // 挂件价格信息

  // 多选模式相关
  const isMultiSelectMode = ref(true) // 默认为多选模式
  const selectedItems = ref([])
  const detailCurrentIndex = ref(0) // 详情浏览当前索引
  
  // 组件选择对话框相关
  const itemsToDeposit = ref([])
  const isSelectingComponent = ref(false) // 是否处于选择组件模式
  
  // 备注弹窗相关
  const remarkDialogVisible = ref(false)
  const currentRemarkIndex = ref(-1)
  const currentRemark = ref('')
  
  // 打开备注弹窗
  const openRemarkDialog = (index) => {
    currentRemarkIndex.value = index
    currentRemark.value = itemForms.value[index].remark || ''
    remarkDialogVisible.value = true
  }
  
  // 保存备注
  const saveRemark = () => {
    if (isGroupedView.value) {
      // 组合模式下保存组合备注
      saveGroupRemark()
    } else {
      // 非组合模式下保存单个物品备注
      if (currentRemarkIndex.value >= 0) {
        itemForms.value[currentRemarkIndex.value].remark = currentRemark.value
      }
      remarkDialogVisible.value = false
    }
  }
  
  // 出售/出租弹窗相关
  const sellRentDialogVisible = ref(false)
  const sellRentDialogTitle = ref('')
  const sellRentDialogType = ref('') // 'sell' 或 'rent'
  const submitting = ref(false)
  const isGroupedView = ref(false) // 是否组合显示
  const expandedGroups = ref({}) // 记录哪些组是展开的

  // 出售平台选择对话框
  const sellPlatformSelectVisible = ref(false) // 出售平台选择对话框

  // 出租相关状态
  const rentPlatformSelectVisible = ref(false) // 出租平台选择对话框
  const rentFormVisible = ref(false) // 出租表单对话框
  const selectedRentPlatform = ref('') // 选中的出租平台
  const rentInitData = ref(null) // 出租 init 数据
  
  // 每个物品的表单数据
  const itemForms = ref([])
  const itemFormRefs = ref([])
  
  // 组合模式下的表单数据（按classid）
  const groupForms = ref({})
  const groupFormRefs = ref({})
  
  // 单个物品表单验证规则
  const itemFormRules = {
    price: [
      { required: true, message: '请输入价格', trigger: 'blur' },
      { 
        pattern: /^\d+(\.\d{1,2})?$/, 
        message: '价格格式不正确', 
        trigger: 'blur' 
      }
    ]
  }
  
  // 切换组合显示
  const toggleGroupedView = () => {
    isGroupedView.value = !isGroupedView.value
    if (isGroupedView.value) {
      // 切换到组合模式时，初始化组合表单
      initGroupForms()
      // 清空展开状态
      expandedGroups.value = {}
    } else {
      // 切换回非组合模式时，重新初始化物品表单
      initItemForms()
    }
  }
  
  // 切换组的展开/折叠状态
  const toggleGroupExpand = (classid) => {
    expandedGroups.value[classid] = !expandedGroups.value[classid]
  }
  
  // 初始化组合表单
  const initGroupForms = () => {
    groupForms.value = {}
    groupFormRefs.value = {}
    
    // 按classid分组并初始化表单（不自动填充价格）
    const groupMap = new Map()
    
    selectedItems.value.forEach(item => {
      const classid = item.classid || `unknown_${item.assetid}`
      
      if (!groupMap.has(classid)) {
        groupMap.set(classid, {
          price: '',
          remark: ''
        })
      }
    })
    
    groupForms.value = Object.fromEntries(groupMap)
  }
  
  // 自动填充组合价格（使用悠悠底价-0.01）
  const autoFillGroupPrices = () => {
    const groupMap = new Map()
    let filledCount = 0
    let noDataCount = 0
    
    selectedItems.value.forEach(item => {
      const classid = item.classid || `unknown_${item.assetid}`
      
      if (!groupMap.has(classid)) {
        // 获取该组第一个物品的悠悠底价
        const groupItems = selectedItems.value.filter(i => 
          (i.classid || `unknown_${i.assetid}`) === classid
        )
        
        // 使用第一个物品的悠悠底价
        const firstItem = groupItems[0]
        const yyypPrice = yyypRealtimePrices.value[firstItem.assetid]
        
        let price = ''
        if (yyypPrice && !yyypPrice.loading && !yyypPrice.error && yyypPrice.lowest_price) {
          // 底价减0.01
          const lowestPrice = parseFloat(yyypPrice.lowest_price)
          const fillPrice = Math.max(0.01, lowestPrice - 0.01)
          price = fillPrice.toFixed(2)
        }
        
        groupMap.set(classid, price)
      }
    })
    
    // 填充价格到表单
    groupMap.forEach((price, classid) => {
      if (groupForms.value[classid]) {
        if (price) {
          groupForms.value[classid].price = price
          filledCount++
        } else {
          noDataCount++
        }
      }
    })
    
    if (filledCount > 0) {
      ElMessage.success(`已自动填充 ${filledCount} 组的价格（底价-0.01）`)
    } else if (noDataCount > 0) {
      ElMessage.warning('没有可用的悠悠底价数据，请先查询底价')
    } else {
      ElMessage.warning('没有可填充的价格')
    }
  }
  
  // 自动填充非组合模式的价格（使用悠悠底价-0.01）
  const autoFillItemPrices = () => {
    let filledCount = 0
    let noDataCount = 0
    
    selectedItems.value.forEach((item, index) => {
      const yyypPrice = yyypRealtimePrices.value[item.assetid]
      
      if (yyypPrice && !yyypPrice.loading && !yyypPrice.error && yyypPrice.lowest_price) {
        if (itemForms.value[index]) {
          // 底价减0.01
          const lowestPrice = parseFloat(yyypPrice.lowest_price)
          const fillPrice = Math.max(0.01, lowestPrice - 0.01)
          itemForms.value[index].price = fillPrice.toFixed(2)
          filledCount++
        }
      } else {
        noDataCount++
      }
    })
    
    if (filledCount > 0) {
      ElMessage.success(`已自动填充 ${filledCount} 件物品的价格（底价-0.01）`)
    } else if (noDataCount > 0) {
      ElMessage.warning('没有可用的悠悠底价数据，请先查询底价')
    } else {
      ElMessage.warning('没有可填充的价格')
    }
  }
  
  // 验证组合表单的价格输入
  const validateGroupPrice = (classid) => {
    if (!groupForms.value[classid]) return
    
    const value = groupForms.value[classid].price
    let newValue = value.replace(/[^\d.]/g, '')
    
    const parts = newValue.split('.')
    if (parts.length > 2) {
      newValue = parts[0] + '.' + parts.slice(1).join('')
    }
    
    if (parts.length === 2 && parts[1].length > 2) {
      newValue = parts[0] + '.' + parts[1].substring(0, 2)
    }
    
    groupForms.value[classid].price = newValue
  }
  
  // 打开组合备注弹窗
  const openGroupRemarkDialog = (classid) => {
    currentRemarkIndex.value = classid
    currentRemark.value = groupForms.value[classid]?.remark || ''
    remarkDialogVisible.value = true
  }
  
  // 保存组合备注
  const saveGroupRemark = () => {
    if (currentRemarkIndex.value && groupForms.value[currentRemarkIndex.value]) {
      groupForms.value[currentRemarkIndex.value].remark = currentRemark.value
    }
    remarkDialogVisible.value = false
  }
  
  // 按 classid 分组物品
  const groupedItems = computed(() => {
    if (!isGroupedView.value) {
      return []
    }
    
    const groupMap = new Map()
    
    selectedItems.value.forEach((item, index) => {
      const classid = item.classid || `unknown_${item.assetid}`
      
      if (!groupMap.has(classid)) {
        groupMap.set(classid, {
          classid: classid,
          items: [],
          itemName: item.item_name,
          steamHashName: item.steam_hash_name,
          weaponType: item.weapon_type
        })
      }
      
      groupMap.get(classid).items.push({
        ...item,
        originalIndex: index
      })
    })
    
    // 转换为数组并按物品数量降序排序
    return Array.from(groupMap.values()).sort((a, b) => b.items.length - a.items.length)
  })

  // 计算组的平均购入价格
  const getGroupAveragePrice = (group) => {
    if (!group || !group.items || group.items.length === 0) {
      return null
    }
    
    const validPrices = group.items
      .map(item => parseFloat(item.buy_price))
      .filter(price => !isNaN(price) && price > 0)
    
    if (validPrices.length === 0) {
      return null
    }
    
    const sum = validPrices.reduce((acc, price) => acc + price, 0)
    const avg = sum / validPrices.length
    return avg.toFixed(2)
  }
  
  // 获取组的价格范围
  const getGroupPriceRange = (group) => {
    if (!group || !group.items || group.items.length === 0) {
      return null
    }
    
    const validPrices = group.items
      .map(item => parseFloat(item.buy_price))
      .filter(price => !isNaN(price) && price > 0)
    
    if (validPrices.length === 0) {
      return null
    }
    
    const min = Math.min(...validPrices)
    const max = Math.max(...validPrices)
    
    if (min === max) {
      return `¥${min.toFixed(2)}`
    }
    
    return `¥${min.toFixed(2)} - ¥${max.toFixed(2)}`
  }
  
  // 获取组的磨损范围
  const getGroupFloatRange = (group) => {
    if (!group || !group.items || group.items.length === 0) {
      return null
    }
    
    const validFloats = group.items
      .map(item => parseFloat(item.weapon_float))
      .filter(f => !isNaN(f) && f > 0)
    
    if (validFloats.length === 0) {
      return null
    }
    
    const min = Math.min(...validFloats)
    const max = Math.max(...validFloats)
    
    if (min === max) {
      return min.toFixed(8)
    }
    
    return `${min.toFixed(8)} - ${max.toFixed(8)}`
  }

  // 懒加载图片观察器
  let imageObserver = null

  const loadSteamIdList = async () => {
    try {
      const response = await axios.get(apiUrls.inventorySteamIds())
      console.log('Steam ID列表响应:', response.data)
      if (response.data.success) {
        steamIdList.value = response.data.data
        if (steamIdList.value.length > 0) {
          // 默认选择第一个 - 使用新格式 steamID（大写）
          selectedSteamId.value = steamIdList.value[0].steamID
          console.log('默认选择Steam ID:', selectedSteamId.value)
        } else {
          ElMessage.warning('没有找到库存数据，请先获取Steam库存')
        }
      }
    } catch (error) {
      console.error('加载Steam ID列表失败:', error)
      ElMessage.error('加载Steam ID列表失败: ' + (error.response?.data?.error || error.message))
    }
  }

  const loadInventoryData = async (reset = true) => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请选择Steam账号')
      return
    }
    
    // 如果是列表模式且开启组合模式，调用组合数据加载
    if (displayMode.value === 'list' && groupMode.value) {
      return await loadGroupedData(reset)
    }
    
    // 如果是重置加载，清空数据和分页状态
    if (reset) {
      inventoryData.value = []
      currentOffset.value = 0
      hasMore.value = true
    }
    
    loading.value = true
    try {
      console.log('正在加载库存数据，Steam ID:', selectedSteamId.value)
      // 加载卡片数据 - 使用分页
      const params = {
        weapon_type: weaponTypeFilter.value,
        float_range: floatRangeFilter.value,
        // 添加前端筛选条件
        pendant_filter: pendantFilter.value,
        sticker_filter: stickerFilter.value,
        rename_filter: renameFilter.value,
        trade_restriction_filter: tradeRestrictionFilter.value,
        limit: pageSize.value,
        offset: currentOffset.value
      }

      // 如果处于选择组件模式，只显示库存组件，并忽略搜索过滤
      if (isSelectingComponent.value) {
        params.classid = '3604678661'
      } else {
        // 只在非选择组件模式下应用搜索过滤
        params.search = searchText.value
      }
      
      const url = apiUrls.inventoryData(selectedSteamId.value)
      console.log('请求URL:', url, '参数:', params)
      const response = await axios.get(url, { params })
      console.log('数据响应:', response.data)
      if (response.data.success) {
        const newData = response.data.data || []
        
        // 如果是重置，直接替换数据；否则追加数据
        if (reset) {
          inventoryData.value = newData
        } else {
          inventoryData.value = [...inventoryData.value, ...newData]
        }
        
        // 检查是否还有更多数据
        hasMore.value = newData.length === pageSize.value
        
        // 更新偏移量
        currentOffset.value += newData.length
        
        // 应用排序（包括默认排序）
        if (sortConfig.value.prop && sortConfig.value.order) {
          applySorting()
        }
        
        console.log('数据已加载，当前:', inventoryData.value.length, '条，还有更多:', hasMore.value, '排序:', sortConfig.value)
      } else {
        ElMessage.error(response.data.error || '加载数据失败')
      }
      
      // 加载统计数据（只在重置时加载，避免频繁请求）
      if (reset) {
        await loadStats()
      }
    } catch (error) {
      console.error('加载库存数据失败:', error)
      ElMessage.error('加载数据失败: ' + (error.response?.data?.error || error.message))
    } finally {
      loading.value = false
    }
  }

  // 加载组合数据
  const loadGroupedData = async (reset = true) => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请选择Steam账号')
      return
    }

    // 如果是重置加载，清空数据和分页状态
    if (reset) {
      groupedData.value = []
      currentOffset.value = 0
      hasMore.value = true
    }

    loading.value = true
    try {
      console.log('正在加载组合库存数据，Steam ID:', selectedSteamId.value)
      const params = {
        search: searchText.value,
        weapon_type: weaponTypeFilter.value,
        float_range: floatRangeFilter.value,
        // 添加前端筛选条件
        pendant_filter: pendantFilter.value,
        sticker_filter: stickerFilter.value,
        rename_filter: renameFilter.value,
        trade_restriction_filter: tradeRestrictionFilter.value,
        limit: pageSize.value,
        offset: currentOffset.value
      }

      const response = await axios.get(apiUrls.inventoryGrouped(selectedSteamId.value), { params })
      console.log('组合数据响应:', response.data)

      if (response.data.success) {
        const newData = (response.data.data || []).map(item => ({
          ...item,
          // 为了兼容现有的显示逻辑，添加必要的字段
          assetid: item.item_name || Math.random().toString(36).slice(2),
          item_count: item.count || 0,
          // 计算总价格（如果有多个物品）
          buy_price: item.buy_prices && item.buy_prices.length > 0 
            ? item.buy_prices.reduce((sum, price) => sum + (parseFloat(price) || 0), 0).toFixed(2)
            : '0.00',
          yyyp_price: item.yyyp_prices && item.yyyp_prices.length > 0
            ? item.yyyp_prices.reduce((sum, price) => sum + (parseFloat(price) || 0), 0).toFixed(2)
            : '0.00',
          buff_price: item.buff_prices && item.buff_prices.length > 0
            ? item.buff_prices.reduce((sum, price) => sum + (parseFloat(price) || 0), 0).toFixed(2)
            : '0.00',
          steam_price: item.steam_prices && item.steam_prices.length > 0
            ? item.steam_prices.reduce((sum, price) => sum + (parseFloat(price) || 0), 0).toFixed(2)
            : '0.00',
          // 使用第一个物品的磨损值作为代表
          weapon_float: item.weapon_floats && item.weapon_floats.length > 0 ? item.weapon_floats[0] : null
          // steam_hash_name 直接使用后端返回的值，不需要重新生成
        }))

        // 如果是重置，直接替换数据；否则追加数据
        if (reset) {
          groupedData.value = newData
        } else {
          groupedData.value = [...groupedData.value, ...newData]
        }

        // 检查是否还有更多数据
        hasMore.value = newData.length === pageSize.value

        // 更新偏移量
        currentOffset.value += newData.length

        // 应用排序（包括默认排序）
        if (sortConfig.value.prop && sortConfig.value.order) {
          applySorting()
        }

        console.log('组合数据已加载，当前:', groupedData.value.length, '条，还有更多:', hasMore.value, '排序:', sortConfig.value)
      } else {
        ElMessage.error(response.data.error || '加载组合数据失败')
      }

      // 加载统计数据（只在重置时加载）
      if (reset) {
        await loadStats()
      }
    } catch (error) {
      console.error('加载组合数据失败:', error)
      ElMessage.error('加载组合数据失败: ' + (error.response?.data?.error || error.message))
    } finally {
      loading.value = false
    }
  }

  // 加载更多数据
  const loadMoreData = async () => {
    if (loadingMore.value || !hasMore.value) {
      return
    }
    
    loadingMore.value = true
    try {
      await loadInventoryData(false)
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
          } else {
            // 图片离开视口，释放内存
            if (img.src && img.classList.contains('loaded')) {
              // 保存 data-src 以便重新加载
              if (!img.getAttribute('data-src')) {
                img.setAttribute('data-src', img.src)
              }
              // 清空 src 释放内存
              img.removeAttribute('src')
              img.classList.remove('loaded')
            }
          }
        })
      }, {
        root: null, // 使用视口作为根
        rootMargin: '200px', // 提前200px开始加载
        threshold: 0.01
      })

      // 观察所有懒加载图片
      const lazyImages = document.querySelectorAll('.lazy-image')
      lazyImages.forEach(img => {
        imageObserver.observe(img)
      })
    })
  }

  // 设置滚动监听（使用 Intersection Observer）
  const setupScrollObserver = () => {
    nextTick(() => {
      const triggerId = displayMode.value === 'card' ? 'load-more-trigger-card' : 'load-more-trigger'
      const trigger = document.getElementById(triggerId)
      if (trigger) {
        // 如果已有观察器，先断开
        if (trigger._observer) {
          trigger._observer.disconnect()
        }

        // 使用最外层页面滚动条（root=null），避免内层容器产生独立滚动条时的触发问题
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

  const loadStats = async () => {
    try {
      // 构建查询参数（包含所有筛选条件）
      const params = {
        weapon_type: weaponTypeFilter.value,
        float_range: floatRangeFilter.value,
        // 添加前端筛选条件
        pendant_filter: pendantFilter.value,
        sticker_filter: stickerFilter.value,
        rename_filter: renameFilter.value,
        trade_restriction_filter: tradeRestrictionFilter.value
      }

      // 如果处于选择组件模式，只统计库存组件
      if (isSelectingComponent.value) {
        params.classid = '3604678661'
      } else {
        // 只在非选择组件模式下应用搜索过滤
        params.search = searchText.value
      }

      const response = await axios.get(apiUrls.inventoryStats(selectedSteamId.value), { params })
      console.log('统计数据响应:', response.data)
      if (response.data.success) {
        statsData.value = response.data.data
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  const handleSteamIdChange = () => {
    console.log('Steam ID已切换:', selectedSteamId.value)
    loadInventoryData(true) // 重置加载
  }

  const handleFilterChange = () => {
    console.log('筛选条件已变更')
    loadInventoryData(true) // 重置加载数据和统计
  }

  const handleReset = () => {
    searchText.value = ''
    weaponTypeFilter.value = ''
    floatRangeFilter.value = ''
    pendantFilter.value = ''
    stickerFilter.value = ''
    renameFilter.value = ''
    tradeRestrictionFilter.value = ''
    sortConfig.value = { prop: '', order: '' }
    loadInventoryData(true) // 重置加载
  }

  // 切换组合模式
  const handleToggleGroupMode = (val = null) => {
    // 只在列表模式下才允许切换组合模式
    if (displayMode.value !== 'list') {
      return
    }
    
    // 按钮直接传 true，开关传布尔值，默认取反
    if (val === true || val === false) {
      groupMode.value = val
    } else {
      groupMode.value = !groupMode.value
    }
    
    // 清空展开行的分页状态
    expandedRowPages.value = {}
    
    // 切换到组合模式时，设置默认排序为数量降序
    if (groupMode.value) {
      sortConfig.value = { prop: 'item_count', order: 'desc' }
    } else {
      // 切换回明细模式时，恢复默认排序
      sortConfig.value = { prop: 'buy_price', order: 'desc' }
    }
    
    // 重置加载数据
    loadInventoryData(true)
  }

  // 监听显示模式变化，切换到卡片模式时关闭组合模式
  watch(displayMode, (newMode, oldMode) => {
    if (newMode === 'card' && groupMode.value) {
      // 切换到卡片模式，关闭组合模式
      groupMode.value = false
      sortConfig.value = { prop: 'buy_price', order: 'desc' }
      loadInventoryData(true)
    } else if (newMode === 'list' && oldMode === 'card') {
      // 从卡片模式切换回列表模式，恢复组合模式
      groupMode.value = true
      sortConfig.value = { prop: 'item_count', order: 'desc' }
      loadInventoryData(true)
    }
  })

  // 计算每页显示的卡片数量（基于300px卡片宽度和容器宽度）
  const getItemsPerPage = () => {
    // 假设容器宽度约为1200px（可以根据实际情况调整）
    // 每个卡片300px，加上间隙，大约每行3-4个
    // 4行 x 3个 = 12个卡片
    return 12
  }

  // 获取展开行的详细数据（带分页）
  const getExpandedItems = (row) => {
    if (!row.assetids || !Array.isArray(row.assetids)) {
      return []
    }

    // 将组合数据转换为详细列表
    const allItems = row.assetids.map((assetid, index) => ({
      assetid: assetid,
      weapon_float: row.weapon_floats && row.weapon_floats[index] ? row.weapon_floats[index] : null,
      buy_price: row.buy_prices && row.buy_prices[index] ? row.buy_prices[index] : '0',
      yyyp_price: row.yyyp_prices && row.yyyp_prices[index] ? row.yyyp_prices[index] : '0',
      buff_price: row.buff_prices && row.buff_prices[index] ? row.buff_prices[index] : '0',
      steam_price: row.steam_prices && row.steam_prices[index] ? row.steam_prices[index] : '0',
      order_time: row.order_times && row.order_times[index] ? row.order_times[index] : null,
      remark: row.remarks && row.remarks[index] ? row.remarks[index] : null,
      // 添加印花、挂件、改名等字段
      sticker: row.stickers && row.stickers[index] ? row.stickers[index] : null,
      pendant: row.pendants && row.pendants[index] ? row.pendants[index] : null,
      rename: row.renames && row.renames[index] ? row.renames[index] : null,
      // 添加用于预览的字段
      steam_hash_name: row.steam_hash_name,
      item_name: row.item_name,
      weapon_name: row.weapon_name,
      weapon_type: row.weapon_type,
      float_range: row.float_range
    }))

    // 获取当前页码，确保页码有效
    const currentPage = expandedRowPages.value[row.assetid] || 1
    const itemsPerPage = getItemsPerPage()
    const totalPages = Math.ceil(allItems.length / itemsPerPage)
    
    console.log('获取展开数据:', {
      assetid: row.assetid,
      currentPage,
      itemsPerPage,
      totalPages,
      totalItems: allItems.length
    })
    
    // 如果当前页码超出范围，重置为第1页
    if (currentPage > totalPages && totalPages > 0) {
      expandedRowPages.value = {
        ...expandedRowPages.value,
        [row.assetid]: 1
      }
      const start = 0
      const end = itemsPerPage
      return allItems.slice(start, end)
    }
    
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage

    console.log('分页范围:', { start, end, 返回数量: allItems.slice(start, end).length })
    
    return allItems.slice(start, end)
  }

  // 获取展开行的总数据量
  const getExpandedTotal = (row) => {
    if (!row.assetids || !Array.isArray(row.assetids)) {
      return 0
    }
    return row.assetids.length
  }

  // 处理展开行的分页变化
  const handleExpandPageChange = (row, page) => {
    console.log('分页变化:', row.assetid, '页码:', page)
    
    // 先更新页码
    expandedRowPages.value = {
      ...expandedRowPages.value,
      [row.assetid]: page
    }
    
    // 如果行未展开，先展开它
    if (tableRef.value) {
      const expandedRows = tableRef.value.store.states.expandRows.value || []
      const isExpanded = expandedRows.some(r => r.assetid === row.assetid)
      
      if (!isExpanded) {
        console.log('行未展开，自动展开:', row.assetid)
        tableRef.value.toggleRowExpansion(row, true)
      }
    }
  }

  // 处理行点击事件（仅在组合模式下）
  const handleRowClick = (row, column, event) => {
    if (!groupMode.value) return
    if (row.item_count <= 1) return // 只有1件物品不展开
    
    // 切换展开状态
    if (tableRef.value) {
      tableRef.value.toggleRowExpansion(row)
    }
  }

  // 获取行样式
  const getRowStyle = (data) => {
    const style = { backgroundColor: 'transparent' }
    // 在组合模式下，如果数量大于1，添加可点击样式
    if (groupMode.value && data.row.item_count > 1) {
      style.cursor = 'pointer'
    }
    return style
  }


  // 统一的排序函数
  const applySorting = () => {
    if (!sortConfig.value.prop || !sortConfig.value.order) return
    
    const { prop, order } = sortConfig.value
    
    // 根据当前模式选择要排序的数据
    const dataToSort = groupMode.value ? groupedData.value : inventoryData.value
    
    dataToSort.sort((a, b) => {
      // 特殊处理：库存存储组件始终排在最后
      const isStorageA = a.item_name === '库存存储组件' || a.steam_hash_name === '库存存储组件'
      const isStorageB = b.item_name === '库存存储组件' || b.steam_hash_name === '库存存储组件'
      
      if (isStorageA && !isStorageB) return 1  // A是存储组件，排在后面
      if (!isStorageA && isStorageB) return -1 // B是存储组件，排在后面
      if (isStorageA && isStorageB) return 0   // 都是存储组件，保持相对位置
      
      let valueA, valueB
      
      if (prop === 'buy_price') {
        // 价格排序
        valueA = parseFloat(a.buy_price) || 0
        valueB = parseFloat(b.buy_price) || 0
      } else if (prop === 'yyyp_price') {
        // 悠悠有品价格排序
        valueA = parseFloat(a.yyyp_price) || 0
        valueB = parseFloat(b.yyyp_price) || 0
      } else if (prop === 'buff_price') {
        // BUFF价格排序
        valueA = parseFloat(a.buff_price) || 0
        valueB = parseFloat(b.buff_price) || 0
      } else if (prop === 'steam_price') {
        // Steam价格排序
        valueA = parseFloat(a.steam_price) || 0
        valueB = parseFloat(b.steam_price) || 0
      } else if (prop === 'order_time') {
        // 入库时间排序
        valueA = a.order_time ? new Date(a.order_time).getTime() : 0
        valueB = b.order_time ? new Date(b.order_time).getTime() : 0
      } else if (prop === 'weapon_float') {
        // 磨损值排序
        valueA = parseFloat(a.weapon_float) || 999999 // 没有磨损值的排在最后
        valueB = parseFloat(b.weapon_float) || 999999
      } else if (prop === 'float_range') {
        // 磨损等级排序（按照游戏内的品质顺序）
        const floatRangeOrder = {
          '崭新出厂': 1,
          '略有磨损': 2,
          '久经沙场': 3,
          '破损不堪': 4,
          '战痕累累': 5
        }
        valueA = floatRangeOrder[a.float_range] || 999
        valueB = floatRangeOrder[b.float_range] || 999
      } else if (prop === 'item_count') {
        // 数量排序（仅组合模式）
        valueA = parseInt(a.item_count) || 0
        valueB = parseInt(b.item_count) || 0
      } else if (prop === 'remark') {
        // 备注排序（有备注的在前，无备注的在后）
        valueA = a.remark ? 0 : 1
        valueB = b.remark ? 0 : 1
      }
      
      if (order === 'asc') {
        return valueA - valueB
      } else {
        return valueB - valueA
      }
    })
  }

  // Element Plus 表格的排序事件处理
  const handleSortChange = ({ prop, order }) => {
    console.log('排序改变:', prop, order)
    
    if (!order) {
      // 取消排序
      sortConfig.value = { prop: '', order: '' }
      loadInventoryData(true)
      return
    }
    
    // 设置排序配置
    sortConfig.value = { 
      prop, 
      order: order === 'ascending' ? 'asc' : 'desc' 
    }
    
    // 应用排序
    applySorting()
  }


  // 开始编辑价格
  const startEdit = (row) => {
    editingAssetId.value = row.assetid
    originalPrice.value = row.buy_price || ''
    editingPrice.value = row.buy_price || ''
    
    // 使用nextTick确保input已渲染后聚焦
    nextTick(() => {
      const input = document.getElementById(`price-input-${row.assetid}`)
      if (input) {
        input.focus()
        input.select() // 选中所有文本，方便修改
      }
    })
  }

  // 取消编辑
  const cancelEdit = () => {
    editingAssetId.value = null
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
    const currentAssetId = editingAssetId.value
    cancelEdit()
    
    // 异步发送请求到后端
    try {
      const response = await axios.put(
        apiUrls.inventoryUpdateBuyPrice(selectedSteamId.value, currentAssetId),
        { buy_price: newPrice }
      )
      
      if (response.data.success) {
        ElMessage.success('价格更新成功')
        // 只更新统计数据，不重新加载整个列表
        await loadInventoryStats()
      } else {
        // 如果失败，恢复原价格
        row.buy_price = oldPrice
        ElMessage.error('价格更新失败: ' + response.data.error)
      }
    } catch (error) {
      // 如果失败，恢复原价格
      row.buy_price = oldPrice
      console.error('更新价格失败:', error)
      ElMessage.error('更新价格失败: ' + error.message)
    }
  }

  // 生成标题（卡片/列表复用），若 weapon_name 与 item_name 相同则只显示一次
  const getCardTitle = (item) => {
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

  const getItemTitle = (item) => getCardTitle(item)

  // 检查是否有额外信息（印花、挂件、改名）
  const hasExtras = (item) => {
    return !!(item.sticker || item.pendant || item.rename)
  }

  // 获取武器图片路径
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

  // 处理图片加载错误
  const handleImageError = (event, steamHashName) => {
    // 将失败的steam_hash_name添加到404缓存中
    if (steamHashName) {
      image404Cache.value.add(steamHashName)
    }
    
    // 移除错误监听器，防止重复触发
    event.target.onerror = null
    
    // 隐藏图片，不设置data URI，避免将图片数据加载到内存
    event.target.style.display = 'none'
  }

  // 获取价格差异样式类
  const getPriceDiffClass = (marketPrice, buyPrice) => {
    if (!marketPrice || !buyPrice) return ''
    const diff = parseFloat(marketPrice) - parseFloat(buyPrice)
    return diff >= 0 ? 'price-profit' : 'price-loss'
  }

  // 切换显示模式
  const toggleDisplayMode = () => {
    displayMode.value = displayMode.value === 'list' ? 'card' : 'list'
  }
  
  // 判断物品是否有交易限制
  const hasTradeRestriction = (item) => {
    if (!item.remark) return false
    
    const lockDate = parseTradeLockDate(item.remark)
    // 如果有交易限制且未过期，返回true
    return lockDate && !lockDate.expired
  }
  
  // 判断物品是否被选中
  const isItemSelected = (assetid) => {
    return selectedItems.value.some(item => item.assetid === assetid)
  }
  
  // 切换物品选中状态
  const toggleItemSelection = (item) => {
    // 检查是否有交易限制
    if (hasTradeRestriction(item)) {
      ElMessage.warning('无法交易')
      return
    }
    
    const index = selectedItems.value.findIndex(i => i.assetid === item.assetid)
    if (index > -1) {
      selectedItems.value.splice(index, 1)
    } else {
      selectedItems.value.push(item)
    }
  }
  
  // 清空选择
  const clearSelection = () => {
    selectedItems.value = []
  }
  
  // 全选当前显示的物品
  const selectAllDisplayed = () => {
    // 获取当前显示的数据
    const displayData = currentDisplayData.value
    
    let addedCount = 0
    let skippedCount = 0
    
    // 遍历当前显示的物品，添加到选中列表（排除已有交易限制的）
    displayData.forEach(item => {
      // 检查是否有交易限制
      if (hasTradeRestriction(item)) {
        skippedCount++
        return
      }
      
      // 检查是否已经在选中列表中
      const alreadySelected = selectedItems.value.some(i => i.assetid === item.assetid)
      if (!alreadySelected) {
        selectedItems.value.push(item)
        addedCount++
      }
    })
    
    let message = `已选择 ${selectedItems.value.length} 件物品`
    if (skippedCount > 0) {
      message += `，已跳过 ${skippedCount} 件有交易限制的物品`
    }
    ElMessage.success(message)
  }
  
  // 处理卡片点击
  const handleCardClick = async (item) => {
    // 如果处于选择组件模式
    if (isSelectingComponent.value) {
      // 检查组件是否已满（weapon_float存储的是已存储数量）
      const storedCount = parseFloat(item.weapon_float) || 0
      if (storedCount >= 1000) {
        ElMessage.warning('该组件已满，无法继续存入物品')
        return
      }
      
      // 确认存入
      try {
        await ElMessageBox.confirm(
          `确认将 ${itemsToDeposit.value.length} 件物品存入此组件吗？`,
          '确认存入',
          {
            confirmButtonText: '确认存入',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        // 执行存入
        await executeDeposit(itemsToDeposit.value, item.assetid)
        
        // 退出选择组件模式
        isSelectingComponent.value = false
        itemsToDeposit.value = []
        
        // 重新加载数据
        await loadInventoryData()
      } catch {
        // 用户取消
      }
      return
    }
    
    // 卡片模式下始终切换选中状态
    toggleItemSelection(item)
  }
  
  // 初始化物品表单
  const initItemForms = () => {
    itemForms.value = selectedItems.value.map(() => ({
      price: '',
      remark: '',
      // BUFF 出租用：日租金 / 押金 / 最长租期，出售时忽略
      rentUnitPrice: '',
      securityPrice: '',
      rentOutDay: '',
      uploadStatus: null,  // 上架状态：null=未上架, 'uploading'=上架中, 'success'=成功, 'failed'=失败
      uploadMessage: ''     // 上架消息
    }))
    itemFormRefs.value = []
  }
  
  // 悠悠有品实时底价数据
  const yyypRealtimePrices = ref({})
  const loadingYYYPPrices = ref(false)
  
  // 查询悠悠有品实时底价
  const fetchYYYPRealtimePrice = async (item) => {
    try {
      // 通过steam_hash_name查询yyyp_id
      const response = await axios.post(
        apiUrls.inventoryYyypLowestPrice(),
        { steamHashName: item.steam_hash_name }
      )
      
      if (response.data.success && response.data.data.yyyp_id) {
        const yyypId = response.data.data.yyyp_id
        
        // 实时查询悠悠在售底价
        const priceResponse = await axios.post(
          `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.YOUPIN_REALTIME_LOWEST_PRICE}`,
          {
            yyypId: yyypId,
            steamId: selectedSteamId.value,
            includeList: false
          }
        )
        
        if (priceResponse.data.success) {
          return {
            assetid: item.assetid,
            lowest_price: priceResponse.data.data.lowest_price,
            total_count: priceResponse.data.data.total_count,
            loading: false,
            error: null
          }
        } else {
          return {
            assetid: item.assetid,
            loading: false,
            error: priceResponse.data.message
          }
        }
      } else {
        return {
          assetid: item.assetid,
          loading: false,
          error: '未找到悠悠ID'
        }
      }
    } catch (error) {
      console.error('查询悠悠底价失败:', error)
      return {
        assetid: item.assetid,
        loading: false,
        error: error.message
      }
    }
  }
  
  // 批量查询悠悠底价
  const fetchAllYYYPRealtimePrices = async () => {
    loadingYYYPPrices.value = true
    yyypRealtimePrices.value = {}
    
    // 初始化loading状态
    selectedItems.value.forEach(item => {
      yyypRealtimePrices.value[item.assetid] = {
        loading: true,
        lowest_price: null,
        total_count: null,
        error: null
      }
    })
    
    // 按 steam_hash_name 分组，避免重复查询相同饰品
    const groupedByHashName = new Map()
    selectedItems.value.forEach(item => {
      const hashName = item.steam_hash_name
      if (!groupedByHashName.has(hashName)) {
        groupedByHashName.set(hashName, [])
      }
      groupedByHashName.get(hashName).push(item)
    })
    
    console.log(`[悠悠底价查询] 共 ${selectedItems.value.length} 件物品，去重后需查询 ${groupedByHashName.size} 个饰品`)
    
    // 逐个查询唯一的饰品（避免并发过多）
    let queryCount = 0
    for (const [hashName, items] of groupedByHashName.entries()) {
      queryCount++
      console.log(`[悠悠底价查询] (${queryCount}/${groupedByHashName.size}) 查询: ${hashName} (${items.length}件)`)
      
      // 查询第一个物品（同一个hash_name的物品yyyp_id相同）
      const result = await fetchYYYPRealtimePrice(items[0])
      
      // 将查询结果应用到所有相同hash_name的物品
      items.forEach(item => {
        yyypRealtimePrices.value[item.assetid] = {
          ...result,
          assetid: item.assetid  // 保持各自的assetid
        }
      })
      
      // 添加延迟避免请求过快
      if (queryCount < groupedByHashName.size) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    console.log(`[悠悠底价查询] 查询完成，共查询 ${groupedByHashName.size} 个饰品`)
    loadingYYYPPrices.value = false
  }
  
  // 显示出售弹窗 - 改为先选择平台
  const showSellDialog = () => {
    if (selectedItems.value.length === 0) {
      ElMessage.warning('请先选择要出售的物品')
      return
    }
    // 打开出售平台选择对话框
    sellRentDialogType.value = 'sell'
    sellPlatformSelectVisible.value = true
  }

  // 显示出租弹窗 - 改为先选择平台
  const showRentDialog = () => {
    if (selectedItems.value.length === 0) {
      ElMessage.warning('请先选择要出租的物品')
      return
    }
    // 打开出租平台选择对话框
    sellRentDialogType.value = 'rent'
    rentPlatformSelectVisible.value = true
  }

  // 处理出售平台选择
  const handleSellPlatformSelect = async (platform) => {
    selectedRentPlatform.value = platform

    if (platform === 'yyyp') {
      // 出售流程
      sellRentDialogTitle.value = '出售物品'
      initItemForms()
      sellRentDialogVisible.value = true

      // 异步查询悠悠底价
      fetchAllYYYPRealtimePrices()
    } else if (platform === 'buff') {
      // BUFF 出售：复用同一个弹窗，只填价格
      sellRentDialogTitle.value = 'BUFF 出售物品'
      sellRentDialogType.value = 'sell'
      initItemForms()
      sellRentDialogVisible.value = true
    }
  }

  // 处理出租平台选择
  const handleRentPlatformSelect = async (platform) => {
    selectedRentPlatform.value = platform

    if (platform === 'yyyp') {
      // 出租流程 - 显示加载提示
      const loading = ElLoading.service({
        lock: true,
        text: '正在获取出租配置...',
        background: 'rgba(0, 0, 0, 0.7)'
      })

      try {
        // 构建所有选中饰品的列表信息（用于获取扩展信息）
        const itemsList = selectedItems.value.map(item => ({
          abrade: String(item.weapon_float || '0'),
          commodityTemplateId: parseInt(item.weapon_classID?.yyyp_id || 0),
          marketHashName: item.steam_hash_name || item.item_name,
          paintSeed: String(item.paintseed || '0'),
          steamAssetId: parseInt(item.assetid || 0)
        }))

        console.log('[出租] 开始并发请求 rentInit 和 getInventoryExtendInfo')
        console.log('[出租] 选中饰品数量:', selectedItems.value.length)

        // 并发请求 - 使用 Promise.allSettled 确保即使扩展信息获取失败也能打开出租表单
        const [initResult, extendInfoResult] = await Promise.allSettled([
          axios.post(
            `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.ENDPOINTS.YYYP_RENT_INIT}`,
            {
              steamId: selectedSteamId.value,
              steam_hash_name: selectedItems.value.map(item => item.steam_hash_name)
            }
          ),
          axios.post(
            `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.YOUPIN_GET_INVENTORY_EXTEND_INFO}`,
            {
              steamId: selectedSteamId.value,
              itemsList: itemsList
            }
          )
        ])

        // 检查 rentInit 结果（必须成功）
        if (initResult.status === 'rejected') {
          throw initResult.reason
        }

        const initResponse = initResult.value

        if (initResponse.data.success) {
          // 保存 init 数据
          rentInitData.value = initResponse.data.data

          // 保存每个饰品的扩展信息（包含赔付方式列表）到 initData 中
          if (extendInfoResult.status === 'fulfilled') {
            const extendInfoResponse = extendInfoResult.value
            if (extendInfoResponse.data.success && extendInfoResponse.data.data) {
              // 将扩展信息附加到 rentInitData
              rentInitData.value.inventoryExtendInfo = extendInfoResponse.data.data
              console.log('[出租] 库存扩展信息获取成功，饰品数量:', Object.keys(extendInfoResponse.data.data.normalLeaseCompensationMap || {}).length)
            } else {
              console.warn('[出租] 库存扩展信息获取失败:', extendInfoResponse.data.message)
            }
          } else {
            console.warn('[出租] 库存扩展信息请求失败（不影响出租流程）:', extendInfoResult.reason?.message)
          }

          // 打开悠悠有品出租表单
          rentFormVisible.value = true

          console.log('[出租] 获取配置成功')
        } else {
          // 显示详细的错误信息
          const errorMsg = initResponse.data.message || '获取出租配置失败'
          ElMessage.error({
            message: errorMsg,
            duration: 5000,
            showClose: true
          })
          console.error('[出租] 获取配置失败:', errorMsg)
        }
      } catch (error) {
        console.error('[出租] 获取出租配置异常:', error)

        // 提取详细错误信息
        let errorMsg = '获取出租配置失败，请重试'

        if (error.response) {
          // 服务器返回了错误响应
          const status = error.response.status
          const data = error.response.data

          if (data && data.message) {
            errorMsg = data.message
          } else if (status === 400) {
            errorMsg = '请求参数错误，请检查所选饰品是否有效'
          } else if (status === 401) {
            errorMsg = 'Token已过期或无效，请前往【设置 > 数据源配置】重新获取悠悠有品配置'
          } else if (status === 500) {
            errorMsg = '服务器错误，请查看日志获取详细信息'
          }

          console.error(`[出租] 错误状态码: ${status}, 错误数据:`, data)
        } else if (error.request) {
          // 请求已发送但没有收到响应
          errorMsg = '无法连接到Spider服务，请确认Spider服务是否正常运行'
          console.error('[出租] 请求未收到响应:', error.request)
        } else {
          // 其他错误
          errorMsg = `请求错误: ${error.message}`
          console.error('[出租] 请求设置错误:', error.message)
        }

        ElMessage.error({
          message: errorMsg,
          duration: 5000,
          showClose: true
        })
      } finally {
        loading.close()
      }
    } else if (platform === 'buff') {
      // BUFF 出租不需要像悠悠有品那样先拉 init 配置，只要日租金/押金/最长租期三个值，
      // 直接复用出售那个弹窗，按 sellRentDialogType='rent' 渲染出租字段
      sellRentDialogTitle.value = 'BUFF 出租物品'
      sellRentDialogType.value = 'rent'
      initItemForms()
      sellRentDialogVisible.value = true
    }
  }

  // 取消出售平台选择
  const handleSellPlatformSelectCancel = () => {
    selectedRentPlatform.value = ''
  }

  // 取消出租平台选择
  const handleRentPlatformSelectCancel = () => {
    selectedRentPlatform.value = ''
  }

  // 出租表单关闭
  const handleRentFormClosed = () => {
    selectedRentPlatform.value = ''
  }

  // 处理出租表单提交
  const handleRentFormSubmit = async (formData) => {
    console.log('[出租提交] 表单数据:', formData)

    // 显示加载提示（二次确认时会先关掉、确认后重新开）
    const showLoading = () => ElLoading.service({
      lock: true,
      text: '正在上架出租...',
      background: 'rgba(0, 0, 0, 0.7)'
    })
    let loading = showLoading()

    // 组装上架请求体。confirmed 为 true 时表示用户已在二次确认弹框中点了"继续上架"
    const buildPayload = (confirmed) => ({
      steamId: selectedSteamId.value,
      confirmed,
      items: formData.items.map(item => {
        const itemData = {
          assetid: item.assetid,
          // 悠悠按 commodityHashName 下发价格区间系数，用于上架前校验
          hashName: selectedItems.value.find(i => i.assetid === item.assetid)?.steam_hash_name || '',
          shortRentPrice: item.shortRentPrice,
          depositPrice: item.depositPrice,
          rentDays: formData.rentDays,
          tradeMode: item.tradeMode || 1,  // 每个饰品独立的交易方式，默认租赁
          zeroCooldown: item.zeroCooldown || false,  // 每个饰品独立的0CD开关
          rentActivity: item.rentActivity || false,  // 每个饰品独立的租送活动
          marketDynamicPricingMinCoefficient: item.marketDynamicPricingMinCoefficient || '95',  // 0CD动态定价系数
          price: item.price || null,
          remark: ''
        }

        // 仅当租期>21天时才传递长租价格
        if (formData.rentDays > 21 && item.longRentPrice) {
          itemData.longRentPrice = item.longRentPrice
        }

        return itemData
      })
    })

    const uploadUrl = `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.YOUPIN_UPLOAD_RENT}`

    try {
      // 调用上架出租 API
      let response = await axios.post(uploadUrl, buildPayload(false))

      // 价格与市场价偏离较大时，悠悠 APP 会弹二次确认；这里复刻同样的交互
      if (!response.data.success && response.data.needConfirm) {
        loading.close()
        const detail = (response.data.warnings || []).map(w => w.message).join('\n')
        try {
          await ElMessageBox.confirm(
            detail ? `${response.data.message}\n\n${detail}` : response.data.message,
            '价格确认',
            {
              confirmButtonText: '继续上架',
              cancelButtonText: '返回修改',
              type: 'warning',
              customStyle: { whiteSpace: 'pre-line' }
            }
          )
        } catch {
          console.log('[出租提交] 用户取消了二次确认')
          return
        }
        loading = showLoading()
        response = await axios.post(uploadUrl, buildPayload(true))
      }

      if (response.data.success) {
        const stats = response.data.stats
        const failedItems = response.data.data.filter(item => item.Status === 0)

        // 显示结果
        if (stats.failed === 0) {
          ElMessage.success(`成功上架 ${stats.success} 个饰品！`)
        } else {
          // 有失败的饰品，显示详细信息
          const failedMessages = failedItems.map(item => {
            const itemName = selectedItems.value.find(i => i.assetid === item.AssetId)?.steam_hash_name || item.AssetId
            return `${itemName}: ${item.Remark}`
          }).join('\n')

          ElMessageBox.alert(
            `成功: ${stats.success} 个\n失败: ${stats.failed} 个\n\n失败原因:\n${failedMessages}`,
            '上架结果',
            {
              confirmButtonText: '确定',
              type: stats.success > 0 ? 'warning' : 'error'
            }
          )
        }

        // 关闭表单
        rentFormVisible.value = false

        // 刷新库存列表
        await loadInventoryData()

        console.log('[出租提交] 上架成功:', response.data)
      } else {
        ElMessage.error(response.data.message || '上架失败')
        console.error('[出租提交] 上架失败:', response.data.message)
      }
    } catch (error) {
      console.error('[出租提交] 请求失败:', error)
      ElMessage.error('上架失败，请重试')
    } finally {
      loading.close()
    }
  }
  
  // 验证单个物品的价格输入
  const validateItemPrice = (index) => {
    const value = itemForms.value[index].price
    // 只允许数字和小数点
    let newValue = value.replace(/[^\d.]/g, '')
    
    // 只允许一个小数点
    const parts = newValue.split('.')
    if (parts.length > 2) {
      newValue = parts[0] + '.' + parts.slice(1).join('')
    }
    
    // 限制小数点后最多两位
    if (parts.length === 2 && parts[1].length > 2) {
      newValue = parts[0] + '.' + parts[1].substring(0, 2)
    }
    
    itemForms.value[index].price = newValue
  }
  
  // 确认出售/出租
  const confirmSellRent = async (platform) => {
    try {
      let itemsData = []
      
      if (isGroupedView.value) {
        // 组合模式：验证所有组的表单
        const groupValidations = []
        
        for (const classid of Object.keys(groupForms.value)) {
          const formRef = groupFormRefs.value[classid]
          if (formRef) {
            groupValidations.push(formRef.validate().catch(() => {
              throw new Error(`组 ${classid} 的价格验证失败`)
            }))
          }
        }
        
        await Promise.all(groupValidations)
        
        // 将组合数据展开为每个物品的数据
        selectedItems.value.forEach(item => {
          const classid = item.classid || `unknown_${item.assetid}`
          const groupForm = groupForms.value[classid]
          
          if (!groupForm) {
            console.warn(`物品 ${item.assetid} 没有对应的组表单数据`)
            return
          }
          
          itemsData.push({
            assetid: item.assetid,
            name: getCardTitle(item),
            // 悠悠按 commodityHashName 下发价格区间系数，用于上架前校验
            hashName: item.steam_hash_name || '',
            price: groupForm.price,
            remark: groupForm.remark || '',
            // BUFF 上架需要的定位字段
            classid: item.classid,
            instanceid: item.instanceid,
            steam_hash_name: item.steam_hash_name,
            rentUnitPrice: groupForm.rentUnitPrice,
            securityPrice: groupForm.securityPrice,
            rentOutDay: groupForm.rentOutDay
          })
        })
      } else {
        // 非组合模式：验证所有物品的表单
        const validationPromises = itemFormRefs.value
          .filter(ref => ref)
          .map((ref, index) => ref.validate().catch(() => {
            throw new Error(`第 ${index + 1} 件物品的价格验证失败`)
          }))
        
        await Promise.all(validationPromises)
        
        // 收集每个物品的数据
        itemsData = selectedItems.value.map((item, index) => ({
          assetid: item.assetid,
          name: getCardTitle(item),
          // 悠悠按 commodityHashName 下发价格区间系数，用于上架前校验
          hashName: item.steam_hash_name || '',
          price: itemForms.value[index].price,
          remark: itemForms.value[index].remark || '',
          // BUFF 上架需要的定位字段
          classid: item.classid,
          instanceid: item.instanceid,
          steam_hash_name: item.steam_hash_name,
          rentUnitPrice: itemForms.value[index].rentUnitPrice,
          securityPrice: itemForms.value[index].securityPrice,
          rentOutDay: itemForms.value[index].rentOutDay
        }))
      }
      
      // 验证是否有数据
      if (itemsData.length === 0) {
        ElMessage.warning('没有可提交的物品数据')
        return
      }
      
      submitting.value = true
      
      const action = sellRentDialogType.value === 'sell' ? '出售' : '出租'
      const platformName = platform === 'yyyp' ? '悠悠有品' : platform === 'buff' ? 'BUFF' : 'CSFL'
      
      // 只处理悠悠有品上架
      if (platform === 'yyyp' && action === '出售') {
        console.log(`开始上架${itemsData.length}件物品到悠悠有品`)
        
        let successCount = 0
        let failCount = 0
        
        // 逐个上架
        for (let i = 0; i < itemsData.length; i++) {
          const item = itemsData[i]
          
          // 更新状态为上架中
          if (isGroupedView.value) {
            // 组合模式暂不支持状态显示
          } else {
            itemForms.value[i].uploadStatus = 'uploading'
            itemForms.value[i].uploadMessage = '上架中...'
          }
          
          try {
            console.log(`[${i + 1}/${itemsData.length}] 正在上架: ${item.name}`)
            
            const sellUrl = `${API_CONFIG.SPIDER_BASE_URL}${API_CONFIG.ENDPOINTS.YOUPIN_SELL_INVENTORY_ITEM}`
            const buildSellPayload = (confirmed) => ({
              steamId: selectedSteamId.value,
              assetId: item.assetid,
              price: item.price,
              remark: item.remark,
              isCanLease: false,
              hashName: item.hashName || '',
              itemName: item.name,
              confirmed
            })

            let response = await axios.post(sellUrl, buildSellPayload(false))

            // 价格与市场价偏离较大时，悠悠 APP 会弹二次确认；这里复刻同样的交互
            if (!response.data.success && response.data.needConfirm) {
              let goOn = true
              try {
                await ElMessageBox.confirm(
                  response.data.message,
                  '价格确认',
                  {
                    confirmButtonText: '继续上架',
                    cancelButtonText: '跳过该件',
                    type: 'warning'
                  }
                )
              } catch {
                goOn = false
              }
              if (!goOn) {
                failCount++
                if (!isGroupedView.value) {
                  itemForms.value[i].uploadStatus = 'failed'
                  itemForms.value[i].uploadMessage = '已取消上架'
                }
                continue
              }
              response = await axios.post(sellUrl, buildSellPayload(true))
            }

            if (response.data.success) {
              successCount++
              console.log(`✓ 上架成功: ${item.name}`)
              
              // 更新状态为成功
              if (!isGroupedView.value) {
                itemForms.value[i].uploadStatus = 'success'
                itemForms.value[i].uploadMessage = '上架成功'
              }
            } else {
              failCount++
              const errorMsg = response.data.message || '未知错误'
              console.error(`✗ 上架失败: ${item.name} - ${errorMsg}`)
              
              // 更新状态为失败
              if (!isGroupedView.value) {
                itemForms.value[i].uploadStatus = 'failed'
                itemForms.value[i].uploadMessage = errorMsg
              }
            }
            
            // 添加延迟，避免请求过快
            if (i < itemsData.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
          } catch (error) {
            failCount++
            const errorMsg = error.response?.data?.message || error.message || '网络错误'
            console.error(`✗ 上架异常: ${item.name}`, error)
            
            // 更新状态为失败
            if (!isGroupedView.value) {
              itemForms.value[i].uploadStatus = 'failed'
              itemForms.value[i].uploadMessage = errorMsg
            }
          }
        }
        
        // 显示结果
        if (failCount === 0) {
          ElMessage.success(`全部上架成功！共${successCount}件物品`)
        } else if (successCount === 0) {
          ElMessage.error(`全部上架失败！共${failCount}件物品`)
        } else {
          ElMessage.warning(`上架完成：成功${successCount}件，失败${failCount}件`)
        }
        
        // 不关闭弹窗，让用户查看上架结果
        // 刷新库存数据
        await loadInventoryData()
        
      } else if (platform === 'buff') {
        // BUFF 的创建接口原生支持批量，出售与出租共用，靠 listingType 区分，
        // 所以一次请求提交全部饰品，不像悠悠有品那样逐件发。
        const listingType = sellRentDialogType.value === 'rent' ? 'rent' : 'sell'

        itemForms.value.forEach(f => {
          f.uploadStatus = 'uploading'
          f.uploadMessage = '上架中...'
        })

        try {
          const response = await axios.post(apiUrls.buffCreateListing(), {
            steamID: selectedSteamId.value,
            listingType,
            items: itemsData.map(it => ({
              assetid: it.assetid,
              classid: it.classid,
              instanceid: it.instanceid,
              steam_hash_name: it.steam_hash_name,
              price: it.price,
              rent_unit_price: it.rentUnitPrice,
              security_price: it.securityPrice,
              rent_out_day: it.rentOutDay,
              desc: it.remark
            }))
          })

          if (response.data.success) {
            ElMessage.success(response.data.message || `已提交 ${itemsData.length} 件饰品上架`)
            itemForms.value.forEach(f => {
              f.uploadStatus = 'success'
              f.uploadMessage = '上架成功'
            })
            await loadInventoryData()
          } else {
            const errorMsg = response.data.message || '上架失败'
            ElMessage.error(errorMsg)
            itemForms.value.forEach(f => {
              f.uploadStatus = 'failed'
              f.uploadMessage = errorMsg
            })
          }
        } catch (error) {
          const errorMsg = error.response?.data?.message || error.message || '网络错误'
          console.error('BUFF上架失败:', error)
          ElMessage.error(`上架失败: ${errorMsg}`)
          itemForms.value.forEach(f => {
            f.uploadStatus = 'failed'
            f.uploadMessage = errorMsg
          })
        }

      } else {
        // 其他平台暂未实现
        ElMessage.warning(`${platformName}${action}功能暂未实现`)
      }

    } catch (error) {
      if (error !== false) {
        console.error('操作失败:', error)
        ElMessage.error(error.message || '请检查所有物品的价格是否填写正确')
      }
    } finally {
      submitting.value = false
    }
  }
  
  // 打开预览弹窗
  const openPreview = (item) => {
    previewItem.value = item
    previewVisible.value = true
    // 加载印花和挂件价格信息
    loadStickersPriceInfo(item.sticker)
    loadPendantPriceInfo(item.pendant)
  }

  // 从选中物品列表打开详情
  const openDetailFromSelection = () => {
    if (selectedItems.value.length === 0) return
    detailCurrentIndex.value = 0
    const item = selectedItems.value[0]
    previewItem.value = item
    previewVisible.value = true
    loadStickersPriceInfo(item.sticker)
    loadPendantPriceInfo(item.pendant)
  }

  // 切换到上一个选中物品
  const prevDetailItem = () => {
    if (detailCurrentIndex.value > 0) {
      detailCurrentIndex.value--
      const item = selectedItems.value[detailCurrentIndex.value]
      previewItem.value = item
      loadStickersPriceInfo(item.sticker)
      loadPendantPriceInfo(item.pendant)
    }
  }

  // 切换到下一个选中物品
  const nextDetailItem = () => {
    if (detailCurrentIndex.value < selectedItems.value.length - 1) {
      detailCurrentIndex.value++
      const item = selectedItems.value[detailCurrentIndex.value]
      previewItem.value = item
      loadStickersPriceInfo(item.sticker)
      loadPendantPriceInfo(item.pendant)
    }
  }

  // 预览弹窗鼠标滚轮切换
  let wheelThrottleTimer = null
  const handlePreviewWheel = (e) => {
    if (selectedItems.value.length <= 1) return
    if (wheelThrottleTimer) return
    wheelThrottleTimer = setTimeout(() => { wheelThrottleTimer = null }, 300)
    if (e.deltaY > 0) {
      nextDetailItem()
    } else if (e.deltaY < 0) {
      prevDetailItem()
    }
  }

  // 加载印花价格信息
  const loadStickersPriceInfo = async (stickersData) => {
    stickersPriceInfo.value = []
    if (!stickersData) return

    try {
      const parsed = typeof stickersData === 'string' ? JSON.parse(stickersData) : stickersData
      if (!Array.isArray(parsed) || parsed.length === 0) return

      console.log('解析的印花数据:', parsed)

      const pricePromises = parsed.map(async (sticker) => {
        const steamHashName = sticker.steam_hash_name
        const name = sticker.name || '未知贴纸'

        console.log('印花查询 - name:', name, 'steam_hash_name:', steamHashName)
        if (!steamHashName) return null

        try {
          const url = apiUrls.buyYyypPriceInfo(steamHashName)
          console.log('请求URL:', url)

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          })

          console.log('响应状态:', response.status, response.statusText)

          if (!response.ok) {
            console.warn(`请求失败 (${steamHashName}): ${response.status} ${response.statusText}`)
            return null
          }

          const result = await response.json()
          console.log('响应数据:', result)

          if (result.success && result.data) {
            return {
              name: name,
              steam_hash_name: steamHashName,
              yyyp_price: result.data.yyyp_price,
              yyyp_on_sale_count: result.data.yyyp_on_sale_count,
              buff_price: result.data.buff_price,
              buff_on_sale_count: result.data.buff_on_sale_count,
              market_listing_item_name: result.data.market_listing_item_name
            }
          }
        } catch (error) {
          console.error(`查询印花价格失败 (${name} - ${steamHashName}):`, error.message || error)
          // 不抛出错误，让其他请求继续执行
        }
        return null
      })

      const results = await Promise.all(pricePromises)
      stickersPriceInfo.value = results.filter(item => item !== null)
      console.log('印花价格信息:', stickersPriceInfo.value)
    } catch (error) {
      console.error('解析印花价格信息失败:', error)
      stickersPriceInfo.value = []
    }
  }

  // 加载挂件价格信息
  const loadPendantPriceInfo = async (pendantData) => {
    pendantPriceInfo.value = null
    if (!pendantData) return

    try {
      const parsed = typeof pendantData === 'string' ? JSON.parse(pendantData) : pendantData
      const pendantObj = Array.isArray(parsed) ? parsed[0] : parsed
      if (!pendantObj || typeof pendantObj !== 'object') return

      const steamHashName = pendantObj.steam_hash_name
      const name = pendantObj.name || '挂件'

      if (!steamHashName) return

      const url = apiUrls.buyYyypPriceInfo(steamHashName)
      console.log('挂件请求URL:', url, 'steam_hash_name:', steamHashName)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn(`请求失败 (${steamHashName}): ${response.status} ${response.statusText}`)
        return
      }

      const result = await response.json()
      console.log('挂件响应数据:', result)

      if (result.success && result.data) {
        pendantPriceInfo.value = {
          name: name,
          steam_hash_name: steamHashName,
          yyyp_price: result.data.yyyp_price,
          yyyp_on_sale_count: result.data.yyyp_on_sale_count,
          buff_price: result.data.buff_price,
          buff_on_sale_count: result.data.buff_on_sale_count,
          market_listing_item_name: result.data.market_listing_item_name
        }
        console.log('挂件价格信息:', pendantPriceInfo.value)
      }
    } catch (error) {
      console.error('解析挂件价格信息失败:', error)
      pendantPriceInfo.value = null
    }
  }

  // 悠悠出售按钮处理
  const handleYYYPSell = () => {
    ElMessage.info('悠悠出售功能待开发')
    // TODO: 实现悠悠出售功能
  }

  // 悠悠出租按钮处理
  const handleYYYPRent = () => {
    ElMessage.info('悠悠出租功能待开发')
    // TODO: 实现悠悠出租功能
  }

  // BUFF出售按钮处理
  const handleBuffSell = () => {
    ElMessage.info('BUFF出售功能待开发')
    // TODO: 实现BUFF出售功能
  }

  // BUFF出租按钮处理
  const handleBuffRent = () => {
    ElMessage.info('BUFF出租功能待开发')
    // TODO: 实现BUFF出租功能
  }

  // 跳转到商品搜索页面
  const handleJumpToItemSearch = () => {
    if (!previewItem.value || !previewItem.value.steam_hash_name) {
      ElMessage.warning('未找到商品信息')
      return
    }

    // 在新标签页打开商品搜索页面
    const searchUrl = `/item-search?keyword=${encodeURIComponent(previewItem.value.steam_hash_name)}`
    window.open(searchUrl, '_blank')
  }

  // 通过印花跳转到商品搜索页面
  const handleJumpToItemSearchBySticker = (sticker) => {
    if (!sticker) {
      ElMessage.warning('未找到印花信息')
      return
    }

    // 直接使用 steam_hash_name 字段
    const steamHashName = sticker.steam_hash_name

    if (!steamHashName) {
      console.warn('印花对象:', sticker)
      ElMessage.warning('该印花没有有效的 steam_hash_name')
      return
    }

    // 在新标签页打开商品搜索页面
    const searchUrl = `/item-search?keyword=${encodeURIComponent(steamHashName)}`
    console.log('印花跳转:', steamHashName, 'URL:', searchUrl)
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

    // 直接使用 steam_hash_name 字段
    const steamHashName = pendantObj.steam_hash_name

    if (!steamHashName) {
      console.warn('挂件对象:', pendantObj)
      ElMessage.warning('该挂件没有有效的 steam_hash_name')
      return
    }

    // 在新标签页打开商品搜索页面
    const searchUrl = `/item-search?keyword=${encodeURIComponent(steamHashName)}`
    console.log('挂件跳转:', steamHashName, 'URL:', searchUrl)
    window.open(searchUrl, '_blank')
  }

  // 移入组件按钮处理（单个物品）
  const handleMoveToComponent = async () => {
    if (!previewItem.value) {
      ElMessage.warning('未找到物品信息')
      return
    }
    
    // 检查是否有交易限制
    if (hasTradeRestriction(previewItem.value)) {
      ElMessage.warning('该物品有交易限制，无法存入组件')
      return
    }
    
    // 调用批量移入组件，传入单个物品
    await moveToComponentWithItems([previewItem.value])
  }
  
  // 批量移入组件
  const moveToComponent = async () => {
    if (selectedItems.value.length === 0) {
      ElMessage.warning('请先选择要移入组件的物品')
      return
    }
    
    // 检查是否有交易限制的物品
    const restrictedItems = selectedItems.value.filter(item => hasTradeRestriction(item))
    if (restrictedItems.length > 0) {
      ElMessage.warning('所选物品中有交易限制的物品，无法存入组件')
      return
    }
    
    // 保存要存入的物品
    itemsToDeposit.value = selectedItems.value
    
    // 进入选择组件模式
    isSelectingComponent.value = true
    
    // 重新加载数据，只显示库存组件
    await loadInventoryData()
    
    ElMessage.info(`请选择一个库存组件来存入 ${itemsToDeposit.value.length} 件物品`)
  }

  // 取消选择组件
  const cancelComponentSelection = async () => {
    isSelectingComponent.value = false
    itemsToDeposit.value = []
    // 重新加载数据，显示所有物品
    await loadInventoryData()
  }
  
  // 执行存入操作
  const executeDeposit = async (items, storageUnitId) => {
    const loading = ElLoading.service({
      lock: true,
      text: '正在存入物品...',
      background: 'rgba(0, 0, 0, 0.7)'
    })
    
    try {
      const itemIds = items.map(item => item.assetid)
      
      const response = await axios.post(
        apiUrls.pwDepositToComponent(),
        {
          steamId: selectedSteamId.value,
          itemIds: itemIds,
          storageUnitId: storageUnitId,
          transferType: 1  // 1表示存入
        }
      )
      
      if (response.data.success) {
        ElMessage.success(response.data.message)
        
        // 清空选择
        clearSelection()
        
        // 刷新库存数据
        await loadInventoryData()
      } else {
        ElMessage.error(response.data.message)
      }
      
    } catch (error) {
      console.error('存入物品失败:', error)
      ElMessage.error(error.response?.data?.message || error.message)
    } finally {
      loading.close()
    }
  }

  // 解析交易限制日期
  const parseTradeLockDate = (remark) => {
    if (!remark) return null
    
    try {
      // 匹配日期格式：2025 10月 23 (7:00:00) 或 2025年10月23日
      const dateMatch = remark.match(/(\d{4})\s*年?\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?\s*\((\d{1,2}):(\d{2}):(\d{2})\)/)
      
      if (dateMatch) {
        const [, year, month, day, hour, minute, second] = dateMatch
        
        // 创建UTC时间（格林尼治标准时间）
        const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
        
        // 转换为本地时间
        const localDate = new Date(utcDate)
        
        // 格式化本地日期（只显示到日期）
        const localYear = localDate.getFullYear()
        const localMonth = localDate.getMonth() + 1
        const localDay = localDate.getDate()
        const formattedDate = `${localYear}年${localMonth}月${localDay}日`
        
        // 计算剩余天数
        const now = new Date()
        const diffTime = localDate - now
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        return {
          date: formattedDate,
          daysLeft: diffDays > 0 ? diffDays : 0,
          expired: diffDays <= 0
        }
      }
      
      return null
    } catch (e) {
      console.error('解析交易限制日期失败:', e)
      return null
    }
  }

  // 解析贴纸JSON数据
  const parseStickers = (stickerJson) => {
    if (!stickerJson) return []
    try {
      const stickers = JSON.parse(stickerJson)
      if (!Array.isArray(stickers)) return []

      // 返回贴纸数组，每个贴纸包含name和image
      return stickers.map(sticker => {
        const name = sticker.name || sticker.sticker_name || '未知贴纸'
        const steamHashName = sticker.steam_hash_name || sticker.image || sticker.sticker_img

        // 根据steam_hash_name生成图片URL
        let imageUrl = null
        if (steamHashName) {
          // 使用getWeaponImage相同的逻辑转换路径
          const imageName = steamHashName
            .replace(/\s*\|\s*/g, '___')
            .replace(/\s/g, '_')
            + '.png'
          imageUrl = apiUrls.weaponImage(imageName)
        }

        return {
          name: name,
          image: imageUrl
        }
      })
    } catch (e) {
      console.error('解析贴纸JSON失败:', e)
      return []
    }
  }

  // 解析挂件JSON数据
  const parsePendant = (pendantJson) => {
    if (!pendantJson) return { name: null, image: null }
    try {
      const pendant = JSON.parse(pendantJson)
      const name = pendant.name || '未知挂件'
      const steamHashName = pendant.steam_hash_name

      // 根据steam_hash_name生成图片URL
      let imageUrl = null
      if (steamHashName) {
        const imageName = steamHashName
          .replace(/\s*\|\s*/g, '___')
          .replace(/\s/g, '_')
          + '.png'
        imageUrl = apiUrls.weaponImage(imageName)
      }

      return {
        name: name,
        image: imageUrl
      }
    } catch (e) {
      console.error('解析挂件JSON失败:', e)
      return { name: null, image: null }
    }
  }

  // 获取贴纸数量
  const getStickerCount = (stickerJson) => {
    return parseStickers(stickerJson).length
  }

  // 获取贴纸提示信息
  const getStickerTooltip = (stickerJson) => {
    const stickers = parseStickers(stickerJson)
    if (stickers.length === 0) return ''
    return '贴纸列表:\n' + stickers.map((s, i) => `${i + 1}. ${s.name}`).join('\n')
  }

  // 单独加载统计数据（不重新加载列表）
  const loadInventoryStats = async () => {
    try {
      // 构建查询参数（与loadInventoryData保持一致）
      const params = {
        weapon_type: weaponTypeFilter.value,
        float_range: floatRangeFilter.value
      }
      
      // 如果处于选择组件模式，只统计库存组件
      if (isSelectingComponent.value) {
        params.classid = '3604678661'
      } else {
        // 只在非选择组件模式下应用搜索过滤
        params.search = searchText.value
      }
      
      const statsResponse = await axios.get(
        apiUrls.inventoryStats(selectedSteamId.value),
        { params }
      )
      if (statsResponse.data.success) {
        statsData.value = statsResponse.data.data
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  // 获取Steam库存
  const fetchSteamInventory = async () => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }

    try {
      fetchingInventory.value = true

      // 直接调用Spider接口，只传steamId
      // Spider会自己调用后端API查询config表获取cookie
      const spiderResponse = await axios.post(
        apiUrls.steamGetInventory(),
        {
          steamId: selectedSteamId.value
        }
      )

      if (spiderResponse.data.success) {
        ElMessage.success(spiderResponse.data.message || '库存获取成功')
        // 重新加载库存数据
        await loadInventoryData()
      } else {
        ElMessage.error(spiderResponse.data.message || '库存获取失败')
      }
    } catch (error) {
      console.error('获取Steam库存失败:', error)
      ElMessage.error('获取库存失败: ' + (error.response?.data?.message || error.message))
    } finally {
      fetchingInventory.value = false
    }
  }

  // 获取悠悠有品价格
  const fetchYYYPPrice = async () => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }

    try {
      fetchingYYYPPrice.value = true
      
      // 调用Spider API获取悠悠有品价格（V2 API）
      const response = await axios.post(
        `${API_CONFIG.SPIDER_BASE_URL}/spiderApiV2/src/web_site/youping/units/settings/dev_tools/syncWeaponPrice`,
        {
          steamId: selectedSteamId.value
        }
      )
      
      if (response.data.success) {
        ElMessage.success(response.data.message || '悠悠有品价格获取成功')
        // 重新加载库存数据和统计信息
        await loadInventoryData()
      } else {
        ElMessage.error(response.data.message || '悠悠有品价格获取失败')
      }
      
    } catch (error) {
      console.error('获取悠悠有品价格失败:', error)
      ElMessage.error('获取价格失败: ' + (error.response?.data?.message || error.message))
    } finally {
      fetchingYYYPPrice.value = false
    }
  }

  // 获取BUFF价格
  const fetchBuffPrice = async () => {
    if (!selectedSteamId.value) {
      ElMessage.warning('请先选择Steam账号')
      return
    }

    try {
      fetchingBuffPrice.value = true
      
      // 调用Spider API获取BUFF价格
      const response = await axios.post(
        apiUrls.buffGetPrice(),
        {
          steamId: selectedSteamId.value
        }
      )
      
      if (response.data.success) {
        ElMessage.success(response.data.message || 'BUFF价格获取成功')
        // 重新加载库存数据和统计信息
        await loadInventoryData()
      } else {
        ElMessage.error(response.data.message || 'BUFF价格获取失败')
      }
      
    } catch (error) {
      console.error('获取BUFF价格失败:', error)
      ElMessage.error('获取价格失败: ' + (error.response?.data?.message || error.message))
    } finally {
      fetchingBuffPrice.value = false
    }
  }

  // 计算当前显示的数据（后端已处理所有筛选，前端不再需要额外筛选）
  const currentDisplayData = computed(() => {
    // 只在列表模式下才使用组合数据
    if (displayMode.value === 'list' && groupMode.value) {
      return groupedData.value
    } else {
      return inventoryData.value
    }
  })

  // 格式化选中的饰品数据，用于传递给出租表单
  const formattedSelectedItems = computed(() => {
    return selectedItems.value.map(item => ({
      assetid: item.assetid,
      name: getCardTitle(item),
      steam_hash_name: item.steam_hash_name || item.item_name,
      image: getWeaponImage(item.steam_hash_name),
      float: item.weapon_float,
      weapon_float: item.weapon_float,
      paintseed: item.paintseed,
      yyyp_Price: item.yyyp_Price,
      weapon_classID: item.weapon_classID,
      buyPrice: item.buy_price ? parseFloat(item.buy_price).toFixed(2) : null
    }))
  })

  // 统计数据计算（使用后端返回的全局统计，支持所有筛选条件）
  const inventoryStats = computed(() => {
    const totalCount = statsData.value.total_count || 0

    const typeDistribution = statsData.value.by_type.length > 0
      ? statsData.value.by_type.slice(0, 3).map(t => `${t.weapon_type}(${t.count})`).join(', ')
      : '暂无数据'

    const wearDistribution = statsData.value.by_wear.length > 0
      ? statsData.value.by_wear.slice(0, 3).map(w => `${w.float_range}(${w.count})`).join(', ')
      : '暂无数据'

    return {
      totalCount: totalCount,
      typeDistribution,
      wearDistribution
    }
  })

  const priceStats = computed(() => {
    // 使用后端返回的统计数据
    const ps = statsData.value.price_stats || {}
    const priced_count = ps.priced_count || 0
    const total_price = typeof ps.total_price === 'number' ? ps.total_price : Number(ps.total_price || 0)
    const avg_price = typeof ps.avg_price === 'number' ? ps.avg_price : Number(ps.avg_price || 0)

    return {
      priced_count,
      total_price: total_price.toFixed(2),
      avg_price: avg_price.toFixed(2),
      min_price: ps.min_price !== undefined ? Number(ps.min_price || 0).toFixed(2) : '0.00',
      max_price: ps.max_price !== undefined ? Number(ps.max_price || 0).toFixed(2) : '0.00'
    }
  })

  const yyypPriceStats = computed(() => {
    // 使用后端返回的统计数据
    const yy = statsData.value.yyyp_price_stats || {}
    const ps = statsData.value.price_stats || {}
    const priced_count = yy.priced_count || 0
    const yy_total = typeof yy.total_price === 'number' ? yy.total_price : Number(yy.total_price || 0)
    const buy_total = typeof ps.total_price === 'number' ? ps.total_price : Number(ps.total_price || 0)
    const avg_price = typeof yy.avg_price === 'number' ? yy.avg_price : Number(yy.avg_price || 0)
    const diff = (yy_total - buy_total).toFixed(2)

    return {
      priced_count,
      total_price: yy_total.toFixed(2),
      avg_price: avg_price.toFixed(2),
      diff
    }
  })

  const buffPriceStats = computed(() => {
    // 使用后端返回的统计数据（扣除2.5%手续费）
    const buff = statsData.value.buff_price_stats || {}
    const ps = statsData.value.price_stats || {}
    const priced_count = buff.priced_count || 0
    const buff_total = typeof buff.total_price === 'number' ? buff.total_price : Number(buff.total_price || 0)
    const buff_total_after_fee = buffNetPrice(buff_total)
    const buy_total = typeof ps.total_price === 'number' ? ps.total_price : Number(ps.total_price || 0)
    const diff = (buff_total_after_fee - buy_total).toFixed(2)

    return {
      priced_count,
      total_price: buff_total_after_fee.toFixed(2),
      avg_price: priced_count > 0 ? (buff_total_after_fee / priced_count).toFixed(2) : '0.00',
      diff
    }
  })

  const steamPriceStats = computed(() => {
    // 使用后端返回的统计数据
    const steam = statsData.value.steam_price_stats || {}
    const ps = statsData.value.price_stats || {}
    const priced_count = steam.priced_count || 0
    const steam_total = typeof steam.total_price === 'number' ? steam.total_price : Number(steam.total_price || 0)
    const buy_total = typeof ps.total_price === 'number' ? ps.total_price : Number(ps.total_price || 0)
    const avg_price = typeof steam.avg_price === 'number' ? steam.avg_price : Number(steam.avg_price || 0)
    const diff = (steam_total - buy_total).toFixed(2)

    return {
      priced_count,
      total_price: steam_total.toFixed(2),
      avg_price: avg_price.toFixed(2),
      diff
    }
  })

  // 设备类型监听取消函数
  let unwatchDevice = null

  onMounted(async () => {
    // 应用设备类型类到 body
    const deviceType = applyDeviceClass()
    console.log('[Inventory] 当前设备类型:', deviceType)

    // 监听设备类型变化
    unwatchDevice = watchDeviceType((newDeviceType) => {
      console.log('[Inventory] 设备类型已变更:', newDeviceType)
    })

    await loadSteamIdList()
    if (selectedSteamId.value) {
      loadInventoryData(true)
    }

    // 设置滚动监听
    setupScrollObserver()

    // 监听显示模式变化，重新设置观察器
    watch(displayMode, () => {
      setupScrollObserver()
    })

    // 监听数据变化，重新设置观察器（数据加载后）
    watch(inventoryData, () => {
      setupScrollObserver()
    })

    // 监听组合数据变化
    watch(groupedData, () => {
      setupScrollObserver()
    })
  })

  // 组件卸载时清理观察器
  onUnmounted(() => {
    // 取消设备类型监听
    if (unwatchDevice) {
      unwatchDevice()
    }

    if (imageObserver) {
      imageObserver.disconnect()
      imageObserver = null
    }
  })

  // 组件选择对话框辅助方法
  const getComponentRemainingClass = (remaining) => {
    if (remaining > 100) return 'remaining-high'
    if (remaining > 20) return 'remaining-medium'
    return 'remaining-low'
  }

  const getComponentProgressColor = (storedCount) => {
    const percentage = storedCount / 1000
    if (percentage < 0.7) return '#67C23A'
    if (percentage < 0.9) return '#E6A23C'
    return '#F56C6C'
  }

  return {
    loading,
    fetchingInventory,
    fetchingYYYPPrice,
    fetchingBuffPrice,
    inventoryData,
    groupedData,
    groupMode,
    currentDisplayData,
    inventoryStats,
    priceStats,
    yyypPriceStats,
    buffPriceStats,
    steamPriceStats,
    searchText,
    weaponTypeFilter,
    floatRangeFilter,
    pendantFilter,
    stickerFilter,
    renameFilter,
    tradeRestrictionFilter,
    displayMode,
    steamIdList,
    selectedSteamId,
    sortConfig,
    getItemTitle,
    getCardTitle,
    getWeaponImage,
    handleImageError,
    getPriceDiffClass,
    parseTradeLockDate,
    parseStickers,
    getStickerCount,
    getStickerTooltip,
    loadInventoryData,
    loadMoreData,
    handleReset,
    handleSteamIdChange,
    handleFilterChange,
    handleSortChange,
    handleToggleGroupMode,
    hasMore,
    loadingMore,
    editingAssetId,
    editingPrice,
    startEdit,
    finishEdit,
    cancelEdit,
    fetchSteamInventory,
    fetchYYYPPrice,
    fetchBuffPrice,
    previewVisible,
    previewItem,
    stickersPriceInfo,
    pendantPriceInfo,
    openPreview,
    handleJumpToItemSearch,
    handleJumpToItemSearchBySticker,
    handleJumpToItemSearchByPendant,
    handleYYYPSell,
    handleYYYPRent,
    handleBuffSell,
    handleBuffRent,
    handleMoveToComponent,
    moveToComponent,
    parsePendant,
    getExpandedItems,
    getExpandedTotal,
    handleExpandPageChange,
    expandedRowPages,
    getItemsPerPage,
    handleRowClick,
    getRowStyle,
    tableRef,
    hasExtras,
    showPriceDiff,
    // 多选相关
    isMultiSelectMode,
    selectedItems,
    toggleDisplayMode,
    isItemSelected,
    hasTradeRestriction,
    toggleItemSelection,
    clearSelection,
    selectAllDisplayed,
    handleCardClick,
    // 详情导航相关
    detailCurrentIndex,
    openDetailFromSelection,
    prevDetailItem,
    nextDetailItem,
    handlePreviewWheel,
    // 出售/出租相关
    sellRentDialogVisible,
    sellRentDialogTitle,
    sellRentDialogType,
    itemForms,
    itemFormRefs,
    itemFormRules,
    submitting,
    showSellDialog,
    showRentDialog,
    validateItemPrice,
    yyypRealtimePrices,
    loadingYYYPPrices,
    confirmSellRent,
    // 出售平台选择
    sellPlatformSelectVisible,
    handleSellPlatformSelect,
    handleSellPlatformSelectCancel,
    // 出租功能
    rentPlatformSelectVisible,
    rentFormVisible,
    selectedRentPlatform,
    rentInitData,
    formattedSelectedItems,
    handleRentPlatformSelect,
    handleRentPlatformSelectCancel,
    handleRentFormClosed,
    handleRentFormSubmit,
    // 组合显示
    isGroupedView,
    toggleGroupedView,
    groupedItems,
    getGroupAveragePrice,
    getGroupPriceRange,
    getGroupFloatRange,
    autoFillGroupPrices,
    autoFillItemPrices,
    expandedGroups,
    toggleGroupExpand,
    groupForms,
    groupFormRefs,
    validateGroupPrice,
    openGroupRemarkDialog,
    // 备注弹窗
    remarkDialogVisible,
    currentRemark,
    openRemarkDialog,
    saveRemark,
    saveRemark,
    // 备注弹窗
    remarkDialogVisible,
    currentRemark,
    openRemarkDialog,
    saveRemark,
    // 备注弹窗相关
    remarkDialogVisible,
    currentRemarkIndex,
    currentRemark,
    openRemarkDialog,
    saveRemark,
    // 图标组件
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    InfoFilled,
    isSelectingComponent,
    itemsToDeposit,
    cancelComponentSelection,
    getComponentRemainingClass,
    getComponentProgressColor
  }
}
