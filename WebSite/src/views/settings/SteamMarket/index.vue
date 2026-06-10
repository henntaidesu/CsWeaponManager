<template>
  <div>
    <!-- Tab切换 -->
    <div class="tab-container">
      <el-tabs v-model="activeTab" @tab-click="handleTabClick" class="steam-tabs">
        <el-tab-pane label="Steam购买" name="buy">
          <!-- Steam购买内容 -->
          <div class="filters card">
            <div class="flex flex-wrap gap-4 items-center">
              <el-input
                v-model="buySearchText"
                placeholder="搜索饰品名称..."
                prefix-icon="Search"
                class="search-input"
                @keyup.enter="handleBuySearch"
                @clear="handleBuyClearSearch"
                clearable
              />
              <el-button type="primary" @click="handleBuySearch" :loading="buyLoading">
                搜索
              </el-button>
              <el-button @click="handleBuyClearSearch" :disabled="buyLoading">
                重置
              </el-button>
              <el-select 
                v-model="buyGameNameFilter" 
                placeholder="选择游戏" 
                class="game-select" 
                @change="handleBuyGameChange"
                clearable
              >
                <el-option label="全部游戏" value="all" />
                <el-option v-for="game in buyGameNamesList" :key="game" :label="game" :value="game" />
              </el-select>
              <el-date-picker
                v-model="buyDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                class="date-picker"
                @change="handleBuyDateRangeChange"
                clearable
              />
              <el-button type="success" @click="handleBuyTimeSearch" :loading="buyLoading">
                按时间搜索
              </el-button>
            </div>
          </div>

          <!-- Steam购买统计数据 -->
          <div class="stats-summary">
            <div class="card">
              <div class="stats-container">
                <div class="stats-section">
                  <h3>Steam购买统计</h3>
                  <div class="grid grid-3">
                    <div class="stat-item">
                      <span class="stat-label">总购买数量:</span>
                      <span class="stat-value">{{ buyTotalStats.totalCount }} 件</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">总购买金额:</span>
                      <span class="stat-value">¥{{ buyTotalStats.totalAmount }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">平均购买价格:</span>
                      <span class="stat-value">¥{{ buyTotalStats.avgPrice }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="stats-divider"></div>
                
                <div class="stats-section">
                  <h3>当前页面统计</h3>
                  <div class="grid grid-3">
                    <div class="stat-item">
                      <span class="stat-label">页面数量:</span>
                      <span class="stat-value">{{ buyCurrentPageStats.totalCount }} 件</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">页面金额:</span>
                      <span class="stat-value">¥{{ buyCurrentPageStats.totalAmount }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">平均购买价格:</span>
                      <span class="stat-value">¥{{ buyCurrentPageStats.avgPrice }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="table-container">
            <div class="pagination pagination-top">
              <el-pagination
                v-model:current-page="buyCurrentPage"
                v-model:page-size="buyPageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="buyTotalItems"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleBuySizeChange"
                @current-change="handleBuyCurrentChange"
              />
            </div>
            
            <el-table
              :data="filteredBuyData"
              v-loading="buyLoading"
              element-loading-text="加载中..."
              style="width: 100%"
              :row-style="{ backgroundColor: 'transparent' }"
              :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
              :flexible="true"
              :scrollbar-always-on="true"
            >
              <el-table-column prop="order_id" label="交易ID" min-width="150" show-overflow-tooltip align="left" />
              <el-table-column label="游戏" min-width="120" show-overflow-tooltip>
                <template #default="scope">
                  {{ scope.row.game_name || 'Counter-Strike 2' }}
                </template>
              </el-table-column>
              <el-table-column prop="weapon_type" label="类型" min-width="50" />
              <el-table-column prop="item_name" label="饰品名称" min-width="150" show-overflow-tooltip />
              <el-table-column prop="weapon_name" label="武器名称" min-width="100" />
              <el-table-column prop="weapon_float" label="Float" min-width="180" align="left">
                <template #default="scope">
                  {{ scope.row.weapon_float }}
                </template>
              </el-table-column>
              <el-table-column prop="float_range" label="磨损等级" min-width="100" />
              <el-table-column prop="price" label="购买价格" min-width="100">
                <template #default="scope">
                  ¥{{ scope.row.price }}
                </template>
              </el-table-column>
              <el-table-column prop="order_time" label="购买时间" min-width="160">
                <template #default="scope">
                  {{ formatTime(scope.row.order_time) }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" min-width="80">
                <template #default="scope">
                  <el-tag 
                    type="success"
                    size="small"
                    :style="{
                      backgroundColor: 'var(--accent-green)',
                      borderColor: 'var(--accent-green)',
                      color: 'var(--text-primary)'
                    }"
                  >
                    {{ scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="pagination">
              <el-pagination
                v-model:current-page="buyCurrentPage"
                v-model:page-size="buyPageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="buyTotalItems"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleBuySizeChange"
                @current-change="handleBuyCurrentChange"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Steam销售" name="sell">
          <!-- Steam销售内容 -->
          <div class="filters card">
            <div class="flex flex-wrap gap-4 items-center">
              <el-input
                v-model="sellSearchText"
                placeholder="搜索饰品名称..."
                prefix-icon="Search"
                class="search-input"
                @keyup.enter="handleSellSearch"
                @clear="handleSellClearSearch"
                clearable
              />
              <el-button type="primary" @click="handleSellSearch" :loading="sellLoading">
                搜索
              </el-button>
              <el-button @click="handleSellClearSearch" :disabled="sellLoading">
                重置
              </el-button>
              <el-select 
                v-model="sellGameNameFilter" 
                placeholder="选择游戏" 
                class="game-select" 
                @change="handleSellGameChange"
                clearable
              >
                <el-option label="全部游戏" value="all" />
                <el-option v-for="game in sellGameNamesList" :key="game" :label="game" :value="game" />
              </el-select>
              <el-date-picker
                v-model="sellDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                class="date-picker"
                @change="handleSellDateRangeChange"
                clearable
              />
              <el-button type="success" @click="handleSellTimeSearch" :loading="sellLoading">
                按时间搜索
              </el-button>
            </div>
          </div>

          <!-- Steam销售统计数据 -->
          <div class="stats-summary">
            <div class="card">
              <div class="stats-container">
                <div class="stats-section">
                  <h3>Steam销售统计</h3>
                  <div class="grid grid-3">
                    <div class="stat-item">
                      <span class="stat-label">总销售数量:</span>
                      <span class="stat-value">{{ sellTotalStats.totalCount }} 件</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">总销售金额:</span>
                      <span class="stat-value">¥{{ sellTotalStats.totalAmount }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">平均销售价格:</span>
                      <span class="stat-value">¥{{ sellTotalStats.avgPrice }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="stats-divider"></div>
                
                <div class="stats-section">
                  <h3>当前页面统计</h3>
                  <div class="grid grid-3">
                    <div class="stat-item">
                      <span class="stat-label">页面数量:</span>
                      <span class="stat-value">{{ sellCurrentPageStats.totalCount }} 件</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">页面金额:</span>
                      <span class="stat-value">¥{{ sellCurrentPageStats.totalAmount }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">平均销售价格:</span>
                      <span class="stat-value">¥{{ sellCurrentPageStats.avgPrice }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="table-container">
            <div class="pagination pagination-top">
              <el-pagination
                v-model:current-page="sellCurrentPage"
                v-model:page-size="sellPageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="sellTotalItems"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSellSizeChange"
                @current-change="handleSellCurrentChange"
              />
            </div>
            
            <el-table
              :data="filteredSellData"
              v-loading="sellLoading"
              element-loading-text="加载中..."
              style="width: 100%"
              :row-style="{ backgroundColor: 'transparent' }"
              :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
              :flexible="true"
              :scrollbar-always-on="true"
            >
              <el-table-column prop="order_id" label="交易ID" min-width="150" show-overflow-tooltip align="left" />
              <el-table-column label="游戏" min-width="120" show-overflow-tooltip>
                <template #default="scope">
                  {{ scope.row.game_name || 'Counter-Strike 2' }}
                </template>
              </el-table-column>
              <el-table-column prop="weapon_type" label="类型" min-width="50" />
              <el-table-column prop="item_name" label="饰品名称" min-width="150" show-overflow-tooltip />
              <el-table-column prop="weapon_name" label="武器名称" min-width="100" />
              <el-table-column prop="weapon_float" label="Float" min-width="180" align="left">
                <template #default="scope">
                  {{ scope.row.weapon_float }}
                </template>
              </el-table-column>
              <el-table-column prop="float_range" label="磨损等级" min-width="100" />
              <el-table-column prop="price" label="销售价格" min-width="100">
                <template #default="scope">
                  ¥{{ scope.row.price }}
                </template>
              </el-table-column>
              <el-table-column prop="order_time" label="销售时间" min-width="160">
                <template #default="scope">
                  {{ formatTime(scope.row.order_time) }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" min-width="80">
                <template #default="scope">
                  <el-tag 
                    type="success"
                    size="small"
                    :style="{
                      backgroundColor: 'var(--accent-green)',
                      borderColor: 'var(--accent-green)',
                      color: 'var(--text-primary)'
                    }"
                  >
                    {{ scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            
            <div class="pagination">
              <el-pagination
                v-model:current-page="sellCurrentPage"
                v-model:page-size="sellPageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="sellTotalItems"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSellSizeChange"
                @current-change="handleSellCurrentChange"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>


<script>
import { useSteamMarket } from './useSteamMarket.js'

export default {
  name: 'SteamMarket',
  setup() {
    return useSteamMarket()
  }
}
</script>

<style scoped src="./styles-scoped.css"></style>
<style src="./styles-global.css"></style>
