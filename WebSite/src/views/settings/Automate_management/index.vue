<template>
  <div class="automate-management">
    <div class="config-toolbar">
      <el-button type="primary" @click="openCreateTaskDialog">添加定时任务</el-button>
    </div>
    
    <el-dialog
      v-model="taskDialogVisible"
      :title="isEditing ? '编辑定时任务' : '添加定时任务'"
      width="600px"
      class="task-config-dialog"
      destroy-on-close
      @close="handleTaskDialogClose"
    >
      <el-form :model="automateForm" label-width="140px" label-position="left">
        <!-- 自动化类型选择 -->
        <el-form-item label="自动化类型">
          <el-select
            v-model="automateForm.automateType"
            placeholder="请选择自动化类型"
            @change="handleTypeChange"
          >
            <el-option label="更新steam库存价格" value="auto_update" />
            <el-option label="获取平台交易记录" value="auto_fetch" />
            <el-option label="更新饰品平台映射价格" value="auto_platform_price" />
            <el-option label="自动搜素饰品" value="auto_search_weapon" />
            <el-option label="更新steam认证" value="auto_refresh_auth" />
          </el-select>
        </el-form-item>

        <!-- 任务名称 -->
        <el-form-item label="任务名称">
          <el-input 
            v-model="automateForm.taskName" 
            placeholder="请输入任务名称"
          />
        </el-form-item>

        <!-- 第二个下拉框 - 根据类型动态显示 -->
        <el-form-item v-if="automateForm.automateType && automateForm.automateType !== 'auto_refresh_auth'" :label="secondSelectLabel">
          <el-select 
            v-model="automateForm.selectedTask" 
            placeholder="请选择任务"
          >
            <el-option 
              v-for="task in availableTasks" 
              :key="task.value" 
              :label="task.label" 
              :value="task.value" 
            />
          </el-select>
        </el-form-item>

        <!-- Steam账号选择 (仅在自动更新数据或更新Steam认证时显示) -->
        <el-form-item
          v-if="(automateForm.automateType === 'auto_update' && automateForm.selectedTask) || automateForm.automateType === 'auto_refresh_auth'"
          label="Steam账号"
        >
          <el-select
            v-model="automateForm.selectedSteamConfig"
            placeholder="请选择Steam账号"
            filterable
          >
            <el-option
              v-for="config in currentSteamConfigList"
              :key="config.dataID"
              :label="`${config.dataName} (${config.steamID || '无SteamID'})`"
              :value="config.dataID"
            />
          </el-select>
        </el-form-item>

        <!-- 数据源选择 (仅在自动获取数据时显示) - 单选 -->
        <el-form-item v-if="['auto_fetch', 'auto_platform_price'].includes(automateForm.automateType)" label="数据源">
          <el-select
            v-model="automateForm.selectedDataSource"
            placeholder="请选择数据源"
            filterable
          >
            <el-option
              v-for="source in filteredDataSources"
              :key="source.dataID"
              :label="`${source.dataName} (${source.steamID || '无SteamID'})`"
              :value="source.dataID"
            />
          </el-select>
        </el-form-item>

        <!-- 是否同步历史数据 (仅在更新饰品平台映射价格 - 悠悠有品数据采集时显示) -->
        <el-form-item
          v-if="automateForm.automateType === 'auto_platform_price' && automateForm.selectedTask === 'platform_youpin_price'"
          label="同步历史数据"
        >
          <el-checkbox v-model="automateForm.syncHistory">
            是否将价格数据同步到历史表
          </el-checkbox>
        </el-form-item>

        <!-- 搜索配置选择 (仅在自动搜素饰品时显示) -->
        <el-form-item
          v-if="automateForm.automateType === 'auto_search_weapon' && automateForm.selectedTask"
          label="搜索配置"
        >
          <el-select
            v-model="automateForm.selectedSearchConfig"
            placeholder="请选择搜索配置"
            filterable
          >
            <el-option
              v-for="config in currentSearchConfigList"
              :key="config.dataID"
              :label="`${config.dataName}${config.platformType ? ' - ' + config.platformType : ''}`"
              :value="config.dataID"
            />
          </el-select>
        </el-form-item>

        <!-- 执行间隔 -->
        <el-form-item label="执行间隔">
          <el-select 
            v-model="automateForm.interval" 
            placeholder="请选择执行间隔"
          >
            <el-option label="5分钟" :value="5" />
            <el-option label="15分钟" :value="15" />
            <el-option label="30分钟" :value="30" />
            <el-option label="1小时" :value="60" />
            <el-option label="3小时" :value="180" />
            <el-option label="6小时" :value="360" />
            <el-option label="12小时" :value="720" />
            <el-option label="24小时" :value="1440" />
            <template #footer>
              <div class="custom-interval-footer">
                <span>手动输入(分钟)</span>
                <el-input-number 
                  v-model="customInterval"
                  :min="1"
                  :step="5"
                  controls-position="right"
                  size="small"
                  style="width: 160px"
                />
                <el-button type="primary" size="small" @click="applyCustomInterval">应用</el-button>
              </div>
            </template>
          </el-select>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" @click="handleExecute" :loading="executing">
            {{ isEditing ? '更新任务' : '保存定时任务' }}
          </el-button>
          <el-button @click="handleTaskDialogClose">{{ isEditing ? '取消编辑' : '重置' }}</el-button>
          <el-button v-if="isEditing" type="danger" plain @click="deleteTask(editingTaskId)">删除配置</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 任务列表 -->
    <div class="task-list-section">
      <el-collapse v-model="activeTaskGroups" class="task-group-collapse">
        <el-collapse-item
          v-for="group in groupedRunningTasks"
          :key="group.type"
          :name="group.type"
          class="task-group"
        >
          <template #title>
            <div class="task-group-title">
              <el-tag type="primary" effect="plain">{{ group.label }}</el-tag>
              <span class="task-group-count">共 {{ group.tasks.length }} 个任务</span>
              <div class="task-group-actions" @click.stop>
                <el-button 
                  type="success" 
                  size="small" 
                  :disabled="isGroupStarting(group.type) || group.tasks.filter(task => task.status === '已停止').length === 0"
                  :loading="isGroupStarting(group.type)"
                  @click="startGroupTasks(group.type, group.tasks)"
                >
                  启动全部
                </el-button>
                <el-button 
                  type="danger" 
                  size="small" 
                  plain
                  :disabled="isGroupStopping(group.type) || group.tasks.filter(task => task.status === '运行中').length === 0"
                  :loading="isGroupStopping(group.type)"
                  @click="stopGroupTasks(group.type, group.tasks)"
                >
                  停止全部
                </el-button>
              </div>
            </div>
          </template>
          <div
            v-for="sub in group.subGroups"
            :key="sub.type"
            class="task-subgroup"
          >
            <div class="task-subgroup-title">
              <el-tag type="info" effect="dark" size="small">{{ sub.type }}</el-tag>
              <span class="task-subgroup-count">{{ sub.tasks.length }} 个任务</span>
            </div>
            <el-table :data="sub.tasks" style="width: 100%">
            <el-table-column prop="taskName" label="任务名称" min-width="150" />
            <el-table-column prop="targetInfo" label="使用账号" min-width="200" show-overflow-tooltip />
            <el-table-column prop="interval" label="间隔(分钟)" width="120" align="center">
              <template #default="{ row }">
                {{ formatInterval(row.interval) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="180" align="center">
              <template #default="{ row }">
                <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 6px;">
                  <el-tag
                    :type="row.status === '执行中' ? 'success' : (row.status === '运行中' ? 'warning' : 'info')"
                  >
                    {{ row.status === '运行中' ? '运行中' : row.status }}
                  </el-tag>
                  <span v-if="row.isExecuting && row.executingDuration > 0" style="font-size: 12px; color: #909399;">
                    {{ formatDuration(row.executingDuration) }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="最后执行" width="120" align="center">
              <template #default="{ row }">
                <span style="font-size: 13px;">{{ formatTimeAgo(row.lastRun) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="下次执行" width="120" align="center">
              <template #default="{ row }">
                <span v-if="row.status === '已停止' || !row.nextRun || row.nextRun === '-'" style="color: #909399;">-</span>
                <span v-else-if="row.status === '执行中'" style="color: #67c23a;">执行中</span>
                <span v-else style="font-size: 13px;">{{ formatCountdown(row.nextRun) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220" align="center" fixed="right">
              <template #default="{ row }">
                <el-button 
                  v-if="row.status === '已停止'" 
                  size="small" 
                  type="success" 
                  @click="startTask(row)"
                >
                  启动
                </el-button>
                <el-button 
                  v-else 
                  size="small" 
                  type="danger" 
                  @click="stopTask(row.id)"
                >
                  停止
                </el-button>
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="openEditTaskDialog(row)"
                  plain
                >
                  编辑
                </el-button>
              </template>
            </el-table-column>
            </el-table>
          </div>
        </el-collapse-item>
      </el-collapse>
      <div v-if="runningTasks.length === 0" class="empty-placeholder">
        <el-empty description="暂无运行中的定时任务" />
      </div>
    </div>

  </div>
</template>


<script setup>
import { ref, watch } from 'vue'
import { useAutomateManagement } from './useAutomateManagement.js'

const {
  automateForm,
  customInterval,
  executing,
  isEditing,
  editingTaskId,
  steamConfigList,
  youpinConfigList,
  buffConfigList,
  dataSources,
  runningTasks,
  groupedRunningTasks,
  renameSearchConfigList,
  pendantSearchConfigList,
  updateTasks,
  fetchTasks,
  platformPriceTasks,
  searchWeaponTasks,
  secondSelectLabel,
  currentSteamConfigList,
  currentSearchConfigList,
  availableTasks,
  filteredDataSources,
  formatInterval,
  formatDuration,
  formatCountdown,
  formatTimeAgo,
  handleTypeChange,
  applyCustomInterval,
  handleExecute,
  handleReset,
  startTask,
  stopTask,
  startGroupTasks,
  stopGroupTasks,
  isGroupStarting,
  isGroupStopping,
  editTask,
  deleteTask
} = useAutomateManagement()

const activeTaskGroups = ref([])
const taskDialogVisible = ref(false)

const openCreateTaskDialog = () => {
  handleReset()
  taskDialogVisible.value = true
}

const openEditTaskDialog = (row) => {
  editTask(row)
  taskDialogVisible.value = true
}

const handleTaskDialogClose = () => {
  taskDialogVisible.value = false
  handleReset()
}

watch(
  groupedRunningTasks,
  (groups) => {
    const groupNames = groups.map(group => group.type)
    if (activeTaskGroups.value.length === 0) {
      activeTaskGroups.value = groupNames
      return
    }

    const activeSet = new Set(activeTaskGroups.value)
    groupNames.forEach(name => {
      if (!activeSet.has(name)) {
        activeSet.add(name)
      }
    })

    activeTaskGroups.value = Array.from(activeSet).filter(name => groupNames.includes(name))
  },
  { immediate: true }
)
</script>

<style scoped src="./styles.css"></style>
