<template>
  <div>
    <!-- 统计数据卡片 -->
    <div class="stats-container">
      <div class="grid grid-4">
        <div class="card">
          <h3>总库存数量</h3>
          <p class="stat-number">{{ inventoryStats?.totalCount || 0 }} | {{ componentStats?.totalCount || 0 }}</p>
        </div>
        <div class="card">
          <h3>悠悠有品最低价</h3>
          <div class="stat-price-container">
            <p class="stat-number">{{ inventoryStats?.yyyp_price || '0.00' }} | {{ componentStats?.yyyp_price || '0.00' }}</p>
            <p class="stat-diff" :style="{ color: (inventoryStats?.yyyp_diff || 0) >= 0 ? 'var(--accent-red-light)' : 'var(--accent-green)' }">
              {{ (inventoryStats?.yyyp_diff || 0) >= 0 ? '+' : '' }}¥{{ inventoryStats?.yyyp_diff || '0.00' }}
            </p>
          </div>
        </div>
        <div class="card">
          <h3>BUFF最低价</h3>
          <div class="stat-price-container">
            <p class="stat-number">{{ inventoryStats?.buff_price || '0.00' }} | {{ componentStats?.buff_price || '0.00' }}</p>
            <p class="stat-diff" :style="{ color: (inventoryStats?.buff_diff || 0) >= 0 ? 'var(--accent-red-light)' : 'var(--accent-green)' }">
              {{ (inventoryStats?.buff_diff || 0) >= 0 ? '+' : '' }}¥{{ inventoryStats?.buff_diff || '0.00' }}
            </p>
          </div>
        </div>
        <div class="card">
          <h3>Steam参考价</h3>
          <div class="stat-price-container">
            <p class="stat-number">{{ inventoryStats?.steam_price || '0.00' }} | {{ componentStats?.steam_price || '0.00' }}</p>
            <p class="stat-diff" :style="{ color: (inventoryStats?.steam_diff || 0) >= 0 ? 'var(--accent-red-light)' : 'var(--accent-green)' }">
              {{ (inventoryStats?.steam_diff || 0) >= 0 ? '+' : '' }}¥{{ inventoryStats?.steam_diff || '0.00' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 价格区间分析图表 -->
    <div class="chart-section">
      <!-- 图表容器 -->
      <div class="chart-container">
        <!-- 市场指数卡片 - 在 iPad 上优先显示 -->
        <SteamDTMarketIndex class="market-index-card" />
        <CSQAQMarketIndex class="market-index-card" />

        <div class="card chart-card">
          <div class="chart-header">
            <h3>库存饰品价格</h3>
            <div class="chart-controls">
              <el-select
                v-model="selectedInventorySteamId"
                placeholder="选择steam账号"
                @change="handleInventorySteamIdChange"
                style="width: 200px;"
                size="small"
              >
                <el-option label="全部账号" value="all" />
                <el-option
                  v-for="item in steamIdList"
                  :key="item.steamID"
                  :label="item.steamID"
                  :value="item.steamID"
                />
              </el-select>
              <el-radio-group v-model="inventoryChartMode" size="small">
                <el-radio-button label="value">按价值</el-radio-button>
                <el-radio-button label="count">按数量</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div ref="inventoryChartRef" class="price-chart"></div>
          <div class="chart-summary">
            <div class="summary-item">
              <span class="summary-label">总数量：</span>
              <span class="summary-value">{{ inventoryChartStats.totalCount }} 件</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">总价值：</span>
              <span class="summary-value">¥{{ inventoryChartStats.totalValue }}</span>
            </div>
          </div>
        </div>
        <div class="card chart-card">
          <div class="chart-header">
            <h3>库存组件价格</h3>
            <div class="chart-controls">
              <el-select
                v-model="selectedComponentSteamId"
                placeholder="选择steam账号"
                @change="handleComponentSteamIdChange"
                style="width: 200px;"
                size="small"
              >
                <el-option label="全部账号" value="all" />
                <el-option
                  v-for="item in steamIdList"
                  :key="item.steamID"
                  :label="item.steamID"
                  :value="item.steamID"
                />
              </el-select>
              <el-radio-group v-model="componentChartMode" size="small">
                <el-radio-button label="value">按价值</el-radio-button>
                <el-radio-button label="count">按数量</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div ref="componentChartRef" class="price-chart"></div>
          <div class="chart-summary">
            <div class="summary-item">
              <span class="summary-label">总数量：</span>
              <span class="summary-value">{{ componentChartStats.totalCount }} 件</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">总价值：</span>
              <span class="summary-value">¥{{ componentChartStats.totalValue }}</span>
            </div>
          </div>
        </div>
        <div class="card chart-card">
          <div class="chart-header">
            <h3>购入饰品价格</h3>
            <div class="chart-controls">
              <el-select 
                v-model="selectedBuySteamId" 
                placeholder="选择steam账号"
                @change="handleBuySteamIdChange"
                style="width: 200px;"
                size="small"
              >
                <el-option label="全部账号" value="all" />
                <el-option
                  v-for="item in steamIdList"
                  :key="item.steamID"
                  :label="item.steamID"
                  :value="item.steamID"
                />
              </el-select>
              <el-radio-group v-model="buyChartMode" size="small">
                <el-radio-button label="value">按价值</el-radio-button>
                <el-radio-button label="count">按数量</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div ref="buyChartRef" class="price-chart"></div>
          <div class="chart-summary">
            <div class="summary-item">
              <span class="summary-label">总数量：</span>
              <span class="summary-value">{{ buyChartStats.totalCount }} 件</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">总价值：</span>
              <span class="summary-value">¥{{ buyChartStats.totalValue }}</span>
            </div>
          </div>
        </div>
        <div class="card chart-card">
          <div class="chart-header">
            <h3>出售饰品价格</h3>
            <div class="chart-controls">
              <el-select 
                v-model="selectedSellSteamId" 
                placeholder="选择steam账号"
                @change="handleSellSteamIdChange"
                style="width: 200px;"
                size="small"
              >
                <el-option label="全部账号" value="all" />
                <el-option
                  v-for="item in steamIdList"
                  :key="item.steamID"
                  :label="item.steamID"
                  :value="item.steamID"
                />
              </el-select>
              <el-radio-group v-model="sellChartMode" size="small">
                <el-radio-button label="value">按价值</el-radio-button>
                <el-radio-button label="count">按数量</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div ref="sellChartRef" class="price-chart"></div>
          <div class="chart-summary">
            <div class="summary-item">
              <span class="summary-label">总数量：</span>
              <span class="summary-value">{{ sellChartStats.totalCount }} 件</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">总价值：</span>
              <span class="summary-value">¥{{ sellChartStats.totalValue }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 饰品列表弹窗 -->
    <el-dialog
      v-model="itemListVisible"
      :title="`价格区间 ${selectedRange} 的饰品列表`"
      width="90%"
      :close-on-click-modal="true"
      class="item-list-dialog"
    >
      <div class="item-list-container">
        <div class="item-list-header">
          <span>共 {{ filteredItems.length }} 件饰品，已加载 {{ displayedItems.length }} 件</span>
        </div>
        <div 
          class="table-scroll-container" 
          @scroll="handleDialogScroll"
          ref="dialogScrollRef"
        >
          <el-table
            :data="displayedItems"
            style="width: 100%"
            :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
            v-loading="loadingMore"
            element-loading-text="加载中..."
            :row-style="{ cursor: 'pointer' }"
          >
            <el-table-column label="图片" width="120" align="center">
              <template #default="scope">
                <div class="weapon-image-cell">
                  <img
                    v-if="getWeaponImage(scope.row.steam_hash_name)"
                    :src="getWeaponImage(scope.row.steam_hash_name)"
                    :alt="scope.row.item_name"
                    class="weapon-img"
                    @error="(e) => handleImageError(e, scope.row.steam_hash_name)"
                  />
                  <span v-else class="no-image">无图</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="饰品名称" min-width="350">
              <template #default="scope">
                <div class="item-name-cell">
                  <div class="item-title">{{ getItemTitle(scope.row) }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="weapon_type" label="类型" width="120" />
            <el-table-column label="数量" width="100" align="center">
              <template #default="scope">
                <span>{{ scope.row.count || 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="磨损值" width="200">
              <template #default="scope">
                <div v-if="scope.row.count > 1" style="color: var(--text-secondary);">
                  多个磨损值
                </div>
                <div v-else-if="scope.row.weapon_float">
                  <div style="font-family: monospace; font-size: 0.85rem; margin-bottom: 4px;">
                    {{ scope.row.weapon_float }}
                  </div>
                  <!-- 磨损值显示条 -->
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
            <el-table-column label="购入价格" width="150" align="right">
              <template #default="scope">
                <span style="color: var(--accent-green); font-weight: bold;">
                  ¥{{ parseFloat(scope.row.buy_price || 0).toFixed(2) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="悠悠有品" width="150" align="right">
              <template #default="scope">
                <div v-if="scope.row.yyyp_price && scope.row.buy_price" style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                  <span style="color: var(--text-primary); font-weight: bold;">
                    ¥{{ parseFloat(scope.row.yyyp_price).toFixed(2) }}
                  </span>
                  <span 
                    :style="{
                      color: parseFloat(scope.row.yyyp_price) < parseFloat(scope.row.buy_price) ? 'var(--accent-green)' : 'var(--accent-red-light)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }"
                  >
                    {{ parseFloat(scope.row.yyyp_price) < parseFloat(scope.row.buy_price) ? '-' : '+' }}
                    ¥{{ Math.abs(parseFloat(scope.row.yyyp_price) - parseFloat(scope.row.buy_price)).toFixed(2) }}
                  </span>
                </div>
                <span v-else-if="scope.row.yyyp_price" style="color: var(--text-primary); font-weight: bold;">
                  ¥{{ parseFloat(scope.row.yyyp_price).toFixed(2) }}
                </span>
                <span v-else style="color: var(--text-secondary);">-</span>
              </template>
            </el-table-column>
            <el-table-column label="BUFF" width="150" align="right">
              <template #default="scope">
                <div v-if="scope.row.buff_price && scope.row.buy_price" style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                  <span style="color: var(--text-primary); font-weight: bold;">
                    ¥{{ parseFloat(scope.row.buff_price).toFixed(2) }}
                  </span>
                  <span 
                    :style="{
                      color: parseFloat(scope.row.buff_price) < parseFloat(scope.row.buy_price) ? 'var(--accent-green)' : 'var(--accent-red-light)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }"
                  >
                    {{ parseFloat(scope.row.buff_price) < parseFloat(scope.row.buy_price) ? '-' : '+' }}
                    ¥{{ Math.abs(parseFloat(scope.row.buff_price) - parseFloat(scope.row.buy_price)).toFixed(2) }}
                  </span>
                </div>
                <span v-else-if="scope.row.buff_price" style="color: var(--text-primary); font-weight: bold;">
                  ¥{{ parseFloat(scope.row.buff_price).toFixed(2) }}
                </span>
                <span v-else style="color: var(--text-secondary);">-</span>
              </template>
            </el-table-column>
            <el-table-column label="Steam" width="120" align="right">
              <template #default="scope">
                <span v-if="scope.row.steam_price" style="color: var(--text-primary); font-weight: bold;">
                  ¥{{ parseFloat(scope.row.steam_price).toFixed(2) }}
                </span>
                <span v-else style="color: var(--text-secondary);">-</span>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="hasMoreItems" class="load-more-indicator">
            <span v-if="!loadingMore">向下滚动加载更多...</span>
          </div>
          <div v-else-if="displayedItems.length > 0" class="load-more-indicator">
            <span>已加载全部数据</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { useHome } from './useHome.js'
import SteamDTMarketIndex from './steamDT/index.vue'
import CSQAQMarketIndex from './CSQAQMarketIndex/index.vue'

export default {
  name: 'Home',
  components: {
    SteamDTMarketIndex,
    CSQAQMarketIndex
  },
  setup() {
    return useHome()
  }
}
</script>

<style scoped src="./styles.css"></style>
