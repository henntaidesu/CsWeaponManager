<template>
  <div class="perfectworld-form">
    <el-form-item>
      <el-button 
        type="success" 
        @click="startPerfectWorldTokenCollection" 
        :loading="perfectWorldTokenLoading"
        :disabled="perfectWorldTokenStatus === 'success'"
        style="width: 100%;"
      >
        <el-icon style="margin-right: 5px;"><Grid /></el-icon>
        {{ perfectWorldTokenLoading ? '正在获取令牌...' : perfectWorldTokenStatus === 'success' ? '✓ 令牌已获取' : (isEditMode ? '重新获取完美世界APP令牌' : '一键获取完美世界APP令牌') }}
      </el-button>
      <div v-if="perfectWorldTokenStatus === 'waiting'" style="margin-top: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; border-left: 3px solid var(--accent-orange);">
        <div style="color: var(--accent-orange); font-weight: 500; margin-bottom: 5px;">
          <el-icon><Loading /></el-icon> 等待手机APP访问...
        </div>
        <div style="color: var(--text-secondary); font-size: 12px; line-height: 1.8;">
          1. 在手机WiFi设置中配置代理: <strong>{{ proxyAddress || '...' }}</strong><br/>
          2. 打开已经登录的完美世界APP<br/>
          3. 点击「数据」，等待 5 秒，等待数据加载<br/>
          4. 点击「组件功能上线」，等待 5 秒，等待数据加载<br/>
          5. 页面会自动保存
        </div>
      </div>
      <div v-if="perfectWorldTokenStatus === 'success'" style="margin-top: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 4px; border-left: 3px solid var(--accent-green);">
        <div style="color: var(--accent-green); font-weight: 500;">
          <el-icon><CircleCheck /></el-icon> 令牌获取成功!
        </div>
      </div>
    </el-form-item>
    
    <!-- 完美世界配置 -->
    <el-collapse v-model="collapseState">
      <el-collapse-item title="完美世界APP配置" name="config">
        <el-form-item label="appversion" required>
          <el-input v-model="form.appversion" placeholder="请输入appversion" />
        </el-form-item>
        <el-form-item label="device" required>
          <el-input v-model="form.device" placeholder="请输入device" />
        </el-form-item>
        <el-form-item label="gameType" required>
          <el-input v-model="form.gameType" placeholder="请输入gameType" />
        </el-form-item>
        <el-form-item label="platform" required>
          <el-input v-model="form.platform" placeholder="请输入platform" />
        </el-form-item>
        <el-form-item label="token" required>
          <el-input 
            v-model="form.pwToken" 
            type="textarea"
            :rows="2"
            placeholder="请输入token"
          />
        </el-form-item>
        <el-form-item label="tdSign" required>
          <el-input 
            v-model="form.tdSign" 
            type="textarea"
            :rows="2"
            placeholder="请输入tdSign"
          />
        </el-form-item>
        <el-form-item label="SteamID" required>
          <el-input v-model="form.pwSteamID" placeholder="请输入SteamID" />
        </el-form-item>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script>
import usePerfectWorldForm from './usePerfectWorldForm.js'
import { Grid, Loading, CircleCheck } from '@element-plus/icons-vue'

export default {
  name: 'PerfectWorldForm',
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
    return usePerfectWorldForm(props, { emit })
  }
}
</script>
<style scoped src="./styles.css"></style>
