import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import axios from 'axios'
import { API_CONFIG, apiUrls } from '@/config/api.js'
import { applyDeviceClass, watchDeviceType } from '@/utils/deviceDetect.js'
import RentFormYYYP from '@/views/Inventory/RentFormYYYP/index.vue'
import OfferProcessing from './OfferProcessing/index.vue'
import RentedOut from './RentedOut/index.vue'
import SaleManagement from './SaleManagement/index.vue'
import LeaseManagement from './LeaseManagement/index.vue'
import SubleaseManagement from './SubleaseManagement/index.vue'
import PresaleManagement from './PresaleManagement/index.vue'
import InstantPayment from './InstantPayment/index.vue'
import MyPurchaseRequest from './MyPurchaseRequest/index.vue'
import MyFavorite from './MyFavorite/index.vue'

export default {
  name: 'OnSale',
  components: {
    Loading,
    CircleCheck,
    CircleClose,
    RentFormYYYP,
    OfferProcessing,
    RentedOut,
    SaleManagement,
    LeaseManagement,
    SubleaseManagement,
    PresaleManagement,
    InstantPayment,
    MyPurchaseRequest,
    MyFavorite
  },
  setup() {
    const route = useRoute()
    const router = useRouter()

    const loading = ref(false)
    const updating = ref(false)
    const autoFillLoading = ref(false)
    const onSaleData = ref([])
    const accountList = ref([])
    const selectedAccount = ref('')
    const searchText = ref('')
    const weaponTypeFilter = ref('')
    const floatRangeFilter = ref('')
    const displayMode = ref('card')
    // 报价处理的数量 - 从 localStorage 读取缓存
    const cachedOfferCount = localStorage.getItem('yyyp_offer_count')
    const offerCount = ref(cachedOfferCount ? parseInt(cachedOfferCount) : 0)

    // 子模块与 URL 同步：有效的 subType 与 tradeTypes 的 value 一致
    const VALID_SUB_TYPES = ['sale', 'lease', 'sublease', 'presale', 'transfer', 'purchase_request', 'offer', 'favorite', 'rented_out', 'instant']
    const selectedTradeType = computed(() => {
      const sub = route.params.subType
      return (sub && VALID_SUB_TYPES.includes(sub)) ? sub : 'sale'
    })
    const tradeTypes = ref([
      { value: 'sale', label: '出售', icon: '💰' },
      { value: 'lease', label: '租赁', icon: '🔄' },
      { value: 'sublease', label: '转租', icon: '🔁' },
      { value: 'presale', label: '预售', icon: '⏰' },
      { value: 'transfer', label: '过户', icon: '📝' },
      { value: 'purchase_request', label: '求购', icon: '🛒' },
      { value: 'offer', label: '报价', icon: '💬' },
      { value: 'favorite', label: '关注', icon: '⭐' },
      { value: 'rented_out', label: '已租出', icon: '📦' },
      { value: 'instant', label: '秒到账', icon: '⚡' }
    ])

    // 图片404缓存
    const image404Cache = ref(new Set())

    // 多选模式相关
    const isMultiSelectMode = ref(true) // 默认开启多选模式
    const selectedItems = ref([])

    // 弹窗相关
    const updatePriceDialogVisible = ref(false)
    const rentPriceDialogVisible = ref(false)  // 租赁改价对话框
    const subleasePriceDialogVisible = ref(false)  // 转租改价对话框
    const batchChangePriceDialogVisible = ref(false)  // 批量改价对话框
    const previewVisible = ref(false)
    const selectedItem = ref(null)
    const previewItem = ref(null)
    const updatePriceForm = ref({
      newPrice: ''
    })

    // 租赁改价相关
    const rentPriceFormData = ref(null)  // 租赁改价表单数据
    const rentInitData = ref(null)  // 租赁初始化数据
    const steamId = ref('')  // 当前操作的完整 Steam ID

    // 转租改价相关
    const subleasePriceFormData = ref(null)  // 转租改价表单数据
    const subleaseInitData = ref(null)  // 转租初始化数据

    // 批量改价相关
    const batchChangePriceForm = ref({
      individualPrices: [],  // 每个商品的价格
      priceUpdateStatus: [],  // 每个商品的改价状态: 'success' | 'error' | null
      priceUpdateErrors: []   // 每个商品的错误信息
    })

    // 格式化租赁改价的 item 数据
    const formattedRentItem = computed(() => {
      // 批量改价模式：使用 selectedItems
      if (selectedItems.value.length > 0 && !selectedItem.value) {
        return selectedItems.value.map(item => ({
          assetid: item.assetid || item.id,
          name: item.item_name || item.steam_hash_name,
          steam_hash_name: item.steam_hash_name || item.item_name,
          image: getWeaponImage(item.steam_hash_name || item.item_name),
          float: item.weapon_float || item.float,
          paintseed: item.paintseed,
          trade_type: 'lease',  // 标记为租赁
          weapon_classID: {
            yyyp_Price: item.deposit_amount || item.yyyp_price || item.market_price,
            yyyp_id: item.template_id || item.yyyp_id
          },
          // 添加当前租赁配置用于自动填充
          currentRentDays: item.lease_max_days,
          currentShortRentPrice: item.short_lease_amount,
          currentLongRentPrice: item.long_lease_amount,
          currentDepositPrice: item.deposit_amount
        }))
      }

      // 单个改价模式：使用 selectedItem
      if (!selectedItem.value) return []

      const item = selectedItem.value
      return [{
        assetid: item.assetid || item.id,
        name: item.item_name || item.steam_hash_name,
        steam_hash_name: item.steam_hash_name || item.item_name,
        image: getWeaponImage(item.steam_hash_name || item.item_name),
        float: item.weapon_float || item.float,
        paintseed: item.paintseed,
        trade_type: 'lease',  // 标记为租赁
        weapon_classID: {
          yyyp_Price: item.deposit_amount || item.yyyp_price || item.market_price,
          yyyp_id: item.template_id || item.yyyp_id
        },
        // 添加当前租赁配置用于自动填充
        currentRentDays: item.lease_max_days,
        currentShortRentPrice: item.short_lease_amount,
        currentLongRentPrice: item.long_lease_amount,
        currentDepositPrice: item.deposit_amount
      }]
    })

    // 格式化转租改价的 item 数据
    const formattedSubleaseItem = computed(() => {
      // 批量改价模式：使用 selectedItems
      if (selectedItems.value.length > 0 && !selectedItem.value) {
        return selectedItems.value.map(item => ({
          assetid: item.assetid || item.id,
          commodity_id: item.commodity_id || item.id,  // 添加 commodity_id 用于查找赔付文本
          name: item.item_name || item.steam_hash_name,
          steam_hash_name: item.steam_hash_name || item.item_name,
          image: getWeaponImage(item.steam_hash_name || item.item_name),
          float: item.weapon_float || item.float,
          paintseed: item.paintseed,
          trade_type: 'sublease',  // 标记为转租
          weapon_classID: {
            yyyp_Price: item.deposit_amount || item.yyyp_price || item.market_price,
            yyyp_id: item.template_id || item.yyyp_id
          },
          // 添加当前转租配置用于自动填充
          currentRentDays: item.lease_max_days,
          currentShortRentPrice: item.short_lease_amount,
          currentLongRentPrice: item.long_lease_amount,
          currentDepositPrice: item.deposit_amount
        }))
      }

      // 单个改价模式：使用 selectedItem
      if (!selectedItem.value) return []

      const item = selectedItem.value
      return [{
        assetid: item.assetid || item.id,
        commodity_id: item.commodity_id || item.id,  // 添加 commodity_id 用于查找赔付文本
        name: item.item_name || item.steam_hash_name,
        steam_hash_name: item.steam_hash_name || item.item_name,
        image: getWeaponImage(item.steam_hash_name || item.item_name),
        float: item.weapon_float || item.float,
        paintseed: item.paintseed,
        trade_type: 'sublease',  // 标记为转租
        weapon_classID: {
          yyyp_Price: item.deposit_amount || item.yyyp_price || item.market_price,
          yyyp_id: item.template_id || item.yyyp_id
        },
        // 添加当前转租配置用于自动填充
        currentRentDays: item.lease_max_days,
        currentShortRentPrice: item.short_lease_amount,
        currentLongRentPrice: item.long_lease_amount,
        currentDepositPrice: item.deposit_amount
      }]
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

      // 只显示悠悠有品平台的数据
      filtered = filtered.filter(item => item.platform === 'yyyp')

      // 交易类型过滤
      if (selectedTradeType.value) {
        filtered = filtered.filter(item => {
          // 如果数据库中有 trade_type 字段，使用它；否则默认为 'sale'
          const itemTradeType = item.trade_type || 'sale'
          return itemTradeType === selectedTradeType.value
        })
      }

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

    // 缓存交易类型数量到 localStorage
    const cacheTradeTypeCount = (tradeType, count) => {
      const key = `yyyp_${tradeType}_count`
      if (count > 0) {
        localStorage.setItem(key, count.toString())
      } else {
        localStorage.removeItem(key)
      }
    }

    // 从 localStorage 获取缓存的交易类型数量
    const getCachedTradeTypeCount = (tradeType) => {
      const key = `yyyp_${tradeType}_count`
      const cached = localStorage.getItem(key)
      return cached ? parseInt(cached) : 0
    }

    // 获取每个交易类型的数量
    const getTradeTypeCount = (tradeType) => {
      // 报价处理使用单独的计数器
      if (tradeType === 'offer') {
        return offerCount.value
      }

      // 如果当前选中的就是这个类型，从 onSaleData 计算实时数量
      if (selectedTradeType.value === tradeType && onSaleData.value.length > 0) {
        return onSaleData.value.filter(item => {
          const itemTradeType = item.trade_type || 'sale'
          return itemTradeType === tradeType && item.platform === 'yyyp'
        }).length
      }

      // 否则从缓存读取
      return getCachedTradeTypeCount(tradeType)
    }

    // 处理报价数量更新
    const handleOfferCountUpdate = (count) => {
      offerCount.value = count
      // 更新 localStorage 缓存
      if (count > 0) {
        localStorage.setItem('yyyp_offer_count', count.toString())
      } else {
        localStorage.removeItem('yyyp_offer_count')
      }
    }

    // 处理已租出数量更新
    const handleRentedOutCountUpdate = (count) => {
      cacheTradeTypeCount('rented_out', count)
    }

    // 处理我的求购数量更新
    const handlePurchaseRequestCountUpdate = (count) => {
      cacheTradeTypeCount('purchase_request', count)
    }

    // 处理秒到账数量更新
    const handleInstantCountUpdate = (count) => {
      cacheTradeTypeCount('instant', count)
    }

    // 处理我的关注数量更新
    const handleFavoriteCountUpdate = (count) => {
      cacheTradeTypeCount('favorite', count)
    }

    // 处理交易类型切换：通过 URL 切换子模块（加载由 route watch 触发）
    const handleTradeTypeChange = (tradeType) => {
      if (!VALID_SUB_TYPES.includes(tradeType)) return
      router.push('/on-sale/yyyp/' + tradeType)
      localStorage.setItem('yyyp_selected_trade_type', tradeType)
      selectedItems.value = []
      displayMode.value = tradeType === 'offer' ? 'list' : 'card'
    }

    // 加载在售数据
    const loadOnSaleData = async () => {
      if (!selectedAccount.value) {
        ElMessage.warning('请选择账号')
        return
      }

      // 报价处理、已租出、秒到账类型由各自组件加载数据，这里不需要处理
      if (selectedTradeType.value === 'offer' || selectedTradeType.value === 'rented_out' || selectedTradeType.value === 'instant') {
        return
      }

      loading.value = true
      try {
        let response

        // 根据交易类型选择不同的API
        if (selectedTradeType.value === 'lease') {
          // 租赁类型：调用租赁列表API
          response = await axios.post(apiUrls.yyypGetLeaseList(), {
            steamId: accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || '',
            page: 1,
            pageSize: 1000
          })

          if (response.data && response.data.success) {
            // 转换租赁数据格式以匹配前端期望
            const leaseData = response.data.data?.commodityInfoList || []
            onSaleData.value = leaseData.map(item => {
              // 解析印花数据
              let stickerData = null
              if (item.haveSticker && item.stickers && item.stickers.length > 0) {
                stickerData = JSON.stringify(item.stickers.map(sticker => ({
                  name: sticker.name,
                  image: sticker.imageUrl,
                  abrade: sticker.abradeDesc,
                  rawIndex: sticker.rawIndex
                })))
              }

              // 解析挂件数据
              let pendantData = null
              if (item.havePendant && item.pendants && item.pendants.length > 0) {
                const pendant = item.pendants[0]  // 通常只有一个挂件
                pendantData = JSON.stringify({
                  name: pendant.name || '',
                  image: pendant.imageUrl || '',
                  pattern: pendant.pattern || ''
                })
              }

              return {
                id: item.id,
                commodity_id: item.commodityId || item.id,  // 商品ID，用于改价等操作
                item_name: item.name,
                steam_hash_name: item.commodityHashName,  // 租赁API返回的是commodityHashName
                sale_price: item.shortLeaseAmount || item.longLeaseAmount || 0,  // 租金（短期或长期）
                buy_price: null,  // 租赁没有购入价
                weapon_float: item.abrade,
                weapon_type: item.typeName || '',
                float_range: item.exteriorName || '',  // 磨损等级名称
                sticker: stickerData,  // 印花数据
                pendant: pendantData,  // 挂件数据
                rename: item.haveNameTag ? '已改名' : null,  // 改名标记
                on_sale_time: item.statusDesc || null,  // 在售时间描述（如"在售1天"）
                platform: 'yyyp',
                trade_type: 'lease',
                account_id: selectedAccount.value,
                // 租赁特有字段
                lease_max_days: item.leaseMaxDays,  // 最大出租天数
                short_lease_amount: item.shortLeaseAmount,  // 短租租金
                long_lease_amount: item.longLeaseAmount,  // 长租租金
                deposit_amount: item.depositAmount,  // 押金
                lease_amount_desc: item.leaseAmountDesc,  // 租金描述
                deposit_amount_desc: item.depositAmountDesc  // 押金描述
              }
            })
            // 缓存租赁数量
            cacheTradeTypeCount('lease', onSaleData.value.length)
            ElMessage.success('加载成功')
          } else {
            ElMessage.error(response.data?.message || '加载失败')
          }
        } else if (selectedTradeType.value === 'sublease') {
          // 转租类型：调用转租列表API
          response = await axios.post(apiUrls.yyypGetSubleaseList(), {
            steamId: accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || '',
            page: 1,
            pageSize: 1000
          })

          if (response.data && response.data.success) {
            // 转换转租数据格式以匹配前端期望
            const subleaseData = response.data.data?.commodityInfoList || []
            onSaleData.value = subleaseData.map(item => {
              // 解析印花数据
              let stickerData = null
              if (item.haveSticker && item.stickers && item.stickers.length > 0) {
                stickerData = JSON.stringify(item.stickers.map(sticker => ({
                  name: sticker.name,
                  image: sticker.imageUrl,
                  abrade: sticker.abradeDesc,
                  rawIndex: sticker.rawIndex
                })))
              }

              // 解析挂件数据
              let pendantData = null
              if (item.havePendant && item.pendants && item.pendants.length > 0) {
                const pendant = item.pendants[0]  // 通常只有一个挂件
                pendantData = JSON.stringify({
                  name: pendant.name || '',
                  image: pendant.imageUrl || '',
                  pattern: pendant.pattern || ''
                })
              }

              return {
                id: item.id,
                commodity_id: item.commodityId || item.id,  // 商品ID，用于改价等操作
                order_no: item.orderNo || item.id,  // 订单号，用于取消转租
                item_name: item.name,
                steam_hash_name: item.commodityHashName,  // 转租API返回的是commodityHashName
                sale_price: item.shortLeaseAmount || item.longLeaseAmount || 0,  // 租金（短期或长期）
                buy_price: null,  // 转租没有购入价
                weapon_float: item.abrade,
                weapon_type: item.typeName || '',
                float_range: item.exteriorName || '',  // 磨损等级名称
                sticker: stickerData,  // 印花数据
                pendant: pendantData,  // 挂件数据
                rename: item.haveNameTag ? '已改名' : null,  // 改名标记
                on_sale_time: item.statusDesc || null,  // 在售时间描述（如"在售1天"）
                platform: 'yyyp',
                trade_type: 'sublease',
                account_id: selectedAccount.value,
                // 转租特有字段
                lease_max_days: item.leaseMaxDays,  // 最大出租天数
                short_lease_amount: item.shortLeaseAmount,  // 短租租金
                long_lease_amount: item.longLeaseAmount,  // 长租租金
                deposit_amount: item.depositAmount,  // 押金
                lease_amount_desc: item.leaseAmountDesc,  // 租金描述
                deposit_amount_desc: item.depositAmountDesc  // 押金描述
              }
            })
            // 缓存转租数量
            cacheTradeTypeCount('sublease', onSaleData.value.length)
            ElMessage.success('加载成功')
          } else {
            ElMessage.error(response.data?.message || '加载失败')
          }
        } else if (selectedTradeType.value === 'presale') {
          // 预售类型：调用预售列表API
          response = await axios.post(apiUrls.yyypGetPresaleList(), {
            steamId: accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || '',
            page: 1,
            pageSize: 1000
          })

          if (response.data && response.data.success) {
            // 转换预售数据格式以匹配前端期望
            const presaleData = response.data.data?.commodityInfoList || []
            onSaleData.value = presaleData.map(item => {
              // 解析印花数据
              let stickerData = null
              if (item.stickers && item.stickers.length > 0) {
                stickerData = JSON.stringify(item.stickers.map(sticker => ({
                  name: sticker.name,
                  image: sticker.imageUrl,
                  abrade: sticker.abradeDesc,
                  rawIndex: sticker.rawIndex
                })))
              }

              // 解析挂件数据（如果有）
              let pendantData = null
              if (item.pendant) {
                pendantData = JSON.stringify({
                  name: item.pendant.name || '',
                  image: item.pendant.imageUrl || '',
                  pattern: item.pendant.pattern || ''
                })
              }

              return {
                id: item.id,
                item_name: item.name,
                steam_hash_name: item.commodityHashName,
                sale_price: parseFloat(item.sellAmount || 0),  // 售价
                buy_price: null,  // 预售没有购入价显示
                weapon_float: item.abrade,
                weapon_type: item.typeName || '',
                float_range: item.exteriorName || '',
                sticker: stickerData,  // 印花数据
                pendant: pendantData,  // 挂件数据
                rename: item.haveNameTag ? '已改名' : null,  // 改名标记
                on_sale_time: item.cacheExpirationDesc || null,  // 剩余冷却天数
                platform: 'yyyp',
                trade_type: 'presale',
                account_id: selectedAccount.value,
                // 预售特有字段
                reference_price: item.referencePrice,  // 市场价
                guard_price_desc: item.guardPriceDesc,  // 保证金描述
                cache_expiration_desc: item.cacheExpirationDesc,  // 剩余冷却天数
                paintseed: item.paintseed  // 图案模板
              }
            })
            // 缓存预售数量
            cacheTradeTypeCount('presale', onSaleData.value.length)
            ElMessage.success('加载成功')
          } else {
            ElMessage.error(response.data?.message || '加载失败')
          }
        } else if (selectedTradeType.value === 'transfer') {
          // 过户类型：租赁过户商品与出售商品同源，由 Spider 按 isLeaseTransfer 过滤后返回
          response = await axios.post(apiUrls.yyypGetTransferList(), {
            steamId: accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || '',
            page: 1,
            pageSize: 1000
          })

          if (response.data && response.data.success) {
            const transferData = response.data.data?.commodityInfoList || []
            onSaleData.value = transferData.map(item => {
              // 解析印花数据
              let stickerData = null
              if (item.stickers && item.stickers.length > 0) {
                stickerData = JSON.stringify(item.stickers.map(sticker => ({
                  name: sticker.name,
                  image: sticker.imageUrl,
                  abrade: sticker.abradeDesc,
                  rawIndex: sticker.rawIndex
                })))
              }

              // 解析挂件数据（如果有）
              let pendantData = null
              if (item.pendant) {
                pendantData = JSON.stringify({
                  name: item.pendant.name || '',
                  image: item.pendant.imageUrl || '',
                  pattern: item.pendant.pattern || ''
                })
              }

              return {
                id: item.id,
                item_name: item.name,
                steam_hash_name: item.commodityHashName,
                sale_price: parseFloat(item.sellAmount || 0),
                buy_price: null,
                weapon_float: item.abrade,
                weapon_type: item.typeName || '',
                float_range: item.exteriorName || '',
                sticker: stickerData,
                pendant: pendantData,
                rename: item.haveNameTag ? '已改名' : null,
                on_sale_time: item.onShelfTime || null,
                platform: 'yyyp',
                trade_type: 'transfer',
                account_id: selectedAccount.value,
                // 过户特有字段
                lease_transfer_date: item.leaseTransferDate,  // 过户日期
                reference_price: item.referencePrice,
                sell_amount_desc: item.sellAmountDesc,
                paintseed: item.paintseed
              }
            })
            // 缓存过户数量
            cacheTradeTypeCount('transfer', onSaleData.value.length)
            ElMessage.success('加载成功')
          } else {
            ElMessage.error(response.data?.message || '加载失败')
          }
        } else if (selectedTradeType.value === 'sale') {
          // 出售类型：直接调用Spider API获取原始数据并解析
          response = await axios.post(apiUrls.yyypGetSellList(), {
            steamId: accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || '',
            page: 1,
            pageSize: 1000
          })

          if (response.data && response.data.success) {
            // 转换出售数据格式以匹配前端期望
            const sellData = response.data.data?.commodityInfoList || []
            onSaleData.value = sellData.map(item => {
              // 解析印花数据
              let stickerData = null
              if (item.haveSticker && item.stickers && item.stickers.length > 0) {
                stickerData = JSON.stringify(item.stickers.map(sticker => ({
                  name: sticker.name,
                  image: sticker.imageUrl,
                  abrade: sticker.abradeDesc,
                  rawIndex: sticker.rawIndex
                })))
              }

              // 解析挂件数据
              let pendantData = null
              if (item.havePendant && item.pendants && item.pendants.length > 0) {
                const pendant = item.pendants[0]  // 通常只有一个挂件
                pendantData = JSON.stringify({
                  name: pendant.name || '',
                  image: pendant.imageUrl || '',
                  pattern: pendant.pattern || ''
                })
              }

              // 从buyAmountDesc中提取购入价 (格式: "购：¥3890")
              let buyPrice = null
              if (item.buyAmountDesc) {
                const match = item.buyAmountDesc.match(/¥([\d.]+)/)
                if (match) {
                  buyPrice = parseFloat(match[1])
                }
              }

              return {
                id: item.id,
                commodity_id: item.id,  // 商品ID，用于改价等操作
                item_name: item.name,
                steam_hash_name: item.commodityHashName,
                sale_price: parseFloat(item.sellAmount || 0),  // 售价（分为单位，需转换）
                buy_price: buyPrice,  // 购入价
                weapon_float: item.abrade,
                wear_value: item.abrade ? parseFloat(item.abrade) : null,  // 磨损值
                weapon_type: item.typeName || '',
                float_range: item.exteriorName || '',
                sticker: stickerData,  // 印花数据
                pendant: pendantData,  // 挂件数据
                rename: item.haveNameTag ? '已改名' : null,  // 改名标记
                on_sale_time: null,  // 出售没有在售时间
                platform: 'yyyp',
                trade_type: 'sale',
                account_id: selectedAccount.value,
                // 出售特有字段
                reference_price: item.referencePrice,  // 市场价（重要！）
                sell_amount_desc: item.sellAmountDesc,  // 售价描述
                buy_amount_desc: item.buyAmountDesc,  // 购入价描述
                paintseed: item.paintseed  // 图案模板
              }
            })
            // 缓存出售数量
            cacheTradeTypeCount('sale', onSaleData.value.length)
            ElMessage.success('加载成功')
          } else {
            ElMessage.error(response.data?.message || '加载失败')
          }
        } else {
          // 其他类型：调用原有的在售商品API
          response = await axios.post(apiUrls.getOnSaleItems(), {
            platform: 'yyyp',
            account_id: selectedAccount.value,
            trade_type: selectedTradeType.value
          })

          if (response.data && response.data.success) {
            onSaleData.value = response.data.data || []
            // 缓存其他类型数量（transfer等）
            cacheTradeTypeCount(selectedTradeType.value, onSaleData.value.length)
            ElMessage.success('加载成功')
          } else {
            ElMessage.error(response.data?.message || '加载失败')
          }
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
        const response = await axios.get(apiUrls.getYYYPAccounts())
        if (response.data && response.data.success) {
          accountList.value = response.data.data || []
          if (accountList.value.length > 0) {
            selectedAccount.value = accountList.value[0].id
            // 同时检查出售和报价处理数据
            await checkAndLoadInitialData()
          } else {
            ElMessage.warning('没有找到悠悠有品账号')
          }
        }
      } catch (error) {
        console.error('加载账号列表失败:', error)
        ElMessage.error('加载账号列表失败: ' + error.message)
      }
    }

    // 检查并加载初始数据（同时检查出售和报价处理）
    const checkAndLoadInitialData = async () => {
      try {
        // 获取 steamId
        const steamId = accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || ''

        // 总是获取报价处理数量（用于显示在 bar 上）
        const [sellOfferResponse, buyOfferResponse] = await Promise.all([
          // 获取报价处理数据 - 我出售的
          axios.post(apiUrls.yyypGetMySellOrders(), {
            steamId: steamId
          }).catch(() => null),
          // 获取报价处理数据 - 我收货的
          axios.post(apiUrls.yyypGetMyBuyOrders(), {
            steamId: steamId
          }).catch(() => null)
        ])

        // 计算报价处理数量
        const sellOfferCount = sellOfferResponse?.data?.success && sellOfferResponse.data.data?.orderList?.length > 0
          ? sellOfferResponse.data.data.orderList.length
          : 0
        const buyOfferCount = buyOfferResponse?.data?.success && buyOfferResponse.data.data?.orderList?.length > 0
          ? buyOfferResponse.data.data.orderList.length
          : 0
        const totalOfferCount = sellOfferCount + buyOfferCount

        // 缓存报价处理数量到 localStorage
        if (totalOfferCount > 0) {
          localStorage.setItem('yyyp_offer_count', totalOfferCount.toString())
          offerCount.value = totalOfferCount
        } else {
          localStorage.removeItem('yyyp_offer_count')
          offerCount.value = 0
        }

        // 如果localStorage中保存的不是出售或报价处理，直接加载该类型数据
        if (selectedTradeType.value !== 'sale' && selectedTradeType.value !== 'offer') {
          loadOnSaleData()
          return
        }

        // 并行请求出售数据
        const saleResponse = await axios.post(apiUrls.yyypGetSellList(), {
          steamId: steamId,
          page: 1,
          pageSize: 1000  // 直接获取完整数据，避免后续重复请求
        }).catch(() => null)

        // 如果报价处理有数据且当前在出售页，则跳转到报价页；否则保持当前 URL
        const currentSub = route.params.subType
        if (totalOfferCount > 0 && currentSub === 'sale') {
          router.replace('/on-sale/yyyp/offer')
          return
        }
        if (totalOfferCount === 0 && currentSub === 'offer') {
          router.replace('/on-sale/yyyp/sale')
        }
        // 当前为出售时，用已获取的数据填充
        if (selectedTradeType.value === 'sale' && saleResponse?.data?.success) {
            // 转换出售数据格式以匹配前端期望
            const sellData = saleResponse.data.data?.commodityInfoList || []
            onSaleData.value = sellData.map(item => {
              // 解析印花数据
              let stickerData = null
              if (item.haveSticker && item.stickers && item.stickers.length > 0) {
                stickerData = JSON.stringify(item.stickers.map(sticker => ({
                  name: sticker.name,
                  image: sticker.imageUrl,
                  abrade: sticker.abradeDesc,
                  rawIndex: sticker.rawIndex
                })))
              }

              // 解析挂件数据
              let pendantData = null
              if (item.havePendant && item.pendants && item.pendants.length > 0) {
                const pendant = item.pendants[0]  // 通常只有一个挂件
                pendantData = JSON.stringify({
                  name: pendant.name || '',
                  image: pendant.imageUrl || '',
                  pattern: pendant.pattern || ''
                })
              }

              // 从buyAmountDesc中提取购入价 (格式: "购：¥3890")
              let buyPrice = null
              if (item.buyAmountDesc) {
                const match = item.buyAmountDesc.match(/¥([\d.]+)/)
                if (match) {
                  buyPrice = parseFloat(match[1])
                }
              }

              return {
                id: item.id,
                commodity_id: item.id,  // 商品ID，用于改价等操作
                item_name: item.name,
                steam_hash_name: item.commodityHashName,
                sale_price: parseFloat(item.sellAmount || 0),  // 售价（分为单位，需转换）
                buy_price: buyPrice,  // 购入价
                weapon_float: item.abrade,
                wear_value: item.abrade ? parseFloat(item.abrade) : null,  // 磨损值
                weapon_type: item.typeName || '',
                float_range: item.exteriorName || '',
                sticker: stickerData,  // 印花数据
                pendant: pendantData,  // 挂件数据
                rename: item.haveNameTag ? '已改名' : null,  // 改名标记
                on_sale_time: null,  // 出售没有在售时间
                platform: 'yyyp',
                trade_type: 'sale',
                account_id: selectedAccount.value,
                // 出售特有字段
                reference_price: item.referencePrice,  // 市场价（重要！）
                sell_amount_desc: item.sellAmountDesc,  // 售价描述
                buy_amount_desc: item.buyAmountDesc,  // 购入价描述
                paintseed: item.paintseed  // 图案模板
              }
            })
            // 缓存出售数量
            cacheTradeTypeCount('sale', onSaleData.value.length)
            ElMessage.success('加载成功')
        } else if (selectedTradeType.value === 'sale') {
            ElMessage.error(saleResponse?.data?.message || '加载失败')
        }
      } catch (error) {
        console.error('检查初始数据失败:', error)
        // 如果检查失败，使用默认逻辑
        loadOnSaleData()
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
      previewVisible.value = false

      // 判断交易类型
      if (item.trade_type === 'lease') {
        // 打开租赁改价对话框
        openRentPriceDialog(item)
      } else if (item.trade_type === 'sublease') {
        // 打开转租改价对话框
        openSubleasePriceDialog(item)
      } else {
        // 打开简单售价改价对话框
        updatePriceForm.value.newPrice = item.sale_price
        updatePriceDialogVisible.value = true
      }
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

    // 一键定价（市价-0.01）
    const setMarketPrice = () => {
      if (!selectedItem.value || !selectedItem.value.reference_price) {
        ElMessage.warning('该商品没有市价信息')
        return
      }

      // 从 reference_price 中提取数字（格式如 "¥239"）
      const match = selectedItem.value.reference_price.match(/[\d.]+/)
      if (match) {
        const referencePrice = parseFloat(match[0])
        const newPrice = Math.max(0.01, referencePrice - 0.01)
        updatePriceForm.value.newPrice = newPrice.toFixed(2)
        ElMessage.success(`已设置为市价-0.01: ¥${newPrice.toFixed(2)}`)
      } else {
        ElMessage.warning('无法解析市价信息')
      }
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

      updating.value = true
      try {
        // 使用批量改价API（传递单个商品）
        const response = await axios.post(apiUrls.yyypBatchChangePrice(), {
          steamId: steamId.value,
          priceUpdates: [{
            id: selectedItem.value.id,
            newPrice: priceFloat.toFixed(2)
          }]
        })

        if (response.data && response.data.success) {
          // 检查具体结果
          const results = response.data.results || []
          // IsSuccess 字段是数字: 1=成功, 0=失败
          const failedItems = results.filter(item => item.IsSuccess === 0 || item.IsSuccess === false)

          if (failedItems.length > 0) {
            // 有失败的商品，错误信息在 Message 或 FailReason 字段
            const failReason = failedItems[0].Message || failedItems[0].FailReason || '未知原因'
            ElMessage.error(`改价失败: ${failReason}`)
          } else {
            ElMessage.success('改价成功')
            updatePriceDialogVisible.value = false
            loadOnSaleData()
          }
        } else {
          ElMessage.error(response.data?.message || '改价失败')
        }
      } catch (error) {
        console.error('改价失败:', error)
        ElMessage.error('改价失败: ' + error.message)
      } finally {
        updating.value = false
      }
    }

    // 打开租赁改价对话框（仅用于租赁，不包含转租）
    const openRentPriceDialog = async (item) => {
      try {
        loading.value = true

        // 获取完整的 Steam ID（从 accountList 中查找）
        steamId.value = accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || ''

        if (!steamId.value) {
          ElMessage.error('无法获取Steam ID，请重新选择账号')
          loading.value = false
          return
        }

        // 获取租赁初始化数据和赔付文本（并行请求）
        const [initResponse, compensationResponse] = await Promise.all([
          axios.post(
            apiUrls.yyypRentInit(),
            {
              steamId: steamId.value,
              steam_hash_name: [item.steam_hash_name || item.item_name]
            }
          ),
          axios.post(
            apiUrls.yyypGetCompensationText(),
            {
              steamId: steamId.value,
              itemInfo: {
                abrade: String(item.weapon_float || item.float || '0'),
                leaseType: 0,  // 0=租赁
                marketHashName: item.steam_hash_name || item.item_name,
                marketPrice: String(item.yyyp_price || item.market_price || '0'),
                pageSourceType: 10,
                paintSeed: parseInt(item.paintseed || 0),
                steamAssetId: parseInt(item.assetid || item.id || 0),
                supportEasyCompensation: false,
                templateId: parseInt(item.template_id || item.yyyp_id || 0)
              }
            }
          )
        ])

        // 解析初始化数据
        if (initResponse.data && initResponse.data.success) {
          rentInitData.value = initResponse.data.data

          // 合并赔付文本数据
          if (compensationResponse.data && compensationResponse.data.success) {
            const compensationData = compensationResponse.data.data
            rentInitData.value.compensationRichContent = compensationData.compensationRichContent
            console.log('[租赁改价] 赔付文本获取成功:', compensationData.compensationRichContent)
          } else {
            console.warn('[租赁改价] 赔付文本获取失败:', compensationResponse.data?.message)
          }

          // 打开租赁改价对话框
          rentPriceDialogVisible.value = true
        } else {
          ElMessage.error(initResponse.data?.message || '获取租赁配置失败')
        }
      } catch (error) {
        console.error('打开租赁改价对话框失败:', error)
        ElMessage.error('打开租赁改价对话框失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 打开转租改价对话框（仅用于转租）
    const openSubleasePriceDialog = async (item) => {
      try {
        loading.value = true

        // 获取完整的 Steam ID（从 accountList 中查找）
        steamId.value = accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || ''

        if (!steamId.value) {
          ElMessage.error('无法获取Steam ID，请重新选择账号')
          loading.value = false
          return
        }

        // 获取转租所需的所有数据（并行请求）
        const commodityId = String(item.commodity_id || item.id)
        const [initResponse, compensationResponse, agreementResponse, detailResponse] = await Promise.all([
          axios.post(
            apiUrls.yyypRentInit(),
            {
              steamId: steamId.value,
              steam_hash_name: [item.steam_hash_name || item.item_name]
            }
          ),
          axios.post(
            apiUrls.yyypSubleaseGetBatchCompensationText(),
            {
              steamId: steamId.value,
              commodityIds: [commodityId],
              gameId: '730'
            }
          ),
          axios.post(
            apiUrls.yyypGetSubleaseAgreement(),
            {
              steamId: steamId.value
            }
          ),
          axios.post(
            apiUrls.yyypGetSubleaseDetail(),
            {
              steamId: steamId.value,
              commodityIds: [commodityId]
            }
          )
        ])

        // 解析初始化数据
        if (initResponse.data && initResponse.data.success) {
          subleaseInitData.value = initResponse.data.data

          // 合并赔付文本数据
          if (compensationResponse.data && compensationResponse.data.success) {
            const compensationData = compensationResponse.data.data
            subleaseInitData.value.commodityCompensationMap = compensationData.commodityCompensationMap
            subleaseInitData.value.leasingModelConfigMap = compensationData.leasingModelConfigMap
            // 为了向后兼容，保留单个商品的 compensationRichContent
            if (compensationData.commodityCompensationMap && compensationData.commodityCompensationMap[commodityId]) {
              subleaseInitData.value.compensationRichContent = compensationData.commodityCompensationMap[commodityId].compensationRichContent
            }
            console.log('[转租改价] 赔付文本获取成功:', compensationData.commodityCompensationMap)
          } else {
            console.warn('[转租改价] 赔付文本获取失败:', compensationResponse.data?.message)
          }

          // 合并转租协议数据
          if (agreementResponse.data && agreementResponse.data.success) {
            const agreementData = agreementResponse.data.data
            subleaseInitData.value.agreementList = agreementData
            console.log('[转租改价] 转租协议获取成功:', agreementData)
          } else {
            console.warn('[转租改价] 转租协议获取失败:', agreementResponse.data?.message)
          }

          // 合并转租详情数据
          if (detailResponse.data && detailResponse.data.success) {
            const detailData = detailResponse.data.data
            subleaseInitData.value.subleaseDetail = detailData
            console.log('[转租改价] 转租详情获取成功:', detailData)
          } else {
            console.warn('[转租改价] 转租详情获取失败:', detailResponse.data?.message)
          }

          // 打开转租改价对话框
          subleasePriceDialogVisible.value = true
        } else {
          ElMessage.error(initResponse.data?.message || '获取转租配置失败')
        }
      } catch (error) {
        console.error('打开转租改价对话框失败:', error)
        ElMessage.error('打开转租改价对话框失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 提交租赁改价（此处省略了具体实现，太长了）
    const confirmRentPriceUpdate = async (submitData) => {
      console.log('[租赁改价] 提交数据:', submitData)
      console.log('[租赁改价] 选中项:', selectedItem.value)
      console.log('[租赁改价] 批量选中项:', selectedItems.value)

      try {
        loading.value = true

        // 判断是批量改价还是单个改价
        const isBatch = selectedItems.value.length > 0 && !selectedItem.value

        // 统一使用 Commoditys 数组格式（单个和批量都使用同一个API）
        const itemsToProcess = isBatch ? selectedItems.value : [selectedItem.value]

        const Commoditys = submitData.items.map((formItem, index) => {
          const originalItem = itemsToProcess[index]

          const config = {
            CommodityId: parseInt(originalItem.commodity_id || originalItem.id),
            CompensationType: 7,
            IsCanLease: true,
            IsCanSold: submitData.tradeMode === 2,
            LeaseDeposit: String(formItem.depositPrice),
            LeaseMaxDays: submitData.rentDays,
            LeaseUnitPrice: formItem.shortRentPrice,  // 短租单价
            LongLeaseUnitPrice: formItem.longRentPrice,  // 长租单价
            NomarlChargePercent: "0.25",
            OpenLeaseActivity: submitData.services?.rentActivity || false,
            OriginCompensationType: 7,
            Remark: "",
            SupportZeroCD: submitData.services?.zeroCooldown ? 1 : 0,
            UseDepositSafeguard: 1,
            VipChargePercent: "0.2",
            VipSwitchStatus: 1
          }

          if (submitData.services?.zeroCooldown) {
            config.ZeroCDConfig = {
              MinCoefficient: "95",
              PricingType: 0
            }
          }

          return config
        })

        const requestData = {
          steamId: steamId.value,
          commodities: Commoditys
        }

        // 单个和批量都使用同一个API
        const apiUrl = apiUrls.yyypChangeRentPrice()
        console.log(`[租赁改价] 调用API: ${apiUrl}`, requestData)

        // 发送改价请求
        const response = await axios.post(apiUrl, requestData)

        if (response.data && response.data.success) {
          ElMessage.success(isBatch ? '批量改价成功' : '改价成功')
          rentPriceDialogVisible.value = false
          selectedItem.value = null
          selectedItems.value = []
          // 重新加载在售数据
          await loadOnSaleData()
        } else {
          ElMessage.error(response.data?.message || '改价失败')
        }
      } catch (error) {
        console.error('[租赁改价] 失败:', error)
        ElMessage.error('改价失败: ' + (error.response?.data?.message || error.message))
      } finally {
        loading.value = false
      }
    }

    // 提交转租改价
    const confirmSubleasePriceUpdate = async (submitData) => {
      console.log('[转租改价] 提交数据:', submitData)
      console.log('[转租改价] 选中项:', selectedItem.value)
      console.log('[转租改价] 批量选中项:', selectedItems.value)

      try {
        loading.value = true

        // 判断是批量改价还是单个改价
        const isBatch = selectedItems.value.length > 0 && !selectedItem.value

        // 统一使用 Commoditys 数组格式（单个和批量都使用同一个API）
        const itemsToProcess = isBatch ? selectedItems.value : [selectedItem.value]

        const Commoditys = submitData.items.map((formItem, index) => {
          const originalItem = itemsToProcess[index]

          const config = {
            CommodityId: parseInt(originalItem.commodity_id || originalItem.id),
            CompensationType: 7,
            IsCanLease: true,
            IsCanSold: submitData.tradeMode === 2,
            LeaseDeposit: String(formItem.depositPrice),
            LeaseMaxDays: submitData.rentDays,
            LeaseUnitPrice: formItem.shortRentPrice,  // 短租单价
            LongLeaseUnitPrice: formItem.longRentPrice,  // 长租单价
            NomarlChargePercent: "0.25",
            OpenLeaseActivity: submitData.services?.rentActivity || false,
            OriginCompensationType: 7,
            Remark: "",
            SupportZeroCD: submitData.services?.zeroCooldown ? 1 : 0,
            UseDepositSafeguard: 1,
            VipChargePercent: "0.2",
            VipSwitchStatus: 1
          }

          if (submitData.services?.zeroCooldown) {
            config.ZeroCDConfig = {
              MinCoefficient: "95",
              PricingType: 0
            }
          }

          return config
        })

        const requestData = {
          steamId: steamId.value,
          commodities: Commoditys
        }

        // 使用转租改价API
        const apiUrl = apiUrls.yyypChangeSubleasePrice()
        console.log(`[转租改价] 调用API: ${apiUrl}`, requestData)

        // 发送改价请求
        const response = await axios.post(apiUrl, requestData)

        if (response.data && response.data.success) {
          ElMessage.success(isBatch ? '批量转租改价成功' : '转租改价成功')
          subleasePriceDialogVisible.value = false
          selectedItem.value = null
          selectedItems.value = []
          // 重新加载在售数据
          await loadOnSaleData()
        } else {
          ElMessage.error(response.data?.message || '转租改价失败')
        }
      } catch (error) {
        console.error('[转租改价] 失败:', error)
        ElMessage.error('转租改价失败: ' + (error.response?.data?.message || error.message))
      } finally {
        loading.value = false
      }
    }

    // 下架商品
    const handleRemoveFromSale = async (item) => {
      const actionText = item.trade_type === 'sublease' ? '取消转租' : '下架'

      try {
        await ElMessageBox.confirm(
          `确定要${actionText} "${getCardTitle(item)}" 吗？`,
          `确认${actionText}`,
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        loading.value = true

        // 根据交易类型选择不同的API
        let response
        if (item.trade_type === 'sublease') {
          // 转租类型：调用取消转租API
          const steamId = accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || ''
          response = await axios.post(apiUrls.yyypCancelSublease(), {
            steamId: steamId,
            orderNoList: [item.order_no || item.id]  // 传递订单号数组
          })
        } else if (item.trade_type === 'lease' || item.trade_type === 'sale' || item.trade_type === 'transfer' || item.trade_type === 'presale') {
          // 租赁/出售/过户/预售类型：直接调用 Spider 下架API
          const steamId = accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || ''
          response = await axios.post(apiUrls.yyypOffShelf(), {
            steamId: steamId,
            ids: [item.id]
          })
        } else {
          // 其他类型：调用原有的下架API
          response = await axios.post(apiUrls.removeFromSale(), {
            id: item.id,
            account_id: selectedAccount.value
          })
        }

        if (response.data && response.data.success) {
          ElMessage.success(`${actionText}成功`)
          previewVisible.value = false
          loadOnSaleData()
        } else {
          ElMessage.error(response.data?.message || `${actionText}失败`)
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error(`${actionText}失败:`, error)
          ElMessage.error(`${actionText}失败: ` + error.message)
        }
      } finally {
        loading.value = false
      }
    }

    // 打开批量改价对话框
    const handleBatchChangePrice = async () => {
      // 检查是否有选中的项目
      if (!selectedItems.value || selectedItems.value.length === 0) {
        ElMessage.warning('请先选择要改价的商品')
        return
      }

      // 检查第一个选中项的类型
      const firstItem = selectedItems.value[0]

      // 判断是租赁类型
      if (firstItem.trade_type === 'lease') {
        // 租赁类型：打开租赁改价对话框
        try {
          loading.value = true

          // 获取完整的 Steam ID
          steamId.value = accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || ''

          if (!steamId.value) {
            ElMessage.error('无法获取Steam ID，请重新选择账号')
            loading.value = false
            return
          }

          // 获取第一个选中项的 steam_hash_name 用于初始化
          const hashNames = selectedItems.value.map(item => item.steam_hash_name || item.item_name)

          // 获取租赁初始化数据
          const initResponse = await axios.post(
            apiUrls.yyypRentInit(),
            {
              steamId: steamId.value,
              steam_hash_name: hashNames
            }
          )

          if (initResponse.data && initResponse.data.success) {
            rentInitData.value = initResponse.data.data

            // 清空 selectedItem，表示这是批量操作
            selectedItem.value = null

            // 打开租赁改价对话框
            rentPriceDialogVisible.value = true
          } else {
            ElMessage.error(initResponse.data?.message || '获取租赁配置失败')
          }
        } catch (error) {
          console.error('[批量租赁改价] 打开租赁改价对话框失败:', error)
          ElMessage.error('打开租赁改价对话框失败: ' + error.message)
        } finally {
          loading.value = false
        }
      } else if (firstItem.trade_type === 'sublease') {
        // 转租类型：打开转租改价对话框
        try {
          loading.value = true

          // 获取完整的 Steam ID
          steamId.value = accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || ''

          if (!steamId.value) {
            ElMessage.error('无法获取Steam ID，请重新选择账号')
            loading.value = false
            return
          }

          // 获取选中项的 steam_hash_name 用于初始化
          const hashNames = selectedItems.value.map(item => item.steam_hash_name || item.item_name)
          const commodityIds = selectedItems.value.map(item => String(item.commodity_id || item.id))

          // 获取转租所需的所有数据（并行请求）
          const [initResponse, agreementResponse, compensationResponse] = await Promise.all([
            axios.post(
              apiUrls.yyypRentInit(),
              {
                steamId: steamId.value,
                steam_hash_name: hashNames
              }
            ),
            axios.post(
              apiUrls.yyypGetSubleaseAgreement(),
              {
                steamId: steamId.value
              }
            ),
            axios.post(
              apiUrls.yyypSubleaseGetBatchCompensationText(),
              {
                steamId: steamId.value,
                commodityIds: commodityIds,
                gameId: '730'
              }
            )
          ])

          if (initResponse.data && initResponse.data.success) {
            subleaseInitData.value = initResponse.data.data

            // 合并转租协议数据
            if (agreementResponse.data && agreementResponse.data.success) {
              const agreementData = agreementResponse.data.data
              subleaseInitData.value.agreementList = agreementData
              console.log('[批量转租改价] 转租协议获取成功:', agreementData)
            } else {
              console.warn('[批量转租改价] 转租协议获取失败:', agreementResponse.data?.message)
            }

            // 合并批量赔付文本数据
            if (compensationResponse.data && compensationResponse.data.success) {
              const compensationData = compensationResponse.data.data
              subleaseInitData.value.commodityCompensationMap = compensationData.commodityCompensationMap
              subleaseInitData.value.leasingModelConfigMap = compensationData.leasingModelConfigMap
              console.log('[批量转租改价] 赔付文本获取成功:', compensationData.commodityCompensationMap)
            } else {
              console.warn('[批量转租改价] 赔付文本获取失败:', compensationResponse.data?.message)
            }

            // 清空 selectedItem，表示这是批量操作
            selectedItem.value = null

            // 打开转租改价对话框
            subleasePriceDialogVisible.value = true
          } else {
            ElMessage.error(initResponse.data?.message || '获取转租配置失败')
          }
        } catch (error) {
          console.error('[批量转租改价] 打开转租改价对话框失败:', error)
          ElMessage.error('打开转租改价对话框失败: ' + error.message)
        } finally {
          loading.value = false
        }
      } else {
        // 其他类型：打开简单的批量改价对话框
        // 初始化 individualPrices 数组，默认填充当前价格
        batchChangePriceForm.value.individualPrices = selectedItems.value.map(item =>
          parseFloat(item.sale_price).toFixed(2)
        )
        // 清空状态和错误信息
        batchChangePriceForm.value.priceUpdateStatus = selectedItems.value.map(() => null)
        batchChangePriceForm.value.priceUpdateErrors = selectedItems.value.map(() => '')
        batchChangePriceDialogVisible.value = true
      }
    }

    // 计算新价格（用于预览）
    const calculateNewPrice = (currentPrice) => {
      const price = parseFloat(currentPrice)
      if (isNaN(price)) return '0.00'

      if (batchChangePriceForm.value.priceChangeType === 'fixed') {
        return parseFloat(batchChangePriceForm.value.fixedPrice || 0).toFixed(2)
      } else {
        const percent = parseFloat(batchChangePriceForm.value.percentValue || 0) / 100
        let newPrice = price
        if (batchChangePriceForm.value.percentType === 'increase') {
          newPrice = price * (1 + percent)
        } else {
          newPrice = price * (1 - percent)
        }
        return Math.max(0, newPrice).toFixed(2)
      }
    }

    // 确认批量改价
    const confirmBatchChangePrice = async () => {
      try {
        updating.value = true

        // 使用用户输入的每个价格
        const priceUpdates = selectedItems.value.map((item, index) => {
          const newPrice = parseFloat(batchChangePriceForm.value.individualPrices[index])
          if (isNaN(newPrice) || newPrice <= 0) {
            throw new Error(`第 ${index + 1} 个商品的价格无效`)
          }
          return {
            id: item.id || item.commodity_id,
            newPrice: newPrice.toFixed(2)
          }
        })

        // 调用批量改价API
        const response = await axios.post(
          apiUrls.yyypBatchChangePrice(),
          {
            steamId: steamId.value,
            priceUpdates: priceUpdates
          }
        )

        if (response.data && response.data.success) {
          // 检查每个商品的改价结果
          const results = response.data.results || []
          // IsSuccess 字段是数字: 1=成功, 0=失败
          const failedItems = results.filter(item => item.IsSuccess === 0 || item.IsSuccess === false)
          const successCount = results.length - failedItems.length

          // 更新每个商品的状态
          selectedItems.value.forEach((item, index) => {
            const itemId = String(item.id || item.commodity_id)
            const result = results.find(r => String(r.CommodityId) === itemId)

            if (result) {
              // IsSuccess: 1=成功, 0=失败
              if (result.IsSuccess === 1 || result.IsSuccess === true) {
                batchChangePriceForm.value.priceUpdateStatus[index] = 'success'
                batchChangePriceForm.value.priceUpdateErrors[index] = ''
              } else {
                batchChangePriceForm.value.priceUpdateStatus[index] = 'error'
                // 错误信息在 Message 或 FailReason 字段
                batchChangePriceForm.value.priceUpdateErrors[index] = result.Message || result.FailReason || '改价失败'
              }
            } else {
              // 没有返回结果，可能是请求失败
              batchChangePriceForm.value.priceUpdateStatus[index] = 'error'
              batchChangePriceForm.value.priceUpdateErrors[index] = '未返回改价结果'
            }
          })

          if (failedItems.length > 0) {
            ElMessage.warning(`批量改价完成: 成功 ${successCount} 件, 失败 ${failedItems.length} 件，请查看列表中的错误提示`)

            if (successCount > 0) {
              // 有成功的，重新加载数据
              await loadOnSaleData()
            }
          } else {
            ElMessage.success(`成功改价 ${priceUpdates.length} 件商品`)
            await loadOnSaleData()
            batchChangePriceDialogVisible.value = false
            selectedItems.value = []
          }
        } else {
          throw new Error(response.data?.message || '批量改价失败')
        }
      } catch (error) {
        console.error('[批量改价] 错误:', error)
        ElMessage.error('批量改价失败: ' + error.message)
      } finally {
        updating.value = false
      }
    }

    // 自动填充批量改价价格（使用市价-0.01）
    const autoFillBatchPrices = async () => {
      try {
        autoFillLoading.value = true
        let filledCount = 0
        let noDataCount = 0

        // 遍历每个选中的商品，使用 reference_price 填充价格
        selectedItems.value.forEach((item, index) => {
          if (item.reference_price) {
            // 从 reference_price 中提取数字（格式如 "¥239"）
            const match = item.reference_price.match(/[\d.]+/)
            if (match) {
              const referencePrice = parseFloat(match[0])
              // 市价减0.01
              const fillPrice = Math.max(0.01, referencePrice - 0.01)
              batchChangePriceForm.value.individualPrices[index] = fillPrice.toFixed(2)
              filledCount++
            } else {
              noDataCount++
            }
          } else {
            noDataCount++
          }
        })

        if (filledCount > 0) {
          ElMessage.success(`已自动填充 ${filledCount} 件物品的价格（市价-0.01）`)
        }
        if (noDataCount > 0) {
          ElMessage.warning(`有 ${noDataCount} 件物品没有市价数据`)
        }
      } catch (error) {
        console.error('[自动填充价格] 错误:', error)
        ElMessage.error('自动填充价格失败: ' + error.message)
      } finally {
        autoFillLoading.value = false
      }
    }

    // 批量下架商品
    const handleBatchRemoveFromSale = async () => {
      if (selectedItems.value.length === 0) {
        ElMessage.warning('请先选择要下架的物品')
        return
      }

      // 判断选中物品的交易类型
      const firstItem = selectedItems.value[0]
      const actionText = firstItem.trade_type === 'sublease' ? '取消转租' : '下架'

      try {
        await ElMessageBox.confirm(
          `确定要批量${actionText} ${selectedItems.value.length} 件物品吗？`,
          `批量${actionText}确认`,
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        loading.value = true

        // 根据交易类型选择不同的API
        let response
        const steamId = accountList.value.find(acc => acc.id === selectedAccount.value)?.steam_id || ''

        if (firstItem.trade_type === 'sublease') {
          // 批量取消转租
          const orderNoList = selectedItems.value.map(item => item.order_no || item.id)
          response = await axios.post(apiUrls.yyypCancelSublease(), {
            steamId: steamId,
            orderNoList: orderNoList
          })
        } else if (firstItem.trade_type === 'lease' || firstItem.trade_type === 'sale' || firstItem.trade_type === 'transfer' || firstItem.trade_type === 'presale') {
          // 批量下架租赁/出售/过户/预售物品
          const ids = selectedItems.value.map(item => item.id)
          response = await axios.post(apiUrls.yyypOffShelf(), {
            steamId: steamId,
            ids: ids
          })
        } else {
          // 批量下架其他类型物品（逐个调用API）
          let successCount = 0
          let failCount = 0

          for (const item of selectedItems.value) {
            try {
              await axios.post(apiUrls.removeFromSale(), {
                id: item.id,
                account_id: selectedAccount.value
              })
              successCount++
            } catch (error) {
              console.error(`${actionText}失败:`, item.item_name, error)
              failCount++
            }
          }

          loading.value = false

          if (successCount > 0) {
            ElMessage.success(`批量${actionText}完成：成功 ${successCount} 件${failCount > 0 ? `，失败 ${failCount} 件` : ''}`)
            selectedItems.value = []
            await loadOnSaleData(selectedTradeType.value)
          } else {
            ElMessage.error(`批量${actionText}失败`)
          }
          return
        }

        // 处理悠悠有品API的响应
        if (response.data && response.data.success) {
          ElMessage.success(`批量${actionText}成功`)
          selectedItems.value = []
          await loadOnSaleData(selectedTradeType.value)
        } else {
          ElMessage.error(response.data?.message || `批量${actionText}失败`)
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error(`批量${actionText}失败:`, error)
          ElMessage.error(`批量${actionText}失败: ` + error.message)
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

    // 多选模式相关函数
    const toggleMultiSelectMode = () => {
      isMultiSelectMode.value = !isMultiSelectMode.value
      if (!isMultiSelectMode.value) {
        // 退出多选模式时清空选择
        selectedItems.value = []
      }
    }

    const isItemSelected = (itemId) => {
      return selectedItems.value.some(item => item.id === itemId)
    }

    const toggleItemSelection = (item) => {
      const index = selectedItems.value.findIndex(i => i.id === item.id)
      if (index > -1) {
        selectedItems.value.splice(index, 1)
      } else {
        selectedItems.value.push(item)
      }
    }

    const handleCardClick = (item) => {
      if (isMultiSelectMode.value) {
        toggleItemSelection(item)
      } else {
        openPreview(item)
      }
    }

    const formatOnSaleTime = (time) => {
      if (!time) return ''

      // 如果已经是描述性文本（如"在售1天"），直接返回
      if (typeof time === 'string' && (time.includes('在售') || time.includes('天') || time.includes('小时'))) {
        return time
      }

      // 尝试解析为日期
      const date = new Date(time)

      // 检查是否为有效日期
      if (isNaN(date.getTime())) {
        return ''  // 无效日期返回空字符串，不显示
      }

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
      if (diff === 0) return 'price-equal'
      return diff > 0 ? 'price-profit' : 'price-loss'
    }

    // 从市价字符串中提取数字（格式如 "¥239" 或 "239"）
    const getReferencePrice = (referencePriceStr) => {
      if (!referencePriceStr) return null
      const match = String(referencePriceStr).match(/[\d.]+/)
      return match ? parseFloat(match[0]) : null
    }

    // 监听交易类型（来自 URL）变化，保存到 localStorage
    watch(selectedTradeType, (newValue) => {
      localStorage.setItem('yyyp_selected_trade_type', newValue)
    })

    // URL 无效子模块时重定向到出售
    watch(() => route.params.subType, (subType) => {
      if (route.name === 'OnSaleYYYP' && subType && !VALID_SUB_TYPES.includes(subType)) {
        router.replace('/on-sale/yyyp/sale')
      }
    }, { immediate: true })

    // URL 子模块切换时（含浏览器前进/后退）：更新展示模式、清空多选、加载数据（跳过首次，由 checkAndLoadInitialData 处理）
    watch(() => route.params.subType, (subType, prevSub) => {
      if (route.name !== 'OnSaleYYYP' || subType === prevSub || prevSub === undefined) return
      displayMode.value = subType === 'offer' ? 'list' : 'card'
      selectedItems.value = []
      loadOnSaleData()
    })

    let unwatchDevice = null

    onMounted(() => {
      const deviceType = applyDeviceClass()
      console.log('[OnSaleYYYP] 当前设备类型:', deviceType)

      unwatchDevice = watchDeviceType((newDeviceType) => {
        console.log('[OnSaleYYYP] 设备类型已变更:', newDeviceType)
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
      autoFillLoading,
      onSaleData,
      accountList,
      selectedAccount,
      searchText,
      weaponTypeFilter,
      floatRangeFilter,
      displayMode,
      selectedTradeType,
      tradeTypes,
      isMultiSelectMode,
      selectedItems,
      updatePriceDialogVisible,
      rentPriceDialogVisible,
      subleasePriceDialogVisible,
      previewVisible,
      selectedItem,
      previewItem,
      updatePriceForm,
      rentInitData,
      subleaseInitData,
      steamId,
      formattedRentItem,
      formattedSubleaseItem,
      onSaleStats,
      currentDisplayData,
      loadOnSaleData,
      loadAccountList,
      handleAccountChange,
      handleReset,
      handleUpdatePrice,
      validatePriceInput,
      setMarketPrice,
      confirmUpdatePrice,
      confirmRentPriceUpdate,
      confirmSubleasePriceUpdate,
      handleRemoveFromSale,
      handleBatchChangePrice,
      calculateNewPrice,
      confirmBatchChangePrice,
      handleBatchRemoveFromSale,
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
      toggleMultiSelectMode,
      isItemSelected,
      toggleItemSelection,
      handleCardClick,
      getPriceDiffClass,
      getReferencePrice,
      getTradeTypeCount,
      handleTradeTypeChange,
      handleOfferCountUpdate,
      handleRentedOutCountUpdate,
      handlePurchaseRequestCountUpdate,
      handleInstantCountUpdate,
      handleFavoriteCountUpdate,
      batchChangePriceDialogVisible,
      batchChangePriceForm,
      autoFillBatchPrices
    }
  }
}