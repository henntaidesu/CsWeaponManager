import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { apiUrls } from '@/config/api.js'

export function useSteamDT() {
  // 状态
  const dataLoading = ref(false)

  // 数据
  const marketIndexData = ref(null)
  const chartData = ref([])  // 折线图数据
  const homepageData = ref(null)  // 首页数据（饰品成交额等）
  const lastUpdate = ref(null)

  // 图表相关
  const chartContainer = ref(null)
  let chartInstance = null


  /**
   * 初始化图表(小型迷你图表)
   */
  const initChart = () => {
    if (!chartContainer.value) {
      // console.log('[SteamDT] chartContainer 未找到')
      return false
    }

    // console.log('[SteamDT] 初始化图表...')
    // console.log('[SteamDT] chartContainer 尺寸:', {
    //   width: chartContainer.value.offsetWidth,
    //   height: chartContainer.value.offsetHeight
    // })

    // 销毁旧实例
    if (chartInstance) {
      // console.log('[SteamDT] 销毁旧图表实例')
      chartInstance.dispose()
    }

    // 创建新实例
    chartInstance = echarts.init(chartContainer.value)
    // console.log('[SteamDT] 图表实例已创建:', chartInstance)

    // 设置初始配置 - 迷你图表样式
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: '#409eff',
        borderWidth: 1,
        textStyle: {
          color: '#fff',
          fontSize: 12
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: '#409eff',
            width: 1,
            type: 'solid'
          }
        },
        formatter: function(params) {
          const point = params[0]
          return `${point.name}<br/>${point.seriesName}: ${point.value}`
        }
      },
      grid: {
        left: '0',
        right: '0',
        bottom: '0',
        top: '0',
        containLabel: false
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        show: false, // 隐藏X轴
        data: []
      },
      yAxis: {
        type: 'value',
        show: false, // 隐藏Y轴
        scale: true
      },
      series: [
        {
          name: '大盘指数',
          type: 'line',
          smooth: true,
          symbol: 'none',
          sampling: 'lttb',
          lineStyle: {
            color: '#409eff',
            width: 1.5
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(64, 158, 255, 0.3)'
              },
              {
                offset: 1,
                color: 'rgba(64, 158, 255, 0.05)'
              }
            ])
          },
          data: []
        }
      ]
    }

    chartInstance.setOption(option)
    // console.log('[SteamDT] 图表配置已设置')

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)

    return true
  }

  /**
   * 更新图表数据
   */
  const updateChart = () => {
    // console.log('[SteamDT] updateChart 调用 - chartInstance:', !!chartInstance, 'chartData.length:', chartData.value?.length)

    if (!chartInstance) {
      // console.log('[SteamDT] 图表实例不存在,无法更新')
      return
    }

    if (!chartData.value || chartData.value.length === 0) {
      // console.log('[SteamDT] 图表数据为空,无法更新')
      return
    }

    // 解析数据: [[timestamp, value], ...]
    const dates = []
    const values = []
    const dayStartIndices = {} // 记录每天的起始索引

    let currentDay = null
    chartData.value.forEach((item, index) => {
      const timestamp = parseInt(item[0])
      const value = parseFloat(item[1])

      // 格式化时间戳为日期
      const date = new Date(timestamp * 1000)
      const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      const dayKey = `${date.getMonth() + 1}/${date.getDate()}`

      dates.push(dateStr)
      values.push(value)

      // 记录每天的第一个数据点索引
      if (currentDay !== dayKey) {
        dayStartIndices[dayKey] = index
        currentDay = dayKey
      }
    })

    // console.log('[SteamDT] 准备设置数据 - dates:', dates.length, 'values:', values.length)
    // console.log('[SteamDT] 数值范围:', { min: Math.min(...values), max: Math.max(...values) })
    // console.log('[SteamDT] 天数:', Object.keys(dayStartIndices).length)

    // 构建分段数据，按日期分段，每天根据当天收盘价与开盘价比较显示颜色
    const pieces = []
    const dayKeys = Object.keys(dayStartIndices)

    for (let i = 0; i < dayKeys.length; i++) {
      const dayKey = dayKeys[i]
      const startIndex = dayStartIndices[dayKey]
      const endIndex = i < dayKeys.length - 1 ? dayStartIndices[dayKeys[i + 1]] : values.length

      // 当天的开盘价和收盘价
      const openPrice = values[startIndex]
      const closePrice = values[endIndex - 1]
      const isRising = closePrice >= openPrice

      pieces.push({
        gte: startIndex,
        lt: endIndex,
        color: isRising ? '#f56c6c' : '#67c23a' // 涨红跌绿
      })
    }

    // 更新图表
    chartInstance.setOption({
      visualMap: {
        show: false,
        dimension: 0, // 按 x 轴索引分段
        pieces: pieces
      },
      xAxis: {
        data: dates
      },
      series: [
        {
          data: values,
          lineStyle: {
            width: 1.5
          },
          areaStyle: {
            opacity: 0.3
          }
        }
      ]
    })

    // console.log('[SteamDT] 图表已更新,数据点数量:', values.length, '分段数量:', pieces.length)
  }

  /**
   * 处理窗口大小变化
   */
  const handleResize = () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  }

  /**
   * 通过 Spider 服务转发获取 SteamDT 市场指数数据（浏览器直连有 CORS 限制）
   */
  const fetchMarketIndexData = async () => {
    dataLoading.value = true
    // console.log('[SteamDT] 开始调用 SteamDT API 获取市场指数...')

    try {
      const apiUrl = apiUrls.steamdtMarketIndex()
      const response = await fetch(apiUrl)
      const result = await response.json()

      // console.log('[SteamDT] API 响应:', result)

      if (result.success && result.data) {
        // 解析大盘指数数据
        marketIndexData.value = {
          index: result.data.broadMarketIndex.toFixed(2),
          riseFallRate: result.data.diffYesterdayRatio.toFixed(2),
          riseFallDiff: result.data.diffYesterday.toFixed(2)
        }

        // 解析折线图数据
        chartData.value = result.data.historyMarketIndexList || []

        lastUpdate.value = new Date()

        // console.log('[SteamDT] 大盘指数获取成功:', marketIndexData.value)
        // console.log('[SteamDT] 折线图数据获取成功,数据点数量:', chartData.value.length)

        // 手动更新图表（使用 nextTick 确保 DOM 已更新）
        nextTick(() => {
          if (chartData.value.length > 0) {
            // 如果图表实例不存在，先初始化
            if (!chartInstance && chartContainer.value) {
              // console.log('[SteamDT] 图表实例不存在，先初始化图表')
              initChart()
            }
            // 更新图表
            if (chartInstance) {
              // console.log('[SteamDT] 手动触发图表更新')
              updateChart()
            } else {
              // console.warn('[SteamDT] 图表实例仍然不存在，无法更新')
            }
          }
        })

        ElMessage.success('市场指数数据已更新')
      } else {
        console.error('[SteamDT] 获取失败:', result.errorMsg || result.message)
        ElMessage.error('获取市场指数失败: ' + (result.errorMsg || result.message || '未知错误'))
      }
    } catch (error) {
      console.error('[SteamDT] 请求失败:', error)
      ElMessage.error('网络请求失败: ' + error.message)
    } finally {
      dataLoading.value = false
    }
  }

  /**
   * 获取SteamDT首页数据（饰品成交额等）
   */
  const fetchHomepageData = async () => {
    // console.log('[SteamDT] 开始获取首页数据（饰品成交额）...')

    try {
      const url = apiUrls.homeSteamdtHomepageData()
      const response = await fetch(url)
      const result = await response.json()

      // console.log('[SteamDT] 首页数据响应:', result)

      if (result.success && result.data) {
        homepageData.value = result.data
        // console.log('[SteamDT] 首页数据获取成功:', homepageData.value)
      } else {
        console.error('[SteamDT] 首页数据获取失败:', result.message)
      }
    } catch (error) {
      console.error('[SteamDT] 首页数据请求失败:', error)
    }
  }


  // 监听 marketIndexData 变化,确保容器渲染后初始化图表
  watch(marketIndexData, (newData) => {
    if (newData) {
      // console.log('[SteamDT] marketIndexData 已加载,准备初始化图表')
      nextTick(() => {
        // console.log('[SteamDT] DOM 更新后,chartContainer.value:', chartContainer.value)
        if (chartContainer.value && !chartInstance) {
          // console.log('[SteamDT] 容器已就绪,初始化图表')
          initChart()
          // 如果此时 chartData 已有数据,立即更新图表
          if (chartData.value && chartData.value.length > 0) {
            // console.log('[SteamDT] 数据已存在,立即更新图表')
            updateChart()
          }
        }
      })
    }
  })

  // 监听 chartData 变化,更新图表数据
  watch(chartData, (newData) => {
    // console.log('[SteamDT] chartData 变化,数据点:', newData?.length)
    if (!newData || newData.length === 0) {
      // console.log('[SteamDT] 数据为空,跳过更新')
      return
    }

    nextTick(() => {
      // 如果图表还没初始化,先初始化
      if (!chartInstance) {
        // console.log('[SteamDT] 图表未初始化,先检查容器')
        if (chartContainer.value) {
          // console.log('[SteamDT] 容器存在,初始化图表')
          initChart()
        } else {
          // console.log('[SteamDT] 容器不存在,等待 marketIndexData 加载')
          return
        }
      }
      // 更新图表数据
      // console.log('[SteamDT] 准备更新图表数据')
      updateChart()
    })
  })

  // 组件挂载时
  onMounted(() => {
    // console.log('[SteamDT] 组件已挂载')
    // 自动获取数据(不在这里初始化图表,等待数据加载后再初始化)
    fetchMarketIndexData()
    fetchHomepageData()
  })

  // 组件卸载时
  onUnmounted(() => {
    // 移除窗口大小监听
    window.removeEventListener('resize', handleResize)

    // 销毁图表实例
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }
  })

  return {
    // 状态
    dataLoading,
    marketIndexData,
    homepageData,
    lastUpdate,
    chartContainer,

    // 方法
    fetchMarketIndexData,
    fetchHomepageData
  }
}
