<template>
  <div class="igxe-form">
    <el-form-item>
      <el-button
        type="success"
        @click="startIgxeTokenCollection"
        :loading="igxeTokenLoading"
        :disabled="igxeTokenStatus === 'success'"
        style="width: 100%;"
      >
        <el-icon style="margin-right: 5px;"><Grid /></el-icon>
        {{ igxeTokenLoading ? '正在获取令牌...' : igxeTokenStatus === 'success' ? '✓ 令牌已获取' : (isEditMode ? '重新获取IGXE令牌' : '一键获取IGXE令牌') }}
      </el-button>
      <div v-if="igxeTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; border-left: 3px solid var(--accent-orange);">
        <div style="color: var(--accent-orange); font-weight: 500; margin-bottom: 5px;">
          <el-icon><Loading /></el-icon> 等待手机APP访问...
        </div>
        <div style="color: var(--text-secondary); font-size: 12px;">
          1. 在手机WiFi设置中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
          2. 打开已经登录的 IGXE APP，进入「我的」页面<br/>
          3. 系统将自动获取令牌
        </div>
      </div>
      <div v-if="igxeTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; border-left: 3px solid var(--accent-green);">
        <div style="color: var(--accent-green); font-weight: 500;">
          <el-icon><CircleCheck /></el-icon> 令牌获取成功!
        </div>
      </div>
    </el-form-item>

    <!-- 基础配置 -->
    <el-collapse v-model="basicCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="基础配置" name="basic">
        <el-form-item label="SteamID" required>
          <el-input v-model="form.steamID" placeholder="请输入SteamID" />
        </el-form-item>
        <el-form-item label="token" required>
          <el-input
            v-model="form.igxeToken"
            type="textarea"
            :rows="3"
            placeholder="请输入登录令牌 token"
          />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>

    <!-- 应用信息配置 -->
    <el-collapse v-model="appCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="应用信息配置" name="app">
        <el-form-item label="versions">
          <el-input v-model="form.igxeVersions" placeholder="请输入 versions（版本号，如 562）" />
        </el-form-item>
        <el-form-item label="SERVER-VERSION">
          <el-input v-model="form.igxeServerVersion" placeholder="请输入 SERVER-VERSION（如 5.6.2）" />
        </el-form-item>
        <el-form-item label="client-type">
          <el-input v-model="form.igxeClientType" placeholder="请输入 client-type（Android 固定为 2）" />
        </el-form-item>
        <el-form-item label="channel">
          <el-input v-model="form.igxeChannel" placeholder="请输入 channel（固定为 igxe）" />
        </el-form-item>
        <el-form-item label="theme">
          <el-input v-model="form.igxeTheme" placeholder="请输入 theme（light / dark）" />
        </el-form-item>
        <el-form-item label="device-info">
          <el-input v-model="form.igxeDeviceInfo" placeholder="请输入 device-info（Base64 设备信息）" />
        </el-form-item>
        <el-form-item label="User-Agent">
          <el-input v-model="form.igxeUserAgent" placeholder="请输入 User-Agent" />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>

  </div>
</template>

<script>
import useIGXEForm from './useIGXEForm.js'
import { Grid, Loading, CircleCheck } from '@element-plus/icons-vue'

export default {
  name: 'IGXEForm',
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
    return useIGXEForm(props, { emit })
  }
}
</script>

<style scoped src="./styles.css"></style>
