import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiUrls } from '@/config/api.js'

export function useDevTool() {
  const devices = ref([])
  const selectedDevice = ref('')
  const deviceInfo = ref(null)
  const certStatus = ref(null)
  const isLoadingDevices = ref(false)
  const isConnectingManual = ref(false)
  const isCheckingCert = ref(false)
  const isInstallingCert = ref(false)
  const isUninstallingCert = ref(false)
  const adbMessage = ref('')
  const adbMessageType = ref('info')

  const selectedSteamIdYoupin = ref('')
  const selectedSteamIdBuff = ref('')
  const steamIdList = ref([])
  const isSyncing = ref(false)
  const isSyncingBuff = ref(false)
  const lastSyncTime = ref('')
  
  // Steam Hash Names 相关状态
  const isCollectingHashNames = ref(false)
  const lastCollectTime = ref('')
  const collectProgress = ref(null)

  // CSQAQ 相关状态
  const isCrawlingCsqaq = ref(false)
  const csqaqStatus = ref({
    status: 'idle',
    message: '',
    total_goods: 0,
    duration: null
  })
  const lastCsqaqTime = ref('')
  
  // CSQAQ上传相关
  const csqaqUploadRef = ref(null)
  const isUploadingCsqaq = ref(false)
  const csqaqFileSelected = ref(false)
  const csqaqUploadResult = ref(null)

  // 图片下载相关
  const isDownloadingIcons = ref(false)
  const iconDownloadResult = ref(null)

  // ========== ADB设备管理功能 ==========
  
  // 手动连接设备
  const connectManualDevice = async () => {
    try {
      const { value: address } = await ElMessageBox.prompt(
        '请输入设备地址（格式: IP:端口）',
        '手动连接设备',
        {
          confirmButtonText: '连接',
          cancelButtonText: '取消',
          inputPattern: /^[\d.]+:\d+$/,
          inputErrorMessage: '格式错误，请输入如: 192.168.123.50:5555',
          inputPlaceholder: '192.168.123.50:5555'
        }
      )
      
      isConnectingManual.value = true
      ElMessage.info(`正在连接到 ${address}...`)
      
      // 连接设备
      await axios.post(apiUrls.adbConnect(), { address })
      
      // 等待连接完成
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 刷新设备列表
      const response = await axios.get(apiUrls.adbDevices())
      if (response.data.success && response.data.data.length > 0) {
        devices.value = response.data.data
        selectedDevice.value = devices.value[0].serial
        deviceInfo.value = devices.value[0]
        
        ElMessage.success('设备连接成功！')
        
        // 自动检测证书
        await checkCertStatus(true)
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('手动连接失败:', error)
        ElMessage.error('连接失败，请检查设备地址和网络')
      }
    } finally {
      isConnectingManual.value = false
    }
  }
  
  // 扫描并加载设备
  const scanAndLoadDevices = async () => {
    isLoadingDevices.value = true
    adbMessage.value = ''
    
    try {
      // 1. 先扫描局域网设备
      adbMessage.value = '正在扫描局域网设备...'
      adbMessageType.value = 'info'
      
      const scanResponse = await axios.post(apiUrls.adbScan(), {
        timeout: 0.5,
        max_workers: 50
      })
      
      if (scanResponse.data.success && scanResponse.data.data.length > 0) {
        const discovered = scanResponse.data.data
        ElMessage.success(`发现 ${discovered.length} 个设备，正在连接...`)
        
        // 2. 连接发现的设备
        for (const address of discovered.slice(0, 3)) {  // 最多连接3个
          try {
            await axios.post(apiUrls.adbConnect(), { address })
          } catch (e) {
            console.warn(`连接设备 ${address} 失败:`, e)
          }
        }
        
        // 等待连接完成
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // 3. 获取设备列表
      const response = await axios.get(apiUrls.adbDevices())
      
      if (response.data.success) {
        devices.value = response.data.data
        
        if (devices.value.length > 0) {
          // 默认选择第一个设备
          if (!selectedDevice.value) {
            selectedDevice.value = devices.value[0].serial
            deviceInfo.value = devices.value[0]
          } else {
            // 更新已选设备的信息
            const selected = devices.value.find(d => d.serial === selectedDevice.value)
            if (selected) {
              deviceInfo.value = selected
            }
          }
          
          adbMessage.value = `找到 ${devices.value.length} 个设备`
          adbMessageType.value = 'success'
          ElMessage.success(response.data.message)
          
          // 自动检测证书状态
          await checkCertStatus()
        } else {
          adbMessage.value = '未找到任何设备。请确保：\n1. 设备已开启ADB调试\n2. MuMu模拟器已启动'
          adbMessageType.value = 'warning'
          ElMessage.warning('未找到任何设备')
        }
      } else {
        adbMessage.value = `获取设备失败: ${response.data.message}`
        adbMessageType.value = 'error'
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      console.error('扫描设备失败:', error)
      adbMessage.value = '扫描设备失败，请确保后端服务正在运行'
      adbMessageType.value = 'error'
      
      let errorMessage = '扫描设备失败'
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage
      } else if (error.request) {
        errorMessage = '无法连接到后端服务器'
      }
      ElMessage.error(errorMessage)
    } finally {
      isLoadingDevices.value = false
    }
  }

  // 检查证书状态（静默模式，不显示成功消息）
  const checkCertStatus = async (silent = false) => {
    if (!selectedDevice.value) {
      if (!silent) {
        ElMessage.warning('请先选择设备')
      }
      return
    }

    isCheckingCert.value = true
    if (!silent) {
      adbMessage.value = ''
    }

    try {
      const response = await axios.post(apiUrls.adbCertStatus(), {
        serial: selectedDevice.value
      })

      if (response.data.success) {
        certStatus.value = response.data.data
        if (!silent) {
          adbMessage.value = response.data.message
          adbMessageType.value = certStatus.value.installed ? 'success' : 'warning'
          ElMessage.success(response.data.message)
        }
      } else {
        if (!silent) {
          adbMessage.value = `检查失败: ${response.data.message}`
          adbMessageType.value = 'error'
          ElMessage.error(response.data.message)
        }
      }
    } catch (error) {
      console.error('检查证书状态失败:', error)
      if (!silent) {
        adbMessage.value = '检查证书状态失败'
        adbMessageType.value = 'error'
        
        let errorMessage = '检查证书状态失败'
        if (error.response) {
          errorMessage = error.response.data?.message || errorMessage
        }
        ElMessage.error(errorMessage)
      }
    } finally {
      isCheckingCert.value = false
    }
  }

  // 安装证书（强制重新安装）
  const installCert = async () => {
    if (!selectedDevice.value) {
      ElMessage.warning('请先选择设备')
      return
    }

    // 检查设备是否有root权限
    if (deviceInfo.value && !deviceInfo.value.is_root) {
      ElMessage.error('设备没有root权限，无法安装系统证书')
      return
    }

    try {
      const message = certStatus.value?.installed 
        ? '证书已安装，确定要重新安装Charles证书吗？此操作将覆盖现有证书。'
        : '确定要安装Charles证书到设备吗？此操作需要root权限。'
      
      await ElMessageBox.confirm(message, '确认安装', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }

    isInstallingCert.value = true
    adbMessage.value = ''
    ElMessage.info('开始安装证书...')

    try {
      const response = await axios.post(apiUrls.adbCertInstall(), {
        serial: selectedDevice.value,
        force: true  // 强制重新安装
      })

      if (response.data.success) {
        adbMessage.value = '证书安装成功！请重启模拟器/设备以使证书生效'
        adbMessageType.value = 'success'
        ElMessage.success(response.data.message)
        
        // 显示重启提示
        ElMessageBox.alert(
          '证书已成功安装到设备！\n\n请手动重启模拟器或设备，以确保证书完全生效。',
          '安装成功 - 需要重启',
          {
            confirmButtonText: '知道了',
            type: 'success'
          }
        )
        
        // 刷新证书状态
        setTimeout(() => {
          checkCertStatus(true)  // 静默检查
        }, 1000)
      } else {
        adbMessage.value = `安装失败: ${response.data.message}`
        adbMessageType.value = 'error'
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      console.error('安装证书失败:', error)
      adbMessage.value = '安装证书失败'
      adbMessageType.value = 'error'
      
      let errorMessage = '安装证书失败'
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage
      }
      ElMessage.error(errorMessage)
    } finally {
      isInstallingCert.value = false
    }
  }

  // 卸载证书
  const uninstallCert = async () => {
    if (!selectedDevice.value) {
      ElMessage.warning('请先选择设备')
      return
    }

    try {
      await ElMessageBox.confirm(
        '确定要卸载Charles证书吗？',
        '确认卸载',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }

    isUninstallingCert.value = true
    adbMessage.value = ''
    ElMessage.info('开始卸载证书...')

    try {
      const response = await axios.post(apiUrls.adbCertUninstall(), {
        serial: selectedDevice.value
      })

      if (response.data.success) {
        adbMessage.value = '证书卸载成功'
        adbMessageType.value = 'success'
        ElMessage.success(response.data.message)
        
        // 刷新证书状态
        setTimeout(() => {
          checkCertStatus(true)  // 静默检查
        }, 1000)
      } else {
        adbMessage.value = `卸载失败: ${response.data.message}`
        adbMessageType.value = 'error'
        ElMessage.error(response.data.message)
      }
    } catch (error) {
      console.error('卸载证书失败:', error)
      adbMessage.value = '卸载证书失败'
      adbMessageType.value = 'error'
      
      let errorMessage = '卸载证书失败'
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage
      }
      ElMessage.error(errorMessage)
    } finally {
      isUninstallingCert.value = false
    }
  }

  // ========== Steam ID 和饰品映射功能 ==========

  // 加载Steam ID列表
  const loadSteamIdList = async () => {
    try {
      const response = await axios.get(apiUrls.devToolsSteamAccounts())
      if (response.data.success && response.data.data.length > 0) {
        steamIdList.value = response.data.data
        // 默认选择第一个
        if (steamIdList.value.length > 0) {
          const firstItem = steamIdList.value[0]
          const defaultSteamId = firstItem.steamID || firstItem.steam_id || ''
          if (!selectedSteamIdYoupin.value) {
            selectedSteamIdYoupin.value = defaultSteamId
          }
          if (!selectedSteamIdBuff.value) {
            selectedSteamIdBuff.value = defaultSteamId
          }
        }
      }
    } catch (error) {
      console.error('加载Steam ID列表失败:', error)
      ElMessage.error('加载Steam ID列表失败')
    }
  }

  // 同步悠悠有品饰品映射
  const syncWeaponTemplates = async () => {
    if (!selectedSteamIdYoupin.value) {
      ElMessage.warning('请先选择 Steam ID')
      return
    }

    if (isSyncing.value) {
      return
    }

    try {
      await ElMessageBox.confirm(
        `确定要同步 Steam ID: ${selectedSteamIdYoupin.value} 的悠悠有品饰品映射吗？此操作可能需要一些时间。`,
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
      ElMessage.warning('请先选择 Steam ID')
      return
    }

    if (isSyncingBuff.value) {
      return
    }

    try {
      await ElMessageBox.confirm(
        `确定要同步 Steam ID: ${selectedSteamIdBuff.value} 的BUFF饰品映射吗？此操作可能需要一些时间。`,
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


  // 完整采集Hash Names (全部)
  const collectHashNamesTest = async () => {
    try {
      await ElMessageBox.confirm(
        '确定要采集Steam市场物品数据吗？测试模式将采集100条数据，预计需要2-3分钟。',
        '确认采集',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info'
        }
      )
    } catch {
      return
    }

    isCollectingHashNames.value = true
    collectProgress.value = null
    ElMessage.info('开始采集Steam市场Hash Names (测试模式: 100条)...')

    try {
      const response = await axios.post(apiUrls.steamCollectHashNames(), {
        max_count: 100,
        batch_size: 50
      })

      if (response.data.success) {
        collectProgress.value = response.data.data
        lastCollectTime.value = new Date().toLocaleString('zh-CN')
        ElMessage.success(`采集完成！${response.data.message}`)
      } else {
        ElMessage.error(`采集失败: ${response.data.message}`)
      }
    } catch (error) {
      console.error('采集Hash Names失败:', error)
      let errorMessage = '采集失败'
      
      if (error.response) {
        errorMessage = error.response.data?.message || `采集失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到爬虫服务器，请检查服务是否运行'
      } else {
        errorMessage = error.message || '采集失败'
      }
      
      ElMessage.error(errorMessage)
    } finally {
      isCollectingHashNames.value = false
    }
  }

  // 完整采集Hash Names (全部)
  const collectHashNamesFull = async () => {
    try {
      await ElMessageBox.confirm(
        '确定要完整采集Steam市场物品数据吗？这将采集约24000条数据，预计需要8-10分钟。期间请不要关闭页面。',
        '确认完整采集',
        {
          confirmButtonText: '确定采集',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }

    isCollectingHashNames.value = true
    collectProgress.value = null
    ElMessage.info('开始完整采集Steam市场Hash Names，这可能需要较长时间，请耐心等待...')

    try {
      const response = await axios.post(apiUrls.steamCollectHashNames(), {
        batch_size: 100
      })

      if (response.data.success) {
        collectProgress.value = response.data.data
        lastCollectTime.value = new Date().toLocaleString('zh-CN')
        ElMessage.success(`采集完成！${response.data.message}`)
      } else {
        ElMessage.error(`采集失败: ${response.data.message}`)
      }
    } catch (error) {
      console.error('采集Hash Names失败:', error)
      let errorMessage = '采集失败'

      if (error.response) {
        errorMessage = error.response.data?.message || `采集失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到爬虫服务器，请检查服务是否运行'
      } else {
        errorMessage = error.message || '采集失败'
      }

      ElMessage.error(errorMessage)
    } finally {
      isCollectingHashNames.value = false
    }
  }

  // CSQAQ 全量采集
  const startCsqaqCrawlAll = async () => {
    try {
      await ElMessageBox.confirm(
        '确定要全量采集 CSQAQ 商品数据吗？将爬取所有页面，预计需要较长时间。',
        '确认全量采集',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }

    isCrawlingCsqaq.value = true
    ElMessage.info('开始全量采集 CSQAQ 商品数据...')

    try {
      const response = await axios.post(apiUrls.csqaqGetGoods(), {
        maxPages: null,  // 全量采集
        headless: true,  // 后台运行
        delayMin: 1,
        delayMax: 3,
        scrollLoad: true
      })

      if (response.data.success) {
        csqaqStatus.value = {
          status: 'completed',
          message: response.data.message,
          total_goods: response.data.data.total,
          duration: response.data.data.duration
        }
        lastCsqaqTime.value = new Date().toLocaleString('zh-CN')
        ElMessage.success(`全量采集成功！${response.data.message}`)
      } else {
        csqaqStatus.value = {
          status: 'error',
          message: response.data.message,
          total_goods: 0,
          duration: null
        }
        ElMessage.error(`采集失败: ${response.data.message}`)
      }
    } catch (error) {
      console.error('CSQAQ采集失败:', error)
      let errorMessage = '采集失败'

      if (error.response) {
        errorMessage = error.response.data?.message || `采集失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到爬虫服务器，请检查服务是否运行'
      } else {
        errorMessage = error.message || '采集失败'
      }

      csqaqStatus.value = {
        status: 'error',
        message: errorMessage,
        total_goods: 0,
        duration: null
      }
      ElMessage.error(errorMessage)
    } finally {
      isCrawlingCsqaq.value = false
    }
  }

  const downloadWeaponIcons = async () => {
    if (isDownloadingIcons.value) {
      return
    }

    isDownloadingIcons.value = true
    iconDownloadResult.value = null

    try {
      const response = await axios.post(apiUrls.downloadWeaponIcons(), {
        limit: 200,
        skipExisting: true
      })

      if (response.data.success) {
        iconDownloadResult.value = response.data.data
        const downloaded = response.data.data?.downloaded || 0
        const total = response.data.data?.total || 0
        ElMessage.success(`已完成 ${downloaded}/${total} 张图片下载`)
      } else {
        ElMessage.error(response.data.message || '下载失败')
      }
    } catch (error) {
      console.error('下载武器图标失败:', error)
      let errorMessage = '下载失败'
      if (error.response) {
        errorMessage = error.response.data?.message || `下载失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到爬虫服务器，请检查服务是否运行'
      } else {
        errorMessage = error.message || errorMessage
      }
      ElMessage.error(errorMessage)
    } finally {
      isDownloadingIcons.value = false
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

  // 组件挂载时加载Steam ID列表
  onMounted(() => {
    loadSteamIdList()
  })

  return {
    // API配置
    apiUrls,
    // ADB设备管理
    devices,
    selectedDevice,
    deviceInfo,
    certStatus,
    isLoadingDevices,
    isConnectingManual,
    isCheckingCert,
    isInstallingCert,
    isUninstallingCert,
    adbMessage,
    adbMessageType,
    scanAndLoadDevices,
    connectManualDevice,
    checkCertStatus,
    installCert,
    uninstallCert,
    // Steam ID 和饰品映射
    selectedSteamIdYoupin,
    selectedSteamIdBuff,
    steamIdList,
    isSyncing,
    isSyncingBuff,
    lastSyncTime,
    syncWeaponTemplates,
    syncBuffTemplates,
    // Steam Hash Names 相关
    isCollectingHashNames,
    lastCollectTime,
    collectProgress,
    collectHashNamesFull,
    // 图片下载
    isDownloadingIcons,
    iconDownloadResult,
    downloadWeaponIcons,
    // CSQAQ 相关
    isCrawlingCsqaq,
    csqaqStatus,
    lastCsqaqTime,
    startCsqaqCrawlAll,
    // CSQAQ上传
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
