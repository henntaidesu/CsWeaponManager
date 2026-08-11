import { ref, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Grid, Loading, CircleCheck } from '@element-plus/icons-vue'
import axios from 'axios'
import { apiUrls } from '@/config/api.js'

export default function useIGXEForm(props, { emit }) {
    const igxeTokenLoading = ref(false)
    const igxeTokenStatus = ref('')
    const tokenCheckTimer = ref(null)
    const basicCollapse = ref([])
    const appCollapse = ref([])

    // 更新表单数据
    const updateForm = (updates) => {
      emit('update:form', { ...props.form, ...updates })
    }

    // 更新代理地址
    const updateProxyAddress = (address) => {
      emit('update:proxyAddress', address)
    }

    // 开始IGXE令牌收集
    const startIgxeTokenCollection = async () => {
      try {
        igxeTokenLoading.value = true
        igxeTokenStatus.value = 'waiting'

        const url = apiUrls.getAppTokenStartIgxe()
        const response = await axios.post(url)

        if (response.data.code === 200) {
          if (response.data.data && response.data.data.proxy_address) {
            updateProxyAddress(response.data.data.proxy_address)
          }
          ElMessage.success('IGXE代理服务器已启动，请在手机上配置代理')
          if (response.data.data?.proxy_address) {
            ElMessage.info({
              message: `代理地址: ${response.data.data.proxy_address}`,
              duration: 5000
            })
          }

          startIgxeTokenPolling()
        } else {
          ElMessage.error(response.data.msg || '启动IGXE代理失败')
          igxeTokenLoading.value = false
          igxeTokenStatus.value = 'failed'
        }
      } catch (error) {
        ElMessage.error('启动IGXE代理失败: ' + (error.message || '网络错误'))
        igxeTokenLoading.value = false
        igxeTokenStatus.value = 'failed'
      }
    }

    // 开始轮询获取令牌数据
    const startIgxeTokenPolling = () => {
      if (tokenCheckTimer.value) {
        clearInterval(tokenCheckTimer.value)
      }

      tokenCheckTimer.value = setInterval(async () => {
        try {
          const url = apiUrls.getAppTokenGetIgxeData()
          const response = await axios.get(url)

          if (response.data.code === 200) {
            const data = response.data.data

            updateForm({
              igxeToken: data.token,
              steamID: data.steam_uid,  // 后端返回的是 steam_uid
              igxeVersions: data.versions,
              igxeServerVersion: data.server_version,
              igxeClientType: data.client_type,
              igxeChannel: data.channel,
              igxeTheme: data.theme,
              igxeDeviceInfo: data.device_info,
              igxeUserAgent: data.user_agent
            })

            ElMessage.success('IGXE Token 获取成功!')
            igxeTokenStatus.value = 'success'
            igxeTokenLoading.value = false

            if (tokenCheckTimer.value) {
              clearInterval(tokenCheckTimer.value)
              tokenCheckTimer.value = null
            }

            stopIgxeTokenCollection()

            // 发射令牌获取成功事件，触发自动保存
            emit('token-success')
          }
        } catch (error) {
          // 获取令牌数据失败时静默处理或由调用方提示
        }
      }, 3000)
    }

    // 停止令牌收集
    const stopIgxeTokenCollection = async () => {
      try {
        await axios.post(apiUrls.getAppTokenStopIgxe())
      } catch (error) {
        // 停止代理服务器失败时静默处理
      }
    }

    // 清理方法 - 用于对话框关闭时调用
    const cleanup = async () => {
      // 清除轮询定时器
      if (tokenCheckTimer.value) {
        clearInterval(tokenCheckTimer.value)
        tokenCheckTimer.value = null
      }

      // 停止SSL代理服务
      await stopIgxeTokenCollection()

      // 重置状态
      igxeTokenLoading.value = false
      igxeTokenStatus.value = ''
    }

    onBeforeUnmount(() => {
      cleanup()
    })

    return {
      Grid,
      Loading,
      CircleCheck,
      igxeTokenLoading,
      igxeTokenStatus,
      basicCollapse,
      appCollapse,
      startIgxeTokenCollection,
      cleanup
    }
  }
