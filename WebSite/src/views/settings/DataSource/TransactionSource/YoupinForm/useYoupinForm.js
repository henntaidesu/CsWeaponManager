import { ref, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Grid, Loading, CircleCheck } from '@element-plus/icons-vue'
import axios from 'axios'
import { apiUrls } from '@/config/api.js'

export default function useYoupinForm(props, { emit }) {
    const yyypTokenLoading = ref(false)
    const yyypTokenStatus = ref('')
    const tokenCheckTimer = ref(null)
    const basicCollapse = ref([])
    const tokenCollapse = ref([])
    const deviceCollapse = ref([])
    const advancedCollapse = ref([])

    // 更新表单数据
    const updateForm = (updates) => {
      emit('update:form', { ...props.form, ...updates })
    }

    // 更新代理地址
    const updateProxyAddress = (address) => {
      emit('update:proxyAddress', address)
    }

    // 开始悠悠有品令牌收集
    const startYyypTokenCollection = async () => {
      try {
        yyypTokenLoading.value = true
        yyypTokenStatus.value = 'waiting'
        
        const url = apiUrls.getAppTokenStartYyyp()
        const response = await axios.post(url)
        
        if (response.data.code === 200) {
          if (response.data.data && response.data.data.proxy_address) {
            updateProxyAddress(response.data.data.proxy_address)
          }
          ElMessage.success('悠悠有品代理服务器已启动，请在手机上配置代理')
          if (response.data.data?.proxy_address) {
            ElMessage.info({
              message: `代理地址: ${response.data.data.proxy_address}`,
              duration: 5000
            })
          }
          
          startYyypTokenPolling()
        } else {
          ElMessage.error(response.data.msg || '启动悠悠有品代理失败')
          yyypTokenLoading.value = false
          yyypTokenStatus.value = 'failed'
        }
      } catch (error) {
        ElMessage.error('启动悠悠有品代理失败: ' + (error.message || '网络错误'))
        yyypTokenLoading.value = false
        yyypTokenStatus.value = 'failed'
      }
    }

    // 开始轮询获取令牌数据
    const startYyypTokenPolling = () => {
      if (tokenCheckTimer.value) {
        clearInterval(tokenCheckTimer.value)
      }
      
      tokenCheckTimer.value = setInterval(async () => {
        try {
          const url = apiUrls.getAppTokenGetYyypData()
          const response = await axios.get(url)
          
          if (response.data.code === 200) {
            const data = response.data.data
            
            updateForm({
              sessionid: data.Sessionid,
              token: data.authorization,
              deviceName: `${data.device_manu} ${data.device_model}`,
              appVersion: data.app_version,
              appType: data.apptype,
              userId: data.userId,
              steamId: data.steamId,
              devicetoken: data.devicetoken,
              deviceid: data.deviceid,
              deviceuk: data.deviceuk,
              uk: data.uk,
              sk: data.sk,
              deviceInfo: data.device_info,
              phone: data.phone || props.form.phone
            })
            
            ElMessage.success('悠悠有品 Token 获取成功!')
            yyypTokenStatus.value = 'success'
            yyypTokenLoading.value = false

            if (tokenCheckTimer.value) {
              clearInterval(tokenCheckTimer.value)
              tokenCheckTimer.value = null
            }

            stopYyypTokenCollection()

            // 发射令牌获取成功事件，触发自动保存
            emit('token-success')
          }
        } catch (error) {
          // 获取令牌数据失败时静默处理或由调用方提示
        }
      }, 3000)
    }

    // 停止令牌收集
    const stopYyypTokenCollection = async () => {
      try {
        await axios.post(apiUrls.getAppTokenStopYyyp())
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
      await stopYyypTokenCollection()

      // 重置状态
      yyypTokenLoading.value = false
      yyypTokenStatus.value = ''
    }

    onBeforeUnmount(() => {
      cleanup()
    })

    return {
      Grid,
      Loading,
      CircleCheck,
      yyypTokenLoading,
      yyypTokenStatus,
      basicCollapse,
      tokenCollapse,
      deviceCollapse,
      advancedCollapse,
      startYyypTokenCollection,
      cleanup
    }
  }
