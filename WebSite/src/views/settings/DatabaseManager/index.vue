<template>
  <div class="database-manager-wrapper">
    <div class="database-manager-container">
      <!-- Navicat 风格布局：左侧表列表 + 右侧内容 -->
      <div class="navicat-layout">
        <!-- 左侧表列表 -->
        <div class="left-sidebar">
          <!-- 数据库信息项 -->
          <div 
            :class="['sidebar-header', 'database-info-header', { active: !selectedTable }]"
            @click="showDatabaseInfo"
          >
            <h3>📊 数据库信息</h3>
          </div>
          
          <div class="tables-list">
            <!-- 表列表 -->
            <div 
              v-for="table in tables" 
              :key="table.name"
              :class="['table-item', { active: selectedTable === table.name }]"
              @click="selectTable(table.name)"
            >
              <div class="table-name">{{ table.name }}</div>
              <div class="table-count">{{ table.rowCount }}</div>
            </div>
          </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="right-content">
          <!-- 数据库首页 - 未选择表时显示 -->
          <div v-if="!selectedTable" class="database-home">
            <!-- 数据库信息 -->
            <div class="info-view">
            <el-card class="info-card">
              <template #header>
                <div class="card-header">
                  <span>数据库信息</span>
                  <el-button type="primary" size="small" @click="refreshDatabaseInfo" :loading="databaseInfoLoading">
                    <el-icon><Refresh /></el-icon>
                    刷新
                  </el-button>
                </div>
              </template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="数据库文件">{{ databaseInfo.name || 'csweaponmanager.db' }}</el-descriptions-item>
                <el-descriptions-item label="文件大小">{{ formatSize(databaseInfo.size) }}</el-descriptions-item>
                <el-descriptions-item label="表数量">{{ tables.length }}</el-descriptions-item>
                <el-descriptions-item label="总行数">{{ databaseInfo.totalRows || 0 }}</el-descriptions-item>
                <el-descriptions-item label="创建时间" :span="2">{{ databaseInfo.createTime || 'N/A' }}</el-descriptions-item>
                <el-descriptions-item label="最后修改时间" :span="2">{{ databaseInfo.modifyTime || 'N/A' }}</el-descriptions-item>
                <el-descriptions-item label="文件路径" :span="2">{{ databaseInfo.path || 'N/A' }}</el-descriptions-item>
              </el-descriptions>
            </el-card>

            <el-card class="info-card" style="margin-top: 20px;">
              <template #header>
                <div class="card-header">
                  <span>数据库后端 / 迁移</span>
                  <el-tag :type="activeBackend === 'mysql' ? 'warning' : 'success'">
                    当前生效：{{ activeBackend === 'mysql' ? 'MySQL' : 'SQLite' }}
                  </el-tag>
                </div>
              </template>
              <div class="db-backend" v-loading="dbConfigLoading">
                <el-form label-width="100px">
                  <el-form-item label="数据库类型">
                    <el-radio-group v-model="dbType">
                      <el-radio-button label="sqlite">SQLite（默认）</el-radio-button>
                      <el-radio-button label="mysql">MySQL</el-radio-button>
                    </el-radio-group>
                  </el-form-item>

                  <template v-if="dbType === 'mysql'">
                    <el-form-item label="主机地址">
                      <el-input v-model="mysqlForm.host" placeholder="127.0.0.1" style="max-width: 360px;" />
                    </el-form-item>
                    <el-form-item label="端口">
                      <el-input v-model.number="mysqlForm.port" placeholder="3306" style="max-width: 200px;" />
                    </el-form-item>
                    <el-form-item label="用户名">
                      <el-input v-model="mysqlForm.user" placeholder="root" style="max-width: 360px;" />
                    </el-form-item>
                    <el-form-item label="密码">
                      <el-input
                        v-model="mysqlForm.password"
                        type="password"
                        show-password
                        :placeholder="mysqlHasPassword ? '已保存密码，留空则不修改' : '请输入密码'"
                        style="max-width: 360px;"
                      />
                    </el-form-item>
                    <el-form-item label="数据库名">
                      <el-input v-model="mysqlForm.database" placeholder="csweaponmanager" style="max-width: 360px;" />
                    </el-form-item>
                  </template>
                </el-form>

                <div class="db-backend-actions">
                  <el-button
                    v-if="dbType === 'mysql'"
                    @click="testMysqlConnection"
                    :loading="testingMysql"
                  >
                    <el-icon><Tools /></el-icon>
                    测试连接
                  </el-button>
                  <el-button type="primary" @click="saveDbConfig" :loading="savingDbConfig">
                    保存并切换
                  </el-button>
                  <el-button
                    type="warning"
                    @click="migrateToMysql"
                    :loading="migratingToMysql"
                    :disabled="activeBackend === 'mysql'"
                  >
                    迁移到 MySQL
                  </el-button>
                  <el-button
                    type="success"
                    @click="migrateToSqlite"
                    :loading="migratingToSqlite"
                    :disabled="activeBackend !== 'mysql'"
                  >
                    迁移到 SQLite
                  </el-button>
                </div>
                <el-alert
                  type="info"
                  :closable="false"
                  show-icon
                  style="margin-top: 12px;"
                  title="说明：连接参数保存在基础 SQLite 的 config 表中。「保存并切换」仅切换后端不迁移数据；「迁移」会复制全部数据到目标库并设为默认。"
                />
              </div>
            </el-card>

            <el-card class="info-card" style="margin-top: 20px;">
              <template #header>
                <div class="card-header">
                  <span>数据库操作</span>
                </div>
              </template>
              <div class="database-actions">
                <el-button type="success" @click="backupDatabase" :loading="backupLoading">
                  <el-icon><FolderAdd /></el-icon>
                  备份数据库
                </el-button>
                <el-button type="primary" @click="downloadDatabase" :loading="downloadLoading">
                  <el-icon><Download /></el-icon>
                  下载数据库
                </el-button>
                <el-button type="warning" @click="showRestoreDialog">
                  <el-icon><Upload /></el-icon>
                  恢复数据库
                </el-button>
                <el-button type="info" @click="optimizeDatabase" :loading="optimizeLoading">
                  <el-icon><Tools /></el-icon>
                  优化数据库
                </el-button>
                <el-button type="danger" @click="vacuumDatabase" :loading="vacuumLoading">
                  <el-icon><MagicStick /></el-icon>
                  清理数据库
                </el-button>
              </div>
            </el-card>

            <el-card class="info-card" style="margin-top: 20px;">
              <template #header>
                <div class="card-header">
                  <span>表统计</span>
                </div>
              </template>
              <el-table :data="tables" style="width: 100%" border max-height="400">
                <el-table-column prop="name" label="表名" />
                <el-table-column prop="rowCount" label="行数" width="120" sortable />
                <el-table-column label="操作" width="260">
                  <template #default="{ row }">
                    <el-button type="primary" size="small" link @click="selectTable(row.name)">
                      查看
                    </el-button>
                    <el-button type="warning" size="small" link @click="truncateTable(row.name)">
                      清空表
                    </el-button>
                    <el-button type="danger" size="small" link @click="dropTable(row.name)">
                      删除表
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>

            <el-card class="info-card" style="margin-top: 20px;">
              <template #header>
                <div class="card-header">
                  <span>SQL 语句执行</span>
                <div class="sql-file-actions">
                  <el-upload
                    :show-file-list="false"
                    :auto-upload="false"
                    accept=".sql,.txt"
                    :before-upload="handleExecuteSqlFile"
                  >
                    <el-button type="primary" :loading="sqlFileExecuting">
                      <el-icon><Upload /></el-icon>
                      上传并执行 SQL 文件
                    </el-button>
                  </el-upload>
                </div>
                </div>
              </template>
              <div class="sql-executor">
                <div class="sql-toolbar">
                  <el-button type="primary" @click="executeSQL" :loading="sqlExecuting">
                    <el-icon><CaretRight /></el-icon>
                    执行 (F5)
                  </el-button>
                  <el-button @click="clearSQL">
                    <el-icon><Delete /></el-icon>
                    清空
                  </el-button>
                  <el-button @click="formatSQL">
                    <el-icon><MagicStick /></el-icon>
                    格式化
                  </el-button>
                </div>
                <el-input
                  v-model="sqlStatement"
                  type="textarea"
                  :rows="8"
                  placeholder="输入 SQL 语句...&#10;&#10;示例:&#10;SELECT * FROM table_name WHERE condition;&#10;UPDATE table_name SET column = value WHERE condition;&#10;DELETE FROM table_name WHERE condition;"
                  @keydown.f5.prevent="executeSQL"
                  class="sql-input"
                />
                <div class="sql-result" v-if="sqlResult.length > 0 || sqlError">
                  <div class="result-header">
                    <h4>执行结果</h4>
                    <el-tag v-if="sqlResult.length > 0" type="success">
                      {{ sqlResult.length }} 行
                    </el-tag>
                    <el-tag v-if="sqlExecutionTime" type="info">
                      执行时间: {{ sqlExecutionTime }}ms
                    </el-tag>
                  </div>
                  <el-alert
                    v-if="sqlError"
                    :title="sqlError"
                    type="error"
                    :closable="false"
                    style="margin-bottom: 10px;"
                  />
                  <el-table
                    v-if="sqlResult.length > 0"
                    :data="sqlResult"
                    style="width: 100%"
                    max-height="300"
                    border
                    stripe
                  >
                    <el-table-column
                      v-for="column in sqlResultColumns"
                      :key="column"
                      :prop="column"
                      :label="column"
                      show-overflow-tooltip
                    />
                  </el-table>
                  <div v-if="sqlMessage" class="sql-message">
                    <el-alert
                      :title="sqlMessage"
                      type="success"
                      :closable="false"
                    />
                  </div>
                  <div v-if="sqlExecutionDetails.length > 0" class="execution-details">
                    <h5>执行详情：</h5>
                    <el-table :data="sqlExecutionDetails" style="width: 100%" border size="small" max-height="200">
                      <el-table-column prop="statement" label="语句" show-overflow-tooltip />
                      <el-table-column prop="type" label="类型" width="100" />
                      <el-table-column label="结果" width="120">
                        <template #default="{ row }">
                          <el-tag v-if="row.type === 'SELECT'" type="success" size="small">
                            {{ row.rows }} 行
                          </el-tag>
                          <el-tag v-else type="info" size="small">
                            {{ row.affected_rows }} 行
                          </el-tag>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </div>
              </div>
            </el-card>
            </div>
          </div>

          <!-- 表详情 - 选择表后显示 -->
          <div v-else class="table-detail">
            <!-- 工具栏 -->
            <div class="toolbar">
              <div class="toolbar-left">
                <h3>{{ selectedTable }}</h3>
                <el-tag type="info">{{ tableData.length }} 行</el-tag>
              </div>
              <div class="toolbar-right">
                <el-button 
                  :type="activeTab === 'data' ? 'primary' : ''"
                  @click="activeTab = 'data'"
                >
                  <el-icon><Grid /></el-icon>
                  数据
                </el-button>
                <el-button 
                  :type="activeTab === 'structure' ? 'primary' : ''"
                  @click="activeTab = 'structure'"
                >
                  <el-icon><List /></el-icon>
                  结构
                </el-button>
                <el-button 
                  :type="activeTab === 'query' ? 'primary' : ''"
                  @click="activeTab = 'query'"
                >
                  <el-icon><EditPen /></el-icon>
                  查询
                </el-button>
              </div>
            </div>

          <!-- 数据视图 -->
          <div v-show="activeTab === 'data'" class="data-view">
            <div class="data-toolbar">
              <el-button type="primary" size="small" @click="openAddDialog">
                <el-icon><Plus /></el-icon>
                新增
              </el-button>
              <el-button type="danger" size="small" @click="deleteSelected" :disabled="selectedRows.length === 0">
                <el-icon><Delete /></el-icon>
                删除选中 ({{ selectedRows.length }})
              </el-button>
              <el-button size="small" @click="exportCurrentTable">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
              <el-button size="small" @click="refreshTableData">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
              
              <div class="data-toolbar-right">
                <el-button size="small" @click="showFilterDialog">
                  <el-icon><Filter /></el-icon>
                  筛选
                  <el-badge v-if="activeFilters.length > 0" :value="activeFilters.length" class="filter-badge" />
                </el-button>
                <span class="row-count-info">共 {{ filteredTableData.length }} 行</span>
                <el-pagination
                  v-model:current-page="currentPage"
                  v-model:page-size="pageSize"
                  :page-sizes="[10, 20, 50, 100]"
                  :total="filteredTableData.length"
                  layout="sizes, prev, pager, next"
                  small
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </div>

            <el-table
              :data="paginatedData"
              style="width: 100%"
              border
              stripe
              @selection-change="handleSelectionChange"
              @sort-change="handleSortChange"
              v-loading="tableLoading"
            >
              <el-table-column type="selection" width="55" fixed="left" />
              <el-table-column label="操作" width="150" fixed="left">
                <template #default="{ row, $index }">
                  <el-button type="primary" size="small" @click="editRow(row, $index)">
                    编辑
                  </el-button>
                  <el-button type="danger" size="small" @click="deleteRow(row, $index)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column 
                v-for="column in tableColumns" 
                :key="column.name"
                :prop="column.name"
                :label="column.name"
                :width="column.width || 150"
                sortable="custom"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  <span>{{ formatCellValue(row[column.name]) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 结构视图 -->
          <div v-show="activeTab === 'structure'" class="structure-view">
            <el-table :data="tableStructure" style="width: 100%" border>
              <el-table-column prop="cid" label="ID" width="80" />
              <el-table-column prop="name" label="字段名" width="200" />
              <el-table-column prop="type" label="类型" width="150" />
              <el-table-column prop="notnull" label="非空" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.notnull ? 'success' : 'info'" size="small">
                    {{ row.notnull ? '是' : '否' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="dflt_value" label="默认值" width="150" />
              <el-table-column prop="pk" label="主键" width="80">
                <template #default="{ row }">
                  <el-tag v-if="row.pk" type="danger" size="small">主键</el-tag>
                </template>
              </el-table-column>
            </el-table>

            <div class="structure-info">
              <h4>表信息</h4>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="表名">{{ selectedTable }}</el-descriptions-item>
                <el-descriptions-item label="字段数">{{ tableStructure.length }}</el-descriptions-item>
                <el-descriptions-item label="行数">{{ tableData.length }}</el-descriptions-item>
                <el-descriptions-item label="创建时间">{{ tableInfo.createTime || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="structure-sql">
              <h4>建表语句</h4>
              <el-input
                v-model="createTableSQL"
                type="textarea"
                :rows="10"
                readonly
              />
              <el-button type="primary" @click="copySQL" style="margin-top: 10px;">
                <el-icon><CopyDocument /></el-icon>
                复制SQL
              </el-button>
            </div>
          </div>

          <!-- 查询视图 -->
          <div v-show="activeTab === 'query'" class="query-view">
            <div class="query-editor">
              <div class="query-toolbar">
                <el-button type="primary" @click="executeQuery" :loading="queryLoading">
                  <el-icon><CaretRight /></el-icon>
                  执行 (F5)
                </el-button>
                <el-button @click="clearQuery">
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
                <el-button @click="formatQuery">
                  <el-icon><MagicStick /></el-icon>
                  格式化
                </el-button>
                <el-button @click="saveQuery">
                  <el-icon><DocumentAdd /></el-icon>
                  保存查询
                </el-button>
                
                <el-select 
                  v-model="selectedSavedQuery" 
                  placeholder="选择已保存的查询"
                  style="width: 200px; margin-left: auto;"
                  @change="loadSavedQuery"
                  clearable
                >
                  <el-option
                    v-for="query in savedQueries"
                    :key="query.id"
                    :label="query.name"
                    :value="query.id"
                  />
                </el-select>
              </div>

              <el-input
                v-model="sqlQuery"
                type="textarea"
                :rows="10"
                placeholder="输入SQL查询语句...&#10;&#10;示例:&#10;SELECT * FROM table_name WHERE condition;&#10;UPDATE table_name SET column = value WHERE condition;&#10;DELETE FROM table_name WHERE condition;"
                @keydown.f5.prevent="executeQuery"
              />
            </div>

            <div class="query-result">
              <div class="result-header">
                <h4>查询结果</h4>
                <el-tag v-if="queryResult.length > 0" type="success">
                  {{ queryResult.length }} 行
                </el-tag>
                <el-tag v-if="queryExecutionTime" type="info">
                  执行时间: {{ queryExecutionTime }}ms
                </el-tag>
              </div>

              <el-alert
                v-if="queryError"
                :title="queryError"
                type="error"
                :closable="false"
                style="margin-bottom: 10px;"
              />

              <el-table
                v-if="queryResult.length > 0"
                :data="queryResult"
                style="width: 100%"
                max-height="400"
                border
                stripe
              >
                <el-table-column
                  v-for="column in queryResultColumns"
                  :key="column"
                  :prop="column"
                  :label="column"
                  show-overflow-tooltip
                />
              </el-table>

              <el-empty v-else-if="!queryError" description="执行查询以查看结果" />
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- 编辑/新增对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editMode === 'add' ? '新增数据' : '编辑数据'"
      width="600px"
    >
      <el-form :model="editForm" label-width="120px">
        <el-form-item
          v-for="column in tableColumns"
          :key="column.name"
          :label="column.name"
        >
          <el-input
            v-model="editForm[column.name]"
            :placeholder="`请输入${column.name}`"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 保存查询对话框 -->
    <el-dialog v-model="saveQueryDialogVisible" title="保存查询" width="400px">
      <el-form :model="saveQueryForm" label-width="80px">
        <el-form-item label="查询名称">
          <el-input v-model="saveQueryForm.name" placeholder="请输入查询名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveQueryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSaveQuery">保存</el-button>
      </template>
    </el-dialog>

    <!-- 筛选对话框 -->
    <el-dialog v-model="filterDialogVisible" title="数据筛选" width="600px">
      <div class="filter-container">
        <div v-for="(filter, index) in filters" :key="index" class="filter-row">
          <el-select v-model="filter.field" placeholder="选择字段" style="width: 150px;">
            <el-option
              v-for="column in tableColumns"
              :key="column.name"
              :label="column.name"
              :value="column.name"
            />
          </el-select>
          
          <el-select v-model="filter.operator" placeholder="条件" style="width: 120px;">
            <el-option label="等于" value="=" />
            <el-option label="不等于" value="!=" />
            <el-option label="包含" value="LIKE" />
            <el-option label="不包含" value="NOT LIKE" />
            <el-option label="大于" value=">" />
            <el-option label="小于" value="<" />
            <el-option label="大于等于" value=">=" />
            <el-option label="小于等于" value="<=" />
            <el-option label="为空" value="IS NULL" />
            <el-option label="不为空" value="IS NOT NULL" />
          </el-select>
          
          <el-input 
            v-if="!['IS NULL', 'IS NOT NULL'].includes(filter.operator)"
            v-model="filter.value" 
            placeholder="筛选值" 
            style="flex: 1;"
          />
          
          <el-button 
            type="danger" 
            :icon="Delete" 
            circle 
            size="small"
            @click="removeFilter(index)"
          />
        </div>
        
        <el-button type="primary" @click="addFilter" style="width: 100%; margin-top: 10px;">
          <el-icon><Plus /></el-icon>
          添加筛选条件
        </el-button>
      </div>
      
      <template #footer>
        <el-button @click="clearFilters">清空</el-button>
        <el-button @click="filterDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="applyFilters">应用筛选</el-button>
      </template>
    </el-dialog>

    <!-- 恢复数据库对话框 -->
    <el-dialog v-model="restoreDialogVisible" title="恢复数据库" width="500px">
      <el-alert
        title="警告"
        type="warning"
        description="恢复数据库将覆盖当前数据库，此操作不可逆！请确保已备份当前数据。"
        :closable="false"
        style="margin-bottom: 20px;"
      />
      <el-upload
        ref="uploadRef"
        :auto-upload="false"
        :limit="1"
        accept=".db,.sqlite,.sqlite3"
        :on-change="handleFileChange"
      >
        <el-button type="primary">
          <el-icon><Upload /></el-icon>
          选择备份文件
        </el-button>
        <template #tip>
          <div class="el-upload__tip">
            只能上传 .db / .sqlite / .sqlite3 文件
          </div>
        </template>
      </el-upload>
      <div v-if="restoreFile" style="margin-top: 15px;">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="文件名">{{ restoreFile.name }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatSize(restoreFile.size) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="restoreDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmRestore" :disabled="!restoreFile" :loading="restoreLoading">
          确认恢复
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>


<script setup>
import { useDatabaseManager } from './useDatabaseManager.js'

const {
  // Icons
  Search, Refresh, FolderAdd, Download, Upload, Tools, MagicStick, Grid, List, EditPen, Plus, Delete, Filter, CopyDocument, CaretRight, DocumentAdd,
  // 侧边栏
  sidebarCollapsed, tableSearchQuery, tables, tablesLoading,
  // 选中的表
  selectedTable, activeTab,
  // 数据库信息
  databaseInfo, databaseInfoLoading, backupLoading, downloadLoading, restoreLoading, optimizeLoading, vacuumLoading, restoreDialogVisible, restoreFile,
  // 表数据
  tableData, tableColumns, tableStructure, tableInfo, createTableSQL, tableLoading,
  // 数据视图
  dataSearchQuery, selectedRows, currentPage, pageSize,
  // 筛选功能
  filterDialogVisible, filters, activeFilters,
  // 排序功能
  sortColumn, sortOrder,
  // 编辑对话框
  editDialogVisible, editMode, editForm, editIndex,
  // 查询视图
  sqlQuery, queryResult, queryResultColumns, queryError, queryExecutionTime, queryLoading,
  // 保存的查询
  savedQueries, selectedSavedQuery, saveQueryDialogVisible, saveQueryForm,
  // SQL 执行
  sqlStatement, sqlResult, sqlResultColumns, sqlError, sqlExecutionTime, sqlExecuting, sqlMessage, sqlExecutionDetails, sqlTotalStatements, sqlFileExecuting,
  // 数据库后端配置 / 迁移
  dbType, activeBackend, mysqlForm, mysqlHasPassword, dbConfigLoading, testingMysql, savingDbConfig, migratingToMysql, migratingToSqlite,
  loadDbConfig, testMysqlConnection, saveDbConfig, migrateToMysql, migrateToSqlite,
  // 计算属性
  filteredTables, filteredTableData, paginatedData,
  // 方法
  refreshTables, showDatabaseInfo, selectTable, onTableChange, loadTableData, loadTableStructure, refreshTableData,
  formatCellValue, handleSelectionChange, handleSizeChange, handleCurrentChange,
  openAddDialog, editRow, saveEdit, deleteRow, deleteSelected, exportCurrentTable, copySQL,
  executeQuery, clearQuery, formatQuery, saveQuery, confirmSaveQuery,
  showFilterDialog, addFilter, removeFilter, applyFilters, clearFilters, handleSortChange,
  loadSavedQueries, loadSavedQuery,
  refreshDatabaseInfo, backupDatabase, downloadDatabase, showRestoreDialog, handleFileChange, confirmRestore,
  optimizeDatabase, vacuumDatabase, truncateTable, dropTable, formatSize,
  executeSQL, handleExecuteSqlFile, clearSQL, formatSQL
} = useDatabaseManager()
</script>

<style scoped src="./styles.css"></style>
