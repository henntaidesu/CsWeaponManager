<template>
  <div class="csfloat-form">
    <el-form-item>
      <el-button 
        type="success" 
        @click="startCsfloatTokenCollection" 
        :loading="csfloatTokenLoading"
        :disabled="csfloatTokenStatus === 'success'"
        style="width: 100%;"
      >
        <el-icon style="margin-right: 5px;"><Grid /></el-icon>
        {{ csfloatTokenLoading ? '正在获取令牌...' : csfloatTokenStatus === 'success' ? '✓ 令牌已获取' : (isEditMode ? '重新获取CsFloat令牌' : '一键获取CsFloat令牌') }}
      </el-button>
      <div v-if="csfloatTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: #fff7e6; border-radius: 4px; border-left: 3px solid #faad14;">
        <div style="color: #faad14; font-weight: 500; margin-bottom: 5px;">
          <el-icon><Loading /></el-icon> 等待浏览器访问...
        </div>
        <div style="color: #666; font-size: 12px;">
          1. 在浏览器中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
          2. 访问已经登录的 https://csfloat.com<br/>
          3. 系统将自动获取令牌
        </div>
      </div>
      <div v-if="csfloatTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: #f6ffed; border-radius: 4px; border-left: 3px solid #52c41a;">
        <div style="color: #52c41a; font-weight: 500;">
          <el-icon><CircleCheck /></el-icon> 令牌获取成功!
        </div>
      </div>
    </el-form-item>
    
    <el-collapse v-model="collapseState">
      <el-collapse-item title="CsFloat配置" name="config">
        <el-form-item label="User-Agent" required>
          <el-input 
            v-model="form.csfloatUserAgent" 
            placeholder="请输入User-Agent"
          />
        </el-form-item>
        <el-form-item label="Referer" required>
          <el-input 
            v-model="form.csfloatReferer" 
            placeholder="请输入Referer"
          />
        </el-form-item>
        <el-form-item label="Accept" required>
          <el-input 
            v-model="form.csfloatAccept" 
            placeholder="请输入Accept"
          />
        </el-form-item>
        <el-form-item label="X-App-Version" required>
          <el-input 
            v-model="form.csfloatXAppVersion" 
            placeholder="请输入X-App-Version"
          />
        </el-form-item>
        <el-form-item label="Host" required>
          <el-input 
            v-model="form.csfloatHost" 
            placeholder="请输入Host"
          />
        </el-form-item>
        <el-form-item label="Connection" required>
          <el-input 
            v-model="form.csfloatConnection" 
            placeholder="请输入Connection"
          />
        </el-form-item>
        <el-form-item label="Accept-Encoding" required>
          <el-input 
            v-model="form.csfloatAcceptEncoding" 
            placeholder="请输入Accept-Encoding"
          />
        </el-form-item>
        <el-form-item label="Cookie" required>
          <el-input 
            v-model="form.csfloatCookie" 
            type="textarea"
            :rows="3"
            placeholder="请输入Cookie"
          />
        </el-form-item>
        <el-form-item label="SteamID" required>
          <el-input 
            v-model="form.csfloatSteamID" 
            placeholder="请输入SteamID"
          />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script>
import useCsfloatForm from './useCsfloatForm.js'
import { Grid, Loading, CircleCheck } from '@element-plus/icons-vue'

export default {
  name: 'CsfloatForm',
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
    return useCsfloatForm(props, { emit })
  }
}
</script>
<style scoped src="./styles.css"></style>
