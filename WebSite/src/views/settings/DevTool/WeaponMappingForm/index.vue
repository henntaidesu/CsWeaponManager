<template>
  <div class="sync-section">
    <h2 class="section-title">平台饰品映射</h2>
    
    <div class="sync-controls">
      <!-- 悠悠有品饰品映射（key1=youpin key2=config 的账号） -->
      <div class="control-group">
        <el-select 
          v-model="selectedSteamIdYoupin" 
          placeholder="选择悠悠有品账号" 
          class="steam-id-select"
          :disabled="isSyncing"
        >
          <el-option 
            v-for="item in youpinConfigList" 
            :key="item.dataID + '_' + (item.steamID || '')" 
            :label="`${item.dataName || '未命名'} (${item.steamID || '无ID'})`" 
            :value="item.steamID || ''"
          />
        </el-select>
        
        <el-button 
          class="mapping-btn"
          type="success" 
          @click="syncWeaponTemplates"
          :disabled="!selectedSteamIdYoupin || isSyncing"
          :loading="isSyncing"
        >
          {{ isSyncing ? '同步中...' : '获取悠悠有品饰品映射' }}
        </el-button>
      </div>
      
      <!-- BUFF饰品映射（key1=buff key2=config 的账号） -->
      <div class="control-group">
        <el-select 
          v-model="selectedSteamIdBuff" 
          placeholder="选择BUFF账号" 
          class="steam-id-select"
          :disabled="isSyncingBuff"
        >
          <el-option 
            v-for="item in buffConfigList" 
            :key="item.dataID + '_' + (item.steamID || '')" 
            :label="`${item.dataName || '未命名'} (${item.steamID || '无ID'})`" 
            :value="item.steamID || ''"
          />
        </el-select>
        
        <el-button 
          class="mapping-btn"
          type="success" 
          @click="syncBuffTemplates"
          :disabled="!selectedSteamIdBuff || isSyncingBuff"
          :loading="isSyncingBuff"
        >
          {{ isSyncingBuff ? '同步中...' : '获取BUFF饰品映射' }}
        </el-button>
      </div>

      <!-- IGXE饰品映射（key1=igxe key2=config 的账号） -->
      <div class="control-group">
        <el-select
          v-model="selectedSteamIdIgxe"
          placeholder="选择IGXE账号"
          class="steam-id-select"
          :disabled="isSyncingIgxe"
        >
          <el-option
            v-for="item in igxeConfigList"
            :key="item.dataID + '_' + (item.steamID || '')"
            :label="`${item.dataName || '未命名'} (${item.steamID || '无ID'})`"
            :value="item.steamID || ''"
          />
        </el-select>

        <el-button
          class="mapping-btn"
          type="success"
          @click="syncIgxeTemplates"
          :disabled="!selectedSteamIdIgxe || isSyncingIgxe"
          :loading="isSyncingIgxe"
        >
          {{ isSyncingIgxe ? '同步中...' : '获取IGXE饰品映射' }}
        </el-button>
      </div>

      <!-- Steam饰品映射ID（爬虫端后台采集，classid / instanceid） -->
      <div class="control-group">
        <el-button
          class="mapping-btn"
          type="success"
          @click="startSteamMappingId"
          :disabled="isSteamRunning"
          :loading="steamTask?.running && steamTask?.task === 'mappingId'"
        >
          {{ steamTask?.running && steamTask?.task === 'mappingId' ? '后台采集中...' : '获取Steam饰品映射ID' }}
        </el-button>

        <span class="steam-label">起始标签</span>
        <el-input-number
          v-model="steamStartTagIndex"
          :min="0"
          :disabled="isSteamRunning"
          controls-position="right"
          class="steam-cursor-input"
        />
        <span class="steam-hint">按武器标签遍历，写入 classid / instanceid，并补齐缺失的名称、磨损区间与图标</span>
      </div>

      <!-- Steam全量hash_name名单（爬虫端后台采集，只插不改） -->
      <div class="control-group">
        <el-button
          class="mapping-btn"
          type="success"
          @click="startSteamHashNameList"
          :disabled="isSteamRunning"
          :loading="steamTask?.running && steamTask?.task === 'hashNameList'"
        >
          {{ steamTask?.running && steamTask?.task === 'hashNameList' ? '后台采集中...' : '获取Steam全量hash_name' }}
        </el-button>

        <span class="steam-label">起始页</span>
        <el-input-number
          v-model="steamStartPage"
          :min="1"
          :max="2477"
          :disabled="isSteamRunning"
          controls-position="right"
          class="steam-cursor-input"
        />
        <span class="steam-hint">补齐 steam_hash_name 名单，只插入库中不存在的记录，不改动已有数据</span>

        <el-button
          type="danger"
          @click="stopSteamTask"
          :disabled="!isSteamRunning"
          :loading="isStoppingSteam"
        >
          停止Steam采集
        </el-button>
      </div>

      <!-- CSQAQ商品采集 -->
      <div class="control-group csqaq-group">
        <el-upload
          ref="csqaqUploadRef"
          :action="apiUrls.csqaqUploadMapping()"
          :auto-upload="false"
          :show-file-list="true"
          :limit="1"
          accept=".txt"
          :on-change="handleCsqaqFileChange"
          :on-success="handleCsqaqUploadSuccess"
          :on-error="handleCsqaqUploadError"
          :before-upload="beforeCsqaqUpload"
          class="csqaq-upload-inline"
        >
          <el-button
            class="csqaq-btn"
            type="success"
            :loading="isUploadingCsqaq"
          >
            {{ isUploadingCsqaq ? '上传中...' : '选择CSQAQ映射文件' }}
          </el-button>
        </el-upload>
        <el-button
          class="csqaq-btn"
          type="primary"
          @click="submitCsqaqUpload"
          :disabled="!csqaqFileSelected || isUploadingCsqaq"
          :loading="isUploadingCsqaq"
        >
          {{ isUploadingCsqaq ? '处理中...' : '提交上传' }}
        </el-button>
        <span class="csqaq-file-path">
          文件获取方法：
          <a href="https://docs.csqaq.com/api-337690892" target="_blank" rel="noopener noreferrer">获取全量站内饰品ID - CSQAQ API 文档</a>
        </span>
      </div>
    </div>
    
    <div v-if="lastSyncTime" class="sync-info">
      <span class="sync-time">最后同步时间: {{ lastSyncTime }}</span>
    </div>

    <!-- Steam 后台采集状态（爬虫端持有，重进页面也能接着看） -->
    <div v-if="steamTask && steamTask.status !== 'idle'" class="progress-info">
      <el-progress :percentage="steamProgressPercent" :stroke-width="14" />
      <div class="progress-item">
        <span class="progress-label">Steam 任务:</span>
        <span class="progress-value">
          {{ steamTask.task === 'mappingId' ? '饰品映射ID' : '全量hash_name名单' }} · {{ steamTask.message }}
        </span>
      </div>
      <div class="progress-item">
        <span class="progress-label">进度:</span>
        <span class="progress-value">
          {{ steamTask.current }} / {{ steamTask.total }}
          <template v-if="steamTask.tag"> · {{ steamTask.tag }}</template>
          <template v-if="steamTask.page"> · 第 {{ steamTask.page }} 页</template>
        </span>
      </div>
      <div class="progress-item">
        <span class="progress-label">已采集 / 已写入:</span>
        <span class="progress-value success-rate">{{ steamTask.fetched }} / {{ steamTask.saved }} 条</span>
      </div>
      <div v-if="steamTask.started_at" class="progress-item">
        <span class="progress-label">开始时间:</span>
        <span class="progress-value">{{ steamTask.started_at }}</span>
      </div>
      <div v-if="steamTask.finished_at" class="progress-item">
        <span class="progress-label">结束时间:</span>
        <span class="progress-value">{{ steamTask.finished_at }}</span>
      </div>
    </div>

    <div v-if="csqaqUploadResult" class="sync-info" style="margin-top: 1rem;">
      <div class="status-row">
        <span class="status-label">上传结果:</span>
        <span class="status-value" :class="csqaqUploadResult.success ? 'success-text' : 'error'">
          {{ csqaqUploadResult.message }}
        </span>
      </div>
      <div v-if="csqaqUploadResult.total > 0" class="status-row">
        <span class="status-label">总记录数:</span>
        <span class="status-value">{{ csqaqUploadResult.total }}</span>
      </div>
      <div v-if="csqaqUploadResult.updated > 0" class="status-row">
        <span class="status-label">更新:</span>
        <span class="status-value success-text">{{ csqaqUploadResult.updated }}</span>
      </div>
      <div v-if="csqaqUploadResult.inserted > 0" class="status-row">
        <span class="status-label">新增:</span>
        <span class="status-value success-text">{{ csqaqUploadResult.inserted }}</span>
      </div>
      <div v-if="csqaqUploadResult.failed > 0" class="status-row">
        <span class="status-label">失败:</span>
        <span class="status-value error">{{ csqaqUploadResult.failed }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import useWeaponMappingForm from './useWeaponMappingForm.js'

export default {
  name: 'WeaponMappingForm',
  setup() {
    return useWeaponMappingForm()
  }
}
</script>
<style scoped src="./styles.css"></style>
