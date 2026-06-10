<template>
  <div class="inventory-mining-container">
    <div class="page-layout">
      <!-- 左侧历史记录栏 -->
      <aside class="history-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-header-title">搜索历史</div>
          <el-button 
            type="info" 
            size="small"
            @click="loadHistoryList"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>

        <div class="sidebar-divider"></div>

        <div class="history-list">
          <div 
            v-for="history in historyList" 
            :key="history.source_steam_id"
            class="history-item"
            :class="{ active: currentMiningId === history.source_steam_id }"
            @click="selectHistory(history.source_steam_id)"
          >
            <el-button 
              type="danger" 
              size="small"
              class="history-delete-btn"
              :icon="Delete"
              circle
              @click.stop="deleteHistory(history.source_steam_id)"
            />
            <div class="history-item-header">
              <img v-if="history.avatar_url" :src="history.avatar_url" class="history-avatar" />
              <div class="history-name-container">
                <span class="history-name">{{ history.persona_name || history.source_steam_id }}</span>
                <span v-if="history.persona_name && history.persona_name !== history.source_steam_id" class="history-steam-id">
                  {{ history.source_steam_id }}
                </span>
              </div>
            </div>
            <div class="history-meta">
              <div class="history-time">{{ formatTime(history.latest_time) }}</div>
              <div class="history-stats">
                <el-tag size="small" type="success">{{ history.total_items }} 件</el-tag>
                <el-tag size="small" type="warning" v-if="history.total_value">¥{{ history.total_value }}</el-tag>
              </div>
            </div>
          </div>

          <div v-if="!historyList || historyList.length === 0" class="empty-history">
            <el-empty description="暂无搜索历史" :image-size="80" />
          </div>
        </div>
      </aside>

      <!-- 右侧主内容区域 -->
      <div class="main-content-area">
        <div class="mining-section">
          <h2 class="section-title">库存挖掘</h2>
          
          <div class="mining-controls">
        <el-input
          v-model="inputSteamId"
          placeholder=""
          class="steam-id-input"
          :disabled="isMining"
          clearable
          @keyup.enter="startMining"
        >
          <template #prepend>Steam ID</template>
        </el-input>
        
        <el-button 
          type="primary" 
          @click="startMining"
          :disabled="!inputSteamId || isMining"
          :loading="isMining"
        >
          {{ isMining ? '挖掘中...' : '开始挖掘' }}
        </el-button>
        
        <el-button 
          type="danger" 
          @click="stopMining"
          :disabled="!isMining"
        >
          停止挖掘
        </el-button>
      </div>

      <div v-if="miningProgress" class="progress-info">
        <el-progress 
          :percentage="miningProgress.percentage" 
          :status="miningProgress.status"
        />
      </div>

      <div v-if="miningResult" class="result-section">
        <div class="result-stats">
          <div class="stat-card">
            <div class="stat-label">总物品数</div>
            <div class="stat-value">{{ miningResult.total_analyzed }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">总价值</div>
            <div class="stat-value success">¥{{ miningResult.total_value || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">账号价值</div>
            <div class="stat-value highlight">¥{{ miningResult.self_value || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">好友价值</div>
            <div class="stat-value">¥{{ miningResult.friends_value || 0 }}</div>
          </div>
        </div>
      </div>
        </div>
        <!-- 结束 mining-section -->

        <!-- 用户树形图 -->
        <div v-if="userTreeData && userTreeData.length > 0" class="user-tree-section">
      <el-tree
        :data="userTreeData"
        :props="treeProps"
        default-expand-all
        class="user-tree"
        node-key="id"
      >
        <template #default="{ node, data }">
          <div class="tree-node">
            <div class="tree-node-content" @click="handleTreeNodeClick(data)">
              <img v-if="data.avatar" :src="data.avatar" class="tree-avatar" />
              <el-icon v-else :size="24" class="tree-icon">
                <User />
              </el-icon>
              <div class="tree-label-container">
                <span class="tree-label">{{ data.label }}</span>
                <span v-if="data.steam_id && data.relationship === 'friend'" class="tree-steam-id">
                  ({{ data.steam_id }})
                </span>
              </div>
              <div class="tree-tags-container">
                <el-tag :type="data.type" size="small" class="tree-tag">
                  {{ data.count }} 件
                </el-tag>
                <el-tag v-if="data.value && data.value !== '0.00'" type="success" size="small" class="tree-tag">
                  ¥{{ data.value }}
                </el-tag>
              </div>
              <el-button 
                v-if="data.steam_id && data.relationship === 'friend'"
                type="primary" 
                size="small"
                class="tree-mine-btn"
                :disabled="isMining"
                @click.stop="mineUserFromTree(data.steam_id)"
              >
                挖掘
              </el-button>
            </div>
          </div>
        </template>
      </el-tree>
        </div>
        <!-- 结束 user-tree-section -->

        <!-- 挖掘结果展示 -->
        <div v-if="miningItems && miningItems.length > 0" class="results-table-section">
          <!-- 分页器 - 顶部（包含切换和筛选信息） -->
          <div class="pagination-toolbar">
        <div class="toolbar-left">
          <el-switch
            v-model="groupMode"
            active-text="组合模式"
            inactive-text="明细模式"
            @change="handleToggleGroupMode"
          />
          <span v-if="selectedUser" class="filter-info">
            <el-tag type="info" closable @close="selectedUser = ''; currentPage = 1; updateDisplayData()">
              {{ userList.find(u => u.steam_id === selectedUser)?.name || '未知用户' }}
            </el-tag>
          </span>
        </div>
        <div class="toolbar-right">
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

      <!-- 表格视图 -->
      <el-table
        ref="tableRef"
        :data="paginatedData"
        style="width: 100%"
        :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
        @row-click="handleRowClick"
        :row-key="row => row.steam_hash_name || row.assetid"
      >
        <el-table-column v-if="groupMode" type="expand" width="1">
          <template #default="scope">
            <div class="expand-content" v-if="scope.row.item_count > 1">
              <div class="expand-two-columns">
                <div 
                  v-for="(item, index) in getExpandedItems(scope.row)" 
                  :key="item.assetid"
                  class="expand-item-card"
                >
                  <div class="expand-item-row">
                    <div class="expand-item-left">
                      <div class="expand-item-image">
                        <img
                          v-if="getWeaponImage(scope.row.steam_hash_name)"
                          :src="getWeaponImage(scope.row.steam_hash_name)"
                          :alt="scope.row.item_name"
                          class="weapon-img-small"
                          @error="(e) => e.target.style.display = 'none'"
                        />
                        <span v-else class="no-image">无图</span>
                        
                        <!-- 贴纸覆盖层 -->
                        <div v-if="item.sticker" class="sticker-overlay-expand">
                          <div
                            v-for="(sticker, sIdx) in parseStickers(item.sticker)"
                            :key="sIdx"
                            class="sticker-item-overlay-expand"
                            :title="sticker.name || '未知贴纸'"
                          >
                            <img
                              v-if="sticker.image"
                              :src="sticker.image"
                              :alt="sticker.name"
                              class="sticker-img-overlay"
                              @error="(e) => e.target.style.display = 'none'"
                            />
                            <div v-else class="sticker-placeholder-overlay">?</div>
                          </div>
                        </div>
                        
                        <!-- 挂件覆盖层 -->
                        <div v-if="item.pendant" class="pendant-overlay-expand">
                          <div
                            class="pendant-item-overlay-expand"
                            :title="parsePendant(item.pendant).name || '挂件'"
                          >
                            <img
                              v-if="parsePendant(item.pendant).image"
                              :src="parsePendant(item.pendant).image"
                              :alt="parsePendant(item.pendant).name"
                              class="pendant-img-overlay"
                              @error="(e) => e.target.style.display = 'none'"
                            />
                            <div v-else class="pendant-placeholder-overlay">🎗️</div>
                          </div>
                        </div>
                      </div>
                      <!-- 改名标签 -->
                      <div v-if="item.rename" class="expand-rename-tag">
                        <el-tag type="info" size="small" :title="item.rename">
                          🏷️
                        </el-tag>
                      </div>
                    </div>
                    <div class="expand-item-details">
                      <div class="expand-item-user">
                        <span class="expand-label">用户:</span>
                        <span class="expand-value">{{ item.persona_name }}</span>
                      </div>
                      <div class="expand-item-float" v-if="item.weapon_float && item.weapon_float !== '0' && item.weapon_float !== '0.0'">
                        <div class="float-text-row">
                          <span class="expand-label">磨损:</span>
                          <span class="expand-value-small">{{ item.weapon_float }}</span>
                        </div>
                        <div class="float-bar-mini">
                          <div class="float-segment fn"></div>
                          <div class="float-segment mw"></div>
                          <div class="float-segment ft"></div>
                          <div class="float-segment ww"></div>
                          <div class="float-segment bs"></div>
                          <div
                            class="float-pointer"
                            :style="{ left: `${parseFloat(item.weapon_float) * 100}%` }"
                          ></div>
                        </div>
                      </div>
                      <div class="expand-item-prices">
                        <div class="expand-price-item" v-if="item.market_price && item.market_price !== '0'">
                          <span class="expand-label">价格:</span>
                          <span class="expand-value">¥{{ parseFloat(item.market_price).toFixed(2) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 分页器 -->
              <div v-if="getExpandedTotal(scope.row) > getItemsPerPage()" class="inline-pagination-below" @click.stop>
                <el-pagination
                  small
                  :current-page="expandedRowPages[scope.row.steam_hash_name] || 1"
                  :page-size="getItemsPerPage()"
                  :total="getExpandedTotal(scope.row)"
                  layout="prev, pager, next"
                  :hide-on-single-page="true"
                  @current-change="(page) => handleExpandPageChange(scope.row, page)"
                />
              </div>
            </div>
            <div v-else class="expand-content-empty">
              <span style="color: var(--text-secondary);">仅有1件物品，无需展开</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="图片" width="144" align="center" fixed="left">
          <template #default="scope">
            <div class="weapon-image-cell">
              <img
                v-if="getWeaponImage(scope.row.steam_hash_name)"
                :src="getWeaponImage(scope.row.steam_hash_name)"
                :alt="scope.row.item_name"
                class="weapon-img"
                @error="(e) => e.target.style.display = 'none'"
              />
              <span v-else class="no-image">无图</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="饰品名称" min-width="250" fixed="left">
          <template #default="scope">
            <div class="item-name-cell">
              <div class="item-title">{{ getItemTitle(scope.row) }}</div>
              <!-- 组合模式下数量为1时显示所属用户 -->
              <div v-if="groupMode && scope.row.item_count === 1 && scope.row.persona_names && scope.row.persona_names[0]" class="item-owner">
                <el-tag size="small" type="info">{{ scope.row.persona_names[0] }}</el-tag>
              </div>
              <div class="item-extras" v-if="hasExtras(scope.row)">
                <!-- 印花图片 -->
                <div class="sticker-list" v-if="scope.row.sticker || (scope.row.stickers && scope.row.stickers[0])">
                  <div
                    v-for="(sticker, idx) in parseStickers(scope.row.sticker || scope.row.stickers[0])"
                    :key="idx"
                    class="sticker-item"
                    :title="sticker.name || '未知贴纸'"
                  >
                    <img
                      v-if="sticker.image"
                      :src="sticker.image"
                      :alt="sticker.name"
                      class="sticker-img"
                      @error="(e) => e.target.style.display = 'none'"
                    />
                    <div v-else class="sticker-placeholder">?</div>
                  </div>
                </div>
                <!-- 挂件图片 -->
                <div class="pendant-list" v-if="scope.row.pendant || (scope.row.pendants && scope.row.pendants[0])">
                  <img
                    v-if="parsePendant(scope.row.pendant || scope.row.pendants[0])?.image"
                    :src="parsePendant(scope.row.pendant || scope.row.pendants[0]).image"
                    :alt="parsePendant(scope.row.pendant || scope.row.pendants[0])?.name"
                    class="pendant-img"
                    @error="(e) => e.target.style.display = 'none'"
                  />
                </div>
                <!-- 改名显示 -->
                <div class="rename-text" v-if="scope.row.rename || (scope.row.renames && scope.row.renames[0])">
                  <span class="rename-value">{{ scope.row.rename || scope.row.renames[0] }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="weapon_type" label="武器类型" min-width="120" />
        
        <el-table-column v-if="!groupMode" prop="persona_name" label="所属用户" width="150" />
        
        <el-table-column label="数量" width="120" align="center" sortable :sort-method="sortByCount">
          <template #default="scope">
            <span>{{ groupMode ? (scope.row.item_count || 0) : 1 }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="weapon_float" label="磨损值" width="200" align="left">
          <template #default="scope">
            <div v-if="groupMode && scope.row.item_count > 1" style="color: var(--text-secondary);">
              多个磨损值
            </div>
            <div v-else-if="scope.row.weapon_float && scope.row.weapon_float !== '0' && scope.row.weapon_float !== '0.0'">
              <div style="font-family: monospace; font-size: 0.85rem; margin-bottom: 4px;">
                {{ scope.row.weapon_float }}
              </div>
              <div class="float-bar">
                <div class="float-segment fn"></div>
                <div class="float-segment mw"></div>
                <div class="float-segment ft"></div>
                <div class="float-segment ww"></div>
                <div class="float-segment bs"></div>
                <div
                  class="float-pointer"
                  :style="{ left: `${parseFloat(scope.row.weapon_float) * 100}%` }"
                ></div>
              </div>
            </div>
            <span v-else style="color: var(--text-secondary);">N/A</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="float_range" label="磨损范围" min-width="120" />
        
        <el-table-column label="价格" min-width="150" sortable :sort-method="sortByPrice">
          <template #default="scope">
            <span v-if="groupMode && scope.row.total_value" style="color: var(--accent-green); font-weight: bold;">
              ¥{{ scope.row.total_value.toFixed(2) }}
            </span>
            <span v-else-if="scope.row.market_price && scope.row.market_price !== '0'" style="color: var(--accent-green); font-weight: bold;">
              ¥{{ parseFloat(scope.row.market_price).toFixed(2) }}
            </span>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
        
        <el-table-column v-if="!groupMode" prop="rarity" label="稀有度" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.rarity" size="small">{{ scope.row.rarity }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column v-if="!groupMode" prop="tradable" label="可交易" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.tradable ? 'success' : 'danger'" size="small">
              {{ scope.row.tradable ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页器 - 底部 -->
      <div class="pagination-toolbar">
        <div class="toolbar-left"></div>
        <div class="toolbar-right">
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
          <!-- 结束 pagination-toolbar (bottom) -->
        </div>
        <!-- 结束 results-table-section -->
      </div>
      <!-- 结束 main-content-area -->
    </div>
    <!-- 结束 page-layout -->
  </div>
  <!-- 结束 inventory-mining-container -->
</template>

<script>
import { User, Refresh, Delete } from '@element-plus/icons-vue'
import { useInventoryMining } from './useInventoryMining.js'

export default {
  name: 'InventoryMining',
  components: {
    User,
    Refresh,
    Delete
  },
  setup() {
    return useInventoryMining()
  }
}
</script>

<style scoped>
.inventory-mining-container {
  padding: 2rem;
  max-width: 100%;
  margin: 0 auto;
}

.page-layout {
  display: flex;
  gap: 1.5rem;
  min-height: calc(100vh - 150px);
  max-width: 100%;
}

/* 左侧历史记录栏 */
.history-sidebar {
  width: 280px;
  min-width: 280px;
  flex-shrink: 0;
  background-color: var(--bg-secondary);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  height: auto;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.sidebar-header-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-green);
}

.sidebar-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-green), transparent);
  margin-bottom: 1rem;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.history-item {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.history-item:hover {
  border-color: var(--accent-green);
  background-color: var(--bg-tertiary);
}

.history-item.active {
  border-color: var(--accent-green);
  background-color: rgba(76, 175, 80, 0.1);
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
}

.history-delete-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
}

.history-item:hover .history-delete-btn {
  opacity: 1;
}

.history-item-header {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.history-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid rgba(76, 175, 80, 0.3);
  flex-shrink: 0;
}

.history-name-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.history-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-steam-id {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.history-stats {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.empty-history {
  padding: 2rem 0;
  text-align: center;
}

/* 右侧主内容区域 */
.main-content-area {
  flex: 1;
  min-width: 0;
}

.mining-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-default);
}

.section-title {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 1.5rem 0;
  font-weight: 600;
}

.mining-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.steam-id-input {
  min-width: 400px;
  max-width: 500px;
}

.progress-info {
  background: rgba(45, 45, 45, 0.6);
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.progress-item {
  margin-bottom: 1rem;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-label {
  display: block;
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.progress-value {
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.progress-value.highlight {
  color: var(--accent-blue);
  font-size: 1.3rem;
}

.result-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-default);
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: rgba(45, 45, 45, 0.6);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  border: 1px solid var(--border-default);
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  color: var(--text-primary);
  font-size: 1.8rem;
  font-weight: 700;
}

.stat-value.highlight {
  color: var(--accent-blue);
}

.stat-value.success {
  color: var(--accent-green);
}

.results-table-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 2rem;
  border: 1px solid var(--border-default);
}

.user-tree-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--border-default);
}

.user-tree {
  background: transparent;
  color: var(--text-primary);
  margin-top: 1rem;
}

.tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  transition: all 0.2s ease;
  gap: 1rem;
}

.tree-node:hover {
  background: rgba(76, 175, 80, 0.1);
  border-radius: 4px;
}

.tree-node-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.tree-mine-btn {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.tree-node:hover .tree-mine-btn {
  opacity: 1;
}

.tree-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid rgba(64, 158, 255, 0.3);
}

.tree-icon {
  color: var(--accent-blue);
}

.tree-label-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.tree-label {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 500;
}

.tree-steam-id {
  color: var(--accent-green);
  font-size: 0.85rem;
  font-family: monospace;
  white-space: nowrap;
}

.tree-tags-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.5rem;
}

.tree-tag {
  flex-shrink: 0;
}

.pagination-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  gap: 1rem;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 0 0 auto;
}

.toolbar-right {
  display: flex;
  justify-content: flex-end;
  flex: 1 1 auto;
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 卡片视图样式 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
}

.item-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.item-card:hover {
  transform: translateY(-4px);
  border-color: rgba(76, 175, 80, 0.6);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.item-card-image {
  width: 100%;
  height: 180px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-default);
  position: relative;
}

.card-weapon-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.no-image-card {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.item-card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.item-card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 2.8em;
}

.item-card-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.item-card-price {
  padding: 0.75rem;
  background: rgba(76, 175, 80, 0.1);
  border-radius: 6px;
  text-align: center;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.price-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent-green);
}

.price-empty {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.item-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-default);
  margin-top: auto;
}

/* 列表视图图片样式 */
.table-weapon-img {
  max-width: 80px;
  max-height: 60px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.no-image-small {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* 表格样式 */
.weapon-image-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.weapon-img {
  max-width: 120px;
  max-height: 80px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.no-image {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.item-name-cell {
  padding: 0.5rem 0;
}

.item-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.item-owner {
  margin-bottom: 0.5rem;
}

.item-extras {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.sticker-list {
  display: flex;
  gap: 0.25rem;
}

.sticker-item {
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sticker-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.sticker-placeholder {
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.pendant-list {
  display: flex;
}

.pendant-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 3px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.rename-text {
  font-size: 0.85rem;
  color: var(--accent-blue);
}

.rename-value {
  font-style: italic;
}

/* 展开行样式 */
:deep(.el-table__expand-column .cell) {
  display: none;
}

:deep(.el-table__expand-column) {
  width: 1px !important;
  padding: 0 !important;
}

:deep(.el-table__body-wrapper .el-table__row[style*="cursor: pointer"]:hover) {
  background-color: rgba(76, 175, 80, 0.1) !important;
}

.expand-content {
  padding: 1rem;
  background-color: var(--bg-secondary) !important;
}

.expand-two-columns {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.expand-item-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.75rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.expand-item-card:hover {
  background: var(--bg-tertiary);
  border-color: rgba(76, 175, 80, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.expand-item-row {
  display: flex;
  gap: 0.75rem;
}

.expand-item-left {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.expand-item-image {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 4px;
  position: relative;
  overflow: visible;
}

.weapon-img-small {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.sticker-overlay-expand {
  position: absolute;
  bottom: 2px;
  left: 2px;
  display: flex;
  gap: 2px;
  z-index: 5;
  pointer-events: none;
}

.sticker-item-overlay-expand {
  position: relative;
  width: 16px;
  height: 16px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  transition: all 0.2s ease;
  pointer-events: auto;
  cursor: pointer;
}

.sticker-item-overlay-expand:hover {
  transform: scale(2);
  z-index: 10;
  border-color: rgba(76, 175, 80, 0.8);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
}

.pendant-overlay-expand {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 5;
  pointer-events: none;
}

.pendant-item-overlay-expand {
  position: relative;
  width: 18px;
  height: 18px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid rgba(255, 215, 0, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  transition: all 0.2s ease;
  pointer-events: auto;
  cursor: pointer;
}

.pendant-item-overlay-expand:hover {
  transform: scale(2);
  z-index: 10;
  border-color: rgba(255, 215, 0, 0.8);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
}

.sticker-img-overlay,
.pendant-img-overlay {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.sticker-placeholder-overlay,
.pendant-placeholder-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: bold;
}

.expand-rename-tag {
  display: flex;
  justify-content: center;
  margin-top: 0.25rem;
}

.expand-rename-tag .el-tag {
  font-size: 0.85rem;
  padding: 2px 6px;
  cursor: help;
}

.expand-item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.expand-item-user {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.expand-item-float {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.float-text-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.expand-value-small {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.75rem;
  font-family: monospace;
}

.expand-item-prices {
  display: flex;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.expand-price-item {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.expand-label {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.expand-value {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 0.85rem;
}

.float-bar-mini {
  position: relative;
  height: 4px;
  display: flex;
  border-radius: 2px;
  overflow: hidden;
  width: 100%;
  margin-top: 2px;
}

.float-bar-mini .float-segment {
  height: 100%;
}

.float-bar-mini .float-pointer {
  width: 2px;
  height: 8px;
  top: 50%;
  transform: translate(-50%, -50%);
}

.expand-content-empty {
  padding: 1rem;
  text-align: center;
  background-color: var(--bg-secondary);
}

.inline-pagination-below {
  margin-top: 0.5rem;
  display: flex;
  justify-content: center;
}

.inline-pagination-below :deep(.el-pagination) {
  padding: 0;
}

.inline-pagination-below :deep(.el-pager li) {
  min-width: 24px;
  height: 24px;
  line-height: 24px;
  font-size: 12px;
}

.inline-pagination-below :deep(.btn-prev),
.inline-pagination-below :deep(.btn-next) {
  padding: 0 4px;
  min-width: 24px;
  height: 24px;
  line-height: 24px;
}

/* 磨损值显示条 */
.float-bar {
  position: relative;
  height: 6px;
  display: flex;
  border-radius: 3px;
  overflow: hidden;
  width: 100%;
  margin: 0.25rem 0;
}

.float-segment {
  height: 100%;
  transition: opacity 0.2s;
}

.float-segment.fn {
  flex: 7;
  background: linear-gradient(90deg, var(--accent-green), var(--accent-green));
}

.float-segment.mw {
  flex: 8;
  background: linear-gradient(90deg, #8BC34A, #9CCC65);
}

.float-segment.ft {
  flex: 23;
  background: linear-gradient(90deg, #FFC107, #FFD54F);
}

.float-segment.ww {
  flex: 7;
  background: linear-gradient(90deg, #FF9800, #FFB74D);
}

.float-segment.bs {
  flex: 55;
  background: linear-gradient(90deg, #F44336, #E57373);
}

.float-pointer {
  position: absolute;
  width: 3px;
  height: 12px;
  background: #fff;
  border: 1px solid #000;
  border-radius: 2px;
  top: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

@media (max-width: 768px) {
  .inventory-mining-container {
    padding: 1rem;
  }

  .mining-section {
    padding: 1.5rem;
  }

  .mining-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .steam-id-input {
    width: 100%;
  }

  .result-stats {
    grid-template-columns: 1fr;
  }

  .table-filters {
    flex-direction: column;
  }

  .card-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}

/* Element Plus 分页器样式 */
:deep(.el-pagination) {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

/* 表格样式 */
:deep(.el-table) {
  background-color: transparent;
  color: var(--text-primary);
}

:deep(.el-table th) {
  background-color: var(--bg-tertiary) !important;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-default);
}

:deep(.el-table td) {
  background-color: transparent !important;
  border-bottom: 1px solid var(--border-default);
  color: var(--text-primary);
}

:deep(.el-table tr:hover > td) {
  background-color: rgba(76, 175, 80, 0.1) !important;
}
</style>


/* 响应式设计 */
@media (max-width: 1024px) {
  .page-layout {
    flex-direction: column;
  }

  .history-sidebar {
    width: 100%;
    min-width: 100%;
    position: relative;
    top: 0;
    max-height: 400px;
  }

  .main-content-area {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .inventory-mining-container {
    padding: 1rem;
  }

  .history-sidebar {
    padding: 1rem;
  }

  .mining-section {
    padding: 1.5rem;
  }

  .mining-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .steam-id-input {
    width: 100%;
    min-width: 100%;
  }
}
