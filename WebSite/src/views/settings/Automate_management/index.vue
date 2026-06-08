<template>
  <div class="automate-management">
    <div class="config-toolbar">
      <el-button type="primary" @click="openCreateIndependentDrawer">添加独立更新任务</el-button>
    </div>

    <!-- 账号卡片 -->
    <div class="section-title">账号自动化</div>
    <div v-if="accountCards.length" class="account-card-grid">
      <div
        v-for="acc in accountCards"
        :key="acc.steamId"
        class="account-card"
        @click="openAccountDetail(acc.steamId)"
      >
        <div class="account-card-header">
          <span class="account-card-name">{{ acc.name }}</span>
          <el-tag size="small" type="success" effect="dark" v-if="acc.running > 0">{{ acc.running }} 运行中</el-tag>
        </div>
        <div class="account-card-steamid">{{ acc.steamId }}</div>
        <div class="account-card-stats">
          <span class="stat stat-running">运行中 {{ acc.running }}</span>
          <span class="stat stat-stopped">已停止 {{ acc.stopped }}</span>
          <span class="stat stat-uncreated">未创建 {{ acc.uncreated }}</span>
        </div>
      </div>
    </div>
    <div v-else class="empty-placeholder">
      <el-empty description="暂无已配置的账号" />
    </div>

    <!-- 独立更新任务卡片 -->
    <div v-if="independentTasks.length" class="independent-section">
      <div class="section-title">独立更新任务</div>
      <div class="account-card-grid">
        <div
          v-for="task in independentTasks"
          :key="task.id"
          class="account-card"
          @click="openEditIndependentDrawer(task)"
        >
          <div class="account-card-header">
            <span class="account-card-name">{{ task.taskName }}</span>
            <el-tag size="small" :type="task.status === '已停止' ? 'info' : 'success'" effect="dark">
              {{ task.status === '已停止' ? '已停止' : '运行中' }}
            </el-tag>
          </div>
          <div class="account-card-steamid">
            {{ typeLabel(task) }} · {{ stockPriceSourceLabel(task.config.source) }} · 每 {{ formatInterval(task.interval) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 账号自动化详情 -->
    <el-drawer
      v-model="detailVisible"
      :title="activeAccount ? `${activeAccount.name}（${activeAccount.steamId}）` : '自动化详情'"
      direction="rtl"
      size="640px"
      class="account-detail-drawer"
    >
      <div v-if="activeAccount" class="detail-body">
        <div
          v-for="grp in activeAccountGroups"
          :key="grp.typeLabel"
          class="detail-type-group"
        >
          <div class="detail-type-title">{{ grp.typeLabel }}</div>
          <div
            v-for="item in grp.items"
            :key="item.key"
            class="detail-item"
            :class="`detail-item--${item.status}`"
          >
            <div class="detail-item-main">
              <span class="detail-item-name">{{ item.methodLabel }}</span>
              <el-tag size="small" :type="statusTagType(item.status)" effect="plain">
                {{ statusText(item.status) }}
              </el-tag>
            </div>

            <!-- 已创建：时间下拉(修改即生效) + 启停 -->
            <div v-if="item.task" class="detail-item-actions">
              <el-select
                :model-value="item.task.interval"
                size="small"
                style="width: 110px"
                @change="(val) => updateTaskInterval(item.task, val)"
              >
                <el-option label="5分钟" :value="5" />
                <el-option label="15分钟" :value="15" />
                <el-option label="30分钟" :value="30" />
                <el-option label="1小时" :value="60" />
                <el-option label="3小时" :value="180" />
                <el-option label="6小时" :value="360" />
                <el-option label="12小时" :value="720" />
                <el-option label="24小时" :value="1440" />
              </el-select>
              <el-button
                v-if="item.status === 'stopped'"
                size="small"
                type="success"
                @click="startTask(item.task)"
              >
                启动
              </el-button>
              <el-button
                v-else
                size="small"
                type="danger"
                @click="stopTask(item.task.id)"
              >
                停止
              </el-button>
            </div>

            <!-- 未创建：可用则可创建，不可用则禁用并提示 -->
            <div v-else class="detail-item-actions">
              <el-checkbox
                v-if="item.taskType === 'platform_youpin_price'"
                v-model="createSync[item.key]"
                size="small"
              >
                同步历史
              </el-checkbox>
              <el-select
                v-model="createInterval[item.key]"
                size="small"
                style="width: 110px"
                :disabled="!item.available"
              >
                <el-option label="5分钟" :value="5" />
                <el-option label="15分钟" :value="15" />
                <el-option label="30分钟" :value="30" />
                <el-option label="1小时" :value="60" />
                <el-option label="3小时" :value="180" />
                <el-option label="6小时" :value="360" />
                <el-option label="12小时" :value="720" />
                <el-option label="24小时" :value="1440" />
              </el-select>
              <el-button
                size="small"
                type="success"
                plain
                :disabled="!item.available"
                :loading="creatingKey === item.key"
                @click="handleCreate(item)"
              >
                创建
              </el-button>
              <span v-if="!item.available" class="detail-item-hint">未配置对应数据源</span>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- 添加 / 管理 独立更新任务 -->
    <el-drawer
      v-model="independentDrawerVisible"
      :title="editingIndependentId ? '独立更新任务' : '添加独立更新任务'"
      direction="rtl"
      size="480px"
      class="independent-drawer"
    >
      <!-- 状态 + 启停（仅编辑模式） -->
      <div v-if="activeIndependentTask" class="independent-status-row">
        <el-tag :type="activeIndependentTask.status === '已停止' ? 'info' : 'success'" effect="dark">
          {{ activeIndependentTask.status === '已停止' ? '已停止' : '运行中' }}
        </el-tag>
        <el-button
          v-if="activeIndependentTask.status === '已停止'"
          size="small"
          type="success"
          @click="startTask(activeIndependentTask)"
        >
          启动
        </el-button>
        <el-button v-else size="small" type="danger" @click="stopTask(activeIndependentTask.id)">停止</el-button>
      </div>

      <el-form :model="independentForm" label-width="100px" label-position="left">
        <el-form-item label="任务名称">
          <el-input v-model="independentForm.taskName" placeholder="请输入任务名称" />
        </el-form-item>

        <el-form-item label="更新内容">
          <el-select v-model="independentForm.updateType" disabled>
            <el-option label="更新库存组件价格" value="stock_platform_price" />
          </el-select>
        </el-form-item>

        <el-form-item label="数据来源">
          <el-radio-group v-model="independentForm.source">
            <el-radio value="database">从数据库同步(悠悠+BUFF)</el-radio>
            <el-radio value="csqaq" :disabled="!hasCsqaqSource">从CSQAQ获取</el-radio>
          </el-radio-group>
          <span v-if="!hasCsqaqSource" class="source-hint">需先在「数据源」页面配置 CSQAQ 类型</span>
        </el-form-item>

        <el-form-item label="执行间隔">
          <el-select v-model="independentForm.interval" placeholder="请选择执行间隔">
            <el-option label="15分钟" :value="15" />
            <el-option label="30分钟" :value="30" />
            <el-option label="1小时" :value="60" />
            <el-option label="3小时" :value="180" />
            <el-option label="6小时" :value="360" />
            <el-option label="12小时" :value="720" />
            <el-option label="24小时" :value="1440" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="savingIndependent" @click="saveIndependentTask">
            {{ editingIndependentId ? '保存修改' : '保存任务' }}
          </el-button>
          <el-button v-if="editingIndependentId" type="danger" plain @click="deleteIndependentFromDrawer">删除</el-button>
          <el-button @click="independentDrawerVisible = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-drawer>
  </div>
</template>


<script setup>
import { ref, reactive, computed } from 'vue'
import { useAutomateManagement } from './useAutomateManagement.js'

const {
  accountCards,
  createAutomation,
  independentTasks,
  hasCsqaqSource,
  createIndependentTask,
  updateIndependentTask,
  stockPriceSourceLabel,
  formatInterval,
  startTask,
  stopTask,
  updateTaskInterval,
  deleteTask
} = useAutomateManagement()

const detailVisible = ref(false)
const activeAccountId = ref(null)
const creatingKey = ref('')

// 未创建项的本地输入：间隔 / 是否同步历史
const createInterval = reactive({})
const createSync = reactive({})

// 当前选中账号（从 accountCards 实时派生，保证 5 秒刷新后内容同步）
const activeAccount = computed(() =>
  accountCards.value.find(acc => acc.steamId === activeAccountId.value) || null
)

// 详情中按自动化类型分组
const activeAccountGroups = computed(() => {
  if (!activeAccount.value) return []
  const groups = []
  const indexMap = new Map()
  activeAccount.value.automations.forEach(item => {
    if (!indexMap.has(item.typeLabel)) {
      indexMap.set(item.typeLabel, groups.length)
      groups.push({ typeLabel: item.typeLabel, items: [] })
    }
    groups[indexMap.get(item.typeLabel)].items.push(item)
    if (createInterval[item.key] === undefined) createInterval[item.key] = 30
    if (createSync[item.key] === undefined) createSync[item.key] = true
  })
  return groups
})

const statusText = (status) => ({
  running: '运行中',
  stopped: '已停止',
  uncreated: '未创建',
  unavailable: '未配置'
}[status] || status)

const statusTagType = (status) => ({
  running: 'success',
  stopped: 'warning',
  uncreated: 'info',
  unavailable: 'info'
}[status] || 'info')

const openAccountDetail = (steamId) => {
  activeAccountId.value = steamId
  detailVisible.value = true
}

const handleCreate = async (item) => {
  creatingKey.value = item.key
  try {
    await createAutomation(
      activeAccount.value.steamId,
      item,
      createInterval[item.key] ?? 30,
      createSync[item.key] ?? true
    )
  } finally {
    creatingKey.value = ''
  }
}

// 独立更新任务
const typeLabel = (task) => task.type || '更新库存组件价格'

const independentDrawerVisible = ref(false)
const editingIndependentId = ref(null)
const savingIndependent = ref(false)
const independentForm = reactive({
  taskName: '更新库存组件价格',
  updateType: 'stock_platform_price',
  source: 'database',
  interval: 60
})

// 当前编辑的独立任务（实时派生，保证状态随刷新同步）
const activeIndependentTask = computed(() =>
  independentTasks.value.find(t => t.id === editingIndependentId.value) || null
)

const resetIndependentForm = () => {
  independentForm.taskName = '更新库存组件价格'
  independentForm.updateType = 'stock_platform_price'
  independentForm.source = 'database'
  independentForm.interval = 60
}

const openCreateIndependentDrawer = () => {
  editingIndependentId.value = null
  resetIndependentForm()
  independentDrawerVisible.value = true
}

const openEditIndependentDrawer = (task) => {
  editingIndependentId.value = task.id
  independentForm.taskName = task.taskName || '更新库存组件价格'
  independentForm.updateType = 'stock_platform_price'
  independentForm.source = task.config?.source || 'database'
  independentForm.interval = task.interval || 60
  independentDrawerVisible.value = true
}

const saveIndependentTask = async () => {
  savingIndependent.value = true
  try {
    const payload = {
      taskName: independentForm.taskName,
      source: independentForm.source,
      interval: independentForm.interval
    }
    const ok = editingIndependentId.value
      ? await updateIndependentTask(editingIndependentId.value, payload)
      : await createIndependentTask(payload)
    if (ok) independentDrawerVisible.value = false
  } finally {
    savingIndependent.value = false
  }
}

const deleteIndependentFromDrawer = () => {
  const id = editingIndependentId.value
  independentDrawerVisible.value = false
  deleteTask(id)
}
</script>

<style scoped src="./styles.css"></style>
