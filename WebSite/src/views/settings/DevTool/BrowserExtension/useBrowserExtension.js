import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

export function useBrowserExtension() {
  // 状态
  const extensionInstalled = ref(false)
  const lastUpdate = ref(null)
  const showPath = ref(false)
  const copied = ref(false)

  // 扩展路径(绝对路径)
  const extensionPath = ref('D:\\Project\\CsWeaponManager\\WebSite\\browser-extension')

  /**
   * 检查扩展是否已安装
   */
  const checkExtensionStatus = () => {
    if (window.SteamDTInterceptor && window.SteamDTInterceptor.isInstalled()) {
      extensionInstalled.value = true

      // 尝试获取最后更新时间
      loadExtensionData()
    } else {
      extensionInstalled.value = false
    }
  }

  /**
   * 加载扩展数据
   */
  const loadExtensionData = async () => {
    if (!window.SteamDTInterceptor) return

    try {
      const data = await window.SteamDTInterceptor.getData()
      if (data.lastUpdate) {
        lastUpdate.value = data.lastUpdate
      }
    } catch (error) {
      console.error('[BrowserExtension] 获取扩展数据失败:', error)
    }
  }

  /**
   * 一键安装扩展(自动化流程)
   */
  const oneClickInstall = async () => {
    try {
      // 步骤1:复制路径
      await navigator.clipboard.writeText(extensionPath.value)
      ElMessage.success('✅ 扩展路径已复制到剪贴板')

      // 步骤2:延迟打开扩展页面
      setTimeout(() => {
        window.open('chrome://extensions/', '_blank')

        // 步骤3:显示引导提示
        setTimeout(() => {
          ElMessage({
            type: 'warning',
            dangerouslyUseHTMLString: true,
            message: `
              <div style="text-align: left;">
                <strong>请按以下步骤完成安装:</strong><br/>
                1️⃣ 在新打开的扩展页面,开启"开发者模式"(右上角开关)<br/>
                2️⃣ 点击"加载已解压的扩展程序"<br/>
                3️⃣ 粘贴路径(已复制): <code style="background:#f4f4f5;padding:2px 6px;">Ctrl+V</code><br/>
                4️⃣ 回到本页面点击"刷新页面"按钮
              </div>
            `,
            duration: 15000,
            showClose: true
          })
        }, 500)
      }, 500)

    } catch (error) {
      console.error('[BrowserExtension] 一键安装失败:', error)
      ElMessage.error('操作失败,请使用手动安装')
      showPath.value = true
    }
  }

  /**
   * 打开浏览器扩展页面
   */
  const openExtensionPage = () => {
    // Chrome/Edge 扩展页面
    window.open('chrome://extensions/', '_blank')
    ElMessage.success('已打开扩展页面')
  }

  /**
   * 显示扩展路径
   */
  const showExtensionPath = () => {
    showPath.value = true
    ElMessage.info('请复制路径并在扩展页面加载')
  }

  /**
   * 复制扩展路径
   */
  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(extensionPath.value)
      copied.value = true
      ElMessage.success('路径已复制到剪贴板')

      // 3秒后重置按钮状态
      setTimeout(() => {
        copied.value = false
      }, 3000)
    } catch (error) {
      console.error('[BrowserExtension] 复制失败:', error)
      ElMessage.error('复制失败,请手动复制')
    }
  }

  /**
   * 刷新页面
   */
  const refreshPage = () => {
    window.location.reload()
  }

  /**
   * 测试扩展
   */
  const testExtension = async () => {
    if (!extensionInstalled.value) {
      ElMessage.warning('扩展未安装,无法测试')
      return
    }

    try {
      const data = await window.SteamDTInterceptor.getData()

      if (data.marketIndex) {
        ElMessage.success('测试成功!已拦截到大盘指数数据')
      } else if (data.klineData) {
        ElMessage.success('测试成功!已拦截到K线数据')
      } else {
        ElMessage.info('扩展运行正常,但暂无拦截数据。请访问主页并等待 SteamDT iframe 加载。')
      }
    } catch (error) {
      console.error('[BrowserExtension] 测试失败:', error)
      ElMessage.error('测试失败:' + error.message)
    }
  }

  /**
   * 格式化时间
   */
  const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 组件挂载时检查扩展状态
  onMounted(() => {
    // 延迟检查,确保扩展 content script 已加载
    setTimeout(() => {
      checkExtensionStatus()
    }, 500)
  })

  return {
    // 状态
    extensionInstalled,
    lastUpdate,
    showPath,
    extensionPath,
    copied,

    // 方法
    oneClickInstall,
    openExtensionPage,
    showExtensionPath,
    copyPath,
    refreshPage,
    testExtension,
    checkExtensionStatus,
    formatTime
  }
}
