<template>
  <div class="pnl-page">
    <!-- 头部:筛选 + 操作 -->
    <div class="pnl-header card">
      <div class="header-row">
        <div class="header-left">
          <el-select
            v-model="dataUserFilter"
            placeholder="全部账号"
            class="data-user-select"
            clearable
            @change="onDataUserChange"
          >
            <el-option v-for="u in dataUserList" :key="u" :label="u" :value="u" />
          </el-select>
          <el-radio-group v-model="activeTab" class="view-switch" @change="onTabChange">
            <el-radio-button label="calendar">盈亏日历</el-radio-button>
            <el-radio-button label="orphans">孤立卖出</el-radio-button>
          </el-radio-group>
        </div>
        <div class="header-right">
          <el-button :loading="loading" @click="recordInventorySnapshot">
            记录今日库存盈亏
          </el-button>
          <el-button type="primary" :loading="loading" @click="runAutoPairing">
            执行自动配对
          </el-button>
        </div>
      </div>

      <!-- 总览卡片 -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-label">当月总盈亏</div>
          <div class="stat-value" :class="profitClass(overallStats.total_profit)">
            {{ Number(overallStats.total_profit || 0).toFixed(2) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">盈利合计</div>
          <div class="stat-value profit-positive">
            {{ Number(overallStats.win_profit || 0).toFixed(2) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">亏损合计</div>
          <div class="stat-value profit-negative">
            {{ Number(overallStats.loss_profit || 0).toFixed(2) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">配对件数</div>
          <div class="stat-value">{{ overallStats.paired_quantity || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">配对笔数</div>
          <div class="stat-value">{{ overallStats.pair_count || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已剔除</div>
          <div class="stat-value">{{ overallStats.excluded_count || 0 }}</div>
        </div>
        <div
          class="stat-card stat-card-clickable"
          title="查看当月未匹配的孤立卖出"
          @click="viewMonthUnmatched"
        >
          <div class="stat-label">未匹配数</div>
          <div class="stat-value profit-negative">{{ overallStats.unmatched_count || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- 主体 -->
    <div class="pnl-main">
      <!-- 盈亏日历 -->
      <div v-show="activeTab === 'calendar'" class="card calendar-panel">
          <el-calendar v-model="calendarRefDate">
            <template #header>
              <div class="cal-header">
                <el-button
                  size="small"
                  :disabled="!canPrevMonth"
                  @click="prevMonth"
                >上一月</el-button>
                <el-select
                  v-model="selectedYear"
                  class="year-select"
                  @change="onYearChange"
                >
                  <el-option
                    v-for="y in yearOptions"
                    :key="y"
                    :label="`${y} 年`"
                    :value="y"
                  />
                </el-select>
                <el-select
                  v-model="selectedMonthNum"
                  class="month-select"
                  @change="onMonthNumChange"
                >
                  <el-option
                    v-for="m in monthOptionsOfYear"
                    :key="m"
                    :label="`${m} 月`"
                    :value="m"
                  />
                </el-select>
                <el-button
                  size="small"
                  :disabled="!canNextMonth"
                  @click="nextMonth"
                >下一月</el-button>
                <span class="cal-header-sep"></span>
                <span class="cal-header-label">库存盈亏口径</span>
                <el-radio-group v-model="invBasis" size="small">
                  <el-radio-button label="yyyp">悠悠</el-radio-button>
                  <el-radio-button label="buff">BUFF</el-radio-button>
                  <el-radio-button label="steam">Steam</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <template #date-cell="{ data }">
              <div
                class="cal-cell"
                :class="[cellColor(data), { 'cal-cell-clickable': dayInfo(data.day) }]"
                @click="dayInfo(data.day) && openDayDetail(data.day)"
              >
                <div class="cal-day">{{ data.day.split('-').slice(2).join('') }}</div>
                <template v-if="dayInfo(data.day)">
                  <div class="cal-profit" :class="profitClass(dayInfo(data.day).profit)">
                    {{ Number(dayInfo(data.day).profit).toFixed(2) }}
                  </div>
                  <div class="cal-meta">
                    {{ dayInfo(data.day).paired_quantity }}件 / {{ dayInfo(data.day).pair_count }}笔
                  </div>
                  <div v-if="dayInfo(data.day).excluded_count" class="cal-excluded">
                    剔除 {{ dayInfo(data.day).excluded_count }}
                  </div>
                </template>
                <div v-if="dayInventory(data.day)" class="cal-inventory">
                  <span class="cal-inventory-label">库存</span>
                  <span :class="profitClass(invProfitOf(dayInventory(data.day)))">
                    {{ Number(invProfitOf(dayInventory(data.day))).toFixed(2) }}
                  </span>
                  <span
                    v-if="invChangePctOf(dayInventory(data.day)) !== null"
                    class="cal-inventory-pct"
                    :class="invChangePctOf(dayInventory(data.day)) >= 0 ? 'profit-positive' : 'profit-negative'"
                    title="较上一快照日的市值涨跌"
                  >
                    {{ invChangePctOf(dayInventory(data.day)) >= 0 ? '▲' : '▼' }}{{ Math.abs(invChangePctOf(dayInventory(data.day))).toFixed(2) }}%
                  </span>
                </div>
              </div>
            </template>
          </el-calendar>
      </div>

      <!-- 孤立卖出 -->
      <div v-show="activeTab === 'orphans'">
          <div class="orphan-filters">
            <el-input
              v-model="orphans.search"
              placeholder="按物品名/hash 搜索"
              class="orphan-search"
              clearable
              @keyup.enter="loadOrphans"
            />
            <el-date-picker
              v-model="orphans.date_range"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="(val) => { orphans.start_date = val && val[0] || ''; orphans.end_date = val && val[1] || ''; }"
              clearable
            />
            <el-button type="primary" :loading="loading" @click="() => { orphans.page = 1; loadOrphans(); }">
              搜索
            </el-button>
          </div>

          <el-table
            :data="orphans.list"
            v-loading="loading"
            size="small"
            :row-style="{ backgroundColor: 'transparent' }"
            :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
          >
            <el-table-column label="图片" width="120" align="center">
              <template #default="{ row }">
                <div class="weapon-image-cell">
                  <img
                    v-if="getWeaponImage(row.steam_hash_name)"
                    :src="getWeaponImage(row.steam_hash_name)"
                    :alt="row.item_name"
                    class="weapon-img"
                    @error="(e) => e.target.style.display = 'none'"
                  />
                  <span v-else class="no-image">无图</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="商品" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="item-name-cell">
                  <div class="item-title">{{ getItemTitle(row) }}</div>
                  <div class="item-extras" v-if="hasExtras(row)">
                    <!-- 印花图片 -->
                    <div class="sticker-list" v-if="row.sticker">
                      <div
                        v-for="(sticker, idx) in parseStickers(row.sticker)"
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
                    <div class="pendant-list" v-if="row.pendant">
                      <img
                        v-if="parsePendant(row.pendant)?.image"
                        :src="parsePendant(row.pendant).image"
                        :alt="parsePendant(row.pendant)?.name"
                        class="pendant-img"
                        @error="(e) => e.target.style.display = 'none'"
                      />
                    </div>
                    <!-- 改名显示 -->
                    <div class="rename-text" v-if="row.rename">
                      <span class="rename-value">{{ row.rename }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="磨损" width="200">
              <template #default="{ row }">
                <div v-if="row.weapon_float">
                  <div style="font-family: monospace; font-size: 0.8rem; margin-bottom: 4px;">
                    {{ row.weapon_float }}
                  </div>
                  <div class="float-bar">
                    <div class="float-segment fn"></div>
                    <div class="float-segment mw"></div>
                    <div class="float-segment ft"></div>
                    <div class="float-segment ww"></div>
                    <div class="float-segment bs"></div>
                    <div
                      class="float-pointer"
                      :style="{ left: `${parseFloat(row.weapon_float) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <span v-else style="color: var(--text-secondary);">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="sell_price" label="实收价" width="100">
              <template #default="{ row }">
                {{ Number(row.sell_price || 0).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="sell_from" label="平台" width="90" />
            <el-table-column prop="data_user" label="账号" width="120" show-overflow-tooltip />
            <el-table-column prop="sell_order_time" label="出售时间" width="160" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="openPairDialog(row)">
                  手动配对
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="orphan-pager">
            <el-pagination
              background
              layout="total, prev, pager, next, sizes"
              :total="orphans.total"
              v-model:current-page="orphans.page"
              v-model:page-size="orphans.page_size"
              :page-sizes="[20, 50, 100]"
              @current-change="loadOrphans"
              @size-change="() => { orphans.page = 1; loadOrphans(); }"
            />
          </div>
      </div>
    </div>

    <!-- 当日明细抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      :title="`${detailDate} 盈亏明细`"
      direction="rtl"
      size="78%"
      class="pnl-detail-drawer"
    >
      <el-table
        :data="detailRows"
        size="small"
        :row-style="{ backgroundColor: 'transparent' }"
        :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
      >
        <el-table-column label="图片" width="120" align="center">
          <template #default="{ row }">
            <div class="weapon-image-cell">
              <img
                v-if="getWeaponImage(row.steam_hash_name)"
                :src="getWeaponImage(row.steam_hash_name)"
                :alt="row.item_name"
                class="weapon-img"
                @error="(e) => e.target.style.display = 'none'"
              />
              <span v-else class="no-image">无图</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="商品" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="item-name-cell">
              <div class="item-title">{{ getItemTitle(row) }}</div>
              <div class="item-extras" v-if="hasExtras(row)">
                <!-- 印花图片 -->
                <div class="sticker-list" v-if="row.sticker">
                  <div
                    v-for="(sticker, idx) in parseStickers(row.sticker)"
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
                <div class="pendant-list" v-if="row.pendant">
                  <img
                    v-if="parsePendant(row.pendant)?.image"
                    :src="parsePendant(row.pendant).image"
                    :alt="parsePendant(row.pendant)?.name"
                    class="pendant-img"
                    @error="(e) => e.target.style.display = 'none'"
                  />
                </div>
                <!-- 改名显示 -->
                <div class="rename-text" v-if="row.rename">
                  <span class="rename-value">{{ row.rename }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="磨损" width="200">
          <template #default="{ row }">
            <div v-if="row.weapon_float">
              <div style="font-family: monospace; font-size: 0.8rem; margin-bottom: 4px;">
                {{ row.weapon_float }}
              </div>
              <div class="float-bar">
                <div class="float-segment fn"></div>
                <div class="float-segment mw"></div>
                <div class="float-segment ft"></div>
                <div class="float-segment ww"></div>
                <div class="float-segment bs"></div>
                <div
                  class="float-pointer"
                  :style="{ left: `${parseFloat(row.weapon_float) * 100}%` }"
                ></div>
              </div>
            </div>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
        <el-table-column label="买入" width="180">
          <template #default="{ row }">
            <div>{{ Number(row.buy_price || 0).toFixed(2) }} @ {{ row.buy_from }}</div>
            <div class="time-faded">{{ row.buy_order_time }}</div>
          </template>
        </el-table-column>
        <el-table-column label="卖出" width="180">
          <template #default="{ row }">
            <div>{{ Number(row.sell_price || 0).toFixed(2) }} @ {{ row.sell_from }}</div>
            <div class="time-faded">{{ row.sell_order_time }}</div>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="60" prop="quantity" />
        <el-table-column label="盈亏" width="100">
          <template #default="{ row }">
            <span :class="[profitClass(row.profit), { 'text-strike': row.is_excluded }]">
              {{ Number(row.profit || 0).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.pair_type === 'manual' ? 'warning' : 'info'">
              {{ row.pair_type === 'manual' ? '手动' : '自动' }}
            </el-tag>
            <el-tag v-if="row.is_excluded" size="small" type="danger" style="margin-left:4px;">剔除</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.is_excluded"
              size="small"
              type="warning"
              @click="setExcluded(row.pairing_id, true)"
            >剔除</el-button>
            <el-button
              v-else
              size="small"
              type="success"
              @click="setExcluded(row.pairing_id, false)"
            >恢复</el-button>
            <el-button size="small" type="danger" @click="unpair(row.pairing_id)">解绑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!detailRows.length" class="empty-tip">该日暂无配对记录</div>
    </el-drawer>

    <!-- 手动配对对话框 -->
    <el-dialog
      v-model="pairDialogVisible"
      title="手动配对买入"
      width="80%"
      destroy-on-close
    >
      <div v-if="pairTargetSell" class="pair-target">
        <div class="pair-target-title">目标出售记录</div>
        <div class="pair-target-grid">
          <div><span class="label">物品:</span>{{ pairTargetSell.item_name }}</div>
          <div><span class="label">磨损:</span>{{ pairTargetSell.weapon_float ? Number(pairTargetSell.weapon_float).toFixed(6) : '-' }}</div>
          <div><span class="label">实收价:</span>{{ Number(pairTargetSell.sell_price || 0).toFixed(2) }}</div>
          <div><span class="label">平台:</span>{{ pairTargetSell.sell_from }}</div>
          <div><span class="label">账号:</span>{{ pairTargetSell.data_user || '-' }}</div>
          <div><span class="label">时间:</span>{{ pairTargetSell.sell_order_time }}</div>
        </div>
      </div>

      <!-- 手动输入购入价(无对应买入记录时) -->
      <div class="manual-price-row">
        <span class="manual-price-label">手动输入购入价</span>
        <el-input-number
          v-model="manualBuyPrice"
          :min="0"
          :precision="2"
          :step="1"
          controls-position="right"
          placeholder="购入价"
          class="manual-price-input"
        />
        <span v-if="manualBuyPrice !== null && manualBuyPrice !== ''" class="manual-price-preview">
          预估盈亏:
          <span :class="profitClass((pairTargetSell?.sell_price || 0) - Number(manualBuyPrice))">
            {{ ((pairTargetSell?.sell_price || 0) - Number(manualBuyPrice)).toFixed(2) }}
          </span>
        </span>
        <el-button type="success" @click="confirmManualPairByPrice">按此价配对</el-button>
      </div>

      <div class="pair-candidates-header">
        <span>候选买入(同 hash 同账号,有剩余可配数)</span>
        <div class="pair-relax">
          <el-checkbox v-model="pairRelaxHash" @change="loadCandidates">放宽 hash(按物品名)</el-checkbox>
          <el-checkbox v-model="pairRelaxUser" @change="loadCandidates">放宽账号(跨账号)</el-checkbox>
        </div>
      </div>

      <el-table :data="pairCandidates" stripe size="small" max-height="400">
        <el-table-column prop="item_name" label="物品" min-width="180" show-overflow-tooltip />
        <el-table-column label="磨损" width="100">
          <template #default="{ row }">
            {{ row.weapon_float ? Number(row.weapon_float).toFixed(6) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="买入价" width="100">
          <template #default="{ row }">
            {{ Number(row.buy_price || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="buy_from" label="平台" width="80" />
        <el-table-column prop="data_user" label="账号" width="110" show-overflow-tooltip />
        <el-table-column prop="buy_order_time" label="买入时间" width="160" />
        <el-table-column label="可用/总数" width="100">
          <template #default="{ row }">
            {{ row.remaining }} / {{ row.qty }}
          </template>
        </el-table-column>
        <el-table-column label="预估盈亏" width="100">
          <template #default="{ row }">
            <span :class="profitClass((pairTargetSell?.sell_price || 0) - (row.buy_price || 0))">
              {{ ((pairTargetSell?.sell_price || 0) - (row.buy_price || 0)).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="confirmManualPair(row)">配对</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!pairCandidates.length" class="empty-tip">未找到候选买入,可勾选「放宽」按钮扩大搜索范围</div>
    </el-dialog>
  </div>
</template>

<script>
import { usePnl } from './usePnl.js'

export default {
  name: 'Pnl',
  setup() {
    return usePnl()
  },
}
</script>

<style scoped src="./styles.css"></style>

<!-- 抽屉为 teleport 到 body 的全局节点,作用域样式无法命中,这里用非作用域规则将抽屉主体置为页面黑色背景 -->
<style>
.pnl-detail-drawer .el-drawer__body {
  background-color: var(--bg-primary);
}
.pnl-detail-drawer .el-drawer__header {
  background-color: var(--bg-primary);
  margin-bottom: 0;
  padding-bottom: 16px;
}
</style>
