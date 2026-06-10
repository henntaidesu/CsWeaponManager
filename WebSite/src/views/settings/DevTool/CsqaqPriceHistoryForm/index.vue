<template>
  <div class="sync-section">
    <div class="section-header">
      <h2 class="section-title">CSQAQ 历史价格采集</h2>
      <div class="header-actions">
        <el-button
          type="primary"
          @click="startFetch"
          :loading="fetching"
          :disabled="fetching"
        >
          {{ fetching ? '采集中...' : '开始采集（近三年）' }}
        </el-button>
        <el-button
          type="danger"
          @click="stopFetch"
          :loading="stopping"
          :disabled="!fetching"
        >
          停止
        </el-button>
      </div>
    </div>

    <div class="fetch-options">
      <div class="option-row">
        <span class="option-label">平台:</span>
        <el-checkbox-group v-model="selectedPlatforms" :disabled="fetching">
          <el-checkbox :value="1">BUFF</el-checkbox>
          <el-checkbox :value="2">悠悠有品</el-checkbox>
          <el-checkbox :value="3">Steam</el-checkbox>
        </el-checkbox-group>
      </div>
      <div class="option-row">
        <span class="option-label">指标:</span>
        <el-checkbox-group v-model="selectedKeys" :disabled="fetching">
          <el-checkbox value="sell_price">在售价</el-checkbox>
          <el-checkbox value="sell_num">在售数量</el-checkbox>
          <el-checkbox value="buy_price">求购价</el-checkbox>
          <el-checkbox value="buy_num">求购数量</el-checkbox>
        </el-checkbox-group>
      </div>
      <div class="option-row">
        <span class="option-label">断点续传:</span>
        <el-switch v-model="skipExisting" :disabled="fetching" />
        <span class="option-hint">跳过已有历史数据的饰品（CSQAQ 限速约 3 秒/请求，全量采集需数十小时，可随时停止后继续）</span>
      </div>
    </div>

    <div v-if="progress" class="sync-info">
      <el-progress :percentage="progressPercent" :stroke-width="14" />
      <div class="status-row">
        <span class="status-label">进度:</span>
        <span class="status-value">{{ progress.current }} / {{ progress.total }}</span>
      </div>
      <div class="status-row">
        <span class="status-label">成功采集:</span>
        <span class="status-value success-text">{{ progress.fetched }}</span>
      </div>
      <div class="status-row">
        <span class="status-label">跳过/失败:</span>
        <span class="status-value">{{ progress.skipped }} / {{ progress.failed }}</span>
      </div>
      <div class="status-row">
        <span class="status-label">写入行数:</span>
        <span class="status-value">{{ progress.rows_written }}</span>
      </div>
      <div v-if="progress.name" class="status-row">
        <span class="status-label">当前饰品:</span>
        <span class="status-value">{{ progress.name }} (ID: {{ progress.good_id }})</span>
      </div>
    </div>
  </div>
</template>

<script>
import useCsqaqPriceHistoryForm from './useCsqaqPriceHistoryForm.js'

export default {
  name: 'CsqaqPriceHistoryForm',
  setup() {
    return useCsqaqPriceHistoryForm()
  }
}
</script>
<style scoped src="./styles.css"></style>
