import { ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { apiUrls } from '@/config/api.js'

export default {
  name: 'RentedOut',
  props: {
    steamId: {
      type: String,
      required: true
    }
  },
  emits: ['update:count'],
  setup(props, { emit }) {
    const loading = ref(false)
    const rentedOutItems = ref([])
    const countdownTimers = ref(new Map())
    const statistics = ref({
      itemCount: 0,
      totalValue: '0.00',
      dailyRent: '0.00'
    })

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

    // 格式化到期时间 - 提取时间部分
    const formatExpireTime = (expireTimeDesc) => {
      if (!expireTimeDesc || expireTimeDesc === '-') return '-'

      // 从 "租赁到期2026.02.02 20:04:45" 提取 "2026.02.02 20:04:45"
      const match = expireTimeDesc.match(/(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2})/)
      if (match) {
        return match[1]
      }

      return expireTimeDesc
    }

    // 解析统计数据描述
    const parseStatisticsDesc = (statsDesc) => {
      if (!statsDesc) {
        return {
          itemCount: 0,
          totalValue: '0.00',
          dailyRent: '0.00'
        }
      }

      // 解析格式: "件数：13｜价值：¥9803.48｜总租金：¥8.24/天"
      const itemCountMatch = statsDesc.match(/件数：(\d+)/)
      const totalValueMatch = statsDesc.match(/价值：¥([\d.]+)/)
      const dailyRentMatch = statsDesc.match(/总租金：¥([\d.]+)\/天/)

      return {
        itemCount: itemCountMatch ? parseInt(itemCountMatch[1]) : 0,
        totalValue: totalValueMatch ? parseFloat(totalValueMatch[1]).toFixed(2) : '0.00',
        dailyRent: dailyRentMatch ? parseFloat(dailyRentMatch[1]).toFixed(2) : '0.00'
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
        const index = rentedOutItems.value.findIndex(i => i.id === item.id)
        if (index > -1 && rentedOutItems.value[index].remaining_seconds > 0) {
          rentedOutItems.value[index].remaining_seconds--
        } else {
          clearInterval(timer)
          countdownTimers.value.delete(item.id)
        }
      }, 1000)

      countdownTimers.value.set(item.id, timer)
    }

    // 停止所有倒计时
    const stopAllCountdowns = () => {
      countdownTimers.value.forEach((timer) => {
        clearInterval(timer)
      })
      countdownTimers.value.clear()
    }

    // 加载已租出数据
    const loadRentedOutData = async () => {
      if (!props.steamId) {
        ElMessage.warning('请选择账号')
        return
      }

      loading.value = true
      try {
        const response = await axios.post(apiUrls.getRentedOutList(), {
          steamId: props.steamId,
          page: 1,
          pageSize: 1000
        })

        if (response.data && response.data.success) {
          // 转换已租出数据格式
          const rentedData = response.data.data?.commodityInfoList || []
          rentedOutItems.value = rentedData.map(item => {
            return {
              id: item.id || item.commodityId,
              item_name: item.name,
              icon_url: item.iconUrl,
              rarity: item.rarityName,
              rarity_color: item.rarityColor,
              exterior: item.exteriorName,
              exterior_color: item.exteriorColor,
              weapon_type: item.typeName,
              abrade: item.abrade,
              rent_amount: item.leaseAmount || item.rentAmount || 0,
              deposit_amount: item.depositAmount || 0,
              lease_days: item.leaseDays || item.rentDays || 0,
              expire_time: item.leaseEndTimeDesc || item.expireTimeDesc || '-',
              remaining_seconds: item.remaining_seconds,
              order_status_desc: item.orderStatusDesc,
              lease_transfer_support: item.leaseTransferSupportFlag === 1,
              lease_transfer_tip: item.leaseTransferUnsupportedTip || '',
              platform: 'yyyp',
              trade_type: 'rented_out'
            }
          })

          // 解析统计数据
          const statsDesc = response.data.data?.statistics || ''
          statistics.value = parseStatisticsDesc(statsDesc)

          const totalCount = response.data.data?.total_count || rentedOutItems.value.length
          ElMessage.success(`加载成功，共 ${totalCount} 个已租出物品${statsDesc ? ' - ' + statsDesc : ''}`)

          // 发送数量给父组件
          emit('update:count', totalCount)

          // 为每个有倒计时的项目启动倒计时
          rentedOutItems.value.forEach(item => {
            if (item.remaining_seconds !== null && item.remaining_seconds !== undefined) {
              startCountdown(item)
            }
          })
        } else {
          ElMessage.error(response.data?.message || '加载失败')
          emit('update:count', 0)
        }
      } catch (error) {
        console.error('加载已租出数据失败:', error)
        ElMessage.error('加载失败: ' + error.message)
      } finally {
        loading.value = false
      }
    }

    // 监听 steamId 变化，重新加载数据
    watch(() => props.steamId, (newSteamId) => {
      if (newSteamId) {
        stopAllCountdowns()
        loadRentedOutData()
      }
    }, { immediate: true })

    // 上架过户
    const handleTransfer = (item) => {
      ElMessage.info(`上架过户功能开发中 - ${item.item_name}`)
      // TODO: 实现上架过户功能
    }

    // 取消转租
    const handleCancelSublease = (item) => {
      ElMessage.info(`取消转租功能开发中 - ${item.item_name}`)
      // TODO: 实现取消转租功能
    }

    // 组件卸载时清理定时器
    onUnmounted(() => {
      stopAllCountdowns()
    })

    return {
      loading,
      rentedOutItems,
      statistics,
      formatCountdown,
      formatExpireTime,
      handleTransfer,
      handleCancelSublease
    }
  }
}
