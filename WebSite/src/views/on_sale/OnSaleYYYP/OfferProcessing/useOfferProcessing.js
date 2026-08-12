import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import axios from 'axios'
import { apiUrls } from '@/config/api.js'

export default {
  name: 'OfferProcessing',
  props: {
    steamId: {
      type: String,
      required: true
    }
  },
  emits: ['update:count'],
  setup(props, { emit }) {
    const loading = ref(false)
    const sellOrders = ref([])
    const buyOrders = ref([])
    const countdownTimers = ref(new Map())
    // 存储每个订单的token信息，key为order_no
    const orderTokenInfo = ref(new Map())
    // 存储批量处理时每个订单的处理状态 {status: 'processing'|'success'|'failed', message: string, progress: '1/5'}
    const batchProcessStatus = ref(new Map())

    // 格式化倒计时显示
    const formatCountdown = (seconds) => {
      if (!seconds || seconds <= 0) return '已过期'
      
      const days = Math.floor(seconds / 86400)
      const hours = Math.floor((seconds % 86400) / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      
      if (days > 0) {
        return `${days}天 ${hours}小时 ${minutes}分钟`
      } else if (hours > 0) {
        return `${hours}小时 ${minutes}分钟 ${secs}秒`
      } else if (minutes > 0) {
        return `${minutes}分钟 ${secs}秒`
      } else {
        return `${secs}秒`
      }
    }

    // 启动倒计时
    const startCountdown = (item) => {
      if (!item.remaining_seconds) return
      
      // 清除旧的定时器
      if (countdownTimers.value.has(item.id)) {
        clearInterval(countdownTimers.value.get(item.id))
      }
      
      // 创建新的定时器
      const timer = setInterval(() => {
        const index = sellOrders.value.findIndex(i => i.id === item.id)
        if (index > -1 && sellOrders.value[index].remaining_seconds > 0) {
          sellOrders.value[index].remaining_seconds--
        } else {
          clearInterval(timer)
          countdownTimers.value.delete(item.id)
        }
      }, 1000)
      
      countdownTimers.value.set(item.id, timer)
    }

    // 停止倒计时
    const stopCountdown = (itemId) => {
      if (countdownTimers.value.has(itemId)) {
        clearInterval(countdownTimers.value.get(itemId))
        countdownTimers.value.delete(itemId)
      }
    }

    // 停止所有倒计时
    const stopAllCountdowns = () => {
      countdownTimers.value.forEach((timer) => {
        clearInterval(timer)
      })
      countdownTimers.value.clear()
    }

    // 加载我出售的报价订单数据
    const loadSellOfferOrders = async () => {
      if (!props.steamId) {
        return { success: true, count: 0 }
      }

      try {
        const response = await axios.post(apiUrls.yyypGetMySellOrders(), {
          steamId: props.steamId,
          code: '1',
          subCode: '1-4',  // 获取待确认报价
          whetherDark: true
        })

        if (response.data && response.data.success) {
          // 转换报价订单数据格式
          const orderData = response.data.data?.orders || []
          sellOrders.value = orderData.map(order => {
            return {
              id: order.offer_id,
              order_no: order.order_no,
              item_name: order.item_name,
              steam_hash_name: order.item_hash_name,
              weapon_type: order.item_type,
              float_range: order.exterior,
              platform: 'yyyp',
              trade_type: 'offer',
              // 报价特有字段
              offer_id: order.offer_id,
              offer_type: order.offer_type,
              order_type: order.order_type,  // 交易类型 (1=出租, 2=出售)
              order_status: order.order_status,
              order_sub_status: order.order_sub_status,  // 订单子状态
              countdown_desc: order.countdown_desc,
              countdown_timestamp: order.countdown_timestamp,
              current_time: order.current_time,
              surplus_countdown: order.surplus_countdown,
              remaining_seconds: order.remaining_seconds,  // 剩余秒数
              end_countdown_desc: order.end_countdown_desc,  // 截止时间描述
              buttons: order.buttons,
              icon_url: order.icon_url,
              rarity: order.rarity,
              rarity_color: order.rarity_color,
              exterior_color: order.exterior_color
            }
          })

          // 为每个订单启动倒计时
          sellOrders.value.forEach(item => {
            if (item.remaining_seconds) {
              startCountdown(item)
            }
          })
          return { success: true, count: sellOrders.value.length }
        } else {
          console.error('加载我出售的订单失败:', response.data?.message)
          return { success: false, error: response.data?.message || '未知错误' }
        }
      } catch (error) {
        console.error('加载我出售的订单异常:', error)
        return { success: false, error: error.message }
      }
    }

    // 加载我收货的报价订单数据
    const loadBuyOfferOrders = async () => {
      if (!props.steamId) {
        return { success: true, count: 0 }
      }

      try {
        const response = await axios.post(apiUrls.yyypGetMyBuyOrders(), {
          steamId: props.steamId,
          code: '2',
          subCode: '2-1',  // 获取全部收货订单
          whetherDark: true
        })

        if (response.data && response.data.success) {
          // 转换报价订单数据格式
          const orderData = response.data.data?.orders || []
          buyOrders.value = orderData.map(order => {
            return {
              id: order.offer_id,
              order_no: order.order_no,
              item_name: order.item_name,
              steam_hash_name: order.item_hash_name,
              weapon_type: order.item_type,
              float_range: order.exterior,
              platform: 'yyyp',
              trade_type: 'offer',
              // 报价特有字段
              offer_id: order.offer_id,
              offer_type: order.offer_type,
              order_type: order.order_type,  // 交易类型 (1=出租, 2=出售)
              order_status: order.order_status,
              order_sub_status: order.order_sub_status,  // 订单子状态
              countdown_desc: order.countdown_desc,
              countdown_timestamp: order.countdown_timestamp,
              current_time: order.current_time,
              surplus_countdown: order.surplus_countdown,
              remaining_seconds: order.remaining_seconds,  // 剩余秒数
              end_countdown_desc: order.end_countdown_desc,  // 截止时间描述
              buttons: order.buttons,
              icon_url: order.icon_url,
              rarity: order.rarity,
              rarity_color: order.rarity_color,
              exterior_color: order.exterior_color
            }
          })

          // 为每个订单启动倒计时
          buyOrders.value.forEach(item => {
            if (item.remaining_seconds) {
              startCountdown(item)
            }
          })
          return { success: true, count: buyOrders.value.length }
        } else {
          console.error('加载我收货的订单失败:', response.data?.message)
          return { success: false, error: response.data?.message || '未知错误' }
        }
      } catch (error) {
        console.error('加载我收货的订单异常:', error)
        return { success: false, error: error.message }
      }
    }

    // 加载所有报价订单数据
    const loadOfferOrders = async () => {
      if (!props.steamId) {
        ElMessage.warning('请选择账号')
        return
      }

      loading.value = true
      try {
        // 并行加载我出售的和我收货的
        const [sellResult, buyResult] = await Promise.all([
          loadSellOfferOrders(),
          loadBuyOfferOrders()
        ])

        // 收集错误信息
        const errors = []
        if (sellResult && !sellResult.success) {
          errors.push(`我出售的: ${sellResult.error}`)
        }
        if (buyResult && !buyResult.success) {
          errors.push(`我收货的: ${buyResult.error}`)
        }

        // 如果有错误，显示错误信息
        if (errors.length > 0) {
          ElMessage.error('加载失败: ' + errors.join('; '))
        } else {
          // 全部成功，显示成功消息
          const totalCount = sellOrders.value.length + buyOrders.value.length
          ElMessage.success(`加载成功，共 ${totalCount} 个待处理报价（出售: ${sellOrders.value.length}, 收货: ${buyOrders.value.length}）`)
        }

        // 发送总数量给父组件
        const totalCount = sellOrders.value.length + buyOrders.value.length
        emit('update:count', totalCount)
      } catch (error) {
        console.error('加载报价订单失败:', error)
        ElMessage.error('加载失败: ' + error.message)
        emit('update:count', 0)
      } finally {
        loading.value = false
      }
    }

    // 处理报价按钮操作
    const handleOfferButton = async (item, button) => {
      try {
        if (!props.steamId) {
          ElMessage.error('无法获取Steam ID')
          return
        }

        const response = await axios.post(apiUrls.yyypProcessOfferButton(), {
          steamId: props.steamId,
          action: button.action,
          offerId: button.offer_id,
          orderNo: button.order_no,
          offerType: item.offer_type,
          orderSubStatus: item.order_sub_status,
          orderType: item.order_type
        })

        if (response.data && response.data.success) {
          ElMessage.success(button.name + '成功')

          // 如果返回了token信息，保存并显示给用户
          if (response.data.data && response.data.data.token_info) {
            const tokenInfo = response.data.data.token_info

            // 将token信息存储到Map中，使用order_no作为key
            orderTokenInfo.value.set(item.order_no, {
              ...tokenInfo,
              timestamp: Date.now()  // 添加时间戳用于显示
            })
          }

          // 重新加载数据
          await loadOfferOrders()
        } else {
          ElMessage.error(response.data?.message || button.name + '失败')
        }
      } catch (error) {
        console.error('处理报价按钮失败:', error)
        ElMessage.error('操作失败: ' + error.message)
      }
    }

    // 批量处理我出售的报价
    const handleBatchProcessSell = async () => {
      if (sellOrders.value.length === 0) {
        ElMessage.warning('没有待处理的出售报价')
        return
      }

      try {
        await ElMessageBox.confirm(
          `确定要按页面顺序批量处理 ${sellOrders.value.length} 个出售报价吗？`,
          '批量处理确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        loading.value = true
        let successCount = 0
        let failCount = 0
        const totalCount = sellOrders.value.length


        // 清空之前的处理状态
        batchProcessStatus.value.clear()

        // 显示开始处理的通知
        ElNotification({
          title: '批量处理开始',
          message: `开始按顺序处理 ${totalCount} 个出售报价...`,
          type: 'info',
          duration: 3000,
          position: 'top-right'
        })

        // 按页面顺序逐条处理
        for (let index = 0; index < sellOrders.value.length; index++) {
          const item = sellOrders.value[index]
          const currentNum = index + 1

          // 找到第一个可操作的按钮（通常是"确认"或"接受"按钮）
          const confirmButton = item.buttons?.find(btn => btn.action === 'confirm' || btn.action === 'accept')

          if (confirmButton) {
            try {

              // 更新卡片状态为"处理中"
              batchProcessStatus.value.set(confirmButton.order_no, {
                status: 'processing',
                message: '正在处理...',
                progress: `${currentNum}/${totalCount}`
              })

              // 显示当前处理的订单信息
              ElNotification({
                title: `处理中 (${currentNum}/${totalCount})`,
                message: `正在处理: ${item.item_name || '未知物品'}\n订单号: ${confirmButton.order_no}`,
                type: 'info',
                duration: 2000,
                position: 'top-right'
              })

              const response = await axios.post(apiUrls.yyypProcessOfferButton(), {
                steamId: props.steamId,
                action: confirmButton.action,
                offerId: confirmButton.offer_id,
                orderNo: confirmButton.order_no,
                offerType: item.offer_type,
                orderSubStatus: item.order_sub_status,
                orderType: item.order_type
              })

              if (response.data && response.data.success) {
                successCount++

                // 如果返回了token信息，保存并显示
                if (response.data.data && response.data.data.token_info) {
                  const tokenInfo = response.data.data.token_info

                  // 将token信息存储到Map中，使用order_no作为key
                  orderTokenInfo.value.set(confirmButton.order_no, {
                    ...tokenInfo,
                    timestamp: Date.now()
                  })

                  // 清除该订单的批量处理状态，让token信息卡片显示
                  batchProcessStatus.value.delete(confirmButton.order_no)
                } else {
                  // 如果没有token信息，显示成功状态
                  batchProcessStatus.value.set(confirmButton.order_no, {
                    status: 'success',
                    message: '✅ 处理成功',
                    progress: `${currentNum}/${totalCount}`
                  })
                }

                ElNotification({
                  title: `✅ 处理成功 (${currentNum}/${totalCount})`,
                  message: `${item.item_name || '未知物品'} 已成功处理`,
                  type: 'success',
                  duration: 2000,
                  position: 'top-right'
                })
              } else {
                failCount++

                // 更新卡片状态为"失败"
                batchProcessStatus.value.set(confirmButton.order_no, {
                  status: 'failed',
                  message: `❌ ${response.data?.message || '处理失败'}`,
                  progress: `${currentNum}/${totalCount}`
                })

                ElNotification({
                  title: `❌ 处理失败 (${currentNum}/${totalCount})`,
                  message: `${item.item_name || '未知物品'}\n原因: ${response.data?.message || '未知错误'}`,
                  type: 'error',
                  duration: 3000,
                  position: 'top-right'
                })
              }
            } catch (error) {
              console.error(`[${currentNum}/${totalCount}] 处理异常:`, error)
              failCount++

              // 更新卡片状态为"失败"
              batchProcessStatus.value.set(confirmButton.order_no, {
                status: 'failed',
                message: `❌ ${error.message || '网络异常'}`,
                progress: `${currentNum}/${totalCount}`
              })

              ElNotification({
                title: `❌ 处理异常 (${currentNum}/${totalCount})`,
                message: `${item.item_name || '未知物品'}\n错误: ${error.message || '网络异常'}`,
                type: 'error',
                duration: 3000,
                position: 'top-right'
              })
            }
          } else {

            // 对于没有按钮的订单，也记录状态
            const orderNo = item.buttons?.[0]?.order_no || item.order_no || `skip_${index}`
            batchProcessStatus.value.set(orderNo, {
              status: 'skipped',
              message: '⚠️ 无可操作按钮',
              progress: `${currentNum}/${totalCount}`
            })

            // 没有可操作的按钮
            ElNotification({
              title: `⚠️ 跳过 (${currentNum}/${totalCount})`,
              message: `${item.item_name || '未知物品'} 没有可操作的按钮`,
              type: 'warning',
              duration: 2000,
              position: 'top-right'
            })
          }

          // 每处理一条后暂停500ms，避免请求过快
          if (index < sellOrders.value.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        loading.value = false


        // 显示最终统计结果
        if (successCount > 0) {
          ElNotification({
            title: '批量处理完成',
            message: `✅ 成功: ${successCount} 个\n${failCount > 0 ? `❌ 失败: ${failCount} 个` : ''}`,
            type: 'success',
            duration: 5000,
            position: 'top-right'
          })
          // 重新加载数据
          await loadOfferOrders()
        } else {
          ElNotification({
            title: '批量处理完成',
            message: `所有报价处理失败 (${failCount} 个)`,
            type: 'error',
            duration: 5000,
            position: 'top-right'
          })
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量处理失败:', error)
          ElMessage.error('批量处理失败: ' + error.message)
        }
        loading.value = false
      }
    }

    // 批量处理我收货的报价
    const handleBatchProcessBuy = async () => {
      if (buyOrders.value.length === 0) {
        ElMessage.warning('没有待处理的收货报价')
        return
      }

      try {
        await ElMessageBox.confirm(
          `确定要按页面顺序批量处理 ${buyOrders.value.length} 个收货报价吗？`,
          '批量处理确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        loading.value = true
        let successCount = 0
        let failCount = 0
        const totalCount = buyOrders.value.length


        // 显示开始处理的通知
        ElNotification({
          title: '批量处理开始',
          message: `开始按顺序处理 ${totalCount} 个收货报价...`,
          type: 'info',
          duration: 3000,
          position: 'top-right'
        })

        // 按页面顺序逐条处理
        for (let index = 0; index < buyOrders.value.length; index++) {
          const item = buyOrders.value[index]
          const currentNum = index + 1

          // 找到第一个可操作的按钮（通常是"确认"或"接受"按钮）
          const confirmButton = item.buttons?.find(btn => btn.action === 'confirm' || btn.action === 'accept')

          if (confirmButton) {
            try {

              // 设置处理中状态
              batchProcessStatus.value.set(confirmButton.order_no, {
                status: 'processing',
                message: '⏳ 处理中...',
                progress: `${currentNum}/${totalCount}`
              })

              // 显示当前处理的订单信息
              ElNotification({
                title: `处理中 (${currentNum}/${totalCount})`,
                message: `正在处理: ${item.item_name || '未知物品'}\n订单号: ${confirmButton.order_no}`,
                type: 'info',
                duration: 2000,
                position: 'top-right'
              })

              const response = await axios.post(apiUrls.yyypProcessOfferButton(), {
                steamId: props.steamId,
                action: confirmButton.action,
                offerId: confirmButton.offer_id,
                orderNo: confirmButton.order_no,
                offerType: item.offer_type,
                orderSubStatus: item.order_sub_status,
                orderType: item.order_type
              })

              if (response.data && response.data.success) {
                successCount++

                // 如果返回了token信息，保存并显示
                if (response.data.data && response.data.data.token_info) {
                  const tokenInfo = response.data.data.token_info

                  // 将token信息存储到Map中，使用order_no作为key
                  orderTokenInfo.value.set(confirmButton.order_no, {
                    ...tokenInfo,
                    timestamp: Date.now()
                  })

                  // 清除该订单的批量处理状态，让token信息卡片显示
                  batchProcessStatus.value.delete(confirmButton.order_no)
                } else {
                  // 如果没有token信息，显示成功状态
                  batchProcessStatus.value.set(confirmButton.order_no, {
                    status: 'success',
                    message: '✅ 处理成功',
                    progress: `${currentNum}/${totalCount}`
                  })
                }

                ElNotification({
                  title: `✅ 处理成功 (${currentNum}/${totalCount})`,
                  message: `${item.item_name || '未知物品'} 已成功处理`,
                  type: 'success',
                  duration: 2000,
                  position: 'top-right'
                })
              } else {
                failCount++

                batchProcessStatus.value.set(confirmButton.order_no, {
                  status: 'failed',
                  message: `❌ ${response.data?.message || '处理失败'}`,
                  progress: `${currentNum}/${totalCount}`
                })

                ElNotification({
                  title: `❌ 处理失败 (${currentNum}/${totalCount})`,
                  message: `${item.item_name || '未知物品'}\n原因: ${response.data?.message || '未知错误'}`,
                  type: 'error',
                  duration: 3000,
                  position: 'top-right'
                })
              }
            } catch (error) {
              console.error(`[${currentNum}/${totalCount}] 处理异常:`, error)
              failCount++

              batchProcessStatus.value.set(confirmButton.order_no, {
                status: 'failed',
                message: `❌ ${error.message || '处理异常'}`,
                progress: `${currentNum}/${totalCount}`
              })

              ElNotification({
                title: `❌ 处理异常 (${currentNum}/${totalCount})`,
                message: `${item.item_name || '未知物品'}\n错误: ${error.message || '网络异常'}`,
                type: 'error',
                duration: 3000,
                position: 'top-right'
              })
            }
          } else {

            // 没有可操作的按钮，设置跳过状态
            if (item.order_no) {
              batchProcessStatus.value.set(item.order_no, {
                status: 'skipped',
                message: '⚠️ 无可操作按钮',
                progress: `${currentNum}/${totalCount}`
              })
            }

            ElNotification({
              title: `⚠️ 跳过 (${currentNum}/${totalCount})`,
              message: `${item.item_name || '未知物品'} 没有可操作的按钮`,
              type: 'warning',
              duration: 2000,
              position: 'top-right'
            })
          }

          // 每处理一条后暂停500ms，避免请求过快
          if (index < buyOrders.value.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        loading.value = false


        // 显示最终统计结果
        if (successCount > 0) {
          ElNotification({
            title: '批量处理完成',
            message: `✅ 成功: ${successCount} 个\n${failCount > 0 ? `❌ 失败: ${failCount} 个` : ''}`,
            type: 'success',
            duration: 5000,
            position: 'top-right'
          })
          // 重新加载数据
          await loadOfferOrders()
        } else {
          ElNotification({
            title: '批量处理完成',
            message: `所有报价处理失败 (${failCount} 个)`,
            type: 'error',
            duration: 5000,
            position: 'top-right'
          })
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量处理失败:', error)
          ElMessage.error('批量处理失败: ' + error.message)
        }
        loading.value = false
      }
    }

    // 获取交易类型标签
    const getOrderTypeLabel = (orderType) => {
      if (orderType === 1) {
        return '出租'
      } else if (orderType === 2) {
        return '出售'
      } else {
        // 其他值直接显示
        return orderType
      }
    }

    // 对按钮进行排序，将"确认报价"放在前面，"手动确认"放在后面
    const getSortedButtons = (buttons) => {
      if (!buttons || buttons.length === 0) {
        return []
      }

      // 复制数组以避免修改原数组
      const sortedButtons = [...buttons]

      // 排序规则：
      // 1. "确认报价" 或 action === 'confirm' 的按钮排在前面
      // 2. "手动确认" 按钮排在后面
      // 3. 其他按钮保持原有顺序
      sortedButtons.sort((a, b) => {
        const aIsConfirm = a.name === '确认报价' || a.action === 'confirm'
        const bIsConfirm = b.name === '确认报价' || b.action === 'confirm'
        const aIsManual = a.name === '手动确认'
        const bIsManual = b.name === '手动确认'

        if (aIsConfirm && !bIsConfirm) return -1
        if (!aIsConfirm && bIsConfirm) return 1
        if (aIsManual && !bIsManual) return 1
        if (!aIsManual && bIsManual) return -1
        return 0
      })

      return sortedButtons
    }

    // 监听 steamId 变化，重新加载数据
    watch(() => props.steamId, (newSteamId) => {
      if (newSteamId) {
        stopAllCountdowns()
        loadOfferOrders()
      }
    }, { immediate: true })

    // 组件卸载时清理定时器
    onUnmounted(() => {
      stopAllCountdowns()
    })

    // 获取订单的token信息
    const getTokenInfo = (orderNo) => {
      return orderTokenInfo.value.get(orderNo)
    }

    // 获取订单的批量处理状态
    const getBatchProcessStatus = (orderNo) => {
      return batchProcessStatus.value.get(orderNo)
    }

    return {
      loading,
      sellOrders,
      buyOrders,
      formatCountdown,
      handleOfferButton,
      handleBatchProcessSell,
      handleBatchProcessBuy,
      getOrderTypeLabel,
      getSortedButtons,
      orderTokenInfo,
      getTokenInfo,
      batchProcessStatus,
      getBatchProcessStatus
    }
  }
}
