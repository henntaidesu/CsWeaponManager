<template>
  <div>
    <div class="stats-summary">
      <div class="card">
        <div class="search-section">
          <div class="flex flex-wrap gap-4 items-center">
            <el-input
              v-model="searchText"
              placeholder="搜索消息标题、内容、订单号...（仅本页支持类型筛选与分页展示）"
              prefix-icon="Search"
              class="search-input"
              @keyup.enter="handleSearch"
              @clear="handleClearSearch"
              clearable
            />
            <el-button type="primary" @click="handleSearch" :loading="loading">搜索</el-button>
            <el-button @click="handleClearSearch" :disabled="loading">重置</el-button>
            <el-select 
              v-model="messageTypeFilter" 
              placeholder="选择消息类型（可多选）" 
              class="type-select" 
              @change="handleTypeChange" 
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
            >
              <el-option v-for="type in messageTypes" :key="type" :label="type" :value="type" />
            </el-select>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="date-picker"
              @change="handleDateRangeChange"
              clearable
            />
            <el-button type="success" @click="handleTimeSearch" :loading="loading">按时间搜索</el-button>
          </div>
          <div class="flex flex-wrap gap-4 items-center" style="margin-top: 12px;">
            <el-select
              v-model="selectedAccount"
              placeholder="选择BUFF账号"
              class="type-select"
              :disabled="syncing"
            >
              <el-option
                v-for="acc in accountList"
                :key="acc.steam_id"
                :label="`${acc.name} (${acc.steam_id})`"
                :value="acc.steam_id"
              />
            </el-select>
            <el-button type="primary" @click="handleSyncNew" :loading="syncing" :disabled="!selectedAccount">
              同步新消息
            </el-button>
            <el-button type="warning" @click="handleSyncHistory" :loading="syncing" :disabled="!selectedAccount">
              同步历史消息
            </el-button>
            <span v-if="!accountList.length" style="color: var(--text-secondary); font-size: 12px;">
              未配置BUFF数据源，请先到「数据源」添加账号
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="table-container">
      <div class="pagination pagination-top">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalItems"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
      
      <el-table
        :data="filteredMessageData"
        v-loading="loading"
        element-loading-text="加载中..."
        style="width: 100%"
        :row-style="{ backgroundColor: 'transparent' }"
        :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
      >
        <el-table-column prop="message_id" label="消息ID" width="220" show-overflow-tooltip align="left" />
        <el-table-column prop="title" label="标题" width="250" show-overflow-tooltip align="left" />
        <el-table-column prop="message_text" label="消息内容" min-width="300" show-overflow-tooltip align="left" />
        <el-table-column prop="createTime" label="创建时间" width="180" align="center" />
      </el-table>

      <div class="pagination pagination-bottom">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalItems"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>


<script>
import { useBuffMessageBox } from './useBuffMessageBox.js'

export default {
  name: 'BuffMessageBox',
  setup() {
    return useBuffMessageBox()
  }
}
</script>

<style scoped src="./styles.css"></style>
