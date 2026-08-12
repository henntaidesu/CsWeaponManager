<template>
  <div>
    <div class="stats-summary">
      <div class="card">
        <div class="search-section">
          <div class="flex flex-wrap gap-4 items-center">
            <el-input
              v-model="searchText"
              placeholder="搜索消息标题、内容、关联单号...（仅本页过滤）"
              prefix-icon="Search"
              class="search-input"
              @clear="handleClearSearch"
              clearable
            />
            <el-button @click="handleClearSearch" :disabled="loading">重置</el-button>
            <el-select
              v-model="categoryFilter"
              placeholder="选择消息分类（可多选）"
              class="type-select"
              multiple
              collapse-tags
              collapse-tags-tooltip
              clearable
            >
              <el-option
                v-for="c in categories"
                :key="c"
                :label="getCategoryLabel(c)"
                :value="c"
              />
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
              clearable
            />
          </div>
          <div class="flex flex-wrap gap-4 items-center" style="margin-top: 12px;">
            <el-select
              v-model="selectedAccount"
              placeholder="选择IGXE账号"
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
              未配置IGXE数据源，请先到「数据源」添加账号
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
        <el-table-column label="分类" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getCategoryColor(row.category)" size="small">
              {{ getCategoryLabel(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" width="250" show-overflow-tooltip align="left" />
        <el-table-column prop="content" label="消息内容" min-width="300" show-overflow-tooltip align="left" />
        <el-table-column prop="biz_id" label="关联单号" width="160" show-overflow-tooltip align="left" />
        <el-table-column label="已读" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_read ? 'info' : 'danger'" size="small">
              {{ row.is_read ? '已读' : '未读' }}
            </el-tag>
          </template>
        </el-table-column>
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
import { useIgxeMessageBox } from './useIgxeMessageBox.js'

export default {
  name: 'IgxeMessageBox',
  setup() {
    return useIgxeMessageBox()
  }
}
</script>

<style scoped src="./styles.css"></style>
