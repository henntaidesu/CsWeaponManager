import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, User, Grid, Loading, CircleCheck, DataAnalysis } from '@element-plus/icons-vue'
import axios from 'axios'
import { apiUrls } from '@/config/api.js'
import { useCollectionState } from './useCollectionState.js'


export function useDataSource() {
  // 使用采集状态管理 composable（持久化到 localStorage）
  const { collectingSourceIds, startCollecting, stopCollecting, isCollecting } = useCollectionState()

  const submitting = ref(false)
  const testing = ref(false)
  const refreshing = ref(false)
  const editingSourceId = ref(null)
  const editDialogVisible = ref(false)
  const isListCollapsed = ref(false) // 列表收起状态
  const editSubmitting = ref(false)
  const addDialogVisible = ref(false)
  const isIndependentDataSourceMode = ref(false) // 是否是独立数据源模式
  const steamLoginLoading = ref(false)
  const steamQRCode = ref('') // 二维码图片base64
  const steamQRLoading = ref(false) // 二维码生成loading
  const steamQRStatus = ref('') // 二维码状态: waiting, success, expired
  const steamQRCheckTimer = ref(null) // 二维码状态检查定时器
  const autoRefreshTimer = ref(null) // 数据源列表自动刷新定时器

  // 表单组件引用 - 用于调用子组件的cleanup方法
  const youpinFormRef = ref(null)
  const buffFormRef = ref(null)
  const perfectWorldFormRef = ref(null)
  const csfloatFormRef = ref(null)
  const c5gameFormRef = ref(null)
  
  // 注意：全局自动采集定时器在 main.js 中初始化，无需在组件中管理
  
  // GetAppToken 相关状态
  const buffTokenLoading = ref(false)  // BUFF Token 获取loading
  const yyypTokenLoading = ref(false)  // 悠悠有品 Token 获取loading
  const perfectWorldTokenLoading = ref(false)  // 完美世界APP Token 获取loading
  const csfloatTokenLoading = ref(false)  // CsFloat Token 获取loading
  const buffTokenStatus = ref('')  // BUFF Token 获取状态: waiting, success, failed
  const yyypTokenStatus = ref('')  // 悠悠有品 Token 获取状态: waiting, success, failed
  const perfectWorldTokenStatus = ref('')  // 完美世界APP Token 获取状态: waiting, success, failed
  const csfloatTokenStatus = ref('')  // CsFloat Token 获取状态: waiting, success, failed
  const tokenCheckTimer = ref(null)  // Token 获取状态检查定时器
  const proxyAddress = ref('')  // 代理地址 (从后端获取)
  
  // 悠悠有品短信登录相关状态
  const yyypSmsLoginLoading = ref(false)  // 短信登录loading
  const yyypSmsLoginStatus = ref('')  // 短信登录状态: success, failed
  const sendingSmsCode = ref(false)  // 发送验证码loading
  const smsCodeCountdown = ref(0)  // 验证码倒计时
  const smsCodeTimer = ref(null)  // 验证码倒计时定时器
  const generatingSessionId = ref(false)  // 生成SessionID loading
  const generatingDeviceId = ref(false)  // 生成DeviceID loading
  const editYyypSmsLoginLoading = ref(false)  // 编辑对话框短信登录loading
  const editSendingSmsCode = ref(false)  // 编辑对话框发送验证码loading
  const editSmsCodeCountdown = ref(0)  // 编辑对话框验证码倒计时
  const editSmsCodeTimer = ref(null)  // 编辑对话框验证码倒计时定时器
  const editGeneratingSessionId = ref(false)  // 编辑对话框生成SessionID loading
  const editGeneratingDeviceId = ref(false)  // 编辑对话框生成DeviceID loading
  
  // 编辑对话框折叠面板状态
  const editYyypBasicCollapse = ref([])
  const editYyypTokenCollapse = ref([])
  const editYyypDeviceCollapse = ref([])
  const editYyypAdvancedCollapse = ref([])
  const editBuffBasicCollapse = ref([])
  const editBuffAppCollapse = ref([])
  const editBuffDeviceCollapse = ref([])
  const editBuffSystemCollapse = ref([])
  const editBuffDisplayCollapse = ref([])
  const editBuffLocaleCollapse = ref([])
  const inputBuffCollapse = ref(['config'])
  const inputPerfectWorldCollapse = ref([])
  const inputCsfloatCollapse = ref([])
  const inputCsqaqCollapse = ref(['config'])
  const inputSteamdtCollapse = ref(['config'])
  const inputSteamCollapse = ref([])
  const inputYyypConfigCollapse = ref([])  // 悠悠有品配置折叠面板
  const editSteamCollapse = ref([])
  const editSteamLoginCollapse = ref([])
  const editPerfectWorldCollapse = ref([])
  const editCsfloatCollapse = ref([])
  const editCsqaqCollapse = ref(['config'])
  const editSteamdtCollapse = ref(['config'])
  
  const editForm = ref({
    name: '',
    type: '',
    apiUrl: '',
    apiKey: '',
    enabled: true,
    // 悠悠有品特有字段
    yyypLoginMethod: 'capture', // 登录方式：sms/capture
    yyypPhone: '', // 短信登录手机号
    yyypSmsCode: '', // 短信验证码
    phone: '',
    sessionid: '',
    token: '',
    deviceName: '',
    appVersion: '',
    sleepTime: 6000,
    appType: '',
    userId: '',
    steamId: '',
    devicetoken: '',
    deviceid: '',
    deviceuk: '',
    uk: '',
    sk: '',
    deviceInfo: '',
    // BUFF特有字段
    cookie: '',
    systemVersion: '',
    systemType: '',
    steamID: '',
    // Steam特有字段
    cookies: '',
    steamBaseCookies: '',
    steamInventoryCookies: '',
    steamCookieMethod: 'qrcode', // Cookie获取方式：qrcode/password/manual，默认扫码登录
    // Steam登录特有字段
    steamUsername: '',
    steamPassword: '',
    steamTwofactorCode: '',
    steamLoginMethod: 'qrcode', // 默认扫码登录
    steamQRSessionId: '', // 二维码会话ID
    // 完美世界APP特有字段
    appversion: '',
    device: '',
    gameType: '',
    platform: '',
    pwToken: '',
    tdSign: '',
    pwSteamID: '',
    // CsFloat特有字段
    csfloatUserAgent: '',
    csfloatReferer: '',
    csfloatAccept: '',
    csfloatXAppVersion: '',
    csfloatHost: '',
    csfloatConnection: '',
    csfloatAcceptEncoding: '',
    csfloatCookie: '',
    csfloatSteamID: '',
    // C5 GAME 特有字段
    c5gameAccessToken: '',
    c5gameDeviceId: '',
    c5gameDeviceModel: '',
    c5gameDeviceOs: '',
    c5gameUserAgent: '',
    c5gameAppVersionCode: '',
    c5gameAppChannel: '',
    c5gameSource: '',
    c5gameSign: '',
    c5gameRdi: '',
    c5gameAcceptLanguage: '',
    c5gameXUa: '',
    c5gameStartReqTime: '',
    c5gameContentType: '',
    c5gameAcceptEncoding: '',
    c5gameAutoLogin: false,
    c5gameAutoLoginUsername: '',
    c5gameAutoLoginPassword: '',
    // CSQAQ特有字段
    csqaqApiToken: '',
    // SteamDT特有字段
    steamdtApiKey: '',
    steamdtCallbackDomain: ''
  })
  
  const inputForm = ref({
    name: '',
    type: '',
    apiUrl: '',
    apiKey: '',
    enabled: false,
    // 悠悠有品特有字段
    yyypLoginMethod: 'sms', // 登录方式：sms/capture，默认短信登录
    yyypPhone: '', // 短信登录手机号
    yyypSmsCode: '', // 短信验证码
    phone: '',
    sessionid: '',
    token: '',
    deviceName: '',
    appVersion: '',
    sleepTime: 6000,
    appType: '',
    userId: '',
    steamId: '',
    devicetoken: '',
    deviceid: '',
    deviceuk: '',
    uk: '',
    sk: '',
    deviceInfo: '',
    // BUFF特有字段
    cookie: '',
    systemVersion: '',
    systemType: '',
    steamID: '',
    // Steam特有字段
    cookies: '',
    steamBaseCookies: '',
    steamInventoryCookies: '',
    steamCookieMethod: 'qrcode', // Cookie获取方式：qrcode/password/manual，默认扫码登录
    // Steam登录特有字段
    steamUsername: '',
    steamPassword: '',
    steamTwofactorCode: '',
    steamLoginMessage: '',
    steamLoginSuccess: false,
    steamLoginMethod: 'qrcode', // 默认使用扫码登录
    steamQRSessionId: '', // 二维码会话ID
    // 完美世界APP特有字段
    appversion: '',
    device: '',
    gameType: '',
    platform: '',
    pwToken: '',
    tdSign: '',
    pwSteamID: '',
    // CsFloat特有字段
    csfloatUserAgent: '',
    csfloatReferer: '',
    csfloatAccept: '',
    csfloatXAppVersion: '',
    csfloatHost: '',
    csfloatConnection: '',
    csfloatAcceptEncoding: '',
    csfloatCookie: '',
    csfloatSteamID: '',
    // C5 GAME 特有字段
    c5gameAccessToken: '',
    c5gameDeviceId: '',
    c5gameDeviceModel: '',
    c5gameDeviceOs: '',
    c5gameUserAgent: '',
    c5gameAppVersionCode: '',
    c5gameAppChannel: '',
    c5gameSource: '',
    c5gameSign: '',
    c5gameRdi: '',
    c5gameAcceptLanguage: '',
    c5gameXUa: '',
    c5gameStartReqTime: '',
    c5gameContentType: '',
    c5gameAcceptEncoding: '',
    c5gameAutoLogin: false,
    c5gameAutoLoginUsername: '',
    c5gameAutoLoginPassword: '',
    // CSQAQ特有字段
    csqaqApiToken: '',
    // SteamDT特有字段
    steamdtApiKey: '',
    steamdtCallbackDomain: ''
  })

  const dataSources = ref([])
  const currentSteamID = ref(null) // 当前要添加数据源的SteamID

  // 数据源类型排序顺序
  const sourceTypeOrder = {
    'steam': 1,
    'steam_login': 1,  // steam_login 与 steam 同优先级
    'buff': 2,
    'youpin': 3,
    'csfloat': 4,
    'c5game': 5,
    'igxe': 6,
    'ecosteam': 6,
    'perfectworld': 999
  }

  // 独立数据源类型列表
  const independentDataSourceTypes = ['csqaq', 'steamdt', 'igxe', 'ecosteam']

  // 独立数据源的计算属性
  const independentDataSources = computed(() => {
    return dataSources.value.filter(source => 
      independentDataSourceTypes.includes(source.type)
    )
  })

  // 按SteamID分组的计算属性（排除独立数据源）
  const groupedDataSources = computed(() => {
    const groups = {}
    
    dataSources.value.forEach(source => {
      // 跳过独立数据源
      if (independentDataSourceTypes.includes(source.type)) {
        return
      }
      
      const steamID = source.steamID || '未设置'
      if (!groups[steamID]) {
        groups[steamID] = []
      }
      groups[steamID].push(source)
    })
    
    // 对每个分组内的数据源进行排序
    Object.keys(groups).forEach(steamID => {
      groups[steamID].sort((a, b) => {
        const orderA = sourceTypeOrder[a.type] || 999
        const orderB = sourceTypeOrder[b.type] || 999
        // 如果优先级相同，steam_login 排在 steam 后面
        if (orderA === orderB) {
          if (a.type === 'steam' && b.type === 'steam_login') return -1
          if (a.type === 'steam_login' && b.type === 'steam') return 1
          return 0
        }
        return orderA - orderB
      })
    })
    
    return groups
  })

  // 获取当前分组已有的数据源类型
  const existingTypesInCurrentGroup = computed(() => {
    if (!currentSteamID.value) return []
    const group = groupedDataSources.value[currentSteamID.value] || []
    return group.map(source => source.type)
  })

  // 检查某个类型是否已存在于当前分组
  const isTypeDisabled = (type) => {
    return existingTypesInCurrentGroup.value.includes(type)
  }

  // 检查独立数据源类型是否已存在（独立数据源全局只能有一个）
  const isIndependentTypeDisabled = (type) => {
    return independentDataSources.value.some(source => source.type === type)
  }

  const getSourceTypeLabel = (type) => {
    const labels = {
      steam: 'Steam市场',
      steam_login: 'Steam市场(登录)',
      perfectworld: '完美世界APP',
      buff: '网易BUFF',
      youpin: '悠悠有品',
      csfloat: 'CsFloat',
      csqaq: 'CSQAQ',
      steamdt: 'SteamDT',
      c5game: 'C5 GAME',
      igxe: 'IGXE',
      ecosteam: 'ECOsteam'
    }
    return labels[type] || type
  }

  const getSourceTypeColor = (enabled) => {
    return enabled ? 'success' : 'warning'
  }

  const getUpdateFreqLabel = (freq) => {
    const labels = {
      '15min': '每15分钟',
      '1hour': '每小时',
      '3hour': '每3小时',
      '6hour': '每6小时',
      '12hour': '每12小时',
      daily: '每天'
    }
    return labels[freq] || freq
  }

  const formatTime = (time) => {
    if (!time) {
      return '从未更新'
    }
    return new Date(time).toLocaleString('zh-CN')
  }

  // 将更新频率转换为毫秒
  const getUpdateFreqMs = (updateFreq) => {
    const freqMap = {
      '15min': 15 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '3hour': 3 * 60 * 60 * 1000,
      '6hour': 6 * 60 * 60 * 1000,
      '12hour': 12 * 60 * 60 * 1000,
      'daily': 24 * 60 * 60 * 1000
    }
    return freqMap[updateFreq] || 15 * 60 * 1000 // 默认15分钟
  }

  // 注意：自动采集定时器已移至全局管理（useAutoCollection.js）
  // 前端组件不再需要管理单独的定时器

  // 更新数据库中的 lastUpdate 时间
  // 注意: 此功能已被禁用，因为后端更新接口已删除
  const updateLastUpdateInDatabase = async (dataID, lastUpdateTime) => {
    // 功能已禁用，不再调用后端更新接口
  }

  const handleSubmit = async () => {
    if (!inputForm.value.name || !inputForm.value.type) {
      ElMessage.error('请填写必要信息')
      return
    }

    // 独立数据源类型检查：每种类型只能存在一个
    if (independentDataSourceTypes.includes(inputForm.value.type)) {
      const existingSource = independentDataSources.value.find(
        source => source.type === inputForm.value.type
      )
      if (existingSource) {
        ElMessage.error(`${getSourceTypeLabel(inputForm.value.type)} 数据源已存在，每种独立数据源只能配置一个`)
        return
      }
    }

    // BUFF类型的字段校验 - 简化验证，只检查必要字段
    if (inputForm.value.type === 'buff') {
      if (!inputForm.value.cookie && !inputForm.value.buffAppVersion) {
        ElMessage.error('请先获取BUFF令牌或填写必要信息')
        return
      }
    }

    if (['steam', 'steam_login'].includes(inputForm.value.type)) {
      if (!inputForm.value.steamInventoryCookies && inputForm.value.cookies) {
        inputForm.value.steamInventoryCookies = inputForm.value.cookies
      }
      inputForm.value.cookies = inputForm.value.steamInventoryCookies || inputForm.value.cookies
    }

    // Steam类型的字段校验
    if (inputForm.value.type === 'steam') {
      // 检查Cookie（无论哪种方式都需要Cookie）
      if (!inputForm.value.cookies) {
        ElMessage.error('请先获取Cookie（扫码/账号密码登录）或手动输入Cookie')
        return
      }
      if (!inputForm.value.steamID) {
        ElMessage.error('请填写SteamID')
        return
      }
    }

    // Steam登录类型的字段校验
    if (inputForm.value.type === 'steam_login') {
      // 检查是否已完成登录
      if (!inputForm.value.cookies) {
        ElMessage.error('请先完成Steam登录（扫码或账号密码登录）')
        return
      }
      if (!inputForm.value.steamID) {
        ElMessage.error('请填写SteamID')
        return
      }
    }

    // 悠悠有品类型的字段校验
    if (inputForm.value.type === 'youpin') {
      if (!inputForm.value.phone) {
        ElMessage.error('请填写手机号')
        return
      }
      if (!inputForm.value.sessionid) {
        ElMessage.error('请填写Session ID')
        return
      }
      if (!inputForm.value.token) {
        ElMessage.error('请填写Token')
        return
      }
      if (!inputForm.value.deviceName) {
        ElMessage.error('请填写设备名称')
        return
      }
      if (!inputForm.value.appVersion) {
        ElMessage.error('请填写应用版本')
        return
      }
      if (!inputForm.value.appType) {
        ElMessage.error('请填写应用类型')
        return
      }
      if (!inputForm.value.userId) {
        ElMessage.error('请填写用户ID')
        return
      }
      if (!inputForm.value.steamId) {
        ElMessage.error('请填写SteamID')
        return
      }
      if (!inputForm.value.devicetoken) {
        ElMessage.error('请填写Device Token')
        return
      }
      if (!inputForm.value.deviceid) {
        ElMessage.error('请填写Device ID')
        return
      }
      if (!inputForm.value.deviceuk) {
        ElMessage.error('请填写Device UK')
        return
      }
      if (!inputForm.value.uk) {
        ElMessage.error('请填写UK')
        return
      }
      if (!inputForm.value.sk) {
        ElMessage.error('请填写SK')
        return
      }
      if (!inputForm.value.deviceInfo) {
        ElMessage.error('请填写Device Info')
        return
      }
    }

    // 完美世界APP类型的字段校验
    if (inputForm.value.type === 'perfectworld') {
      if (!inputForm.value.appversion) {
        ElMessage.error('请填写appversion')
        return
      }
      if (!inputForm.value.device) {
        ElMessage.error('请填写device')
        return
      }
      if (!inputForm.value.gameType) {
        ElMessage.error('请填写gameType')
        return
      }
      if (!inputForm.value.platform) {
        ElMessage.error('请填写platform')
        return
      }
      if (!inputForm.value.pwToken) {
        ElMessage.error('请填写token')
        return
      }
      if (!inputForm.value.tdSign) {
        ElMessage.error('请填写tdSign')
        return
      }
      if (!inputForm.value.pwSteamID) {
        ElMessage.error('请填写SteamID')
        return
      }
    }

    // CsFloat类型的字段校验
    if (inputForm.value.type === 'csfloat') {
      if (!inputForm.value.csfloatUserAgent) {
        ElMessage.error('请填写User-Agent')
        return
      }
      if (!inputForm.value.csfloatReferer) {
        ElMessage.error('请填写Referer')
        return
      }
      if (!inputForm.value.csfloatAccept) {
        ElMessage.error('请填写Accept')
        return
      }
      if (!inputForm.value.csfloatXAppVersion) {
        ElMessage.error('请填写X-App-Version')
        return
      }
      if (!inputForm.value.csfloatHost) {
        ElMessage.error('请填写Host')
        return
      }
      if (!inputForm.value.csfloatConnection) {
        ElMessage.error('请填写Connection')
        return
      }
      if (!inputForm.value.csfloatAcceptEncoding) {
        ElMessage.error('请填写Accept-Encoding')
        return
      }
      if (!inputForm.value.csfloatCookie) {
        ElMessage.error('请填写Cookie')
        return
      }
      if (!inputForm.value.csfloatSteamID) {
        ElMessage.error('请填写SteamID')
        return
      }
    }

    // CSQAQ类型的字段校验
    if (inputForm.value.type === 'csqaq') {
      if (!inputForm.value.csqaqApiToken) {
        ElMessage.error('请填写ApiToken')
        return
      }
    }

    // SteamDT类型的字段校验
    if (inputForm.value.type === 'steamdt') {
      if (!inputForm.value.steamdtApiKey) {
        ElMessage.error('请填写API_KEY')
        return
      }
      if (!inputForm.value.steamdtCallbackDomain) {
        ElMessage.error('请填写回调域名')
        return
      }
    }

    if (inputForm.value.type === 'c5game') {
      if (!inputForm.value.steamID) {
        ElMessage.error('请填写SteamID')
        return
      }
      if (!inputForm.value.c5gameAccessToken) {
        ElMessage.error('请填写访问令牌（x-access-token）')
        return
      }
      if (!inputForm.value.c5gameUserAgent) {
        ElMessage.error('请填写 User Agent')
        return
      }
      if (inputForm.value.c5gameAutoLogin) {
        if (!inputForm.value.c5gameAutoLoginUsername) {
          ElMessage.error('请填写 C5 自动登录用户名')
          return
        }
        if (!inputForm.value.c5gameAutoLoginPassword) {
          ElMessage.error('请填写 C5 自动登录密码')
          return
        }
      }
    }

    submitting.value = true
    try {
      // 获取当前时间作为创建时间
      const now = new Date().toISOString()
      
      let requestData = {
        dataName: inputForm.value.name,
        type: inputForm.value.type,
        enabled: inputForm.value.enabled
      }

      // 根据数据源类型构建配置JSON字符串
      if (inputForm.value.type === 'youpin') {
        // 悠悠有品特殊配置
        requestData.configJson = JSON.stringify({
          phone: inputForm.value.phone,
          Sessionid: inputForm.value.sessionid,
          token: inputForm.value.token,
          DeviceName: inputForm.value.deviceName,
          app_version: inputForm.value.appVersion,
          sleep_time: inputForm.value.sleepTime.toString(),
          app_type: inputForm.value.appType,
          userId: inputForm.value.userId,
          steamId: inputForm.value.steamId,
          devicetoken: inputForm.value.devicetoken,
          deviceid: inputForm.value.deviceid,
          deviceuk: inputForm.value.deviceuk,
          uk: inputForm.value.uk,
          sk: inputForm.value.sk,
          device_info: inputForm.value.deviceInfo
        })
      } else if (inputForm.value.type === 'perfectworld') {
        // 完美世界APP特殊配置
        requestData.configJson = JSON.stringify({
          appversion: inputForm.value.appversion,
          device: inputForm.value.device,
          gameType: inputForm.value.gameType,
          platform: inputForm.value.platform,
          token: inputForm.value.pwToken,
          tdSign: inputForm.value.tdSign,
          steamID: inputForm.value.pwSteamID,
          sleep_time: '6000'
        })
      } else if (inputForm.value.type === 'buff') {
        // BUFF特殊配置
        requestData.configJson = JSON.stringify({
          app_version: inputForm.value.buffAppVersion,
          app_version_code: inputForm.value.buffAppVersionCode,
          brand: inputForm.value.buffBrand,
          build_fingerprint: inputForm.value.buffBuildFingerprint,
          channel: inputForm.value.buffChannel,
          device_id: inputForm.value.buffDeviceId,
          device_id_weak: inputForm.value.buffDeviceIdWeak,
          manufacturer: inputForm.value.buffManufacturer,
          model: inputForm.value.buffModel,
          network: inputForm.value.buffNetwork,
          product: inputForm.value.buffProduct,
          resolution: inputForm.value.buffResolution,
          rom: inputForm.value.buffRom,
          rom_id: inputForm.value.buffRomId,
          screen_density: inputForm.value.buffScreenDensity,
          screen_size: inputForm.value.buffScreenSize,
          seed: inputForm.value.buffSeed,
          system_type: inputForm.value.buffSystemType,
          system_version: inputForm.value.buffSystemVersion,
          timestamp: inputForm.value.buffTimestamp,
          timezone: inputForm.value.buffTimezone,
          timezone_offset: inputForm.value.buffTimezoneOffset,
          timezone_offset_dst: inputForm.value.buffTimezoneOffsetDst,
          user_agent: inputForm.value.buffUserAgent,
          locale: inputForm.value.buffLocale,
          locale_supported: inputForm.value.buffLocaleSupported,
          devicename: inputForm.value.buffDevicename,
          cookie: inputForm.value.cookie,
          steamID: inputForm.value.steamID,
          sleep_time: '6000'
        })
      } else if (inputForm.value.type === 'steam') {
        // Steam特殊配置（支持三种Cookie获取方式）
        const baseCookies = inputForm.value.steamBaseCookies || inputForm.value.cookies || ''
        const inventoryCookies = inputForm.value.steamInventoryCookies || inputForm.value.cookies || ''
        requestData.configJson = JSON.stringify({
          baseCookies,
          inventoryCookies,
          cookies: inventoryCookies,
          steamID: inputForm.value.steamID,
          steamCookieMethod: inputForm.value.steamCookieMethod, // 记录获取方式
          steamUsername: inputForm.value.steamUsername || '',
          steamPassword: inputForm.value.steamPassword || '',
          sleep_time: '6000'
        })
      } else if (inputForm.value.type === 'steam_login') {
        // Steam登录特殊配置
        const baseCookies = inputForm.value.steamBaseCookies || inputForm.value.cookies || ''
        const inventoryCookies = inputForm.value.steamInventoryCookies || inputForm.value.cookies || ''
        requestData.configJson = JSON.stringify({
          baseCookies,
          inventoryCookies,
          cookies: inventoryCookies,
          steamID: inputForm.value.steamID,
          steamUsername: inputForm.value.steamUsername,
          steamPassword: inputForm.value.steamPassword,
          sleep_time: '6000'
        })
      } else if (inputForm.value.type === 'csfloat') {
        // CsFloat特殊配置
        requestData.configJson = JSON.stringify({
          'User-Agent': inputForm.value.csfloatUserAgent,
          'Referer': inputForm.value.csfloatReferer,
          'Accept': inputForm.value.csfloatAccept,
          'X-App-Version': inputForm.value.csfloatXAppVersion,
          'Host': inputForm.value.csfloatHost,
          'Connection': inputForm.value.csfloatConnection,
          'Accept-Encoding': inputForm.value.csfloatAcceptEncoding,
          'Cookie': inputForm.value.csfloatCookie,
          steamID: inputForm.value.csfloatSteamID,
          sleep_time: '6000'
        })
      } else if (inputForm.value.type === 'c5game') {
        requestData.configJson = JSON.stringify({
          steamID: inputForm.value.steamID,
          user_agent: inputForm.value.c5gameUserAgent,
          accept_encoding: inputForm.value.c5gameAcceptEncoding,
          x_device_os: inputForm.value.c5gameDeviceOs,
          content_type: inputForm.value.c5gameContentType,
          x_source: inputForm.value.c5gameSource,
          x_device_model: inputForm.value.c5gameDeviceModel,
          rdi: inputForm.value.c5gameRdi,
          accept_language: inputForm.value.c5gameAcceptLanguage,
          x_ua: inputForm.value.c5gameXUa,
          x_start_req_time: inputForm.value.c5gameStartReqTime,
          x_device_id: inputForm.value.c5gameDeviceId,
          x_access_token: inputForm.value.c5gameAccessToken,
          x_app_channel: inputForm.value.c5gameAppChannel,
          x_app_version_code: inputForm.value.c5gameAppVersionCode,
          x_sign: inputForm.value.c5gameSign,
          auto_login: inputForm.value.c5gameAutoLogin,
          auto_login_username: inputForm.value.c5gameAutoLoginUsername,
          auto_login_password: inputForm.value.c5gameAutoLoginPassword,
          sleep_time: '6000'
        })
      } else if (inputForm.value.type === 'csqaq') {
        // CSQAQ特殊配置
        requestData.configJson = JSON.stringify({
          ApiToken: inputForm.value.csqaqApiToken
        })
      } else if (inputForm.value.type === 'steamdt') {
        // SteamDT特殊配置
        requestData.configJson = JSON.stringify({
          API_KEY: inputForm.value.steamdtApiKey,
          CallbackDomain: inputForm.value.steamdtCallbackDomain
        })
      } else {
        requestData.configJson = JSON.stringify({
          apiUrl: inputForm.value.apiUrl,
          apiKey: inputForm.value.apiKey,
          sleep_time: (inputForm.value.sleepTime?.toString?.() || '6000')
        })
      }

      let response
      if (editingSourceId.value) {
        const url = apiUrls.dataSourceUpdate(editingSourceId.value)
        response = await axios.put(url, requestData)
      } else {
        const url = apiUrls.dataSourceCreate()
        response = await axios.post(url, requestData)
      }

      const result = response.data
      
      if (result.success) {
        const action = editingSourceId.value ? '更新' : '添加'
        ElMessage.success(`数据源${action}成功`)
        resetForm()
        editingSourceId.value = null
        addDialogVisible.value = false // 关闭添加对话框
        loadDataSources()
      } else {
        const action = editingSourceId.value ? '更新' : '添加'
        ElMessage.error(result.message || `${action}数据源失败`)
      }
    } catch (error) {
      let errorMessage = '操作失败'
      
      if (error.response) {
        // 服务器返回了错误响应
        errorMessage = error.response.data?.message || `服务器错误 (${error.response.status})`
      } else if (error.request) {
        // 请求发送了但没有收到响应
        errorMessage = '网络连接失败，请检查API服务器是否运行'
      } else {
        // 其他错误
        errorMessage = error.message || '未知错误'
      }
      
      ElMessage.error(errorMessage)
    } finally {
      submitting.value = false
    }
  }

  // ===== BUFF Token 获取相关函数 =====
  const startBuffTokenCollection = async (isEdit = false) => {
    try {
      buffTokenLoading.value = true
      buffTokenStatus.value = 'waiting'
      
      const url = apiUrls.getAppTokenStartBuff()
      const response = await axios.post(url)
      
      if (response.data.code === 200) {
        // 保存代理地址
        if (response.data.data && response.data.data.proxy_address) {
          proxyAddress.value = response.data.data.proxy_address
        }
        ElMessage.success('BUFF 代理服务器已启动，请在手机上配置代理')
        if (proxyAddress.value) {
          ElMessage.info({
            message: `代理地址: ${proxyAddress.value}`,
            duration: 5000
          })
        }
        
        // 开始轮询获取数据
        startBuffTokenPolling(isEdit)
      } else {
        ElMessage.error(response.data.msg || '启动BUFF代理失败')
        buffTokenLoading.value = false
        buffTokenStatus.value = 'failed'
      }
    } catch (error) {
      ElMessage.error('启动BUFF代理失败: ' + (error.message || '网络错误'))
      buffTokenLoading.value = false
      buffTokenStatus.value = 'failed'
    }
  }

  const startBuffTokenPolling = (isEdit = false) => {
    // 清除旧的定时器
    if (tokenCheckTimer.value) {
      clearInterval(tokenCheckTimer.value)
    }
    
    // 每3秒检查一次数据是否收集完成
    tokenCheckTimer.value = setInterval(async () => {
      try {
        const url = apiUrls.getAppTokenGetBuffData()
        const response = await axios.get(url)

        if (response.data.code === 200) {
          // 数据收集完成
          const data = response.data.data
          
          // 填充表单
          if (isEdit) {
            editForm.value.buffAppVersion = data.app_version || editForm.value.buffAppVersion
            editForm.value.buffAppVersionCode = data.app_version_code || editForm.value.buffAppVersionCode
            editForm.value.buffBrand = data.brand || editForm.value.buffBrand
            editForm.value.buffBuildFingerprint = data.build_fingerprint || editForm.value.buffBuildFingerprint
            editForm.value.buffChannel = data.channel || editForm.value.buffChannel
            editForm.value.buffDeviceId = data.device_id || editForm.value.buffDeviceId
            editForm.value.buffDeviceIdWeak = data.device_id_weak || editForm.value.buffDeviceIdWeak
            editForm.value.buffManufacturer = data.manufacturer || editForm.value.buffManufacturer
            editForm.value.buffModel = data.model || editForm.value.buffModel
            editForm.value.buffNetwork = data.network || editForm.value.buffNetwork
            editForm.value.buffProduct = data.product || editForm.value.buffProduct
            editForm.value.buffResolution = data.resolution || editForm.value.buffResolution
            editForm.value.buffRom = data.rom || editForm.value.buffRom
            editForm.value.buffRomId = data.rom_id || editForm.value.buffRomId
            editForm.value.buffScreenDensity = data.screen_density || editForm.value.buffScreenDensity
            editForm.value.buffScreenSize = data.screen_size || editForm.value.buffScreenSize
            editForm.value.buffSeed = data.seed || editForm.value.buffSeed
            editForm.value.buffSystemType = data.system_type || editForm.value.buffSystemType
            editForm.value.buffSystemVersion = data.system_version || editForm.value.buffSystemVersion
            editForm.value.buffTimestamp = data.timestamp || editForm.value.buffTimestamp
            editForm.value.buffTimezone = data.timezone || editForm.value.buffTimezone
            editForm.value.buffTimezoneOffset = data.timezone_offset || editForm.value.buffTimezoneOffset
            editForm.value.buffTimezoneOffsetDst = data.timezone_offset_dst || editForm.value.buffTimezoneOffsetDst
            editForm.value.buffUserAgent = data.user_agent || editForm.value.buffUserAgent
            editForm.value.buffLocale = data.locale || editForm.value.buffLocale
            editForm.value.buffLocaleSupported = data.locale_supported || editForm.value.buffLocaleSupported
            editForm.value.buffDevicename = data.devicename || editForm.value.buffDevicename
            editForm.value.cookie = data.cookie || editForm.value.cookie
            editForm.value.steamID = data.steamid || editForm.value.steamID
          } else {
            inputForm.value.buffAppVersion = data.app_version || inputForm.value.buffAppVersion
            inputForm.value.buffAppVersionCode = data.app_version_code || inputForm.value.buffAppVersionCode
            inputForm.value.buffBrand = data.brand || inputForm.value.buffBrand
            inputForm.value.buffBuildFingerprint = data.build_fingerprint || inputForm.value.buffBuildFingerprint
            inputForm.value.buffChannel = data.channel || inputForm.value.buffChannel
            inputForm.value.buffDeviceId = data.device_id || inputForm.value.buffDeviceId
            inputForm.value.buffDeviceIdWeak = data.device_id_weak || inputForm.value.buffDeviceIdWeak
            inputForm.value.buffManufacturer = data.manufacturer || inputForm.value.buffManufacturer
            inputForm.value.buffModel = data.model || inputForm.value.buffModel
            inputForm.value.buffNetwork = data.network || inputForm.value.buffNetwork
            inputForm.value.buffProduct = data.product || inputForm.value.buffProduct
            inputForm.value.buffResolution = data.resolution || inputForm.value.buffResolution
            inputForm.value.buffRom = data.rom || inputForm.value.buffRom
            inputForm.value.buffRomId = data.rom_id || inputForm.value.buffRomId
            inputForm.value.buffScreenDensity = data.screen_density || inputForm.value.buffScreenDensity
            inputForm.value.buffScreenSize = data.screen_size || inputForm.value.buffScreenSize
            inputForm.value.buffSeed = data.seed || inputForm.value.buffSeed
            inputForm.value.buffSystemType = data.system_type || inputForm.value.buffSystemType
            inputForm.value.buffSystemVersion = data.system_version || inputForm.value.buffSystemVersion
            inputForm.value.buffTimestamp = data.timestamp || inputForm.value.buffTimestamp
            inputForm.value.buffTimezone = data.timezone || inputForm.value.buffTimezone
            inputForm.value.buffTimezoneOffset = data.timezone_offset || inputForm.value.buffTimezoneOffset
            inputForm.value.buffTimezoneOffsetDst = data.timezone_offset_dst || inputForm.value.buffTimezoneOffsetDst
            inputForm.value.buffUserAgent = data.user_agent || inputForm.value.buffUserAgent
            inputForm.value.buffLocale = data.locale || inputForm.value.buffLocale
            inputForm.value.buffLocaleSupported = data.locale_supported || inputForm.value.buffLocaleSupported
            inputForm.value.buffDevicename = data.devicename || inputForm.value.buffDevicename
            inputForm.value.cookie = data.cookie || inputForm.value.cookie
            inputForm.value.steamID = data.steamid || inputForm.value.steamID
          }
          
          ElMessage.success('BUFF Token 获取成功!')
          buffTokenStatus.value = 'success'
          buffTokenLoading.value = false
          
          // 停止轮询
          if (tokenCheckTimer.value) {
            clearInterval(tokenCheckTimer.value)
            tokenCheckTimer.value = null
          }
          
          // 自动保存后回调关闭代理服务器
          ElMessage.info('正在自动保存数据源配置...')
          setTimeout(async () => {
            if (isEdit) {
              await handleEditSubmit()
            } else {
              await handleSubmit()
            }
            await stopBuffTokenCollection()
          }, 1000)
        } else if (response.data.code === 202) {
          // 数据正在收集中
        }
      } catch (error) {
        // 获取BUFF数据失败时仅在界面上提示或静默处理
      }
    }, 3000)
  }

  const stopBuffTokenCollection = async () => {
    try {
      const url = apiUrls.getAppTokenStopBuff()
      await axios.post(url)
    } catch (error) {
      // 停止BUFF代理失败时静默处理
    }
  }

  // ===== 悠悠有品 Token 获取相关函数 =====
  const startYyypTokenCollection = async (isEdit = false) => {
    try {
      yyypTokenLoading.value = true
      yyypTokenStatus.value = 'waiting'

      // 启动前先清除服务端上一个账号残留的缓存数据，避免多账号更新时读到旧账号数据
      try {
        await axios.post(apiUrls.getAppTokenClearYyypData())
      } catch (clearError) {
        console.warn('清除悠悠有品缓存失败（忽略，继续启动）:', clearError)
      }

      const url = apiUrls.getAppTokenStartYyyp()
      const response = await axios.post(url)
      
      if (response.data.code === 200) {
        // 保存代理地址
        if (response.data.data && response.data.data.proxy_address) {
          proxyAddress.value = response.data.data.proxy_address
        }
        ElMessage.success('悠悠有品代理服务器已启动，请在手机上配置代理')
        if (proxyAddress.value) {
          ElMessage.info({
            message: `代理地址: ${proxyAddress.value}`,
            duration: 5000
          })
        }
        
        // 开始轮询获取数据
        startYyypTokenPolling(isEdit)
      } else {
        ElMessage.error(response.data.msg || '启动悠悠有品代理失败')
        yyypTokenLoading.value = false
        yyypTokenStatus.value = 'failed'
      }
    } catch (error) {
      console.error('启动悠悠有品代理失败:', error)
      ElMessage.error('启动悠悠有品代理失败: ' + (error.message || '网络错误'))
      yyypTokenLoading.value = false
      yyypTokenStatus.value = 'failed'
    }
  }

  const startYyypTokenPolling = (isEdit = false) => {
    // 清除旧的定时器
    if (tokenCheckTimer.value) {
      clearInterval(tokenCheckTimer.value)
    }
    
    // 每3秒检查一次数据是否收集完成
    tokenCheckTimer.value = setInterval(async () => {
      try {
        const url = apiUrls.getAppTokenGetYyypData()
        const response = await axios.get(url)
        
        if (response.data.code === 200) {
          // 数据收集完成
          const data = response.data.data
          
          // 填充表单
          if (isEdit) {
            editForm.value.sessionid = data.Sessionid
            editForm.value.token = data.authorization
            editForm.value.deviceName = `${data.device_manu} ${data.device_model}`
            editForm.value.appVersion = data.app_version
            editForm.value.appType = data.apptype
            editForm.value.userId = data.userId
            editForm.value.steamId = data.steamId
            // 新增字段
            editForm.value.devicetoken = data.devicetoken
            editForm.value.deviceid = data.deviceid
            editForm.value.deviceuk = data.deviceuk
            editForm.value.uk = data.uk
            editForm.value.sk = data.sk
            editForm.value.deviceInfo = data.device_info
          } else {
            inputForm.value.sessionid = data.Sessionid
            inputForm.value.token = data.authorization
            inputForm.value.deviceName = `${data.device_manu} ${data.device_model}`
            inputForm.value.appVersion = data.app_version
            inputForm.value.appType = data.apptype
            inputForm.value.userId = data.userId
            inputForm.value.steamId = data.steamId
            // 新增字段
            inputForm.value.devicetoken = data.devicetoken
            inputForm.value.deviceid = data.deviceid
            inputForm.value.deviceuk = data.deviceuk
            inputForm.value.uk = data.uk
            inputForm.value.sk = data.sk
            inputForm.value.deviceInfo = data.device_info
          }
          
          ElMessage.success('悠悠有品 Token 获取成功!')
          yyypTokenStatus.value = 'success'
          yyypTokenLoading.value = false
          
          // 停止轮询
          if (tokenCheckTimer.value) {
            clearInterval(tokenCheckTimer.value)
            tokenCheckTimer.value = null
          }
          
          // 自动保存后回调关闭代理服务器
          ElMessage.info('正在自动保存数据源配置...')
          setTimeout(async () => {
            if (isEdit) {
              await handleEditSubmit()
            } else {
              await handleSubmit()
            }
            await stopYyypTokenCollection()
          }, 1000)
        } else if (response.data.code === 202) {
          // 数据正在收集中
          console.log('悠悠有品 Token 收集中...')
        }
      } catch (error) {
        console.error('获取悠悠有品数据失败:', error)
      }
    }, 3000)
  }

  const stopYyypTokenCollection = async () => {
    try {
      const url = apiUrls.getAppTokenStopYyyp()
      await axios.post(url)
    } catch (error) {
      console.error('停止悠悠有品代理失败:', error)
    }
  }

  // 完美世界APP令牌获取相关函数
  const startPerfectWorldTokenCollection = async (isEdit) => {
    try {
      perfectWorldTokenLoading.value = true
      perfectWorldTokenStatus.value = ''
      
      const url = apiUrls.getAppTokenStartPerfectWorld()
      const response = await axios.post(url)
      
      if (response.data.code === 200) {
        // 保存代理地址
        if (response.data.data && response.data.data.proxy_address) {
          proxyAddress.value = response.data.data.proxy_address
        }
        perfectWorldTokenStatus.value = 'waiting'
        ElMessage.success('完美世界APP代理已启动,请在手机上配置代理并登录APP')
        if (proxyAddress.value) {
          ElMessage.info({
            message: `代理地址: ${proxyAddress.value}`,
            duration: 5000
          })
        }
        // 开始轮询检查是否获取到数据
        startPerfectWorldTokenPolling(isEdit)
      } else {
        ElMessage.error(response.data.msg || '启动完美世界APP代理失败')
        perfectWorldTokenLoading.value = false
      }
    } catch (error) {
      console.error('启动完美世界APP代理失败:', error)
      ElMessage.error('启动完美世界APP代理失败')
      perfectWorldTokenLoading.value = false
    }
  }

  const startPerfectWorldTokenPolling = (isEdit) => {
    tokenCheckTimer.value = setInterval(async () => {
      try {
        const url = apiUrls.getAppTokenGetPerfectWorldData()
        const response = await axios.get(url)
        
        if (response.data.code === 200 && response.data.data) {
          // 获取到数据,停止轮询
          clearInterval(tokenCheckTimer.value)
          perfectWorldTokenLoading.value = false
          perfectWorldTokenStatus.value = 'success'
          ElMessage.success('完美世界APP令牌获取成功!')
          
          // 填充表单
          const data = response.data.data
          if (isEdit) {
            editForm.value.platform = data.platform || editForm.value.platform
            editForm.value.device = data.device || editForm.value.device
            editForm.value.appversion = data.appVersion || editForm.value.appversion
            editForm.value.pwToken = data.token || editForm.value.pwToken
            editForm.value.gameType = data.gameTypeStr || editForm.value.gameType
            editForm.value.tdSign = data.tdSign || editForm.value.tdSign
            editForm.value.pwSteamID = data.steamId || editForm.value.pwSteamID
          } else {
            inputForm.value.platform = data.platform || inputForm.value.platform
            inputForm.value.device = data.device || inputForm.value.device
            inputForm.value.appversion = data.appVersion || inputForm.value.appversion
            inputForm.value.pwToken = data.token || inputForm.value.pwToken
            inputForm.value.gameType = data.gameTypeStr || inputForm.value.gameType
            inputForm.value.tdSign = data.tdSign || inputForm.value.tdSign
            inputForm.value.pwSteamID = data.steamId || inputForm.value.pwSteamID
          }
          
          // 自动保存后回调关闭代理服务器
          ElMessage.info('正在自动保存数据源配置...')
          setTimeout(async () => {
            if (isEdit) {
              await handleEditSubmit()
            } else {
              await handleSubmit()
            }
            await stopPerfectWorldTokenCollection()
          }, 1000)
        } else if (response.data.code === 202) {
          // 数据正在收集中
          console.log('完美世界APP Token 收集中...')
        }
      } catch (error) {
        console.error('获取完美世界APP数据失败:', error)
      }
    }, 3000)
  }

  const stopPerfectWorldTokenCollection = async () => {
    try {
      const url = apiUrls.getAppTokenStopPerfectWorld()
      await axios.post(url)
    } catch (error) {
      console.error('停止完美世界APP代理失败:', error)
    }
  }

  // ===== CsFloat Token 获取相关函数 =====
  const startCsfloatTokenCollection = async (isEdit = false) => {
    try {
      csfloatTokenLoading.value = true
      csfloatTokenStatus.value = 'waiting'
      
      const url = apiUrls.getAppTokenStartCsfloat()
      const response = await axios.post(url)
      
      if (response.data.code === 200) {
        // 保存代理地址
        if (response.data.data && response.data.data.proxy_address) {
          proxyAddress.value = response.data.data.proxy_address
        }
        ElMessage.success('CsFloat 代理服务器已启动，请在浏览器中配置代理')
        if (proxyAddress.value) {
          ElMessage.info({
            message: `代理地址: ${proxyAddress.value}`,
            duration: 5000
          })
        }
        
        // 开始轮询获取数据
        startCsfloatTokenPolling(isEdit)
      } else {
        ElMessage.error(response.data.msg || '启动CsFloat代理失败')
        csfloatTokenLoading.value = false
        csfloatTokenStatus.value = 'failed'
      }
    } catch (error) {
      console.error('启动CsFloat代理失败:', error)
      ElMessage.error('启动CsFloat代理失败: ' + (error.message || '网络错误'))
      csfloatTokenLoading.value = false
      csfloatTokenStatus.value = 'failed'
    }
  }

  const startCsfloatTokenPolling = (isEdit = false) => {
    // 清除旧的定时器
    if (tokenCheckTimer.value) {
      clearInterval(tokenCheckTimer.value)
    }
    
    // 每3秒检查一次数据是否收集完成
    tokenCheckTimer.value = setInterval(async () => {
      try {
        const url = apiUrls.getAppTokenGetCsfloatData()
        const response = await axios.get(url)
        
        console.log('[CsFloat轮询] API响应:', response.data)
        console.log('[CsFloat轮询] code:', response.data.code)
        console.log('[CsFloat轮询] data:', response.data.data)
        
        if (response.data.code === 200) {
          // 数据收集完成
          const data = response.data.data
          
          // 填充表单
          if (isEdit) {
            editForm.value.csfloatUserAgent = data['User-Agent'] || editForm.value.csfloatUserAgent
            editForm.value.csfloatReferer = data['Referer'] || editForm.value.csfloatReferer
            editForm.value.csfloatAccept = data['Accept'] || editForm.value.csfloatAccept
            editForm.value.csfloatXAppVersion = data['X-App-Version'] || editForm.value.csfloatXAppVersion
            editForm.value.csfloatHost = data['Host'] || editForm.value.csfloatHost
            editForm.value.csfloatConnection = data['Connection'] || editForm.value.csfloatConnection
            editForm.value.csfloatAcceptEncoding = data['Accept-Encoding'] || editForm.value.csfloatAcceptEncoding
            editForm.value.csfloatCookie = data['Cookie'] || editForm.value.csfloatCookie
            editForm.value.csfloatSteamID = data['steamID'] || editForm.value.csfloatSteamID
          } else {
            inputForm.value.csfloatUserAgent = data['User-Agent'] || inputForm.value.csfloatUserAgent
            inputForm.value.csfloatReferer = data['Referer'] || inputForm.value.csfloatReferer
            inputForm.value.csfloatAccept = data['Accept'] || inputForm.value.csfloatAccept
            inputForm.value.csfloatXAppVersion = data['X-App-Version'] || inputForm.value.csfloatXAppVersion
            inputForm.value.csfloatHost = data['Host'] || inputForm.value.csfloatHost
            inputForm.value.csfloatConnection = data['Connection'] || inputForm.value.csfloatConnection
            inputForm.value.csfloatAcceptEncoding = data['Accept-Encoding'] || inputForm.value.csfloatAcceptEncoding
            inputForm.value.csfloatCookie = data['Cookie'] || inputForm.value.csfloatCookie
            inputForm.value.csfloatSteamID = data['steamID'] || inputForm.value.csfloatSteamID
          }
          
          ElMessage.success('CsFloat Token 获取成功!')
          csfloatTokenStatus.value = 'success'
          csfloatTokenLoading.value = false
          
          // 停止轮询
          if (tokenCheckTimer.value) {
            clearInterval(tokenCheckTimer.value)
            tokenCheckTimer.value = null
          }
          
          // 自动保存后回调关闭代理服务器
          ElMessage.info('正在自动保存数据源配置...')
          setTimeout(async () => {
            if (isEdit) {
              await handleEditSubmit()
            } else {
              await handleSubmit()
            }
            await stopCsfloatTokenCollection()
          }, 1000)
        } else if (response.data.code === 202) {
          // 数据正在收集中
          console.log('CsFloat Token 收集中...')
        }
      } catch (error) {
        console.error('获取CsFloat数据失败:', error)
      }
    }, 3000)
  }

  const stopCsfloatTokenCollection = async () => {
    try {
      const url = apiUrls.getAppTokenStopCsfloat()
      await axios.post(url)
    } catch (error) {
      console.error('停止CsFloat代理失败:', error)
    }
  }

  const resetForm = () => {
    inputForm.value = {
      name: '',
      type: '',
      apiUrl: '',
      apiKey: '',
      enabled: false,
      // 悠悠有品特有字段
      phone: '',
      sessionid: '',
      token: '',
      deviceName: '',
      appVersion: '',
      sleepTime: 6000,
      appType: '',
      userId: '',
      steamId: '',
      devicetoken: '',
      deviceid: '',
      deviceuk: '',
      uk: '',
      sk: '',
      deviceInfo: '',
      // BUFF特有字段
      cookie: '',
      systemVersion: '',
      systemType: '',
      steamID: '',
      // Steam特有字段
      cookies: '',
      steamBaseCookies: '',
      steamInventoryCookies: '',
      // Steam登录特有字段
      steamUsername: '',
      steamPassword: '',
      steamTwofactorCode: '',
      steamLoginMessage: '',
      steamLoginSuccess: false,
      // 完美世界APP特有字段
      appversion: '',
      device: '',
      gameType: '',
      platform: '',
      pwToken: '',
      tdSign: '',
      pwSteamID: '',
      // CsFloat特有字段
      csfloatUserAgent: '',
      csfloatReferer: '',
      csfloatAccept: '',
      csfloatXAppVersion: '',
      csfloatHost: '',
      csfloatConnection: '',
      csfloatAcceptEncoding: '',
      csfloatCookie: '',
      csfloatSteamID: '',
      // C5 GAME 特有字段
      c5gameAccessToken: '',
      c5gameDeviceId: '',
      c5gameDeviceModel: '',
      c5gameDeviceOs: '',
      c5gameUserAgent: '',
      c5gameAppVersionCode: '',
      c5gameAppChannel: '',
      c5gameSource: '',
      c5gameSign: '',
      c5gameRdi: '',
      c5gameAcceptLanguage: '',
      c5gameXUa: '',
      c5gameStartReqTime: '',
      c5gameContentType: '',
      c5gameAcceptEncoding: '',
      // CSQAQ特有字段
      csqaqApiToken: '',
      // SteamDT特有字段
      steamdtApiKey: '',
      steamdtCallbackDomain: ''
    }
    editingSourceId.value = null
  }

  const testConnection = async () => {
    if (!inputForm.value.apiUrl) {
      ElMessage.error('请输入API地址')
      return
    }

    testing.value = true
    try {
      const response = await axios.post(apiUrls.dataSourceTest(), {
        type: inputForm.value.type,
        apiUrl: inputForm.value.apiUrl,
        apiKey: inputForm.value.apiKey
      })

      const result = response.data
      
      if (result.success) {
        ElMessage.success('连接测试成功')
      } else {
        ElMessage.error(result.message || '连接测试失败')
      }
    } catch (error) {
      console.error('连接测试失败:', error)
      let errorMessage = '连接测试失败'
      
      if (error.response) {
        errorMessage = error.response.data?.message || `测试失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到API服务器'
      } else {
        errorMessage = error.message || '测试失败'
      }
      
      ElMessage.error(errorMessage)
    } finally {
      testing.value = false
    }
  }

  const testSourceConnection = async (source) => {
    ElMessage.info(`正在测试 ${source.dataName} 连接...`)
    
    try {
      const response = await axios.post(apiUrls.dataSourceTest(), {
        type: source.type,
        apiUrl: source.apiUrl,
        apiKey: '' // 不发送实际的API密钥
      })

      const result = response.data
      
      if (result.success) {
        ElMessage.success(`${source.dataName} 连接正常`)
      } else {
        ElMessage.error(`${source.dataName} 连接失败: ${result.message}`)
      }
    } catch (error) {
      console.error('测试数据源连接失败:', error)
      let errorMessage = `${source.dataName} 连接测试失败`
      
      if (error.response) {
        errorMessage = error.response.data?.message || `测试失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到API服务器'
      } else {
        errorMessage = error.message || '测试失败'
      }
      
      ElMessage.error(errorMessage)
    }
  }

  // 悠悠有品专用爬虫采集函数
  const startYoupinSpiderCollection = async (source) => {
    if (!source.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    if (collectingSourceIds.value.has(source.dataID)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    try {
      // 添加到采集中的列表
      startCollecting(source.dataID)
      
      ElMessage.info(`开始使用爬虫采集悠悠有品数据: ${source.dataName}`)
      
      // 准备发送给爬虫的数据 - newData接口只需要steamId，后端会根据steamId获取完整配置
      const spiderData = {
        steamId: source.config?.yyyp_steamId || source.steamID || ''
      }
      
      console.log('发送给悠悠有品爬虫的数据:', spiderData)

      // 调用爬虫API
      const response = await axios.post(apiUrls.youpinSyncNewData(), spiderData)

      // 后端成功返回 200 状态码和 "获取完成" 消息
      if (response.status === 200) {
        ElMessage.success(`${source.dataName} 悠悠有品爬虫采集完成！`)
        console.log('悠悠有品爬虫采集响应:', response.data)
        
        // 更新数据源的最后更新时间
        const now = new Date()
        source.lastUpdate = now
        
        // 更新数据库中的 lastUpdate
        await updateLastUpdateInDatabase(source.dataID, now.toISOString())
      } else {
        ElMessage.error(`悠悠有品爬虫采集失败: ${response.data}`)
      }
    } catch (error) {
      console.error('悠悠有品爬虫采集失败:', error)
      let errorMessage = `悠悠有品爬虫采集 ${source.dataName} 失败`
      
      if (error.response) {
        errorMessage = error.response.data?.message || `悠悠有品爬虫采集失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到悠悠有品爬虫服务器'
      } else {
        errorMessage = error.message || '悠悠有品爬虫采集失败'
      }
      
      ElMessage.error(errorMessage)
    } finally {
      // 从采集中的列表移除
      stopCollecting(source.dataID)
    }
  }

  // BUFF专用爬虫采集函数
  const startBuffSpiderCollection = async (source) => {
    if (!source.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    if (collectingSourceIds.value.has(source.dataID)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    try {
      // 添加到采集中的列表
      startCollecting(source.dataID)
      
      ElMessage.info(`开始使用爬虫采集BUFF数据: ${source.dataName}`)

      // 准备发送给爬虫的数据 - 只需要发送steamID即可
      // 后端会根据steamID自动从数据库获取完整配置
      const spiderData = {
        steamID: source.steamID || ''
      }
      
      console.log('发送给BUFF爬虫的数据:', spiderData)
      
      // 调用爬虫API
      const response = await axios.post(apiUrls.buffSyncNewData(), spiderData)

      // 后端成功返回 200 状态码和 "获取完成" 消息
      if (response.status === 200) {
        ElMessage.success(`${source.dataName} BUFF爬虫采集完成！`)
        console.log('BUFF爬虫采集响应:', response.data)
        
        // 更新数据源的最后更新时间
        const now = new Date()
        source.lastUpdate = now
        
        // 更新数据库中的 lastUpdate
        await updateLastUpdateInDatabase(source.dataID, now.toISOString())
      } else {
        ElMessage.error(`BUFF爬虫采集失败: ${response.data}`)
      }
    } catch (error) {
      console.error('BUFF爬虫采集失败:', error)
      let errorMessage = `BUFF爬虫采集 ${source.dataName} 失败`
      
      if (error.response) {
        errorMessage = error.response.data?.message || `BUFF爬虫采集失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到BUFF爬虫服务器'
      } else {
        errorMessage = error.message || 'BUFF爬虫采集失败'
      }
      
      ElMessage.error(errorMessage)
    } finally {
      // 从采集中的列表移除
      stopCollecting(source.dataID)
    }
  }

  // CsFloat 专用爬虫采集函数
  const startCsfloatSpiderCollection = async (source) => {
    if (!source.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    if (collectingSourceIds.value.has(source.dataID)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    const steamId =
      source.steamID ||
      source.config?.steamID ||
      source.config?.steamId ||
      source.config?.steam_id ||
      ''

    if (!steamId) {
      ElMessage.error('请先在数据源配置中填写 SteamID')
      return
    }

    try {
      startCollecting(source.dataID)

      ElMessage.info(`开始采集CsFloat数据: ${source.dataName}`)

      const spiderData = { steamId }
      console.log('发送给CsFloat爬虫的数据:', spiderData)

      const response = await axios.post(apiUrls.csfloatSyncNewData(), spiderData)

      if (response.status === 200) {
        const result = response.data || {}
        if (result.success === false) {
          ElMessage.error(result.message || 'CsFloat采集失败')
        } else {
          const message = result.message || 'CsFloat采集完成'
          const buyNew = result.data?.buy_new ?? '0'
          const sellNew = result.data?.sell_new ?? '0'
          ElMessage.success(`${source.dataName} - ${message} (买:${buyNew} / 卖:${sellNew})`)

          const now = new Date()
          source.lastUpdate = now
          await updateLastUpdateInDatabase(source.dataID, now.toISOString())
        }
      } else {
        ElMessage.error(`CsFloat采集失败: ${response.data}`)
      }
    } catch (error) {
      console.error('CsFloat采集失败:', error)
      let errorMessage = `CsFloat采集 ${source.dataName} 失败`

      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          `CsFloat采集失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到CsFloat爬虫服务器'
      } else {
        errorMessage = error.message || 'CsFloat采集失败'
      }

      ElMessage.error(errorMessage)
    } finally {
      stopCollecting(source.dataID)
    }
  }

  // C5 GAME 专用爬虫采集（增量）
  const startC5gameSpiderCollection = async (source) => {
    if (!source.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    if (collectingSourceIds.value.has(source.dataID)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    const steamId =
      source.steamID ||
      source.config?.steamID ||
      source.config?.steamId ||
      source.config?.steam_id ||
      ''

    if (!steamId) {
      ElMessage.error('请先在数据源配置中填写 SteamID')
      return
    }

    try {
      startCollecting(source.dataID)

      ElMessage.info(`开始采集C5 GAME数据: ${source.dataName}`)

      const spiderData = { steamId }
      const response = await axios.post(apiUrls.c5gameSyncNewData(), spiderData)

      if (response.status === 200) {
        const result = response.data || {}
        if (result.success === false) {
          ElMessage.error(result.message || 'C5 GAME采集失败')
        } else {
          const message = result.message || 'C5 GAME采集完成'
          const sellNew = result.data?.sell_new ?? '0'
          ElMessage.success(`${source.dataName} - ${message} (卖:${sellNew})`)

          const now = new Date()
          source.lastUpdate = now
          await updateLastUpdateInDatabase(source.dataID, now.toISOString())
        }
      } else {
        ElMessage.error(`C5 GAME采集失败: ${response.data}`)
      }
    } catch (error) {
      console.error('C5 GAME采集失败:', error)
      let errorMessage = `C5 GAME采集 ${source.dataName} 失败`

      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          `C5 GAME采集失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到C5 GAME爬虫服务器'
      } else {
        errorMessage = error.message || 'C5 GAME采集失败'
      }

      ElMessage.error(errorMessage)
    } finally {
      stopCollecting(source.dataID)
    }
  }

  // Steam专用爬虫采集函数（增量采集 - 只获取新数据）
  const startSteamSpiderCollection = async (source) => {
    if (!source.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    if (collectingSourceIds.value.has(source.dataID)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    try {
      // 添加到采集中的列表
      startCollecting(source.dataID)
      
      ElMessage.info(`开始增量采集Steam新数据: ${source.dataName}`)

      // 准备发送给爬虫的数据 - 按照后端API期望的字段名
      const spiderData = {
        // 后端API只需要 steamId，会自动从配置中读取cookie
        steamId: source.config?.steamID || '',
      }
      
      console.log('Steam数据源完整信息:', source)
      console.log('Steam配置对象:', source.config)
      console.log('发送给Steam爬虫的数据:', spiderData)
      
      // 验证必要参数
      if (!spiderData.steamId) {
        ElMessage.error('Steam ID 未配置，请先在数据源配置中添加 Steam ID')
        stopCollecting(source.dataID)
        return
      }
      
      // 调用增量采集爬虫API（getNewData接口）
      const response = await axios.post(apiUrls.steamSyncNewData(), spiderData)

      // 后端成功返回 200 状态码
      if (response.status === 200) {
        const message = response.data?.message || 'Steam增量采集完成'
        ElMessage.success(`${source.dataName} - ${message}`)
        console.log('Steam增量采集响应:', response.data)
        
        // 更新数据源的最后更新时间
        const now = new Date()
        source.lastUpdate = now
        
        // 更新数据库中的 lastUpdate
        await updateLastUpdateInDatabase(source.dataID, now.toISOString())
      } else {
        ElMessage.error(`Steam增量采集失败: ${response.data}`)
      }
    } catch (error) {
      console.error('Steam增量采集失败:', error)
      let errorMessage = `Steam增量采集 ${source.dataName} 失败`
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Steam增量采集失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到Steam爬虫服务器'
      } else {
        errorMessage = error.message || 'Steam增量采集失败'
      }
      
      ElMessage.error(errorMessage)
    } finally {
      // 从采集中的列表移除
      stopCollecting(source.dataID)
    }
  }

  const startCollection = async (source) => {
    // 如果是悠悠有品，调用爬虫采集
    if (source.type === 'youpin') {
      return startYoupinSpiderCollection(source)
    }
    
    // 如果是BUFF，调用BUFF爬虫采集
    if (source.type === 'buff') {
      return startBuffSpiderCollection(source)
    }
    
    if (source.type === 'csfloat') {
      return startCsfloatSpiderCollection(source)
    }

    if (source.type === 'c5game') {
      return startC5gameSpiderCollection(source)
    }
    
    // 如果是Steam，调用Steam爬虫采集
    if (source.type === 'steam') {
      return startSteamSpiderCollection(source)
    }
    
    // 其他数据源使用原有的采集逻辑
    if (!source.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    if (collectingSourceIds.value.has(source.dataID)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    try {
      // 添加到采集中的列表
      startCollecting(source.dataID)
      
      ElMessage.info(`开始采集数据源: ${source.dataName}`)
      
      // 调用采集API
      const response = await axios.post(apiUrls.dataSourceCollect(source.dataID), {
        dataSourceId: source.dataID,
        dataSourceName: source.dataName,
        type: source.type
      })

      const result = response.data
      
      if (result.success) {
        ElMessage.success(`${source.dataName} 采集完成！采集到 ${result.data?.count || 0} 条数据`)
        
        // 更新数据源的最后更新时间
        const now = new Date()
        source.lastUpdate = now
        
        // 更新数据库中的 lastUpdate
        await updateLastUpdateInDatabase(source.dataID, now.toISOString())
      } else {
        ElMessage.error(`采集失败: ${result.message}`)
      }
    } catch (error) {
      console.error('采集失败:', error)
      let errorMessage = `采集 ${source.dataName} 失败`
      
      if (error.response) {
        errorMessage = error.response.data?.message || `采集失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到API服务器'
      } else {
        errorMessage = error.message || '采集失败'
      }
      
      ElMessage.error(errorMessage)
    } finally {
      // 从采集中的列表移除
      stopCollecting(source.dataID)
    }
  }

  const toggleSource = async (source) => {
    try {
      const response = await axios.put(apiUrls.dataSourceToggle(source.dataID), {
        enabled: source.enabled
      })

      const result = response.data
      
      if (result.success) {
        ElMessage.success(`${source.dataName} ${source.enabled ? '已启用' : '已禁用'}`)
      } else {
        ElMessage.error(result.message || '状态更新失败')
        source.enabled = !source.enabled
      }
    } catch (error) {
      console.error('状态更新失败:', error)
      let errorMessage = '状态更新失败'
      
      if (error.response) {
        errorMessage = error.response.data?.message || `更新失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到API服务器'
      } else {
        errorMessage = error.message || '状态更新失败'
      }
      
      ElMessage.error(errorMessage)
      // 恢复原状态
      source.enabled = !source.enabled
    }
  }

  const toggleEditSourceStatus = async (enabled) => {
    if (!editingSourceId.value) return
    try {
      const response = await axios.put(apiUrls.dataSourceToggle(editingSourceId.value), {
        enabled: !!enabled
      })
      const result = response.data
      if (result.success) {
        const current = dataSources.value.find(item => item.dataID === editingSourceId.value)
        if (current) {
          current.enabled = !!enabled
        }
        ElMessage.success(`数据源已${enabled ? '启用' : '禁用'}`)
      } else {
        ElMessage.error(result.message || '状态更新失败')
        editForm.value.enabled = !enabled
      }
    } catch (error) {
      let errorMessage = '状态更新失败'
      if (error.response) {
        errorMessage = error.response.data?.message || `更新失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到API服务器'
      } else {
        errorMessage = error.message || '状态更新失败'
      }
      ElMessage.error(errorMessage)
      editForm.value.enabled = !enabled
    }
  }

  const editSource = (source) => {
    // 记录当前编辑的数据源ID
    editingSourceId.value = source.dataID
    
    // 自动收起列表
    isListCollapsed.value = true
    
    // 填充编辑表单，显示所有现有配置
    const config = source.config || {}
    
    console.log('开始编辑数据源:', {
      source: source,
      config: config,
      type: source.type,
      configKeys: Object.keys(config)
    })

    // 基础信息
    editForm.value.name = source.dataName
    editForm.value.type = source.type
    editForm.value.enabled = source.enabled
    
    
    // 根据数据源类型解析不同的配置
    if (source.type === 'youpin') {
      // 解析悠悠有品的配置 - 现在从JSON展开的字段中读取
      editForm.value.phone = config.yyyp_phone || ''
      editForm.value.sessionid = config.yyyp_Sessionid || ''
      editForm.value.token = config.yyyp_token || ''
      editForm.value.deviceName = config.yyyp_DeviceName || ''
      editForm.value.appVersion = config.yyyp_app_version || ''
      editForm.value.sleepTime = parseInt(config.yyyp_sleep_time || '6000')
      editForm.value.appType = config.yyyp_app_type || ''
      editForm.value.userId = config.yyyp_userId || ''
      editForm.value.steamId = config.yyyp_steamId || ''
      editForm.value.devicetoken = config.yyyp_devicetoken || ''
      editForm.value.deviceid = config.yyyp_deviceid || ''
      editForm.value.deviceuk = config.yyyp_deviceuk || ''
      editForm.value.uk = config.yyyp_uk || ''
      editForm.value.sk = config.yyyp_sk || ''
      editForm.value.deviceInfo = config.yyyp_device_info || ''
      
      // 短信登录相关字段 - 将已存储的 sessionid 同步到短信登录的 Session ID 输入框
      editForm.value.yyypLoginMethod = config.yyypLoginMethod || 'capture'  // 默认为抓包方式
      editForm.value.yyypSessionId = config.yyyp_Sessionid || ''  // 同步 Session ID
      editForm.value.yyypDeviceId = config.yyyp_deviceid || ''  // 同步 Device ID
      editForm.value.yyypPhone = config.yyyp_phone || ''
      editForm.value.yyypSmsCode = ''  // 验证码不保存，每次都需要重新获取
      
      console.log('悠悠有品配置解析结果:', {
        phone: editForm.value.phone,
        sessionid: editForm.value.sessionid,
        yyypSessionId: editForm.value.yyypSessionId,
        yyypDeviceId: editForm.value.yyypDeviceId,
        token: editForm.value.token,
        deviceName: editForm.value.deviceName,
        appVersion: editForm.value.appVersion,
        sleepTime: editForm.value.sleepTime,
        appType: editForm.value.appType,
        userId: editForm.value.userId,
        yyypLoginMethod: editForm.value.yyypLoginMethod
      })
    } else if (source.type === 'buff') {
      // BUFF配置
      console.log('BUFF配置解析:', config)
      editForm.value.buffAppVersion = config.app_version || ''
      editForm.value.buffAppVersionCode = config.app_version_code || ''
      editForm.value.buffBrand = config.brand || ''
      editForm.value.buffBuildFingerprint = config.build_fingerprint || ''
      editForm.value.buffChannel = config.channel || ''
      editForm.value.buffDeviceId = config.device_id || ''
      editForm.value.buffDeviceIdWeak = config.device_id_weak || ''
      editForm.value.buffManufacturer = config.manufacturer || ''
      editForm.value.buffModel = config.model || ''
      editForm.value.buffNetwork = config.network || ''
      editForm.value.buffProduct = config.product || ''
      editForm.value.buffResolution = config.resolution || ''
      editForm.value.buffRom = config.rom || ''
      editForm.value.buffRomId = config.rom_id || ''
      editForm.value.buffScreenDensity = config.screen_density || ''
      editForm.value.buffScreenSize = config.screen_size || ''
      editForm.value.buffSeed = config.seed || ''
      editForm.value.buffSystemType = config.system_type || ''
      editForm.value.buffSystemVersion = config.system_version || ''
      editForm.value.buffTimestamp = config.timestamp || ''
      editForm.value.buffTimezone = config.timezone || ''
      editForm.value.buffTimezoneOffset = config.timezone_offset || ''
      editForm.value.buffTimezoneOffsetDst = config.timezone_offset_dst || ''
      editForm.value.buffUserAgent = config.user_agent || ''
      editForm.value.buffLocale = config.locale || ''
      editForm.value.buffLocaleSupported = config.locale_supported || ''
      editForm.value.buffDevicename = config.devicename || ''
      editForm.value.cookie = config.cookie || ''
      editForm.value.steamID = config.steamID || ''
      editForm.value.updateFreq = config.updateFreq || source.updateFreq || '15min'
    } else if (source.type === 'steam') {
      // Steam配置
      console.log('Steam配置解析:', {
        cookies: config.cookies,
        steamID: config.steamID,
        steamCookieMethod: config.steamCookieMethod
      })
      const baseCookies = config.baseCookies || config.baseCookie || config.cookie || ''
      const inventoryCookies = config.inventoryCookies || config.cookies || config.cookie || ''
      editForm.value.steamBaseCookies = baseCookies
      editForm.value.steamInventoryCookies = inventoryCookies
      editForm.value.cookies = inventoryCookies
      editForm.value.steamID = config.steamID || ''
      // 使用配置中记录的 Cookie 获取方式，支持 password
      const cookieMethod = config.steamCookieMethod || 'qrcode'
      editForm.value.steamCookieMethod = cookieMethod
      editForm.value.steamUsername = config.steamUsername || ''
      editForm.value.steamPassword = config.steamPassword || ''
      editForm.value.updateFreq = config.updateFreq || source.updateFreq || '15min'
    } else if (source.type === 'steam_login') {
      // Steam登录配置（兼容旧数据，使用与steam相同的逻辑）
      console.log('Steam登录配置解析:', {
        cookies: config.cookies,
        steamID: config.steamID,
        steamCookieMethod: config.steamCookieMethod,
        steamUsername: config.steamUsername,
        updateFreq: config.updateFreq
      })
      const baseCookies = config.baseCookies || config.baseCookie || config.cookie || ''
      const inventoryCookies = config.inventoryCookies || config.cookies || config.cookie || ''
      editForm.value.steamBaseCookies = baseCookies
      editForm.value.steamInventoryCookies = inventoryCookies
      editForm.value.cookies = inventoryCookies
      editForm.value.steamID = config.steamID || ''
      // 如果有steamCookieMethod则使用，否则根据是否有用户名密码来判断
      let cookieMethod
      if (config.steamCookieMethod) {
        cookieMethod = config.steamCookieMethod
      } else if (config.steamUsername) {
        cookieMethod = 'password'
      } else {
        cookieMethod = 'qrcode'
      }
      // 直接使用推断出的 cookie 获取方式，允许 password
      editForm.value.steamCookieMethod = cookieMethod
      editForm.value.steamUsername = config.steamUsername || ''
      editForm.value.steamPassword = config.steamPassword || ''
      editForm.value.updateFreq = config.updateFreq || source.updateFreq || '15min'
    } else if (source.type === 'perfectworld') {
      // 完美世界APP配置
      console.log('完美世界APP配置解析:', {
        appversion: config.appversion,
        device: config.device,
        gameType: config.gameType,
        platform: config.platform,
        token: config.token,
        tdSign: config.tdSign,
        steamID: config.steamID,
        updateFreq: config.updateFreq
      })
      editForm.value.appversion = config.appversion || ''
      editForm.value.device = config.device || ''
      editForm.value.gameType = config.gameType || ''
      editForm.value.platform = config.platform || ''
      editForm.value.pwToken = config.token || ''
      editForm.value.tdSign = config.tdSign || ''
      editForm.value.pwSteamID = config.steamID || ''
      editForm.value.updateFreq = config.updateFreq || source.updateFreq || '15min'
    } else if (source.type === 'csfloat') {
      // CsFloat配置
      console.log('CsFloat配置解析:', config)
      editForm.value.csfloatUserAgent = config['User-Agent'] || config.userAgent || ''
      editForm.value.csfloatReferer = config.Referer || config.referer || ''
      editForm.value.csfloatAccept = config.Accept || config.accept || ''
      editForm.value.csfloatXAppVersion = config['X-App-Version'] || config.xAppVersion || ''
      editForm.value.csfloatHost = config.Host || config.host || ''
      editForm.value.csfloatConnection = config.Connection || config.connection || ''
      editForm.value.csfloatAcceptEncoding = config['Accept-Encoding'] || config.acceptEncoding || ''
      editForm.value.csfloatCookie = config.Cookie || config.cookie || ''
      editForm.value.csfloatSteamID = config.steamID || ''
      editForm.value.updateFreq = config.updateFreq || source.updateFreq || '15min'
    } else if (source.type === 'c5game') {
      console.log('C5 GAME配置解析:', config)
      editForm.value.steamID = config.steamID || source.steamID || ''
      editForm.value.c5gameAccessToken = config.x_access_token || ''
      editForm.value.c5gameDeviceId = config.x_device_id || ''
      editForm.value.c5gameDeviceModel = config.x_device_model || ''
      editForm.value.c5gameDeviceOs = config.x_device_os || ''
      editForm.value.c5gameUserAgent = config.user_agent || ''
      editForm.value.c5gameAppVersionCode = config.x_app_version_code != null && config.x_app_version_code !== ''
        ? String(config.x_app_version_code)
        : ''
      editForm.value.c5gameAppChannel = config.x_app_channel || ''
      editForm.value.c5gameSource = config.x_source != null && config.x_source !== '' ? String(config.x_source) : ''
      editForm.value.c5gameSign = config.x_sign || ''
      editForm.value.c5gameRdi = config.rdi || ''
      editForm.value.c5gameAcceptLanguage = config.accept_language || ''
      editForm.value.c5gameXUa = config.x_ua || ''
      editForm.value.c5gameStartReqTime = config.x_start_req_time != null && config.x_start_req_time !== ''
        ? String(config.x_start_req_time)
        : ''
      editForm.value.c5gameContentType = config.content_type || ''
      editForm.value.c5gameAcceptEncoding = config.accept_encoding || ''
      editForm.value.c5gameAutoLogin = !!config.auto_login
      editForm.value.c5gameAutoLoginUsername = config.auto_login_username || ''
      editForm.value.c5gameAutoLoginPassword = config.auto_login_password || ''
      editForm.value.updateFreq = config.updateFreq || source.updateFreq || '15min'
    } else if (source.type === 'csqaq') {
      // CSQAQ配置
      console.log('CSQAQ配置解析:', config)
      editForm.value.csqaqApiToken = config.ApiToken || ''
    } else if (source.type === 'steamdt') {
      // SteamDT配置
      console.log('SteamDT配置解析:', config)
      editForm.value.steamdtApiKey = config.API_KEY || ''
      editForm.value.steamdtCallbackDomain = config.CallbackDomain || ''
    } else {
      // 通用配置 - 检查多种可能的字段名
      editForm.value.apiUrl = config.api_url || source.apiUrl || ''
      editForm.value.apiKey = config.api_key || config.token || ''
      editForm.value.sleepTime = parseInt(config.sleep_time || '6000')
    }
    
    console.log('编辑表单数据:', editForm.value)
    
    // 打开编辑对话框
    editDialogVisible.value = true
  }

  const handleEditDialogClose = async () => {
    // 调用表单组件的cleanup方法停止SSL代理
    if (youpinFormRef.value?.cleanup) {
      await youpinFormRef.value.cleanup()
    }
    if (buffFormRef.value?.cleanup) {
      await buffFormRef.value.cleanup()
    }
    if (perfectWorldFormRef.value?.cleanup) {
      await perfectWorldFormRef.value.cleanup()
    }
    if (csfloatFormRef.value?.cleanup) {
      await csfloatFormRef.value.cleanup()
    }
    if (c5gameFormRef.value?.cleanup) {
      await c5gameFormRef.value.cleanup()
    }

    // 清除 Token 获取定时器
    if (tokenCheckTimer.value) {
      clearInterval(tokenCheckTimer.value)
      tokenCheckTimer.value = null
    }

    // 重置 Token 获取状态
    buffTokenStatus.value = ''
    yyypTokenStatus.value = ''
    perfectWorldTokenStatus.value = ''
    csfloatTokenStatus.value = ''
    buffTokenLoading.value = false
    yyypTokenLoading.value = false
    perfectWorldTokenLoading.value = false
    csfloatTokenLoading.value = false

    // 展开列表
    isListCollapsed.value = false

    // 关闭编辑弹窗时同步最新状态，确保主页面列表与弹窗操作一致
    await loadDataSources()

    // 对话框关闭时清理状态
    editingSourceId.value = null
    editForm.value = {
      name: '',
      type: '',
      apiUrl: '',
      apiKey: '',
      enabled: true,
      // 悠悠有品特有字段
      phone: '',
      sessionid: '',
      token: '',
      deviceName: '',
      appVersion: '',
      sleepTime: 6000,
      appType: '',
      userId: '',
      steamId: '',
      devicetoken: '',
      deviceid: '',
      deviceuk: '',
      uk: '',
      sk: '',
      deviceInfo: '',
      // 悠悠有品短信登录字段
      yyypLoginMethod: 'sms',
      yyypSessionId: '',
      yyypDeviceId: '',
      yyypPhone: '',
      yyypSmsCode: '',
      // BUFF特有字段
      cookie: '',
      systemVersion: '',
      systemType: '',
      steamID: '',
      // Steam特有字段
      cookies: '',
      steamCookieMethod: 'qrcode',
      steamUsername: '',
      steamPassword: '',
      steamTwofactorCode: '',
      steamLoginMethod: 'password',
      steamQRSessionId: '',
      // 完美世界APP特有字段
      appversion: '',
      device: '',
      gameType: '',
      platform: '',
      pwToken: '',
      tdSign: '',
      pwSteamID: '',
      // CsFloat特有字段
      csfloatUserAgent: '',
      csfloatReferer: '',
      csfloatAccept: '',
      csfloatXAppVersion: '',
      csfloatHost: '',
      csfloatConnection: '',
      csfloatAcceptEncoding: '',
      csfloatCookie: '',
      csfloatSteamID: '',
      // C5 GAME 特有字段
      c5gameAccessToken: '',
      c5gameDeviceId: '',
      c5gameDeviceModel: '',
      c5gameDeviceOs: '',
      c5gameUserAgent: '',
      c5gameAppVersionCode: '',
      c5gameAppChannel: '',
      c5gameSource: '',
      c5gameSign: '',
      c5gameRdi: '',
      c5gameAcceptLanguage: '',
      c5gameXUa: '',
      c5gameStartReqTime: '',
      c5gameContentType: '',
      c5gameAcceptEncoding: '',
      c5gameAutoLogin: false,
      c5gameAutoLoginUsername: '',
      c5gameAutoLoginPassword: '',
      // CSQAQ特有字段
      csqaqApiToken: ''
    }
    
    // 清理短信登录相关状态
    if (editSmsCodeTimer.value) {
      clearInterval(editSmsCodeTimer.value)
      editSmsCodeTimer.value = null
    }
    editSmsCodeCountdown.value = 0
    editYyypSmsLoginLoading.value = false
    editSendingSmsCode.value = false
    editGeneratingSessionId.value = false
    editGeneratingDeviceId.value = false
  }

  // 打开添加数据源对话框
  const openAddDialog = (steamID) => {
    currentSteamID.value = steamID // 记录当前分组的steamID
    isIndependentDataSourceMode.value = false // 清除独立数据源模式
    resetForm() // 先重置表单
    addDialogVisible.value = true
  }

  // 打开新建SteamID分组的对话框（不限制类型）
  const openAddDialogForNewSteam = () => {
    currentSteamID.value = null // 清空steamID，不限制类型
    isIndependentDataSourceMode.value = false // 清除独立数据源模式
    resetForm() // 先重置表单
    addDialogVisible.value = true
  }

  // 打开添加独立数据源对话框（CSQAQ等独立数据源）
  const openAddIndependentDataSource = () => {
    // 检查是否所有独立数据源类型都已存在
    const availableTypes = independentDataSourceTypes.filter(
      type => !isIndependentTypeDisabled(type)
    )
    
    if (availableTypes.length === 0) {
      ElMessage.warning('所有独立数据源类型都已配置，每种类型只能存在一个配置')
      return
    }
    
    currentSteamID.value = null // 清空steamID
    resetForm() // 先重置表单
    isIndependentDataSourceMode.value = true // 设置为独立数据源模式
    
    // 默认选择第一个可用的独立数据源类型
    const defaultType = availableTypes[0]
    inputForm.value.type = defaultType
    inputForm.value.name = getSourceTypeLabel(defaultType)
    inputForm.value.enabled = true // 独立数据源创建时默认开启 status = 1
    
    addDialogVisible.value = true
  }

  // 关闭添加数据源对话框
  const handleAddDialogClose = async () => {
    // 调用表单组件的cleanup方法停止SSL代理
    if (youpinFormRef.value?.cleanup) {
      await youpinFormRef.value.cleanup()
    }
    if (buffFormRef.value?.cleanup) {
      await buffFormRef.value.cleanup()
    }
    if (perfectWorldFormRef.value?.cleanup) {
      await perfectWorldFormRef.value.cleanup()
    }
    if (csfloatFormRef.value?.cleanup) {
      await csfloatFormRef.value.cleanup()
    }
    if (c5gameFormRef.value?.cleanup) {
      await c5gameFormRef.value.cleanup()
    }

    // 清除二维码轮询定时器
    if (steamQRCheckTimer.value) {
      clearInterval(steamQRCheckTimer.value)
      steamQRCheckTimer.value = null
    }

    // 清除 Token 获取定时器
    if (tokenCheckTimer.value) {
      clearInterval(tokenCheckTimer.value)
      tokenCheckTimer.value = null
    }

    // 重置二维码相关状态
    steamQRCode.value = ''
    steamQRStatus.value = ''
    steamQRLoading.value = false

    // 重置 Token 获取状态
    buffTokenStatus.value = ''
    yyypTokenStatus.value = ''
    perfectWorldTokenStatus.value = ''
    csfloatTokenStatus.value = ''
    buffTokenLoading.value = false
    yyypTokenLoading.value = false
    perfectWorldTokenLoading.value = false
    csfloatTokenLoading.value = false

    resetForm() // 关闭时重置表单
  }

  // 编辑对话框中的悠悠有品"首次数据获取/全部获取"功能
  // limitParams: { limitType: 'all'|'count'|'date', limitCount: number, limitDate: 'YYYY-MM-DD' }
  const handleEditCollectAll = async (limitParams = {}) => {
    if (!editForm.value.name) {
      ElMessage.error('数据源信息不完整')
      return
    }

    if (!editForm.value.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    // 确保只有悠悠有品类型才能调用全部采集
    if (editForm.value.type !== 'youpin') {
      ElMessage.error('只有悠悠有品数据源才支持全部采集功能')
      return
    }

    if (collectingSourceIds.value.has(editingSourceId.value)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    const { limitType = 'all', limitCount = null, limitDate = null } = limitParams

    let limitDesc = ''
    if (limitType === 'count') limitDesc = `（条数限制: ${limitCount}）`
    else if (limitType === 'date') limitDesc = `（日期限制: ${limitDate} 之后）`

    try {
      startCollecting(editingSourceId.value)

      ElMessage.info(`开始执行悠悠有品首次数据获取: ${editForm.value.name}${limitDesc}`)

      const spiderData = {
        steamId: editForm.value.steamId || '',
        limit_type: limitType,
        limit_count: limitCount,
        limit_date: limitDate,
      }

      console.log('发送给悠悠有品数据获取爬虫的数据:', spiderData)

      const response = await axios.post(apiUrls.youpinSyncHistoryData(), spiderData)

      if (response.status === 200) {
        ElMessage.success(`${editForm.value.name} 悠悠有品数据获取完成！`)
        console.log('悠悠有品数据获取响应:', response.data)
      } else {
        ElMessage.error(`悠悠有品数据获取失败: ${response.data}`)
      }
    } catch (error) {
      console.error('悠悠有品数据获取失败:', error)
      let errorMessage = `悠悠有品数据获取 ${editForm.value.name} 失败`

      if (error.response) {
        errorMessage = error.response.data?.message || `悠悠有品数据获取失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到悠悠有品爬虫服务器'
      } else {
        errorMessage = error.message || '悠悠有品数据获取失败'
      }

      ElMessage.error(errorMessage)
    } finally {
      // 从采集中的列表移除
      stopCollecting(editingSourceId.value)
    }
  }

  // 编辑对话框中的BUFF"首次数据获取/全部获取"功能
  // limitParams: { limitType: 'all'|'count'|'date', limitCount: number, limitDate: 'YYYY-MM-DD' }
  const handleEditBuffCollectAll = async (limitParams = {}) => {
    if (!editForm.value.name) {
      ElMessage.error('数据源信息不完整')
      return
    }

    if (!editForm.value.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    if (editForm.value.type !== 'buff') {
      ElMessage.error('只有BUFF数据源才支持全部获取功能')
      return
    }

    if (collectingSourceIds.value.has(editingSourceId.value)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    const { limitType = 'all', limitCount = null, limitDate = null } = limitParams

    const limitDesc = limitType === 'count'
      ? `（条数限制: ${limitCount}）`
      : limitType === 'date'
        ? `（日期限制: ${limitDate} 及之后）`
        : '（全量）'

    try {
      startCollecting(editingSourceId.value)

      ElMessage.info(`开始执行BUFF数据获取 ${limitDesc}: ${editForm.value.name}`)

      const spiderData = {
        steamID: editForm.value.steamID || '',
        dataID: editingSourceId.value,
        dataName: editForm.value.name,
        type: editForm.value.type,
        enabled: editForm.value.enabled,
        // 限制参数
        limit_type: limitType,
        limit_count: limitCount,
        limit_date: limitDate,
      }

      console.log('发送给BUFF数据获取爬虫的数据:', spiderData)

      const response = await axios.post(apiUrls.buffSyncHistoryData(), spiderData)

      if (response.status === 200) {
        ElMessage.success(`${editForm.value.name} BUFF数据获取完成！`)
        console.log('BUFF数据获取响应:', response.data)
      } else {
        ElMessage.error(`BUFF数据获取失败: ${response.data}`)
      }
    } catch (error) {
      console.error('BUFF数据获取失败:', error)
      let errorMessage = `BUFF数据获取 ${editForm.value.name} 失败`

      if (error.response) {
        errorMessage = error.response.data?.message || `BUFF数据获取失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到BUFF爬虫服务器'
      } else {
        errorMessage = error.message || 'BUFF数据获取失败'
      }

      ElMessage.error(errorMessage)
    } finally {
      stopCollecting(editingSourceId.value)
    }
  }

  // 编辑对话框中的 CsFloat "全部采集" 功能
  // limitParams: { limitType: 'all'|'count'|'date', limitCount: number, limitDate: 'YYYY-MM-DD' }
  const handleEditCsfloatCollectAll = async (limitParams = {}) => {
    if (!editForm.value.name) {
      ElMessage.error('数据源信息不完整')
      return
    }

    if (!editForm.value.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    if (editForm.value.type !== 'csfloat') {
      ElMessage.error('只有CsFloat数据源才支持全部采集功能')
      return
    }

    if (collectingSourceIds.value.has(editingSourceId.value)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    const steamId =
      editForm.value.csfloatSteamID ||
      editForm.value.steamID ||
      editForm.value.steamId ||
      ''

    if (!steamId) {
      ElMessage.error('请先填写 CsFloat 数据源的 SteamID')
      return
    }

    const { limitType = 'all', limitCount = null, limitDate = null } = limitParams

    let limitDesc = ''
    if (limitType === 'count') limitDesc = `（条数限制: ${limitCount}）`
    else if (limitType === 'date') limitDesc = `（日期限制: ${limitDate} 之后）`

    try {
      startCollecting(editingSourceId.value)

      ElMessage.info(`开始执行CsFloat首次数据获取: ${editForm.value.name}${limitDesc}`)

      const response = await axios.post(apiUrls.csfloatSyncHistoryData(), {
        steamId,
        limit_type: limitType,
        limit_count: limitCount,
        limit_date: limitDate,
      })

      if (response.status === 200) {
        const result = response.data || {}
        if (result.success === false) {
          ElMessage.error(result.message || 'CsFloat 数据获取失败')
        } else {
          ElMessage.success(result.message || 'CsFloat 数据获取完成！')
        }
      } else {
        ElMessage.error(`CsFloat 数据获取失败: ${response.data}`)
      }
    } catch (error) {
      console.error('CsFloat 数据获取失败:', error)
      let errorMessage = `CsFloat 数据获取 ${editForm.value.name} 失败`

      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          `CsFloat 数据获取失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到CsFloat爬虫服务器'
      } else {
        errorMessage = error.message || 'CsFloat 数据获取失败'
      }

      ElMessage.error(errorMessage)
    } finally {
      stopCollecting(editingSourceId.value)
    }
  }

  // 编辑对话框中的 C5 GAME「首次数据获取」
  // limitParams: { limitType: 'all'|'count'|'date', limitCount: number, limitDate: 'YYYY-MM-DD' }
  const handleEditC5gameCollectAll = async (limitParams = {}) => {
    if (!editForm.value.name) {
      ElMessage.error('数据源信息不完整')
      return
    }

    if (!editForm.value.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    if (editForm.value.type !== 'c5game') {
      ElMessage.error('只有 C5 GAME 数据源才支持该功能')
      return
    }

    if (collectingSourceIds.value.has(editingSourceId.value)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    const steamId =
      editForm.value.steamID ||
      editForm.value.steamId ||
      ''

    if (!steamId) {
      ElMessage.error('请先填写 C5 GAME 数据源的 SteamID')
      return
    }

    const { limitType = 'all', limitCount = null, limitDate = null } = limitParams

    let limitDesc = ''
    if (limitType === 'count') limitDesc = `（条数限制: ${limitCount}）`
    else if (limitType === 'date') limitDesc = `（日期限制: ${limitDate} 之后）`

    try {
      startCollecting(editingSourceId.value)

      ElMessage.info(`开始执行 C5 GAME 首次数据获取: ${editForm.value.name}${limitDesc}`)

      const response = await axios.post(apiUrls.c5gameSyncHistoryData(), {
        steamId,
        limit_type: limitType,
        limit_count: limitCount,
        limit_date: limitDate,
      })

      if (response.status === 200) {
        const result = response.data || {}
        if (result.success === false) {
          ElMessage.error(result.message || 'C5 GAME 数据获取失败')
        } else {
          ElMessage.success(result.message || 'C5 GAME 数据获取完成！')
        }
      } else {
        ElMessage.error(`C5 GAME 数据获取失败: ${response.data}`)
      }
    } catch (error) {
      console.error('C5 GAME 数据获取失败:', error)
      let errorMessage = `C5 GAME 数据获取 ${editForm.value.name} 失败`

      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          `C5 GAME 数据获取失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到 C5 GAME 爬虫服务器'
      } else {
        errorMessage = error.message || 'C5 GAME 数据获取失败'
      }

      ElMessage.error(errorMessage)
    } finally {
      stopCollecting(editingSourceId.value)
    }
  }

  // 编辑对话框中的Steam"首次数据获取"功能
  // limitParams: { limitType: 'all'|'count'|'date', limitCount: number, limitDate: 'YYYY-MM-DD' }
  const handleEditSteamCollectAll = async (limitParams = {}) => {
    if (!editForm.value.name) {
      ElMessage.error('数据源信息不完整')
      return
    }

    if (!editForm.value.enabled) {
      ElMessage.warning('请先启用数据源')
      return
    }

    if (editForm.value.type !== 'steam') {
      ElMessage.error('只有Steam数据源才支持全部采集功能')
      return
    }

    if (collectingSourceIds.value.has(editingSourceId.value)) {
      ElMessage.info('该数据源正在采集中...')
      return
    }

    const { limitType = 'all', limitCount = null, limitDate = null } = limitParams

    let limitDesc = ''
    if (limitType === 'count') limitDesc = `（条数限制: ${limitCount}）`
    else if (limitType === 'date') limitDesc = `（日期限制: ${limitDate} 之后）`

    try {
      startCollecting(editingSourceId.value)

      ElMessage.info(`开始执行Steam首次数据获取: ${editForm.value.name}${limitDesc}`)

      const spiderData = {
        steamId: editForm.value.steamID || '',
        limit_type: limitType,
        limit_count: limitCount,
        limit_date: limitDate,
      }

      console.log('发送给Steam数据获取爬虫的数据:', spiderData)

      const response = await axios.post(apiUrls.steamSyncHistoryData(), spiderData)

      if (response.status === 200) {
        ElMessage.success(`${editForm.value.name} Steam数据获取完成！`)
        console.log('Steam数据获取响应:', response.data)
      } else {
        ElMessage.error(`Steam数据获取失败: ${response.data}`)
      }
    } catch (error) {
      console.error('Steam数据获取失败:', error)
      let errorMessage = `Steam数据获取 ${editForm.value.name} 失败`

      if (error.response) {
        errorMessage = error.response.data?.message || `Steam数据获取失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到Steam爬虫服务器'
      } else {
        errorMessage = error.message || 'Steam数据获取失败'
      }

      ElMessage.error(errorMessage)
    } finally {
      stopCollecting(editingSourceId.value)
    }
  }

  // 编辑对话框中的删除功能
  const handleEditDelete = () => {
    if (!editForm.value.name || !editingSourceId.value) {
      ElMessage.error('数据源信息不完整')
      return
    }

    ElMessageBox.confirm(
      `确定要删除数据源 "${editForm.value.name}" 吗？\n\n删除后将无法恢复，该数据源的所有配置信息都会被永久删除。`,
      '⚠️ 危险操作 - 确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'error',
        buttonSize: 'default',
        showClose: true,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            ElMessageBox.confirm(
              '这是最后确认，删除后无法恢复！',
              '最终确认',
              {
                confirmButtonText: '我确定要删除',
                cancelButtonText: '取消',
                type: 'error'
              }
            ).then(() => {
              done()
            }).catch(() => {
              // 取消最终确认，不关闭第一个对话框
            })
          } else {
            done()
          }
        }
      }
    ).then(async () => {
      try {
        const response = await axios.delete(apiUrls.dataSourceDelete(editingSourceId.value))

        const result = response.data

        if (result.success) {
          const index = dataSources.value.findIndex(s => s.dataID === editingSourceId.value)
          if (index > -1) {
            dataSources.value.splice(index, 1)
            ElMessage.success('数据源删除成功')
            editDialogVisible.value = false // 关闭编辑对话框
          }
        } else {
          ElMessage.error(result.message || '删除数据源失败')
        }
      } catch (error) {
        console.error('删除数据源失败:', error)
        let errorMessage = '删除数据源失败'
        
        if (error.response) {
          errorMessage = error.response.data?.message || `删除失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到API服务器'
        } else {
          errorMessage = error.message || '删除失败'
        }
        
        ElMessage.error(errorMessage)
      }
    })
  }

  const handleEditSubmit = async () => {
    if (!editForm.value.name) {
      ElMessage.error('请填写数据源名称')
      return
    }

    // BUFF类型的字段校验 - 简化验证，只检查必要字段
    if (editForm.value.type === 'buff') {
      console.log('[BUFF编辑验证] cookie:', editForm.value.cookie)
      console.log('[BUFF编辑验证] buffAppVersion:', editForm.value.buffAppVersion)
      
      if (!editForm.value.cookie && !editForm.value.buffAppVersion) {
        ElMessage.error('请先获取BUFF令牌或填写必要信息')
        return
      }
    }

    if (['steam', 'steam_login'].includes(editForm.value.type)) {
      if (!editForm.value.steamInventoryCookies && editForm.value.cookies) {
        editForm.value.steamInventoryCookies = editForm.value.cookies
      }
      editForm.value.cookies = editForm.value.steamInventoryCookies || editForm.value.cookies
    }

    // Steam类型的字段校验
    if (editForm.value.type === 'steam') {
      // 检查Cookie（无论哪种方式都需要Cookie）
      if (!editForm.value.cookies) {
        ElMessage.error('请先获取Cookie（扫码/账号密码登录）或手动输入Cookie')
        return
      }
      if (!editForm.value.steamID) {
        ElMessage.error('请填写SteamID')
        return
      }
    }

    // Steam登录类型的字段校验（兼容旧数据，使用与steam相同的逻辑）
    if (editForm.value.type === 'steam_login') {
      // 检查Cookie（无论哪种方式都需要Cookie）
      if (!editForm.value.cookies) {
        ElMessage.error('请先获取Cookie（扫码/账号密码登录）或手动输入Cookie')
        return
      }
      if (!editForm.value.steamID) {
        ElMessage.error('请填写SteamID')
        return
      }
    }

    // 悠悠有品类型的字段校验
    if (editForm.value.type === 'youpin') {
      if (!editForm.value.phone) {
        ElMessage.error('请填写手机号')
        return
      }
      if (!editForm.value.sessionid) {
        ElMessage.error('请填写Session ID')
        return
      }
      if (!editForm.value.token) {
        ElMessage.error('请填写Token')
        return
      }
      if (!editForm.value.deviceName) {
        ElMessage.error('请填写设备名称')
        return
      }
      if (!editForm.value.appVersion) {
        ElMessage.error('请填写应用版本')
        return
      }
      if (!editForm.value.appType) {
        ElMessage.error('请填写应用类型')
        return
      }
      if (!editForm.value.userId) {
        ElMessage.error('请填写用户ID')
        return
      }
      if (!editForm.value.steamId) {
        ElMessage.error('请填写SteamID')
        return
      }
      if (!editForm.value.devicetoken) {
        ElMessage.error('请填写Device Token')
        return
      }
      if (!editForm.value.deviceid) {
        ElMessage.error('请填写Device ID')
        return
      }
      if (!editForm.value.deviceuk) {
        ElMessage.error('请填写Device UK')
        return
      }
      if (!editForm.value.uk) {
        ElMessage.error('请填写UK')
        return
      }
      if (!editForm.value.sk) {
        ElMessage.error('请填写SK')
        return
      }
      if (!editForm.value.deviceInfo) {
        ElMessage.error('请填写Device Info')
        return
      }
    }

    // 完美世界APP类型的字段校验
    if (editForm.value.type === 'perfectworld') {
      if (!editForm.value.appversion) {
        ElMessage.error('请填写appversion')
        return
      }
      if (!editForm.value.device) {
        ElMessage.error('请填写device')
        return
      }
      if (!editForm.value.gameType) {
        ElMessage.error('请填写gameType')
        return
      }
      if (!editForm.value.platform) {
        ElMessage.error('请填写platform')
        return
      }
      if (!editForm.value.pwToken) {
        ElMessage.error('请填写token')
        return
      }
      if (!editForm.value.tdSign) {
        ElMessage.error('请填写tdSign')
        return
      }
      if (!editForm.value.pwSteamID) {
        ElMessage.error('请填写SteamID')
        return
      }
    }

    // CsFloat类型的字段校验
    if (editForm.value.type === 'csfloat') {
      if (!editForm.value.csfloatUserAgent) {
        ElMessage.error('请填写User-Agent')
        return
      }
      if (!editForm.value.csfloatReferer) {
        ElMessage.error('请填写Referer')
        return
      }
      if (!editForm.value.csfloatAccept) {
        ElMessage.error('请填写Accept')
        return
      }
      if (!editForm.value.csfloatXAppVersion) {
        ElMessage.error('请填写X-App-Version')
        return
      }
      if (!editForm.value.csfloatHost) {
        ElMessage.error('请填写Host')
        return
      }
      if (!editForm.value.csfloatConnection) {
        ElMessage.error('请填写Connection')
        return
      }
      if (!editForm.value.csfloatAcceptEncoding) {
        ElMessage.error('请填写Accept-Encoding')
        return
      }
      if (!editForm.value.csfloatCookie) {
        ElMessage.error('请填写Cookie')
        return
      }
      if (!editForm.value.csfloatSteamID) {
        ElMessage.error('请填写SteamID')
        return
      }
    }

    // CSQAQ类型的字段校验
    if (editForm.value.type === 'csqaq') {
      if (!editForm.value.csqaqApiToken) {
        ElMessage.error('请填写ApiToken')
        return
      }
    }

    // SteamDT类型的字段校验
    if (editForm.value.type === 'steamdt') {
      if (!editForm.value.steamdtApiKey) {
        ElMessage.error('请填写API_KEY')
        return
      }
      if (!editForm.value.steamdtCallbackDomain) {
        ElMessage.error('请填写回调域名')
        return
      }
    }

    if (editForm.value.type === 'c5game') {
      if (!editForm.value.steamID) {
        ElMessage.error('请填写SteamID')
        return
      }
      if (!editForm.value.c5gameAccessToken) {
        ElMessage.error('请填写访问令牌（x-access-token）')
        return
      }
      if (!editForm.value.c5gameUserAgent) {
        ElMessage.error('请填写 User Agent')
        return
      }
      if (editForm.value.c5gameAutoLogin) {
        if (!editForm.value.c5gameAutoLoginUsername) {
          ElMessage.error('请填写 C5 自动登录用户名')
          return
        }
        if (!editForm.value.c5gameAutoLoginPassword) {
          ElMessage.error('请填写 C5 自动登录密码')
          return
        }
      }
    }

    editSubmitting.value = true
    try {
      let requestData = {
        dataName: editForm.value.name,
        type: editForm.value.type,
        enabled: editForm.value.enabled
      }

      // 根据数据源类型构建配置JSON字符串
      if (editForm.value.type === 'youpin') {
        // 修复：编辑时也使用不带前缀的字段名，与添加时保持一致
        // 后端会统一添加 yyyp_ 前缀
        requestData.configJson = JSON.stringify({
          phone: editForm.value.phone,
          Sessionid: editForm.value.sessionid,
          token: editForm.value.token,
          DeviceName: editForm.value.deviceName,
          app_version: editForm.value.appVersion,
          sleep_time: editForm.value.sleepTime.toString(),
          app_type: editForm.value.appType,
          userId: editForm.value.userId,
          steamId: editForm.value.steamId,
          devicetoken: editForm.value.devicetoken,
          deviceid: editForm.value.deviceid,
          deviceuk: editForm.value.deviceuk,
          uk: editForm.value.uk,
          sk: editForm.value.sk,
          device_info: editForm.value.deviceInfo
        })
      } else if (editForm.value.type === 'perfectworld') {
        // 完美世界APP特殊配置
        requestData.configJson = JSON.stringify({
          appversion: editForm.value.appversion,
          device: editForm.value.device,
          gameType: editForm.value.gameType,
          platform: editForm.value.platform,
          token: editForm.value.pwToken,
          tdSign: editForm.value.tdSign,
          steamID: editForm.value.pwSteamID,
          updateFreq: editForm.value.updateFreq,
          sleep_time: '6000'
        })
      } else if (editForm.value.type === 'buff') {
        // BUFF特殊配置
        requestData.configJson = JSON.stringify({
          app_version: editForm.value.buffAppVersion,
          app_version_code: editForm.value.buffAppVersionCode,
          brand: editForm.value.buffBrand,
          build_fingerprint: editForm.value.buffBuildFingerprint,
          channel: editForm.value.buffChannel,
          device_id: editForm.value.buffDeviceId,
          device_id_weak: editForm.value.buffDeviceIdWeak,
          manufacturer: editForm.value.buffManufacturer,
          model: editForm.value.buffModel,
          network: editForm.value.buffNetwork,
          product: editForm.value.buffProduct,
          resolution: editForm.value.buffResolution,
          rom: editForm.value.buffRom,
          rom_id: editForm.value.buffRomId,
          screen_density: editForm.value.buffScreenDensity,
          screen_size: editForm.value.buffScreenSize,
          seed: editForm.value.buffSeed,
          system_type: editForm.value.buffSystemType,
          system_version: editForm.value.buffSystemVersion,
          timestamp: editForm.value.buffTimestamp,
          timezone: editForm.value.buffTimezone,
          timezone_offset: editForm.value.buffTimezoneOffset,
          timezone_offset_dst: editForm.value.buffTimezoneOffsetDst,
          user_agent: editForm.value.buffUserAgent,
          locale: editForm.value.buffLocale,
          locale_supported: editForm.value.buffLocaleSupported,
          devicename: editForm.value.buffDevicename,
          cookie: editForm.value.cookie,
          steamID: editForm.value.steamID,
          updateFreq: editForm.value.updateFreq,
          sleep_time: '6000'
        })
      } else if (editForm.value.type === 'steam') {
        // Steam特殊配置（支持三种Cookie获取方式）
        const baseCookies = editForm.value.steamBaseCookies || editForm.value.cookies || ''
        const inventoryCookies = editForm.value.steamInventoryCookies || editForm.value.cookies || ''
        requestData.configJson = JSON.stringify({
          baseCookies,
          inventoryCookies,
          cookies: inventoryCookies,
          steamID: editForm.value.steamID,
          steamCookieMethod: editForm.value.steamCookieMethod, // 记录获取方式
          steamUsername: editForm.value.steamUsername || '',
          steamPassword: editForm.value.steamPassword || '',
          updateFreq: editForm.value.updateFreq,
          sleep_time: '6000'
        })
      } else if (editForm.value.type === 'csfloat') {
        // CsFloat特殊配置
        requestData.configJson = JSON.stringify({
          'User-Agent': editForm.value.csfloatUserAgent,
          'Referer': editForm.value.csfloatReferer,
          'Accept': editForm.value.csfloatAccept,
          'X-App-Version': editForm.value.csfloatXAppVersion,
          'Host': editForm.value.csfloatHost,
          'Connection': editForm.value.csfloatConnection,
          'Accept-Encoding': editForm.value.csfloatAcceptEncoding,
          'Cookie': editForm.value.csfloatCookie,
          steamID: editForm.value.csfloatSteamID,
          updateFreq: editForm.value.updateFreq,
          sleep_time: '6000'
        })
      } else if (editForm.value.type === 'c5game') {
        requestData.configJson = JSON.stringify({
          steamID: editForm.value.steamID,
          user_agent: editForm.value.c5gameUserAgent,
          accept_encoding: editForm.value.c5gameAcceptEncoding,
          x_device_os: editForm.value.c5gameDeviceOs,
          content_type: editForm.value.c5gameContentType,
          x_source: editForm.value.c5gameSource,
          x_device_model: editForm.value.c5gameDeviceModel,
          rdi: editForm.value.c5gameRdi,
          accept_language: editForm.value.c5gameAcceptLanguage,
          x_ua: editForm.value.c5gameXUa,
          x_start_req_time: editForm.value.c5gameStartReqTime,
          x_device_id: editForm.value.c5gameDeviceId,
          x_access_token: editForm.value.c5gameAccessToken,
          x_app_channel: editForm.value.c5gameAppChannel,
          x_app_version_code: editForm.value.c5gameAppVersionCode,
          x_sign: editForm.value.c5gameSign,
          auto_login: editForm.value.c5gameAutoLogin,
          auto_login_username: editForm.value.c5gameAutoLoginUsername,
          auto_login_password: editForm.value.c5gameAutoLoginPassword,
          updateFreq: editForm.value.updateFreq,
          sleep_time: '6000'
        })
      } else if (editForm.value.type === 'csqaq') {
        // CSQAQ特殊配置
        requestData.configJson = JSON.stringify({
          ApiToken: editForm.value.csqaqApiToken
        })
      } else if (editForm.value.type === 'steamdt') {
        // SteamDT特殊配置
        requestData.configJson = JSON.stringify({
          API_KEY: editForm.value.steamdtApiKey,
          CallbackDomain: editForm.value.steamdtCallbackDomain
        })
      } else if (editForm.value.type === 'steam_login') {
        // Steam登录特殊配置（兼容旧数据，使用与steam相同的配置）
        const baseCookies = editForm.value.steamBaseCookies || editForm.value.cookies || ''
        const inventoryCookies = editForm.value.steamInventoryCookies || editForm.value.cookies || ''
        requestData.configJson = JSON.stringify({
          baseCookies,
          inventoryCookies,
          cookies: inventoryCookies,
          steamID: editForm.value.steamID,
          steamCookieMethod: editForm.value.steamCookieMethod, // 记录获取方式
          steamUsername: editForm.value.steamUsername || '',
          steamPassword: editForm.value.steamPassword || '',
          updateFreq: editForm.value.updateFreq,
          sleep_time: '6000'
        })
      } else {
        requestData.configJson = JSON.stringify({
          apiUrl: editForm.value.apiUrl,
          apiKey: editForm.value.apiKey,
          updateFreq: editForm.value.updateFreq,
          sleep_time: editForm.value.sleepTime?.toString() || '6000'
        })
      }

      const response = await axios.put(
        apiUrls.dataSourceUpdate(editingSourceId.value),
        requestData
      )

      const result = response.data
      
      if (result.success) {
        ElMessage.success('数据源更新成功')
        editDialogVisible.value = false
        loadDataSources() // 重新加载数据源列表
      } else {
        ElMessage.error(result.message || '更新数据源失败')
      }
    } catch (error) {
      console.error('更新数据源失败:', error)
      let errorMessage = '更新失败'
      
      if (error.response) {
        errorMessage = error.response.data?.message || `更新失败 (${error.response.status})`
      } else if (error.request) {
        errorMessage = '无法连接到API服务器'
      } else {
        errorMessage = error.message || '更新失败'
      }
      
      ElMessage.error(errorMessage)
    } finally {
      editSubmitting.value = false
    }
  }

  const removeSource = (source) => {
    ElMessageBox.confirm(
      `确定要删除数据源 "${source.dataName}" 吗？\n\n删除后将无法恢复，该数据源的所有配置信息都会被永久删除。`,
      '⚠️ 危险操作 - 确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'error',
        buttonSize: 'default',
        showClose: true,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            ElMessageBox.confirm(
              '这是最后确认，删除后无法恢复！',
              '最终确认',
              {
                confirmButtonText: '我确定要删除',
                cancelButtonText: '取消',
                type: 'error'
              }
            ).then(() => {
              done()
            }).catch(() => {
              // 取消最终确认，不关闭第一个对话框
            })
          } else {
            done()
          }
        }
      }
    ).then(async () => {
      try {
        const response = await axios.delete(apiUrls.dataSourceDelete(source.dataID))

        const result = response.data

        if (result.success) {
          const index = dataSources.value.findIndex(s => s.dataID === source.dataID)
          if (index > -1) {
            dataSources.value.splice(index, 1)
            ElMessage.success('数据源删除成功')
          }
        } else {
          ElMessage.error(result.message || '删除数据源失败')
        }
      } catch (error) {
        console.error('删除数据源失败:', error)
        let errorMessage = '删除数据源失败'
        
        if (error.response) {
          errorMessage = error.response.data?.message || `删除失败 (${error.response.status})`
        } else if (error.request) {
          errorMessage = '无法连接到API服务器'
        } else {
          errorMessage = error.message || '删除失败'
        }
        
        ElMessage.error(errorMessage)
      }
    })
  }

  const refreshAllSources = async () => {
    refreshing.value = true
    try {
      await loadDataSources()
      ElMessage.success('所有数据源已刷新')
    } catch (error) {
      ElMessage.error('刷新失败')
    } finally {
      refreshing.value = false
    }
  }

  const loadDataSources = async () => {
    try {
      // console.log('开始请求数据源API...')
      const response = await axios.get(apiUrls.dataSourceList())
      // console.log('Axios response:', response)
      
      const result = response.data
      // console.log('API响应结果:', result)
      
      if (result.success) {
        // console.log('成功获取数据源，数量:', result.data.length)
        
        dataSources.value = result.data.map(item => {
          // console.log(`[DEBUG] 数据源 ${item.dataName}:`)
          // console.log(`  - 原始steamID值:`, item.steamID)
          // console.log(`  - steamID类型:`, typeof item.steamID)
          
          return {
            id: item.dataID,
            dataID: item.dataID,
            name: item.dataName,
            dataName: item.dataName,
            type: item.type || 'other',  // 直接使用后端返回的type字段
            apiUrl: item.config?.apiUrl || '',
            updateFreq: item.updateFreq || '15min',
            enabled: item.enabled,
            status: item.enabled ? 'online' : 'offline',
            lastUpdate: item.lastUpdate ? new Date(item.lastUpdate) : null,
            config: item.config || {},
            steamID: item.steamID || ''  // 直接使用config表的steamID字段
          }
        })
        // console.log('处理后的数据源:', dataSources.value)
        // console.log('分组数据:', groupedDataSources.value)
        
        // 注意：全局定时器已在 main.js 中初始化，无需在组件中调用
      } else {
        console.error('API返回失败:', result.message)
        ElMessage.error(result.message || '获取数据源失败')
      }
    } catch (error) {
      console.error('获取数据源失败:', error)
      let errorMessage = '获取数据源失败'
      
      if (error.response) {
        // 服务器返回了错误响应
        errorMessage = error.response.data?.message || `服务器错误 (${error.response.status})`
        console.error('服务器响应错误:', error.response.data)
      } else if (error.request) {
        // 请求发送了但没有收到响应
        errorMessage = '无法连接到API服务器，请检查服务器是否运行在端口9001'
        console.error('网络请求错误，无响应')
      } else {
        // 其他错误
        errorMessage = error.message || '未知错误'
        console.error('请求设置错误:', error.message)
      }
      
      console.error('详细错误信息:', {
        name: error.name,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      ElMessage.error(errorMessage)
    }
  }


  // Steam登录处理函数（添加数据源时）
  const handleSteamLogin = async () => {
    if (!inputForm.value.steamUsername || !inputForm.value.steamPassword) {
      ElMessage.error('请输入Steam用户名和密码')
      return
    }

    steamLoginLoading.value = true
    inputForm.value.steamLoginMessage = ''
    inputForm.value.steamLoginSuccess = false

    try {
      const loginData = {
        username: inputForm.value.steamUsername,
        password: inputForm.value.steamPassword,
        twofactor_code: inputForm.value.steamTwofactorCode || '',
        save_to_db: false  // 不直接保存，等用户保存数据源时再保存
      }

      const response = await axios.post(apiUrls.steamLogin(), loginData)
      const result = response.data

      if (result.success) {
        // 登录成功
        const baseCookies = result.base_cookies || result.baseCookies || result.cookies || ''
        const inventoryCookies = result.inventory_cookies || result.inventoryCookies || result.cookies || ''
        // 参考扫码登录逻辑，同时兼容 result.data 内返回 steam_id 的情况
        const steamIdFromResp =
          result.steam_id ||
          result.steamId ||
          result.data?.steam_id ||
          result.data?.steamId
        inputForm.value.steamBaseCookies = baseCookies
        inputForm.value.steamInventoryCookies = inventoryCookies
        inputForm.value.cookies = inventoryCookies
        if (steamIdFromResp) {
          inputForm.value.steamID = steamIdFromResp
        }
        inputForm.value.steamLoginMessage = steamIdFromResp
          ? '✅ Steam登录成功！Cookie与SteamID已获取'
          : '✅ Steam登录成功！Cookie已获取，请填写SteamID'
        inputForm.value.steamLoginSuccess = true
        ElMessage.success(steamIdFromResp ? 'Steam登录成功，已自动填入SteamID' : 'Steam登录成功！请手动输入SteamID')
      } else if (result.requires_twofactor) {
        // 需要 Steam Guard 验证码
        inputForm.value.steamLoginMessage = ''
        inputForm.value.steamLoginSuccess = false
        // 不再弹出提示
      } else if (result.requires_emailauth) {
        // 需要邮箱验证码
        inputForm.value.steamLoginMessage = '⚠️ 需要邮箱验证码，请查收邮件后输入'
        inputForm.value.steamLoginSuccess = false
        ElMessage.warning('需要邮箱验证码')
      } else if (result.requires_captcha) {
        // 需要图形验证码
        inputForm.value.steamLoginMessage = '⚠️ 需要图形验证码，请稍后重试或手动输入Cookie'
        inputForm.value.steamLoginSuccess = false
        ElMessage.warning('需要图形验证码')
      } else {
        // 其他错误
        inputForm.value.steamLoginMessage = `❌ 登录失败: ${result.message}`
        inputForm.value.steamLoginSuccess = false
        ElMessage.error(result.message || '登录失败')
      }
    } catch (error) {
      console.error('Steam登录失败:', error)
      inputForm.value.steamLoginMessage = `❌ 登录失败: ${error.message || '网络错误'}`
      inputForm.value.steamLoginSuccess = false
      ElMessage.error('Steam登录失败，请检查网络连接')
    } finally {
      steamLoginLoading.value = false
    }
  }

  // 生成Steam二维码
  const handleGenerateQRCode = async () => {
    steamQRLoading.value = true
    steamQRCode.value = ''
    steamQRStatus.value = ''

    try {
      ElMessage.info('正在生成Steam登录二维码...')
      
      // 调用后端API生成二维码
      const response = await axios.post(apiUrls.steamQRGenerate())
      
      if (response.data.success) {
        steamQRCode.value = response.data.data.qr_code
        steamQRStatus.value = 'waiting'
        inputForm.value.steamQRSessionId = response.data.data.session_id
        
        ElMessage.success('二维码生成成功，请使用Steam APP扫码')
        
        // 开始轮询检查二维码状态
        startQRCodePolling()
      } else {
        ElMessage.error(response.data.message || '生成二维码失败')
      }
    } catch (error) {
      console.error('生成二维码失败:', error)
      ElMessage.error('生成二维码失败，请检查网络连接')
    } finally {
      steamQRLoading.value = false
    }
  }

  // 获取二维码状态文本
  const getSteamQRStatusText = () => {
    const statusMap = {
      'waiting': '等待扫码中...',
      'success': '✅ 登录成功',
      'expired': '❌ 二维码已过期'
    }
    return statusMap[steamQRStatus.value] || '未知状态'
  }

  // 开始轮询检查二维码状态
  const startQRCodePolling = () => {
    // 清除已有定时器
    if (steamQRCheckTimer.value) {
      clearInterval(steamQRCheckTimer.value)
    }

    // 每3秒检查一次
    steamQRCheckTimer.value = setInterval(async () => {
      try {
        const response = await axios.post(apiUrls.steamQRPoll(), {
          session_id: inputForm.value.steamQRSessionId
        })
        
        if (response.data.success) {
          if (response.data.status === 'success') {
            // 登录成功
            steamQRStatus.value = 'success'
            
            // 填充Cookie与SteamID
            const baseCookies = response.data.data?.base_cookies || response.data.data?.baseCookies || response.data.data?.cookies || ''
            const inventoryCookies = response.data.data?.inventory_cookies || response.data.data?.inventoryCookies || response.data.data?.cookies || ''
            inputForm.value.steamBaseCookies = baseCookies
            inputForm.value.steamInventoryCookies = inventoryCookies
            inputForm.value.cookies = inventoryCookies
            if (response.data.data?.steam_id) {
              inputForm.value.steamID = response.data.data.steam_id
            }
            inputForm.value.steamLoginSuccess = true
            
            // 显示成功消息
            const accountName = response.data.data.account_name || ''
            const steamIdMsg = response.data.data?.steam_id ? '（SteamID已自动填入）' : ''
            inputForm.value.steamLoginMessage = `✅ 扫码登录成功！${accountName ? '账号: ' + accountName : ''}${steamIdMsg}`
            
            clearInterval(steamQRCheckTimer.value)
            ElMessage.success('Steam扫码登录成功！已填入Cookie与SteamID，可直接保存')
            
            // 自动保存并关闭弹窗
            ElMessage.info('正在自动保存数据源配置...')
            setTimeout(() => {
              handleSubmit()
            }, 1000)
          } else if (response.data.status === 'waiting') {
            // 继续等待
            steamQRStatus.value = 'waiting'
          }
        } else {
          // 出错或过期
          steamQRStatus.value = 'expired'
          clearInterval(steamQRCheckTimer.value)
          ElMessage.warning(response.data.message || '二维码已过期，请重新生成')
        }
      } catch (error) {
        console.error('检查二维码状态失败:', error)
        clearInterval(steamQRCheckTimer.value)
        steamQRStatus.value = 'expired'
        ElMessage.error('检查二维码状态失败')
      }
    }, 3000) // 每3秒检查一次
  }

  // 编辑表单 - 生成Steam二维码
  const handleEditGenerateQRCode = async () => {
    steamQRLoading.value = true
    steamQRCode.value = ''
    steamQRStatus.value = ''

    try {
      ElMessage.info('正在生成Steam登录二维码...')
      
      // 调用后端API生成二维码
      const response = await axios.post(apiUrls.steamQRGenerate())
      
      if (response.data.success) {
        steamQRCode.value = response.data.data.qr_code
        steamQRStatus.value = 'waiting'
        editForm.value.steamQRSessionId = response.data.data.session_id
        
        ElMessage.success('二维码生成成功，请使用Steam APP扫码')
        
        // 开始轮询检查二维码状态（编辑表单版本）
        startEditQRCodePolling()
      } else {
        ElMessage.error(response.data.message || '生成二维码失败')
      }
    } catch (error) {
      console.error('生成二维码失败:', error)
      ElMessage.error('生成二维码失败，请检查网络连接')
    } finally {
      steamQRLoading.value = false
    }
  }

  // 编辑表单 - 开始轮询检查二维码状态
  const startEditQRCodePolling = () => {
    // 清除已有定时器
    if (steamQRCheckTimer.value) {
      clearInterval(steamQRCheckTimer.value)
    }

    // 每3秒检查一次
    steamQRCheckTimer.value = setInterval(async () => {
      try {
        const response = await axios.post(apiUrls.steamQRPoll(), {
          session_id: editForm.value.steamQRSessionId
        })
        
        if (response.data.success) {
          if (response.data.status === 'success') {
            // 登录成功
            steamQRStatus.value = 'success'
            
            // 更新Cookie与SteamID
            const baseCookies = response.data.data?.base_cookies || response.data.data?.baseCookies || response.data.data?.cookies || ''
            const inventoryCookies = response.data.data?.inventory_cookies || response.data.data?.inventoryCookies || response.data.data?.cookies || ''
            editForm.value.steamBaseCookies = baseCookies
            editForm.value.steamInventoryCookies = inventoryCookies
            editForm.value.cookies = inventoryCookies
            if (response.data.data?.steam_id) {
              editForm.value.steamID = response.data.data.steam_id
            }
            
            clearInterval(steamQRCheckTimer.value)
            ElMessage.success('Steam扫码登录成功！基础/库存Cookies 与 SteamID 已更新')
            
            // 自动保存并关闭弹窗
            ElMessage.info('正在自动保存数据源配置...')
            setTimeout(() => {
              handleEditSubmit()
            }, 1000)
          } else if (response.data.status === 'waiting') {
            // 继续等待
            steamQRStatus.value = 'waiting'
          }
        } else {
          // 出错或过期
          steamQRStatus.value = 'expired'
          clearInterval(steamQRCheckTimer.value)
          ElMessage.warning(response.data.message || '二维码已过期，请重新生成')
        }
      } catch (error) {
        console.error('检查二维码状态失败:', error)
        clearInterval(steamQRCheckTimer.value)
        steamQRStatus.value = 'expired'
        ElMessage.error('检查二维码状态失败')
      }
    }, 3000) // 每3秒检查一次
  }

  // Steam登录处理函数（编辑数据源时）
  const handleEditSteamLogin = async () => {
    if (!editForm.value.steamUsername || !editForm.value.steamPassword) {
      ElMessage.error('请输入Steam用户名和密码')
      return
    }

    steamLoginLoading.value = true

    try {
      const loginData = {
        username: editForm.value.steamUsername,
        password: editForm.value.steamPassword,
        twofactor_code: editForm.value.steamTwofactorCode || '',
        save_to_db: false
      }

      const response = await axios.post(apiUrls.steamLogin(), loginData)
      const result = response.data

      if (result.success) {
        // 登录成功
        const baseCookies = result.base_cookies || result.baseCookies || result.cookies || ''
        const inventoryCookies = result.inventory_cookies || result.inventoryCookies || result.cookies || ''
        // 参考扫码登录逻辑，同时兼容 result.data 内返回 steam_id 的情况
        const steamIdFromResp =
          result.steam_id ||
          result.steamId ||
          result.data?.steam_id ||
          result.data?.steamId
        editForm.value.steamBaseCookies = baseCookies
        editForm.value.steamInventoryCookies = inventoryCookies
        editForm.value.cookies = inventoryCookies
        if (steamIdFromResp) {
          editForm.value.steamID = steamIdFromResp
        }
        ElMessage.success(steamIdFromResp ? 'Steam重新登录成功，已自动填入SteamID' : 'Steam重新登录成功！请手动输入SteamID')
      } else if (result.requires_twofactor) {
        // 不再弹出提示
      } else if (result.requires_emailauth) {
        ElMessage.warning('需要邮箱验证码，请查收邮件后输入')
      } else if (result.requires_captcha) {
        ElMessage.warning('需要图形验证码，请稍后重试')
      } else {
        ElMessage.error(result.message || '登录失败')
      }
    } catch (error) {
      console.error('Steam登录失败:', error)
      ElMessage.error('Steam登录失败，请检查网络连接')
    } finally {
      steamLoginLoading.value = false
    }
  }

  // 启动数据源列表自动刷新
  const startAutoRefresh = () => {
    // 清除已有定时器
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value)
    }
    
    // 每30分钟自动刷新数据源列表
    autoRefreshTimer.value = setInterval(() => {
      console.log('自动刷新数据源列表（每30分钟）')
      loadDataSources()
    }, 1800000) // 30分钟 = 1800秒 = 1800000毫秒
  }

  // 停止自动刷新
  const stopAutoRefresh = () => {
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value)
      autoRefreshTimer.value = null
    }
  }

  // ==================== 悠悠有品短信登录相关方法 ====================
  
  // 发送短信验证码（添加对话框）
  const handleSendSmsCode = async () => {
    if (!inputForm.value.yyypPhone) {
      ElMessage.error('请输入手机号')
      return
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(inputForm.value.yyypPhone)) {
      ElMessage.error('请输入正确的手机号')
      return
    }
    
    sendingSmsCode.value = true
    try {
      // TODO: 调用后端API发送短信验证码
      // const response = await axios.post(apiUrls.sendYyypSmsCode, {
      //   phone: inputForm.value.yyypPhone
      // })
      
      // 模拟发送成功
      ElMessage.success('验证码已发送，请查收短信')
      
      // 开始倒计时
      smsCodeCountdown.value = 60
      smsCodeTimer.value = setInterval(() => {
        smsCodeCountdown.value--
        if (smsCodeCountdown.value <= 0) {
          clearInterval(smsCodeTimer.value)
          smsCodeTimer.value = null
        }
      }, 1000)
    } catch (error) {
      console.error('发送验证码失败:', error)
      ElMessage.error('发送验证码失败: ' + (error.response?.data?.message || error.message))
    } finally {
      sendingSmsCode.value = false
    }
  }
  
  // 短信登录（添加对话框）
  const handleYyypSmsLogin = async () => {
    if (!inputForm.value.yyypSessionId) {
      ElMessage.error('请先生成或输入Session ID')
      return
    }
    
    if (!inputForm.value.yyypPhone) {
      ElMessage.error('请输入手机号')
      return
    }
    
    if (!inputForm.value.yyypSmsCode) {
      ElMessage.error('请输入验证码')
      return
    }
    
    yyypSmsLoginLoading.value = true
    try {
      // TODO: 调用后端API进行短信登录
      // const response = await axios.post(apiUrls.yyypSmsLogin, {
      //   sessionId: inputForm.value.yyypSessionId,
      //   phone: inputForm.value.yyypPhone,
      //   code: inputForm.value.yyypSmsCode
      // })
      
      // 模拟登录成功，自动填充配置信息
      ElMessage.success('登录成功！配置信息已自动填充')
      yyypSmsLoginStatus.value = 'success'
      
      // 将短信登录的 Session ID 同步到认证令牌配置中
      inputForm.value.sessionid = inputForm.value.yyypSessionId
      
      // TODO: 从后端响应中获取配置信息并填充到表单
      // inputForm.value.phone = response.data.phone
      // inputForm.value.sessionid = response.data.sessionid  // 后端返回的sessionid
      // inputForm.value.token = response.data.token
      // inputForm.value.appVersion = response.data.appVersion
      // inputForm.value.appType = response.data.appType
      // inputForm.value.userId = response.data.userId
      // inputForm.value.steamId = response.data.steamId
      // inputForm.value.deviceName = response.data.deviceName
      // inputForm.value.devicetoken = response.data.devicetoken
      // inputForm.value.deviceid = response.data.deviceid
      // inputForm.value.deviceInfo = response.data.deviceInfo
      // inputForm.value.deviceuk = response.data.deviceuk
      // inputForm.value.uk = response.data.uk
      // inputForm.value.sk = response.data.sk
      
      // 自动展开配置折叠面板
      inputYyypConfigCollapse.value = ['config']
    } catch (error) {
      console.error('短信登录失败:', error)
      ElMessage.error('登录失败: ' + (error.response?.data?.message || error.message))
      yyypSmsLoginStatus.value = 'failed'
    } finally {
      yyypSmsLoginLoading.value = false
    }
  }
  
  // 发送短信验证码（编辑对话框）
  const handleEditSendSmsCode = async () => {
    if (!editForm.value.yyypPhone) {
      ElMessage.error('请输入手机号')
      return
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(editForm.value.yyypPhone)) {
      ElMessage.error('请输入正确的手机号')
      return
    }
    
    editSendingSmsCode.value = true
    try {
      // TODO: 调用后端API发送短信验证码
      // const response = await axios.post(apiUrls.sendYyypSmsCode, {
      //   phone: editForm.value.yyypPhone
      // })
      
      // 模拟发送成功
      ElMessage.success('验证码已发送，请查收短信')
      
      // 开始倒计时
      editSmsCodeCountdown.value = 60
      editSmsCodeTimer.value = setInterval(() => {
        editSmsCodeCountdown.value--
        if (editSmsCodeCountdown.value <= 0) {
          clearInterval(editSmsCodeTimer.value)
          editSmsCodeTimer.value = null
        }
      }, 1000)
    } catch (error) {
      console.error('发送验证码失败:', error)
      ElMessage.error('发送验证码失败: ' + (error.response?.data?.message || error.message))
    } finally {
      editSendingSmsCode.value = false
    }
  }
  
  // 短信登录（编辑对话框）
  const handleEditYyypSmsLogin = async () => {
    if (!editForm.value.yyypSessionId) {
      ElMessage.error('请先生成或输入Session ID')
      return
    }
    
    if (!editForm.value.yyypPhone) {
      ElMessage.error('请输入手机号')
      return
    }
    
    if (!editForm.value.yyypSmsCode) {
      ElMessage.error('请输入验证码')
      return
    }
    
    editYyypSmsLoginLoading.value = true
    try {
      // TODO: 调用后端API进行短信登录
      // const response = await axios.post(apiUrls.yyypSmsLogin, {
      //   sessionId: editForm.value.yyypSessionId,
      //   phone: editForm.value.yyypPhone,
      //   code: editForm.value.yyypSmsCode
      // })
      
      // 模拟登录成功，自动填充配置信息
      ElMessage.success('登录成功！配置信息已自动填充')
      
      // 将短信登录的 Session ID 同步到认证令牌配置中
      editForm.value.sessionid = editForm.value.yyypSessionId
      
      // TODO: 从后端响应中获取配置信息并填充到表单
      // editForm.value.phone = response.data.phone
      // editForm.value.sessionid = response.data.sessionid  // 后端返回的sessionid
      // editForm.value.token = response.data.token
      // editForm.value.appVersion = response.data.appVersion
      // editForm.value.appType = response.data.appType
      // editForm.value.userId = response.data.userId
      // editForm.value.steamId = response.data.steamId
      // editForm.value.deviceName = response.data.deviceName
      // editForm.value.devicetoken = response.data.devicetoken
      // editForm.value.deviceid = response.data.deviceid
      // editForm.value.deviceInfo = response.data.deviceInfo
      // editForm.value.deviceuk = response.data.deviceuk
      // editForm.value.uk = response.data.uk
      // editForm.value.sk = response.data.sk
      
      // 自动展开配置折叠面板，方便查看
      editYyypBasicCollapse.value = ['basic']
      editYyypTokenCollapse.value = ['token']
    } catch (error) {
      console.error('短信登录失败:', error)
      ElMessage.error('登录失败: ' + (error.response?.data?.message || error.message))
    } finally {
      editYyypSmsLoginLoading.value = false
    }
  }
  
  // 生成SessionID（添加对话框）
  const handleGenerateSessionId = async () => {
    generatingSessionId.value = true
    try {
      // TODO: 调用后端API生成SessionID
      // const response = await axios.post(apiUrls.generateYyypSessionId)
      // inputForm.value.yyypSessionId = response.data.sessionId
      
      // 模拟生成SessionID
      const randomSessionId = 'SESSION_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      inputForm.value.yyypSessionId = randomSessionId
      ElMessage.success('SessionID生成成功')
    } catch (error) {
      console.error('生成SessionID失败:', error)
      ElMessage.error('生成SessionID失败: ' + (error.response?.data?.message || error.message))
    } finally {
      generatingSessionId.value = false
    }
  }
  
  // 生成SessionID（编辑对话框）
  const handleEditGenerateSessionId = async () => {
    editGeneratingSessionId.value = true
    try {
      // TODO: 调用后端API生成SessionID
      // const response = await axios.post(apiUrls.generateYyypSessionId)
      // editForm.value.yyypSessionId = response.data.sessionId
      
      // 模拟生成SessionID
      const randomSessionId = 'SESSION_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      editForm.value.yyypSessionId = randomSessionId
      ElMessage.success('SessionID生成成功')
    } catch (error) {
      console.error('生成SessionID失败:', error)
      ElMessage.error('生成SessionID失败: ' + (error.response?.data?.message || error.message))
    } finally {
      editGeneratingSessionId.value = false
    }
  }
  
  // 生成DeviceID（添加对话框）
  const handleGenerateDeviceId = async () => {
    generatingDeviceId.value = true
    try {
      // TODO: 调用后端API生成DeviceID
      // const response = await axios.post(apiUrls.generateYyypDeviceId)
      // inputForm.value.yyypDeviceId = response.data.deviceId
      
      // 模拟生成DeviceID
      const randomDeviceId = 'DEVICE_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      inputForm.value.yyypDeviceId = randomDeviceId
      ElMessage.success('DeviceID生成成功')
    } catch (error) {
      console.error('生成DeviceID失败:', error)
      ElMessage.error('生成DeviceID失败: ' + (error.response?.data?.message || error.message))
    } finally {
      generatingDeviceId.value = false
    }
  }
  
  // 生成DeviceID（编辑对话框）
  const handleEditGenerateDeviceId = async () => {
    editGeneratingDeviceId.value = true
    try {
      // TODO: 调用后端API生成DeviceID
      // const response = await axios.post(apiUrls.generateYyypDeviceId)
      // editForm.value.yyypDeviceId = response.data.deviceId
      
      // 模拟生成DeviceID
      const randomDeviceId = 'DEVICE_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      editForm.value.yyypDeviceId = randomDeviceId
      ElMessage.success('DeviceID生成成功')
    } catch (error) {
      console.error('生成DeviceID失败:', error)
      ElMessage.error('生成DeviceID失败: ' + (error.response?.data?.message || error.message))
    } finally {
      editGeneratingDeviceId.value = false
    }
  }

  onMounted(() => {
    loadDataSources()
    startAutoRefresh() // 启动自动刷新
  })
  
  // 页面卸载时清理定时器
  onBeforeUnmount(() => {
    stopAutoRefresh()
    if (steamQRCheckTimer.value) {
      clearInterval(steamQRCheckTimer.value)
    }
    if (tokenCheckTimer.value) {
      clearInterval(tokenCheckTimer.value)
    }
    // 注意：全局定时器不需要在组件卸载时清理，它会持续运行
  })

  return {
    submitting,
    testing,
    refreshing,
    editingSourceId,
    collectingSourceIds,
    editDialogVisible,
    editSubmitting,
    addDialogVisible,
    isIndependentDataSourceMode,
    isListCollapsed,
    editForm,
    inputForm,
    dataSources,
    independentDataSources,
    groupedDataSources,
    currentSteamID,
    existingTypesInCurrentGroup,
    isTypeDisabled,
    isIndependentTypeDisabled,
    getSourceTypeLabel,
    getSourceTypeColor,
    getUpdateFreqLabel,
    formatTime,
    handleSubmit,
    resetForm,
    testConnection,
    testSourceConnection,
    startCollection,
    editSource,
    toggleEditSourceStatus,
    handleEditDialogClose,
    handleEditSubmit,
    handleEditCollectAll,
    // 表单组件引用
    youpinFormRef,
    buffFormRef,
    perfectWorldFormRef,
    csfloatFormRef,
    c5gameFormRef,
    // GetAppToken 相关
    buffTokenLoading,
    yyypTokenLoading,
    perfectWorldTokenLoading,
    csfloatTokenLoading,
    buffTokenStatus,
    yyypTokenStatus,
    perfectWorldTokenStatus,
    csfloatTokenStatus,
    startBuffTokenCollection,
    startYyypTokenCollection,
    startPerfectWorldTokenCollection,
    startCsfloatTokenCollection,
    proxyAddress,
    // 悠悠有品短信登录相关
    yyypSmsLoginLoading,
    yyypSmsLoginStatus,
    sendingSmsCode,
    smsCodeCountdown,
    handleSendSmsCode,
    handleYyypSmsLogin,
    generatingSessionId,
    handleGenerateSessionId,
    generatingDeviceId,
    handleGenerateDeviceId,
    editYyypSmsLoginLoading,
    editSendingSmsCode,
    editSmsCodeCountdown,
    handleEditSendSmsCode,
    handleEditYyypSmsLogin,
    editGeneratingSessionId,
    handleEditGenerateSessionId,
    editGeneratingDeviceId,
    handleEditGenerateDeviceId,
    // 编辑对话框折叠面板
    editYyypBasicCollapse,
    editYyypTokenCollapse,
    editYyypDeviceCollapse,
    editYyypAdvancedCollapse,
    editBuffBasicCollapse,
    editBuffAppCollapse,
    editBuffDeviceCollapse,
    editBuffSystemCollapse,
    editBuffDisplayCollapse,
    editBuffLocaleCollapse,
    inputBuffCollapse,
    inputPerfectWorldCollapse,
    inputCsfloatCollapse,
    inputCsqaqCollapse,
    inputSteamdtCollapse,
    inputSteamCollapse,
    inputYyypConfigCollapse,
    editSteamCollapse,
    editSteamLoginCollapse,
    editPerfectWorldCollapse,
    editCsfloatCollapse,
    editCsqaqCollapse,
    editSteamdtCollapse,
    handleEditBuffCollectAll,
    handleEditCsfloatCollectAll,
    handleEditC5gameCollectAll,
    handleEditSteamCollectAll,
    handleEditDelete,
    openAddDialog,
    openAddDialogForNewSteam,
    openAddIndependentDataSource,
    handleAddDialogClose,
    removeSource,
    refreshAllSources,
    steamLoginLoading,
    handleSteamLogin,
    handleEditSteamLogin,
    handleEditGenerateQRCode,
    steamQRCode,
    steamQRLoading,
    steamQRStatus,
    handleGenerateQRCode,
    getSteamQRStatusText
  }
}
