<template>
  <div class="buff-form">
    <el-form-item>
      <el-button 
        type="success" 
        @click="startBuffTokenCollection" 
        :loading="buffTokenLoading"
        :disabled="buffTokenStatus === 'success'"
        style="width: 100%;"
      >
        <el-icon style="margin-right: 5px;"><Grid /></el-icon>
        {{ buffTokenLoading ? '正在获取令牌...' : buffTokenStatus === 'success' ? '✓ 令牌已获取' : (isEditMode ? '重新获取BUFF令牌' : '一键获取BUFF令牌') }}
      </el-button>
      <div v-if="buffTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; border-left: 3px solid var(--accent-orange);">
        <div style="color: var(--accent-orange); font-weight: 500; margin-bottom: 5px;">
          <el-icon><Loading /></el-icon> 等待手机APP访问...
        </div>
        <div style="color: var(--text-secondary); font-size: 12px;">
          1. 在手机WiFi设置中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
          2. 打开已经登录的BUFF APP<br/>
          3. 系统将自动获取令牌
        </div>
      </div>
      <div v-if="buffTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; border-left: 3px solid var(--accent-green);">
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
        <el-form-item label="Cookie" required>
          <el-input 
            v-model="form.cookie" 
            type="textarea"
            :rows="3"
            placeholder="请输入Cookie"
          />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
    
    <!-- 应用信息配置 -->
    <el-collapse v-model="appCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="应用信息配置" name="app">
        <el-form-item label="app-version" required>
          <el-input v-model="form.buffAppVersion" placeholder="请输入app-version" />
        </el-form-item>
        <el-form-item label="app-version-code">
          <el-input v-model="form.buffAppVersionCode" placeholder="请输入app-version-code" />
        </el-form-item>
        <el-form-item label="channel">
          <el-input v-model="form.buffChannel" placeholder="请输入channel" />
        </el-form-item>
        <el-form-item label="user-agent">
          <el-input v-model="form.buffUserAgent" placeholder="请输入user-agent" />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
    
    <!-- 设备信息配置 -->
    <el-collapse v-model="deviceCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="设备信息配置" name="device">
        <el-form-item label="device-id">
          <el-input v-model="form.buffDeviceId" placeholder="请输入device-id" />
        </el-form-item>
        <el-form-item label="device-id-weak">
          <el-input v-model="form.buffDeviceIdWeak" placeholder="请输入device-id-weak" />
        </el-form-item>
        <el-form-item label="devicename">
          <el-input v-model="form.buffDevicename" placeholder="请输入devicename" />
        </el-form-item>
        <el-form-item label="brand">
          <el-input v-model="form.buffBrand" placeholder="请输入brand" />
        </el-form-item>
        <el-form-item label="manufacturer">
          <el-input v-model="form.buffManufacturer" placeholder="请输入manufacturer" />
        </el-form-item>
        <el-form-item label="model">
          <el-input v-model="form.buffModel" placeholder="请输入model" />
        </el-form-item>
        <el-form-item label="product">
          <el-input v-model="form.buffProduct" placeholder="请输入product" />
        </el-form-item>
        <el-form-item label="build-fingerprint">
          <el-input v-model="form.buffBuildFingerprint" placeholder="请输入build-fingerprint" />
        </el-form-item>
        <el-form-item label="seed">
          <el-input v-model="form.buffSeed" placeholder="请输入seed" />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
    
    <!-- 系统信息配置 -->
    <el-collapse v-model="systemCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="系统信息配置" name="system">
        <el-form-item label="system-type">
          <el-input v-model="form.buffSystemType" placeholder="请输入system-type" />
        </el-form-item>
        <el-form-item label="system-version">
          <el-input v-model="form.buffSystemVersion" placeholder="请输入system-version" />
        </el-form-item>
        <el-form-item label="rom">
          <el-input v-model="form.buffRom" placeholder="请输入rom" />
        </el-form-item>
        <el-form-item label="rom-id">
          <el-input v-model="form.buffRomId" placeholder="请输入rom-id" />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
    
    <!-- 显示与网络配置 -->
    <el-collapse v-model="displayCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="显示与网络配置" name="display">
        <el-form-item label="resolution">
          <el-input v-model="form.buffResolution" placeholder="请输入resolution" />
        </el-form-item>
        <el-form-item label="screen-density">
          <el-input v-model="form.buffScreenDensity" placeholder="请输入screen-density" />
        </el-form-item>
        <el-form-item label="screen-size">
          <el-input v-model="form.buffScreenSize" placeholder="请输入screen-size" />
        </el-form-item>
        <el-form-item label="network">
          <el-input v-model="form.buffNetwork" placeholder="请输入network" />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
    
    <!-- 时区与本地化配置 -->
    <el-collapse v-model="localeCollapse" style="margin-bottom: 20px;">
      <el-collapse-item title="时区与本地化配置" name="locale">
        <el-form-item label="timestamp">
          <el-input v-model="form.buffTimestamp" placeholder="请输入timestamp" />
        </el-form-item>
        <el-form-item label="timezone">
          <el-input v-model="form.buffTimezone" placeholder="请输入timezone" />
        </el-form-item>
        <el-form-item label="timezone-offset">
          <el-input v-model="form.buffTimezoneOffset" placeholder="请输入timezone-offset" />
        </el-form-item>
        <el-form-item label="timezone-offset-dst">
          <el-input v-model="form.buffTimezoneOffsetDst" placeholder="请输入timezone-offset-dst" />
        </el-form-item>
        <el-form-item label="locale">
          <el-input v-model="form.buffLocale" placeholder="请输入locale" />
        </el-form-item>
        <el-form-item label="locale-supported">
          <el-input v-model="form.buffLocaleSupported" placeholder="请输入locale-supported" />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>

  </div>
</template>

<script>
import useBuffForm from './useBuffForm.js'
import { Grid, Loading, CircleCheck } from '@element-plus/icons-vue'

export default {
  name: 'BuffForm',
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
    return useBuffForm(props, { emit })
  }
}
</script>
<style scoped src="./styles.css"></style>
