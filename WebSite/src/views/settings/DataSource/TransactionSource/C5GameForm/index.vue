<template>
  <div class="c5game-form">
    <el-form-item>
      <el-button 
        type="success" 
        @click="startC5GameTokenCollection" 
        :loading="c5gameTokenLoading"
        :disabled="c5gameTokenStatus === 'success'"
        style="width: 100%;"
      >
        <el-icon style="margin-right: 5px;"><Grid /></el-icon>
        {{ c5gameTokenLoading ? '正在获取令牌...' : c5gameTokenStatus === 'success' ? '✓ 令牌已获取' : (isEditMode ? '重新获取C5 GAME令牌' : '一键获取C5 GAME令牌') }}
      </el-button>
      <div v-if="c5gameTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; border-left: 3px solid var(--accent-orange);">
        <div style="color: var(--accent-orange); font-weight: 500; margin-bottom: 5px;">
          <el-icon><Loading /></el-icon> 等待手机APP访问...
        </div>
        <div style="color: var(--text-secondary); font-size: 12px;">
          1. 在手机WiFi设置中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
          2. 打开已经登录的C5 GAME APP<br/>
          3. 系统将自动获取令牌
        </div>
      </div>
      <div v-if="c5gameTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; border-left: 3px solid var(--accent-green);">
        <div style="color: var(--accent-green); font-weight: 500;">
          <el-icon><CircleCheck /></el-icon> 令牌获取成功!
        </div>
      </div>
    </el-form-item>

    <el-form-item label="自动登录">
      <el-switch
        v-model="autoLoginEnabled"
        active-text="开启"
        inactive-text="关闭"
        @change="handleAutoLoginSwitchChange"
      />
    </el-form-item>
    <el-form-item v-if="autoLoginEnabled" label="用户名" required>
      <el-input v-model="form.c5gameAutoLoginUsername" placeholder="请输入 C5 用户名" />
    </el-form-item>
    <el-form-item v-if="autoLoginEnabled" label="密码" required>
      <el-input
        v-model="form.c5gameAutoLoginPassword"
        type="password"
        show-password
        placeholder="请输入 C5 密码"
      />
    </el-form-item>
    
    <!-- 基础配置 -->
    <el-collapse v-model="basicCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="基础配置" name="basic">
        <el-form-item label="SteamID" required>
          <el-input v-model="form.steamID" placeholder="请输入SteamID" />
        </el-form-item>
        <el-form-item label="访问令牌" required>
          <el-input 
            v-model="form.c5gameAccessToken" 
            type="textarea"
            :rows="3"
            placeholder="请输入x-access-token"
          />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
    
    <!-- 设备信息配置 -->
    <el-collapse v-model="deviceCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="设备信息配置" name="device">
        <el-form-item label="设备ID" required>
          <el-input v-model="form.c5gameDeviceId" placeholder="请输入x-device-id" />
        </el-form-item>
        <el-form-item label="设备型号" required>
          <el-input v-model="form.c5gameDeviceModel" placeholder="请输入x-device-model" />
        </el-form-item>
        <el-form-item label="设备系统" required>
          <el-input v-model="form.c5gameDeviceOs" placeholder="请输入x-device-os" />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
    
    <!-- 应用信息配置 -->
    <el-collapse v-model="appCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="应用信息配置" name="app">
        <el-form-item label="User Agent" required>
          <el-input
            v-model="form.c5gameUserAgent"
            placeholder="须与 x-sign 同一次抓包，如 C5GAME App;409020;Flutter (Android)"
          />
        </el-form-item>
        <el-form-item label="应用版本号" required>
          <el-input v-model="form.c5gameAppVersionCode" placeholder="请输入x-app-version-code" />
        </el-form-item>
        <el-form-item label="应用渠道" required>
          <el-input v-model="form.c5gameAppChannel" placeholder="请输入x-app-channel" />
        </el-form-item>
        <el-form-item label="来源标识" required>
          <el-input v-model="form.c5gameSource" placeholder="请输入x-source" />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
    
    <!-- 签名与验证配置 -->
    <el-collapse v-model="signatureCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="签名与验证配置" name="signature">
        <el-form-item label="签名" required>
          <el-input v-model="form.c5gameSign" placeholder="请输入x-sign" />
        </el-form-item>
        <el-form-item label="风险设备信息" required>
          <el-input 
            v-model="form.c5gameRdi" 
            type="textarea"
            :rows="5"
            placeholder="请输入rdi（风险设备标识）"
          />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
    
    <!-- 系统配置 -->
    <el-collapse v-model="systemCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="系统配置" name="system">
        <el-form-item label="语言设置">
          <el-input v-model="form.c5gameAcceptLanguage" placeholder="请输入accept-language" />
        </el-form-item>
        <el-form-item label="UA标识">
          <el-input v-model="form.c5gameXUa" placeholder="须与 user-agent 同客户端，如 Dart/3.8.1 或 Dalvik/…" />
        </el-form-item>
        <el-form-item label="请求开始时间">
          <el-input v-model="form.c5gameStartReqTime" placeholder="请输入x-start-req-time" />
        </el-form-item>
        <el-form-item label="内容类型">
          <el-input v-model="form.c5gameContentType" placeholder="请输入content-type" />
        </el-form-item>
        <el-form-item label="编码方式">
          <el-input v-model="form.c5gameAcceptEncoding" placeholder="请输入accept-encoding" />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>

  </div>
</template>

<script>
import { computed } from 'vue'
import useC5GameForm from './useC5GameForm.js'
import { Grid, Loading, CircleCheck } from '@element-plus/icons-vue'

export default {
  name: 'C5GameForm',
  components: {
    Grid,
    Loading,
    CircleCheck
  },
  props: {
    form: {
      type: Object,
      required: true
    },
    isEditMode: {
      type: Boolean,
      default: false
    },
    proxyAddress: {
      type: String,
      default: ''
    }
  },
  emits: ['update:form', 'update:proxyAddress', 'token-success'],
  setup(props, { emit }) {
    const c5FormState = useC5GameForm(props, { emit })

    const autoLoginEnabled = computed({
      get: () => !!props.form.c5gameAutoLogin,
      set: (value) => {
        emit('update:form', {
          ...props.form,
          c5gameAutoLogin: !!value
        })
      }
    })

    const handleAutoLoginSwitchChange = (enabled) => {
      if (!enabled) {
        emit('update:form', {
          ...props.form,
          c5gameAutoLogin: false,
          c5gameAutoLoginUsername: '',
          c5gameAutoLoginPassword: ''
        })
      }
    }

    return {
      ...c5FormState,
      autoLoginEnabled,
      handleAutoLoginSwitchChange
    }
  }
}
</script>

<style scoped src="./styles.css"></style>

