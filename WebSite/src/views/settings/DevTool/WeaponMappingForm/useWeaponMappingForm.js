import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiUrls } from '@/config/api.js'

// Steam 采集在爬虫端后台跑，前端只做轮询展示
const STEAM_STATUS_POLL_MS = 3000

export default function useWeaponMappingForm() {
  const selectedSteamIdYoupin = ref('')
  const selectedSteamIdBuff = ref('')
  const selectedSteamIdIgxe = ref('')
  // 悠悠有品：key1=youpin key2=config 的账号列表；BUFF：key1=buff；IGXE：key1=igxe
  const youpinConfigList = ref([])
  const buffConfigList = ref([])
  const igxeConfigList = ref([])
  const isSyncing = ref(false)
  const isSyncingBuff = ref(false)
  const isSyncingIgxe = ref(false)
  const lastSyncTime = ref('')
  
  // Steam 后台采集任务：断点、状态快照、轮询句柄
  const steamStartTagIndex = ref(0)
  const steamStartPage = ref(1)
  const steamTask = ref(null)
  const isStoppingSteam = ref(false)
  let steamPollTimer = null

  const isSteamRunning = computed(() => steamTask.value?.running === true)
  const steamProgressPercent = computed(() => {
    if (!steamTask.value?.total) return 0
    return Math.floor(steamTask.value.current * 100 / steamTask.value.total)
  })

  // CSQAQ上传相关
  const csqaqUploadRef = ref(null)
  const isUploadingCsqaq = ref(false)
  const csqaqFileSelected = ref(false)
  const csqaqUploadResult = ref(null)

  // 加载悠悠有品配置账号列表（key1=youpin, key2=config）
  const loadYoupinConfigList = async () => {
    try {
      const response = await axios.get(apiUrls.devToolsConfigAccounts('youpin'))
      if (response.data.success && Array.isArray(response.data.data)) {
        youpinConfigList.value = response.data.data
        if (youpinConfigList.value.length > 0 && !selectedSteamIdYoupin.value) {
          selectedSteamIdYoupin.value = youpinConfigList.value[0].steamID || ''
        }
      }
    } catch (error) {
      console.error('加载悠悠有品配置账号列表失败:', error)
      ElMessage.error('加载悠悠有品配置账号列表失败')
    }
  }

  // 加载BUFF配置账号列表（key1=buff, key2=config）
  const loadBuffConfigList = async () => {
    try {
      const response = await axios.get(apiUrls.devToolsConfigAccounts('buff'))
      if (response.data.success && Array.isArray(response.data.data)) {
        buffConfigList.value = response.data.data
        if (buffConfigList.value.length > 0 && !selectedSteamIdBuff.value) {
          selectedSteamIdBuff.value = buffConfigList.value[0].steamID || ''
        }
      }
    } catch (error) {
      console.error('加载BUFF配置账号列表失败:', error)
      ElMessage.error('加载BUFF配置账号列表失败')
    }
  }

  // 加载IGXE配置账号列表（key1=igxe, key2=config）
  const loadIgxeConfigList = async () => {
    try {
      const response = await axios.get(apiUrls.devToolsConfigAccounts('igxe'))
      if (response.data.success && Array.isArray(response.data.data)) {
        igxeConfigList.value = response.data.data
        if (igxeConfigList.value.length > 0 && !selectedSteamIdIgxe.value) {
          selectedSteamIdIgxe.value = igxeConfigList.value[0].steamID || ''
        }
      }
    } catch (error) {
      console.error('加载IGXE配置账号列表失败:', error)
      ElMessage.error('加载IGXE配置账号列表失败')
    }
  }

  // 同步悠悠有品饰品映射
  const syncWeaponTemplates = async () => {
    if (!selectedSteamIdYoupin.value) {
      ElMessage.warning('请先选择悠悠有品账号')
      return
    }

    if (isSyncing.value) {
      return
    }

    try {
      await ElMessageBox.confirm(
        `确定要同步所选悠悠有品账号的饰品映射吗？此操作可能需要一些时间。`,
        '确认同步',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }

    isSyncing.value = true
    ElMessage.info('开始同步饰品映射...')
    
    try {

      const response = await axios.post(apiUrls.youpinSyncWeaponTemplates(), {
        steamId: selectedSteamIdYoupin.value,
        syncHistory: false  // dev-tools 获取映射不同步到历史表
      })

      if (response.data.success) {
        ElMessage.success(`同步成功！${response.data.message}`)
        lastSyncTime.value = new Date().toLocaleString('zh-CN')
      } else {
        ElMessage.error(`同步失败: ${response.data.message}`)
      }
    } catch (error) {
      console.error('同步饰品映射失败:', error)
      let errorMessage = '同步失败'
      
      if (error.response) {
        errorMessage = error.response.data?.message || `同步失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到爬虫服务器，请检查服务是否运行'
      } else {
        errorMessage = error.message || '同步失败'
      }
      
      ElMessage.error(errorMessage)
    } finally {
      isSyncing.value = false
    }
  }

  // 同步BUFF饰品映射
  const syncBuffTemplates = async () => {
    if (!selectedSteamIdBuff.value) {
      ElMessage.warning('请先选择BUFF账号')
      return
    }

    if (isSyncingBuff.value) {
      return
    }

    try {
      await ElMessageBox.confirm(
        `确定要同步所选BUFF账号的饰品映射吗？此操作可能需要一些时间。`,
        '确认同步',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }

    isSyncingBuff.value = true
    ElMessage.info('开始同步BUFF饰品映射...')

    try {

      const response = await axios.post(apiUrls.buffSyncTemplates(), {
        steamId: selectedSteamIdBuff.value
      })

      if (response.data.success) {
        ElMessage.success(`同步成功！${response.data.message}`)
        lastSyncTime.value = new Date().toLocaleString('zh-CN')
      } else {
        ElMessage.error(`同步失败: ${response.data.message}`)
      }
    } catch (error) {
      console.error('同步BUFF饰品映射失败:', error)
      let errorMessage = '同步失败'

      if (error.response) {
        errorMessage = error.response.data?.message || `同步失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到爬虫服务器，请检查服务是否运行'
      } else {
        errorMessage = error.message || '同步失败'
      }

      ElMessage.error(errorMessage)
    } finally {
      isSyncingBuff.value = false
    }
  }

  // 同步IGXE饰品映射
  const syncIgxeTemplates = async () => {
    if (!selectedSteamIdIgxe.value) {
      ElMessage.warning('请先选择IGXE账号')
      return
    }

    if (isSyncingIgxe.value) {
      return
    }

    try {
      await ElMessageBox.confirm(
        `确定要同步所选IGXE账号的饰品映射吗？此操作可能需要一些时间。`,
        '确认同步',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }

    isSyncingIgxe.value = true
    ElMessage.info('开始同步IGXE饰品映射...')

    try {

      const response = await axios.post(apiUrls.igxeSyncTemplates(), {
        steamId: selectedSteamIdIgxe.value
      })

      if (response.data.success) {
        ElMessage.success(`同步成功！${response.data.message}`)
        lastSyncTime.value = new Date().toLocaleString('zh-CN')
      } else {
        ElMessage.error(`同步失败: ${response.data.message}`)
      }
    } catch (error) {
      console.error('同步IGXE饰品映射失败:', error)
      let errorMessage = '同步失败'

      if (error.response) {
        errorMessage = error.response.data?.message || `同步失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到爬虫服务器，请检查服务是否运行'
      } else {
        errorMessage = error.message || '同步失败'
      }

      ElMessage.error(errorMessage)
    } finally {
      isSyncingIgxe.value = false
    }
  }

  // ========== Steam 饰品映射（爬虫端后台任务） ==========

  // 拉一次任务状态；任务不在跑时停掉轮询
  const refreshSteamStatus = async () => {
    try {
      const response = await axios.get(apiUrls.steamMappingTaskStatus())
      if (!response.data.success) return

      const task = response.data.data
      steamTask.value = task

      if (!task.running) {
        stopSteamPolling()
        isStoppingSteam.value = false
        // 停止时把断点回填，下次点开始即从这里继续
        if (task.status === 'stopped' && task.resume !== null && task.resume !== undefined) {
          if (task.task === 'mappingId') {
            steamStartTagIndex.value = task.resume
          } else if (task.task === 'hashNameList') {
            steamStartPage.value = task.resume
          }
        }
      }
    } catch (error) {
      console.error('查询Steam采集状态失败:', error)
      stopSteamPolling()
    }
  }

  const startSteamPolling = () => {
    if (steamPollTimer) return
    steamPollTimer = setInterval(refreshSteamStatus, STEAM_STATUS_POLL_MS)
  }

  const stopSteamPolling = () => {
    if (!steamPollTimer) return
    clearInterval(steamPollTimer)
    steamPollTimer = null
  }

  // 启动后台采集：请求立即返回，采集在爬虫端继续，关掉页面也不影响
  const startSteamTask = async (url, confirmText, body) => {
    if (isSteamRunning.value) {
      ElMessage.warning('已有 Steam 采集任务在运行中，请先停止')
      return
    }

    try {
      await ElMessageBox.confirm(confirmText, '确认采集', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }

    try {
      const response = await axios.post(url, body)
      if (response.data.success) {
        ElMessage.success(response.data.message || '已在后台开始采集')
        await refreshSteamStatus()
        startSteamPolling()
      } else {
        ElMessage.error(response.data.message || '启动采集失败')
      }
    } catch (error) {
      console.error('启动Steam采集任务失败:', error)
      let errorMessage = '启动采集失败'

      if (error.response) {
        errorMessage = error.response.data?.message || `启动采集失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到爬虫服务器，请检查服务是否运行'
      } else {
        errorMessage = error.message || '启动采集失败'
      }

      ElMessage.error(errorMessage)
    }
  }

  // 采集饰品映射ID：按武器标签遍历，写入 classid / instanceid
  const startSteamMappingId = () => startSteamTask(
    apiUrls.steamStartMappingIdTask(),
    '确定要采集 Steam 饰品映射ID 吗？采集在后台进行，全量跑一轮需要数小时，期间可关闭页面。',
    { start_tag_index: steamStartTagIndex.value }
  )

  // 采集全量 hash_name 名单：只补库中不存在的记录
  const startSteamHashNameList = () => startSteamTask(
    apiUrls.steamStartHashNameListTask(),
    '确定要采集 Steam 全量 hash_name 名单吗？采集在后台进行，全量约 2477 页需要数小时，期间可关闭页面。',
    { start_page: steamStartPage.value }
  )

  const stopSteamTask = async () => {
    if (!isSteamRunning.value || isStoppingSteam.value) return

    isStoppingSteam.value = true
    try {
      const response = await axios.post(apiUrls.steamStopMappingTask())
      ElMessage.info(response.data.message || '停止信号已发送')
      startSteamPolling()
    } catch (error) {
      console.error('停止Steam采集失败:', error)
      isStoppingSteam.value = false
      ElMessage.error('停止采集失败')
    }
  }

  // CSQAQ上传相关函数
  const handleCsqaqFileChange = (file, fileList) => {
    // 文件选择时触发
    if (fileList.length > 0) {
      const selectedFile = file.raw
      const isTxt = selectedFile.name.endsWith('.txt')
      const isLt50M = selectedFile.size / 1024 / 1024 < 50
      
      if (!isTxt) {
        ElMessage.error('只能上传.txt文件！')
        csqaqFileSelected.value = false
        // 清除文件
        if (csqaqUploadRef.value) {
          csqaqUploadRef.value.clearFiles()
        }
        return
      }
      
      if (!isLt50M) {
        ElMessage.error('文件大小不能超过50MB！')
        csqaqFileSelected.value = false
        // 清除文件
        if (csqaqUploadRef.value) {
          csqaqUploadRef.value.clearFiles()
        }
        return
      }
      
      csqaqFileSelected.value = true
      ElMessage.success('文件已选择，请点击"提交上传"按钮')
    } else {
      csqaqFileSelected.value = false
    }
  }

  const beforeCsqaqUpload = (file) => {
    const isTxt = file.name.endsWith('.txt')
    if (!isTxt) {
      ElMessage.error('只能上传.txt文件！')
      return false
    }
    
    const isLt50M = file.size / 1024 / 1024 < 50
    if (!isLt50M) {
      ElMessage.error('文件大小不能超过50MB！')
      return false
    }
    
    return true
  }

  const submitCsqaqUpload = () => {
    if (!csqaqUploadRef.value) {
      ElMessage.error('上传组件未初始化')
      return
    }
    
    isUploadingCsqaq.value = true
    csqaqUploadRef.value.submit()
  }

  const handleCsqaqUploadSuccess = (response, file) => {
    isUploadingCsqaq.value = false
    csqaqFileSelected.value = false
    
    if (response.success) {
      csqaqUploadResult.value = response
      ElMessage.success(response.message || '上传成功')
      
      // 清空文件列表
      if (csqaqUploadRef.value) {
        csqaqUploadRef.value.clearFiles()
      }
    } else {
      ElMessage.error(response.message || '上传失败')
    }
  }

  const handleCsqaqUploadError = (error, file) => {
    isUploadingCsqaq.value = false
    csqaqFileSelected.value = false
    
    console.error('上传失败:', error)
    
    let errorMessage = '上传失败'
    try {
      const response = JSON.parse(error.message)
      errorMessage = response.message || errorMessage
    } catch (e) {
      errorMessage = error.message || errorMessage
    }
    
    ElMessage.error(errorMessage)
  }

  // 组件挂载时加载悠悠有品/BUFF/IGXE 配置账号列表（key1=youpin|buff|igxe, key2=config）
  // 同时拉一次 Steam 任务状态——任务在爬虫端后台跑，重进页面要能接着显示进度
  onMounted(async () => {
    loadYoupinConfigList()
    loadBuffConfigList()
    loadIgxeConfigList()

    await refreshSteamStatus()
    if (isSteamRunning.value) {
      startSteamPolling()
    }
  })

  onUnmounted(() => {
    stopSteamPolling()
  })

  return {
    apiUrls,
    selectedSteamIdYoupin,
    selectedSteamIdBuff,
    selectedSteamIdIgxe,
    youpinConfigList,
    buffConfigList,
    igxeConfigList,
    isSyncing,
    isSyncingBuff,
    isSyncingIgxe,
    lastSyncTime,
    syncWeaponTemplates,
    syncBuffTemplates,
    syncIgxeTemplates,
    steamStartTagIndex,
    steamStartPage,
    steamTask,
    isSteamRunning,
    isStoppingSteam,
    steamProgressPercent,
    startSteamMappingId,
    startSteamHashNameList,
    stopSteamTask,
    csqaqUploadRef,
    isUploadingCsqaq,
    csqaqFileSelected,
    csqaqUploadResult,
    handleCsqaqFileChange,
    beforeCsqaqUpload,
    submitCsqaqUpload,
    handleCsqaqUploadSuccess,
    handleCsqaqUploadError
  }
}
