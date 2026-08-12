import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { apiUrls } from '@/config/api'

export function useRentFormYYYP(props, { emit }) {
  const autoPricingLoading = ref(false)

  // 判断是否为转租模式（从 props.items 中获取 trade_type）
  const isSubleaseMode = computed(() => {
    if (!props.items || props.items.length === 0) return false
    // 检查第一个 item 的 trade_type 是否为 'sublease'
    return props.items[0]?.trade_type === 'sublease'
  })

  // 全局表单数据（租期）
  const formData = reactive({
    rentDays: 8, // 默认天数
    customDays: null
  })

  // 每个饰品独立的价格表单：短租/长租/押金
  const itemFormMap = reactive({})

  // 每个饰品的赔付方式代码（key为assetid, value为compensationTypeCode）
  const itemsCompensation = reactive({})

  // 从 initData 解析交易方式
  const tradeMethods = computed(() => {
    if (!props.initData?.tradingMethodDTOList) {
      return [
        { id: '2', name: '租赁', type: 1 },
        { id: '3', name: '可租可售', type: 2 }
      ]
    }
    // 过滤掉"出售"选项,只保留租赁相关
    return props.initData.tradingMethodDTOList
      .filter(item => item.tradingMethodType !== 0)
      .map(item => ({
        id: item.tradingMethodId,
        name: item.tradingMethodName,
        type: item.tradingMethodType
      }))
  })

  // 从 initData 解析出租天数选项
  const rentDaysOptions = computed(() => {
    return props.initData?.leaseDayList || [8, 15, 30]
  })

  // 获取第一个饰品的配置信息
  const firstItemConfig = computed(() => {
    if (!props.items || props.items.length === 0 || !props.initData) {
      return null
    }
    const firstItem = props.items[0]
    const hashName = firstItem.steam_hash_name || firstItem.name

    return {
      coefficient: props.initData.coefficientMap?.[hashName],
      zeroRent: props.initData.zeroRentMap?.[hashName],
      depositProtect: props.initData.depositProtectFeeConfigMap?.[hashName],
      enableZeroCD: props.initData.zeroCDRentSupportTempateMap?.[hashName]
    }
  })

  // 获取指定饰品的扩展信息（赔付方式列表）
  // 支持两种数据源：1. 库存出租（inventoryExtendInfo） 2. 转租改价（commodityCompensationMap）
  const getItemExtendInfo = (assetId) => {
    // 先尝试从库存出租的数据源获取（使用 assetId）
    const inventoryData = props.initData?.inventoryExtendInfo?.normalLeaseCompensationMap?.[assetId]
    if (inventoryData) return inventoryData

    // 如果没有，尝试从转租改价的数据源获取（使用 commodity_id）
    // 找到对应的 item，获取其 commodity_id
    const item = props.items.find(i => i.assetid === assetId)
    if (item?.commodity_id) {
      return props.initData?.commodityCompensationMap?.[String(item.commodity_id)]
    }

    return null
  }

  // 获取指定饰品当前的赔付方式详情（根据 compensationTypeCode）
  const getItemCompensationMode = (assetId) => {
    const extendInfo = getItemExtendInfo(assetId)
    if (!extendInfo) return null

    const selectedCode = itemsCompensation[assetId] || extendInfo.compensationTypeCode
    // compensationModeMap 的 key 是字符串，需要转换
    return extendInfo.compensationModeMap?.[String(selectedCode)]
  }

  // 获取指定饰品的0CD配置
  const getItemZeroCDConfig = (assetId) => {
    // 先尝试从库存出租的数据源获取
    const inventoryConfig = props.initData?.inventoryExtendInfo?.zeroCDRentConfigMap?.[assetId]
    if (inventoryConfig) return inventoryConfig

    // 如果没有，尝试从转租改价的数据源获取
    const item = props.items.find(i => i.assetid === assetId)
    if (item?.commodity_id) {
      const commodityData = props.initData?.commodityCompensationMap?.[String(item.commodity_id)]
      return commodityData?.zeroCDRentConfig
    }

    return null
  }

  // 检测指定饰品的赔付文本中是否有删除线（表示有折扣活动）
  const itemHasStrikethrough = (assetId) => {
    const compensationMode = getItemCompensationMode(assetId)
    if (!compensationMode?.depositCompensationRichContent) {
      return false
    }
    // 检查HTML中是否包含 text-decoration: line-through
    return compensationMode.depositCompensationRichContent.includes('text-decoration: line-through')
  }

  // 判断指定饰品是否支持0CD（只要在 zeroCDRentConfigMap 中存在即可）
  const canItemEnableZeroCD = (assetId) => {
    const config = getItemZeroCDConfig(assetId)

    // 只要 zeroCDRentConfigMap 中包含该饰品，就说明可以开启 0CD
    return config != null
  }

  // 最小/最大租赁天数
  const minRentDays = computed(() => {
    return firstItemConfig.value?.coefficient?.minRentDays || 8
  })

  const maxRentDays = computed(() => {
    return firstItemConfig.value?.coefficient?.maxRentDays || 100
  })

  // 租金提示
  const rentPriceTip = computed(() => {
    return firstItemConfig.value?.zeroRent?.activityRentDesc || '租金<=0.89更快出租'
  })

  // 押金提示
  const depositTip = computed(() => {
    return firstItemConfig.value?.zeroRent?.activityDepositDesc || '押金<=1299，优先展示'
  })

  // 服务费率
  const serviceFeeRate = computed(() => {
    const rate = firstItemConfig.value?.depositProtect?.rate
    return rate ? (rate * 100).toFixed(0) : '25'
  })

  const vipServiceFeeRate = computed(() => {
    const vipRate = firstItemConfig.value?.depositProtect?.vipRate
    return vipRate ? (vipRate * 100).toFixed(0) : null
  })

  // 是否显示长租价格输入框（租期>21天时显示）
  const showLongRentPrice = computed(() => {
    const currentDays = formData.rentDays === 'custom' ? formData.customDays : formData.rentDays
    return currentDays && currentDays > 21
  })

  // 租送活动
  const rentActivities = computed(() => {
    if (!props.initData?.activityCustomConfigDTOList) {
      return []
    }
    return props.initData.activityCustomConfigDTOList.filter(
      activity => activity.activityType === 0 && activity.activityStatus === 0
    )
  })

  const rentActivityDesc = computed(() => {
    if (rentActivities.value.length === 0) {
      return ''
    }
    const activity = rentActivities.value[0]
    if (activity.activityItemList && activity.activityItemList.length > 0) {
      return activity.activityItemList.map(item => item.itemDesc).join('、')
    }
    return activity.activityDesc || ''
  })

  // 初始化表单数据（全局 + 每个饰品）
  const initForms = () => {
    // 全局租期默认值：优先使用当前租期，否则使用第一个选项
    if (props.items && props.items.length > 0 && props.items[0].currentRentDays) {
      formData.rentDays = props.items[0].currentRentDays
    } else if (rentDaysOptions.value.length > 0) {
      formData.rentDays = rentDaysOptions.value[0]
    }

    // 初始化每个饰品的价格表单、赔付方式和0CD开关
    if (props.items && props.items.length > 0) {
      props.items.forEach((item) => {
        // 初始化赔付方式选择（使用API返回的默认值）
        const extendInfo = getItemExtendInfo(item.assetid)
        if (extendInfo) {
          // 使用 compensationTypeCode 作为默认选中的赔付方式
          itemsCompensation[item.assetid] = extendInfo.compensationTypeCode || 7
        } else {
          // 如果没有扩展信息，默认使用押金赔付（code=7）
          itemsCompensation[item.assetid] = 7
        }

        // 检测是否支持0CD（后端支持 + 有折扣活动）
        const canEnableZeroCD = canItemEnableZeroCD(item.assetid)

        // 总是重新初始化，确保使用最新的 props 数据
        // 自动填充当前的租赁价格数据
        itemFormMap[item.assetid] = reactive({
          shortRentPrice: item.currentShortRentPrice || '',
          longRentPrice: item.currentLongRentPrice || '',
          depositPrice: item.currentDepositPrice || item.weapon_classID?.yyyp_Price || '',
          tradeMode: 1,  // 每个饰品独立的交易方式（1=租赁, 2=可租可售）
          zeroCooldown: canEnableZeroCD,  // 如果支持0CD，默认开启
          rentActivity: false  // 每个饰品独立的租送活动开关
        })

        // 如果该赔付方式有固定押金，自动填充
        const compensationMode = getItemCompensationMode(item.assetid)
        if (compensationMode && compensationMode.depositAmount && !itemFormMap[item.assetid].depositPrice) {
          itemFormMap[item.assetid].depositPrice = compensationMode.depositAmount
        }

        // 调试日志
        if (canEnableZeroCD) {
        }
      })
    }
  }

  watch(
    () => [props.initData, props.items],
    (newVal, oldVal) => {

      initForms()

      // 不再需要全局赔付文本，每个饰品都有自己的赔付说明
      // 赔付文本从 inventoryExtendInfo.normalLeaseCompensationMap[assetId] 中获取
    },
    { immediate: true, deep: true }
  )

  // 处理图片加载错误
  const handleImageError = (e) => {
    e.target.style.display = 'none'
  }

  // 处理取消
  const handleCancel = () => {
    emit('cancel')
  }

  // 处理提交
  const handleSubmit = () => {
    // 验证表单
    if (!validateForm()) {
      return
    }

    // 调试：输出当前 itemFormMap 的状态

    // 准备提交数据（全局配置 + 每个饰品的独立价格）
    const submitData = {
      rentDays: formData.rentDays === 'custom' ? formData.customDays : formData.rentDays,
      items: props.items.map((item) => {
        const itemForm = itemFormMap[item.assetid]
        const zeroCDConfig = getItemZeroCDConfig(item.assetid)

        return {
          assetid: item.assetid,
          steam_hash_name: item.steam_hash_name,
          shortRentPrice: parseFloat(itemForm.shortRentPrice),
          longRentPrice: itemForm.longRentPrice ? parseFloat(itemForm.longRentPrice) : null,
          depositPrice: parseFloat(itemForm.depositPrice),
          tradeMode: itemForm.tradeMode,  // 每个饰品独立的交易方式
          zeroCooldown: itemForm.zeroCooldown,  // 是否开启0CD
          rentActivity: itemForm.rentActivity,  // 租送活动（固定false）
          // 从0CD配置中读取marketDynamicPricingMinCoefficient
          marketDynamicPricingMinCoefficient: zeroCDConfig?.marketDynamicPricingMinCoefficient || '95'
        }
      })
    }

    emit('submit', submitData)
  }

  // 表单验证
  const validateForm = () => {
    // 验证租赁天数
    if (formData.rentDays === 'custom') {
      if (!formData.customDays || formData.customDays <= 0) {
        ElMessage.warning('请输入有效的租赁天数')
        return false
      }
      if (formData.customDays < minRentDays.value || formData.customDays > maxRentDays.value) {
        ElMessage.warning(`租赁天数必须在 ${minRentDays.value}-${maxRentDays.value} 之间`)
        return false
      }
    }

    // 验证每个饰品的价格配置
    const minRent = firstItemConfig.value?.coefficient?.minRent
    const maxRent = firstItemConfig.value?.coefficient?.maxRent
    const minDeposit = firstItemConfig.value?.coefficient?.minDeposit
    const maxDeposit = firstItemConfig.value?.coefficient?.maxDeposit

    for (const item of props.items || []) {
      const itemForm = itemFormMap[item.assetid]
      if (!itemForm) continue

      // 短租租金必填
      if (!itemForm.shortRentPrice || itemForm.shortRentPrice === '') {
        ElMessage.warning(`【${item.name}】请输入短租租金`)
        return false
      }
      const shortRent = parseFloat(itemForm.shortRentPrice)
      if (isNaN(shortRent) || shortRent <= 0) {
        ElMessage.warning(`【${item.name}】请输入有效的短租租金`)
        return false
      }
      if (minRent && shortRent < parseFloat(minRent)) {
        ElMessage.warning(`【${item.name}】租金不能低于 ¥${minRent}/天`)
        return false
      }
      if (maxRent && shortRent > parseFloat(maxRent)) {
        ElMessage.warning(`【${item.name}】租金不能高于 ¥${maxRent}/天`)
        return false
      }

      // 押金必填
      if (!itemForm.depositPrice || itemForm.depositPrice === '') {
        ElMessage.warning(`【${item.name}】请输入商品押金`)
        return false
      }
      const deposit = parseFloat(itemForm.depositPrice)
      if (isNaN(deposit) || deposit <= 0) {
        ElMessage.warning(`【${item.name}】请输入有效的押金`)
        return false
      }
      if (minDeposit && deposit < parseFloat(minDeposit)) {
        ElMessage.warning(`【${item.name}】押金不能低于 ¥${minDeposit}`)
        return false
      }
      if (maxDeposit && deposit > parseFloat(maxDeposit)) {
        ElMessage.warning(`【${item.name}】押金不能高于 ¥${maxDeposit}`)
        return false
      }
    }

    return true
  }

  // 本地回退的一键定价逻辑（按购入价简单估算）
  const localAutoPricingFallback = () => {
    if (!props.items || props.items.length === 0) {
      ElMessage.warning('没有可定价的饰品')
      return 0
    }

    let successCount = 0

    props.items.forEach((item) => {
      const itemForm = itemFormMap[item.assetid]
      if (!itemForm) return

      const buyPrice = parseFloat(item.buyPrice || item.buy_price || 0)
      if (buyPrice > 0) {
        const shortRent = (buyPrice * 0.015).toFixed(2)
        itemForm.shortRentPrice = shortRent

        const longRent = (parseFloat(shortRent) * 0.8).toFixed(2)
        itemForm.longRentPrice = longRent

        const deposit = (buyPrice * 1.05).toFixed(2)
        itemForm.depositPrice = deposit

        successCount++
      }
    })

    return successCount
  }

  // 一键定价功能：优先调用后端自动定价接口，失败时回退到本地估算
  const handleAutoPricing = async () => {
    if (!props.items || props.items.length === 0) {
      ElMessage.warning('没有可定价的饰品')
      return
    }

    // 收集 steam_hash_name -> assetid 列表
    const hashNameSet = new Set()
    const hashToAssetIds = {}
    props.items.forEach(item => {
      const hashName = item.steam_hash_name || item.name
      if (!hashName) return
      hashNameSet.add(hashName)
      if (!hashToAssetIds[hashName]) {
        hashToAssetIds[hashName] = []
      }
      hashToAssetIds[hashName].push(item.assetid)
    })

    const steamHashNames = Array.from(hashNameSet)
    if (!steamHashNames.length) {
      ElMessage.warning('选中的饰品缺少 steam_hash_name，无法调用自动定价，将使用本地估算')
      const localCount = localAutoPricingFallback()
      if (localCount > 0) {
        ElMessage.success(`已为 ${localCount} 件饰品按购入价估算定价`)
      }
      return
    }

    autoPricingLoading.value = true
    try {
      // 根据是否为转租模式选择不同的API
      const apiUrl = isSubleaseMode.value
        ? apiUrls.yyypSubleaseAutoPricing()
        : apiUrls.yyypRentAutoPricing()

      const resp = await fetch(apiUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          steamId: props.steamId || '',
          steam_hash_name: steamHashNames
        })
      })

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`)
      }

      const result = await resp.json()
      if (!result.success) {
        ElMessage.error(result.message || '自动定价失败，将使用本地估算')
        const localCount = localAutoPricingFallback()
        if (localCount > 0) {
          ElMessage.success(`已为 ${localCount} 件饰品按购入价估算定价`)
        }
        return
      }

      const data = result.data || {}
      const pricingList = data.pricingInfoVos || []
      if (!pricingList.length) {
        ElMessage.warning('自动定价成功，但未返回任何定价数据，将使用本地估算')
        const localCount = localAutoPricingFallback()
        if (localCount > 0) {
          ElMessage.success(`已为 ${localCount} 件饰品按购入价估算定价`)
        }
        return
      }

      // 构建 commodityHashName -> 定价信息 映射
      const priceMap = {}
      pricingList.forEach(p => {
        if (!p.commodityHashName) return
        priceMap[p.commodityHashName] = {
          price: p.price,
          shortLeaseUnitPrice: p.shortLeaseUnitPrice,
          longLeaseUnitPrice: p.longLeaseUnitPrice,
          leaseDeposit: p.leaseDeposit,
          leaseMaxDays: p.leaseMaxDays
        }
      })

      let successCount = 0
      // 将定价结果写入每个饰品对应的表单
      Object.entries(hashToAssetIds).forEach(([hashName, assetIds]) => {
        const pricing = priceMap[hashName]
        if (!pricing) return

        assetIds.forEach(assetid => {
          const itemForm = itemFormMap[assetid]
          if (!itemForm) return

          const shortRent = parseFloat(pricing.shortLeaseUnitPrice || pricing.price || 0)
          const longRent = parseFloat(pricing.longLeaseUnitPrice || 0)
          const deposit = parseFloat(pricing.leaseDeposit || 0)

          if (shortRent > 0) {
            itemForm.shortRentPrice = shortRent.toFixed(2)
          }
          if (longRent > 0) {
            itemForm.longRentPrice = longRent.toFixed(2)
          }
          if (deposit > 0) {
            itemForm.depositPrice = deposit.toFixed(2)
          }

          successCount++
        })
      })

      if (successCount > 0) {
        ElMessage.success(`已为 ${successCount} 件饰品完成悠悠有品自动定价`)
      } else {
        ElMessage.warning('未能为当前饰品匹配到定价数据，将使用本地估算')
        const localCount = localAutoPricingFallback()
        if (localCount > 0) {
          ElMessage.success(`已为 ${localCount} 件饰品按购入价估算定价`)
        }
      }
    } catch (e) {
      console.error('悠悠有品自动定价接口异常:', e)
      ElMessage.error(`自动定价失败: ${e.message}，将使用本地估算`)
      const localCount = localAutoPricingFallback()
      if (localCount > 0) {
        ElMessage.success(`已为 ${localCount} 件饰品按购入价估算定价`)
      }
    } finally {
      autoPricingLoading.value = false
    }
  }

  // 设置0.71租金
  const handleSet071Price = () => {
    if (!props.items || props.items.length === 0) {
      ElMessage.warning('没有可设置的饰品')
      return
    }

    let successCount = 0
    props.items.forEach(item => {
      const itemForm = itemFormMap[item.assetid]
      if (itemForm) {
        // 设置短租租金为 0.71
        itemForm.shortRentPrice = '0.71'
        // 设置长租租金为 0.71
        itemForm.longRentPrice = '0.71'
        successCount++
      }
    })

    if (successCount > 0) {
      ElMessage.success(`已为 ${successCount} 件饰品设置租金为 0.71`)
    } else {
      ElMessage.warning('未能设置租金')
    }
  }

  return {
    formData,
    itemFormMap,
    itemsCompensation,
    tradeMethods,
    rentDaysOptions,
    minRentDays,
    maxRentDays,
    rentPriceTip,
    depositTip,
    serviceFeeRate,
    vipServiceFeeRate,
    showLongRentPrice,
    rentActivities,
    rentActivityDesc,
    handleImageError,
    handleCancel,
    handleSubmit,
    handleAutoPricing,
    handleSet071Price,
    autoPricingLoading,
    // 赔付方式相关
    getItemCompensationMode,
    // 0CD相关
    canItemEnableZeroCD
  }
}
