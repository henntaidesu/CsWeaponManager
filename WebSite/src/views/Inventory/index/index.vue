<template>
  <div>
    <div class="filters card">
      <div class="flex flex-wrap gap-4 items-center">
        <el-select 
          v-model="selectedSteamId" 
          placeholder="选择Steam账号" 
          class="steam-id-select"
          @change="handleSteamIdChange"
          filterable
        >
          <el-option
            v-for="item in steamIdList"
            :key="item.dataID"
            :label="`${item.dataName} (${item.steamID}) - ${item.item_count}件`"
            :value="item.steamID"
          >
            <span style="float: left">{{ item.dataName }} ({{ item.steamID }})</span>
            <span style="float: right; color: var(--el-text-color-secondary); font-size: 13px">
              {{ item.item_count }}件
            </span>
          </el-option>
        </el-select>
        <el-input
          v-model="searchText"
          placeholder="搜索饰品名称..."
          prefix-icon="Search"
          class="search-input"
          @keyup.enter="loadInventoryData"
          clearable
        />
        <el-select v-model="weaponTypeFilter" placeholder="武器类型" class="filter-select" clearable @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="步枪" value="步枪" />
          <el-option label="手枪" value="手枪" />
          <el-option label="狙击枪" value="狙击枪" />
          <el-option label="冲锋枪" value="冲锋枪" />
          <el-option label="霰弹枪" value="霰弹枪" />
          <el-option label="机枪" value="机枪" />
          <el-option label="手套" value="手套" />
          <el-option label="匕首" value="匕首" />
          <el-option label="挂件" value="挂件" />
        </el-select>
        <el-select v-model="floatRangeFilter" placeholder="磨损等级" class="filter-select" clearable @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="崭新出厂" value="崭新出厂" />
          <el-option label="略有磨损" value="略有磨损" />
          <el-option label="久经沙场" value="久经沙场" />
          <el-option label="破损不堪" value="破损不堪" />
          <el-option label="战痕累累" value="战痕累累" />
        </el-select>
        <el-select v-model="pendantFilter" placeholder="挂件" class="filter-select" clearable @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="有挂件" value="has" />
          <el-option label="无挂件" value="none" />
        </el-select>
        <el-select v-model="stickerFilter" placeholder="印花" class="filter-select" clearable @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="有印花" value="has" />
          <el-option label="无印花" value="none" />
        </el-select>
        <el-select v-model="renameFilter" placeholder="改名" class="filter-select" clearable @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="有改名" value="has" />
          <el-option label="无改名" value="none" />
        </el-select>
        <el-select v-model="tradeRestrictionFilter" placeholder="交易限制" class="filter-select" clearable @change="handleFilterChange">
          <el-option label="全部" value="" />
          <el-option label="有交易限制" value="has" />
          <el-option label="无交易限制" value="none" />
        </el-select>
        <el-button type="primary" @click="loadInventoryData" :loading="loading">
          搜索
        </el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="success" @click="fetchSteamInventory" :loading="fetchingInventory" class="action-button">
          更新Steam库存
        </el-button>
        <el-button type="success" @click="fetchYYYPPrice" :loading="fetchingYYYPPrice" class="action-button">
          获取悠悠有品价格
        </el-button>
        <el-button type="success" @click="fetchBuffPrice" :loading="fetchingBuffPrice" class="action-button">
          获取BUFF价格
        </el-button>
        <el-button 
          :type="showPriceDiff ? 'primary' : 'info'" 
          @click="showPriceDiff = !showPriceDiff" 
          class="action-button"
        >
          {{ showPriceDiff ? '显示差价' : '显示价格' }}
        </el-button>
        <div style="margin-left: auto; display: flex; gap: 0.5rem; align-items: center;">
          <el-switch
            v-if="displayMode === 'list'"
            v-model="groupMode"
            active-text="组合模式"
            inactive-text="明细模式"
            @change="handleToggleGroupMode"
          />
          <el-button
            :type="displayMode === 'list' ? 'primary' : ''" 
            @click="toggleDisplayMode"
          >
            {{ displayMode === 'list' ? '列表' : '卡片' }}
          </el-button>
        </div>
      </div>
    </div>

    <div class="inventory-stats">
      <div class="grid grid-5">
        <div class="card">
          <h3>总库存数量</h3>
          <p class="stat-number">{{ inventoryStats.totalCount }}</p>
        </div>
        <div class="card">
          <h3>购入总价值</h3>
          <p class="stat-number">¥{{ priceStats.total_price }}</p>
        </div>
        <div class="card">
          <h3>悠悠有品最低价</h3>
          <div class="stat-price-container">
            <p class="stat-number">¥{{ yyypPriceStats.total_price }}</p>
            <p class="stat-diff-right" :style="{ color: yyypPriceStats.diff >= 0 ? 'var(--accent-red-light)' : 'var(--accent-green)' }">
              {{ yyypPriceStats.diff >= 0 ? '+' : '' }}¥{{ yyypPriceStats.diff }}
            </p>
          </div>
        </div>
        <div class="card">
          <h3>BUFF最低价</h3>
          <div class="stat-price-container">
            <p class="stat-number">¥{{ buffPriceStats.total_price }}</p>
            <p class="stat-diff-right" :style="{ color: buffPriceStats.diff >= 0 ? 'var(--accent-red-light)' : 'var(--accent-green)' }">
              {{ buffPriceStats.diff >= 0 ? '+' : '' }}¥{{ buffPriceStats.diff }}
            </p>
          </div>
        </div>
        <div class="card">
          <h3>Steam参考价</h3>
          <div class="stat-price-container">
            <p class="stat-number">¥{{ steamPriceStats.total_price }}</p>
            <p class="stat-diff-right" :style="{ color: steamPriceStats.diff >= 0 ? 'var(--accent-red-light)' : 'var(--accent-green)' }">
              {{ steamPriceStats.diff >= 0 ? '+' : '' }}¥{{ steamPriceStats.diff }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表/卡片统一使用外层容器（与 /stock-components 一致） -->
    <div class="table-container">
      <!-- 列表显示 -->
      <div v-if="displayMode === 'list'" class="table-wrapper">
      <el-table
        ref="tableRef"
        :data="currentDisplayData"
        v-loading="loading"
        element-loading-text="加载中..."
        style="width: 100%"
        :row-style="getRowStyle"
        :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
        :default-sort="{ prop: 'buy_price', order: 'descending' }"
        @sort-change="handleSortChange"
        @row-click="handleRowClick"
        :row-key="row => row.assetid"
      >
        <el-table-column v-if="groupMode" type="expand" width="1">
          <template #default="scope">
            <div class="expand-content" v-if="scope.row.item_count > 1">
              <div class="expand-two-columns">
                <div 
                  v-for="(item, index) in getExpandedItems(scope.row)" 
                  :key="item.assetid"
                  class="expand-item-card"
                  @click="openPreview(item)"
                >
                  <div class="expand-item-row">
                    <div class="expand-item-left">
                      <div class="expand-item-image">
                        <img
                          v-if="getWeaponImage(scope.row.steam_hash_name)"
                          :src="getWeaponImage(scope.row.steam_hash_name)"
                          :alt="scope.row.item_name"
                          class="weapon-img-small"
                          @error="(e) => handleImageError(e, scope.row.steam_hash_name)"
                        />
                        <span v-else class="no-image">无图</span>
                        
                        <!-- 贴纸覆盖层 - 左下角 -->
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
                        
                        <!-- 挂件覆盖层 - 右上角 -->
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
                      <div v-if="item.remark" class="expand-remark-tag">
                        <el-tooltip v-if="parseTradeLockDate(item.remark) && !parseTradeLockDate(item.remark).expired" :content="item.remark" placement="top" effect="dark">
                          <el-tag type="warning" size="small">
                            至{{ parseTradeLockDate(item.remark).date }}
                          </el-tag>
                        </el-tooltip>
                        <el-tooltip v-else-if="item.remark && !parseTradeLockDate(item.remark)" :content="item.remark" placement="top" effect="dark">
                          <el-tag type="warning" size="small">交易保护</el-tag>
                        </el-tooltip>
                      </div>
                      <!-- 改名标签 - 只显示图标 -->
                      <div v-if="item.rename" class="expand-rename-tag">
                        <el-tag type="info" size="small" :title="item.rename">
                          🏷️
                        </el-tag>
                      </div>
                    </div>
                    <div class="expand-item-details">
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
                        <!-- 第一行：购入和Steam -->
                        <div class="expand-price-item" v-if="item.buy_price && item.buy_price !== '0'">
                          <span class="expand-label">购入:</span>
                          <span class="expand-value">¥{{ parseFloat(item.buy_price).toFixed(2) }}</span>
                        </div>
                        <div class="expand-price-item" v-if="item.steam_price && item.steam_price !== '0'">
                          <span class="expand-label">Steam:</span>
                          <span 
                            class="expand-value"
                            :style="item.buy_price && item.buy_price !== '0' ? { color: parseFloat(item.steam_price) >= parseFloat(item.buy_price) ? 'var(--accent-red-light)' : 'var(--accent-green)' } : {}"
                          >
                            ¥{{ showPriceDiff && item.buy_price && item.buy_price !== '0' ? Math.abs(parseFloat(item.steam_price) - parseFloat(item.buy_price)).toFixed(2) : parseFloat(item.steam_price).toFixed(2) }}
                          </span>
                        </div>
                        <!-- 第二行：悠悠和BUFF -->
                        <div class="expand-price-item" v-if="item.yyyp_price && item.yyyp_price !== '0'">
                          <span class="expand-label">悠悠:</span>
                          <span 
                            class="expand-value"
                            :style="item.buy_price && item.buy_price !== '0' ? { color: parseFloat(item.yyyp_price) >= parseFloat(item.buy_price) ? 'var(--accent-red-light)' : 'var(--accent-green)' } : {}"
                          >
                            ¥{{ showPriceDiff && item.buy_price && item.buy_price !== '0' ? Math.abs(parseFloat(item.yyyp_price) - parseFloat(item.buy_price)).toFixed(2) : parseFloat(item.yyyp_price).toFixed(2) }}
                          </span>
                        </div>
                        <div class="expand-price-item" v-if="item.buff_price && item.buff_price !== '0'">
                          <span class="expand-label">BUFF:</span>
                          <span 
                            class="expand-value"
                            :style="item.buy_price && item.buy_price !== '0' ? { color: parseFloat(item.buff_price) >= parseFloat(item.buy_price) ? 'var(--accent-red-light)' : 'var(--accent-green)' } : {}"
                          >
                            ¥{{ showPriceDiff && item.buy_price && item.buy_price !== '0' ? Math.abs(parseFloat(item.buff_price) - parseFloat(item.buy_price)).toFixed(2) : parseFloat(item.buff_price).toFixed(2) }}
                          </span>
                        </div>
                      </div>
                      <div class="expand-item-meta">
                        <div v-if="item.order_time" class="expand-meta-item">
                          <span class="expand-label">入库:</span>
                          <span class="expand-value" style="color: var(--text-secondary);">{{ item.order_time }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            <div v-else class="expand-content-empty">
              <span style="color: var(--text-secondary);">仅有1件物品，无需展开</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="图片" width="144" align="center" fixed="left">
          <template #default="scope">
            <div class="weapon-image-cell" style="cursor: pointer;">
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
        <el-table-column label="饰品名称" min-width="250">
          <template #default="scope">
            <div class="item-name-cell">
              <div class="item-title">{{ getItemTitle(scope.row) }}</div>
              <!-- 组合模式下显示分页器 - 固定在名称下方 -->
              <div v-if="groupMode && getExpandedTotal(scope.row) > getItemsPerPage()" class="inline-pagination-below" @click.stop>
                <el-pagination
                  small
                  :current-page="expandedRowPages[scope.row.assetid] || 1"
                  :page-size="getItemsPerPage()"
                  :total="getExpandedTotal(scope.row)"
                  layout="prev, pager, next"
                  :hide-on-single-page="true"
                  @current-change="(page) => handleExpandPageChange(scope.row, page)"
                />
              </div>
              <div class="item-extras" v-if="hasExtras(scope.row)">
                <!-- 印花图片 -->
                <div class="sticker-list" v-if="scope.row.sticker">
                  <div
                    v-for="(sticker, idx) in parseStickers(scope.row.sticker)"
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
                <div class="pendant-list" v-if="scope.row.pendant">
                  <img
                    v-if="parsePendant(scope.row.pendant)?.image"
                    :src="parsePendant(scope.row.pendant).image"
                    :alt="parsePendant(scope.row.pendant)?.name"
                    class="pendant-img"
                    @error="(e) => e.target.style.display = 'none'"
                  />
                </div>
                <!-- 改名显示 -->
                <div class="rename-text" v-if="scope.row.rename">
                  <span class="rename-value">{{ scope.row.rename }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="weapon_type" label="类型" min-width="100" />
        <el-table-column v-if="groupMode" prop="item_count" label="数量" width="120" align="center" sortable="custom">
          <template #default="scope">
            <span>{{ scope.row.item_count || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="weapon_float"
          label="磨损值"
          min-width="220"
          sortable="custom"
        >
          <template #default="scope">
            <!-- 组合模式下，数量大于1时不显示磨损值 -->
            <div v-if="groupMode && scope.row.item_count > 1" style="color: var(--text-secondary);">
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
        <el-table-column 
          prop="buy_price" 
          label="购入价格" 
          width="150" 
          sortable="custom"
        >
          <template #default="scope">
            <div v-if="editingAssetId !== scope.row.assetid" 
                 @click="startEdit(scope.row)" 
                 style="cursor: pointer; padding: 5px;">
              <div v-if="scope.row.buy_price" style="display: flex; align-items: center; gap: 5px;">
                <span style="color: var(--text-primary); font-weight: bold;">¥{{ parseFloat(scope.row.buy_price).toFixed(2) }}</span>
              </div>
              <span v-else style="color: var(--text-secondary);">点击输入</span>
            </div>
            <el-input 
              v-else
              v-model="editingPrice" 
              placeholder="输入价格" 
              size="small"
              :id="'price-input-' + scope.row.assetid"
              @blur="finishEdit(scope.row)"
              @keyup.enter="finishEdit(scope.row)"
              @keyup.esc="cancelEdit"
            />
          </template>
        </el-table-column>
        <el-table-column 
          prop="yyyp_price" 
          label="悠悠有品" 
          width="180" 
          sortable="custom"
        >
          <template #default="scope">
            <div v-if="scope.row.yyyp_price && scope.row.buy_price" style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
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
        <el-table-column 
          prop="buff_price" 
          label="BUFF" 
          width="180" 
          sortable="custom"
        >
          <template #default="scope">
            <div v-if="scope.row.buff_price && scope.row.buy_price" style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
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
        <el-table-column 
          prop="steam_price" 
          label="Steam" 
          width="120" 
          sortable="custom"
        >
          <template #default="scope">
            <span v-if="scope.row.steam_price" style="color: var(--text-primary); font-weight: bold;">
              ¥{{ parseFloat(scope.row.steam_price).toFixed(2) }}
            </span>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
        <el-table-column
          v-if="!groupMode"
          label="备注"
          width="220"
          fixed="right"
        >
          <template #default="scope">
            <div v-if="scope.row.remark && parseTradeLockDate(scope.row.remark) && !parseTradeLockDate(scope.row.remark).expired">
              <el-tooltip :content="scope.row.remark" placement="left" effect="dark">
                <el-tag type="warning" size="small" style="cursor: help;">
                  至{{ parseTradeLockDate(scope.row.remark).date }}
                </el-tag>
              </el-tooltip>
            </div>
            <div v-else-if="scope.row.remark && !parseTradeLockDate(scope.row.remark)">
              <el-tooltip :content="scope.row.remark" placement="left" effect="dark">
                <el-tag type="warning" size="small" style="cursor: help;">
                  交易限制
                </el-tag>
              </el-tooltip>
            </div>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
        <el-table-column 
          v-if="!groupMode"
          prop="order_time" 
          label="入库时间" 
          width="180" 
          sortable="custom"
          fixed="right"
        >
          <template #default="scope">
            <span v-if="scope.row.order_time" style="color: var(--text-secondary);">
              {{ scope.row.order_time }}
            </span>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-footer">
        <span>共 {{ currentDisplayData.length }} 条数据</span>
        <span v-if="hasMore && !loadingMore" style="margin-left: 1rem; color: var(--text-secondary);">滚动加载更多...</span>
        <span v-if="loadingMore" style="margin-left: 1rem; color: var(--accent-green);">正在加载更多...</span>
        <span v-if="!hasMore && currentDisplayData.length > 0" style="margin-left: 1rem; color: var(--text-secondary);">已加载全部数据</span>
      </div>
      <!-- 滚动触发元素 -->
      <div id="load-more-trigger" style="height: 1px;"></div>
      </div>

    <!-- 多选模式下的操作按钮 -->
    <div v-if="selectedItems.length > 0 && !isSelectingComponent" class="multi-select-actions">
      <div class="selected-count">
        已选择 {{ selectedItems.length }} 件物品
      </div>
      <div class="action-buttons">
        <el-button type="info" @click="selectAllDisplayed">全选</el-button>
        <el-button @click="clearSelection">清空选择</el-button>
        <el-button type="primary" @click="showSellDialog">出售</el-button>
        <el-button type="primary" @click="showRentDialog">出租</el-button>
        <el-button type="success" @click="moveToComponent">存入组件</el-button>
        <el-button color="#00bcd4" @click="openDetailFromSelection">详情</el-button>
      </div>
    </div>

    <!-- 选择组件模式提示 -->
    <div v-if="isSelectingComponent" class="component-selection-banner">
      <div class="banner-content">
        <el-icon class="banner-icon"><InfoFilled /></el-icon>
        <span class="banner-text">
          正在选择库存组件，准备存入 <strong>{{ itemsToDeposit.length }}</strong> 件物品，请点击下方组件卡片完成存入
        </span>
      </div>
      <el-button @click="cancelComponentSelection" type="danger" plain>取消存入</el-button>
    </div>

    <!-- 卡片显示 -->
    <div class="card-container" v-if="displayMode === 'card'">
      <div v-loading="loading" class="card-grid">
        <div
          v-for="item in currentDisplayData"
          :key="item.assetid"
          class="inventory-card"
          :class="{
            'selected': isItemSelected(item.assetid),
            'multi-select-mode': true,
            'trade-restricted': hasTradeRestriction(item),
            'component-full': isSelectingComponent && parseFloat(item.weapon_float || 0) >= 1000
          }"
          :data-assetid="item.assetid"
          @click="handleCardClick(item)"
        >
          <div class="card-image">
            <img
              v-if="getWeaponImage(item.steam_hash_name)"
              :data-src="getWeaponImage(item.steam_hash_name)"
              :alt="item.item_name"
              class="lazy-image"
              @error="(e) => handleImageError(e, item.steam_hash_name)"
            />
            <div v-else class="image-placeholder">
              <span>无图片</span>
            </div>
            <!-- 贴纸图片覆盖层 - 左下角 -->
            <div v-if="item.sticker" class="sticker-overlay">
              <div
                v-for="(sticker, index) in parseStickers(item.sticker)"
                :key="index"
                class="sticker-item-overlay"
                :title="sticker.name || '未知贴纸'"
              >
                <img
                  v-if="sticker.image"
                  :data-src="sticker.image"
                  :alt="sticker.name"
                  class="sticker-img-overlay lazy-image"
                  @error="(e) => e.target.style.display = 'none'"
                />
                <div v-else class="sticker-placeholder-overlay">?</div>
              </div>
            </div>
            <!-- 挂件图片覆盖层 - 右上角 -->
            <div v-if="item.pendant" class="pendant-overlay">
              <div
                class="pendant-item-overlay"
                :title="parsePendant(item.pendant).name || '挂件'"
              >
                <img
                  v-if="parsePendant(item.pendant).image"
                  :data-src="parsePendant(item.pendant).image"
                  :alt="parsePendant(item.pendant).name"
                  class="pendant-img-overlay lazy-image"
                  @error="(e) => e.target.style.display = 'none'"
                />
                <div v-else class="pendant-placeholder-overlay">🎗️</div>
              </div>
            </div>
          </div>
          <div class="card-content">
            <div class="card-title" :title="getCardTitle(item)">
              {{ getCardTitle(item) }}
            </div>
            <div class="card-info">
              <!-- 组件：显示空位占比 -->
              <div v-if="item.classid === '3604678661'" class="component-storage-info">
                <div class="storage-stats">
                  <span class="storage-label">已存储:</span>
                  <span class="storage-value">{{ parseFloat(item.weapon_float || 0) }} / 1000</span>
                </div>
                <div class="storage-progress">
                  <el-progress
                    :percentage="(parseFloat(item.weapon_float || 0) / 1000 * 100)"
                    :stroke-width="8"
                    :show-text="false"
                    :color="getComponentProgressColor(parseFloat(item.weapon_float || 0))"
                  />
                </div>
                <div class="storage-remaining">
                  <span class="remaining-label">剩余空位:</span>
                  <span class="remaining-value" :class="getComponentRemainingClass(1000 - parseFloat(item.weapon_float || 0))">
                    {{ 1000 - parseFloat(item.weapon_float || 0) }}
                  </span>
                </div>
              </div>
              
              <!-- 普通物品：显示磨损值 -->
              <template v-else>
                <div class="float-bar-container" v-if="item.weapon_float">
                  <div class="float-bar">
                    <!-- 五个磨损等级的颜色区域 -->
                    <div class="float-segment fn" title="崭新出厂 (0.00 - 0.07)"></div>
                    <div class="float-segment mw" title="略有磨损 (0.07 - 0.15)"></div>
                    <div class="float-segment ft" title="久经沙场 (0.15 - 0.38)"></div>
                    <div class="float-segment ww" title="破损不堪 (0.38 - 0.45)"></div>
                    <div class="float-segment bs" title="战痕累累 (0.45 - 1.00)"></div>
                    <!-- 磨损值指针 -->
                    <div
                      class="float-pointer"
                      :style="{ left: `${parseFloat(item.weapon_float) * 100}%` }"
                      :title="`磨损值: ${item.weapon_float}`"
                    ></div>
                  </div>
                </div>
                <div class="float-value" v-if="item.weapon_float">
                  {{ item.weapon_float }}
                </div>
              </template>
            </div>
            <div class="card-prices" v-if="item.classid !== '3604678661'">
              <!-- 第一行：购入和Steam -->
              <div class="price-row" v-if="item.buy_price || item.steam_price">
                <div class="price-group" v-if="item.buy_price">
                  <span class="price-label">购入:</span>
                  <span class="price-value buy-price">¥{{ parseFloat(item.buy_price).toFixed(2) }}</span>
                </div>
                <div class="price-group" v-if="item.steam_price && item.steam_price !== '0'">
                  <span class="price-label">Steam:</span>
                  <span 
                    class="price-value"
                    :style="item.buy_price ? { color: parseFloat(item.steam_price) >= parseFloat(item.buy_price) ? 'var(--accent-red-light)' : 'var(--accent-green)' } : {}"
                  >
                    ¥{{ showPriceDiff && item.buy_price ? Math.abs(parseFloat(item.steam_price) - parseFloat(item.buy_price)).toFixed(2) : parseFloat(item.steam_price).toFixed(2) }}
                  </span>
                </div>
              </div>
              <!-- 第二行：悠悠和BUFF -->
              <div class="price-row" v-if="item.yyyp_price || item.buff_price">
                <div class="price-group" v-if="item.yyyp_price && item.yyyp_price !== '0'">
                  <span class="price-label">悠悠:</span>
                  <span
                    class="price-value"
                    :style="item.buy_price ? { color: parseFloat(item.yyyp_price) >= parseFloat(item.buy_price) ? 'var(--accent-red-light)' : 'var(--accent-green)' } : {}"
                  >
                    ¥{{ showPriceDiff && item.buy_price ? Math.abs(parseFloat(item.yyyp_price) - parseFloat(item.buy_price)).toFixed(2) : parseFloat(item.yyyp_price).toFixed(2) }}
                  </span>
                </div>
                <div class="price-group" v-if="item.buff_price && item.buff_price !== '0'">
                  <span class="price-label">BUFF:</span>
                  <span
                    class="price-value"
                    :style="item.buy_price ? { color: parseFloat(item.buff_price) >= parseFloat(item.buy_price) ? 'var(--accent-red-light)' : 'var(--accent-green)' } : {}"
                  >
                    ¥{{ showPriceDiff && item.buy_price ? Math.abs(parseFloat(item.buff_price) - parseFloat(item.buy_price)).toFixed(2) : parseFloat(item.buff_price).toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div class="card-tags">
                <el-tooltip v-if="item.remark && parseTradeLockDate(item.remark) && !parseTradeLockDate(item.remark).expired" :content="item.remark" placement="top" effect="dark">
                  <el-tag type="warning" size="small">
                    至{{ parseTradeLockDate(item.remark).date }}
                  </el-tag>
                </el-tooltip>
                <el-tooltip v-else-if="item.remark && !parseTradeLockDate(item.remark)" :content="item.remark" placement="top" effect="dark">
                  <el-tag type="warning" size="small">交易限制</el-tag>
                </el-tooltip>
                <el-tag v-if="item.rename" type="info" size="small" class="rename-tag">
                  <span class="tag-icon">🏷️</span>{{ item.rename }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="table-footer">
        <span>共 {{ currentDisplayData.length }} 条数据</span>
        <span v-if="hasMore && !loadingMore" style="margin-left: 1rem; color: var(--text-secondary);">滚动加载更多...</span>
        <span v-if="loadingMore" style="margin-left: 1rem; color: var(--accent-green);">正在加载更多...</span>
        <span v-if="!hasMore && inventoryData.length > 0" style="margin-left: 1rem; color: var(--text-secondary);">已加载全部数据</span>
      </div>
      <!-- 滚动触发元素 -->
      <div id="load-more-trigger-card" style="height: 1px;"></div>
    </div>

    </div>

    <!-- 备注弹窗 -->
    <el-dialog
      v-model="remarkDialogVisible"
      title="添加备注"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-input 
        v-model="currentRemark" 
        type="textarea"
        :rows="4"
        placeholder="请输入备注信息（可选）"
        maxlength="200"
        show-word-limit
      />
      <template #footer>
        <el-button @click="remarkDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRemark">确定</el-button>
      </template>
    </el-dialog>

    <!-- 备注弹窗 -->
    <el-dialog
      v-model="remarkDialogVisible"
      title="添加备注"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-input 
        v-model="currentRemark" 
        type="textarea"
        :rows="4"
        placeholder="请输入备注信息（可选）"
        maxlength="200"
        show-word-limit
      />
      <template #footer>
        <el-button @click="remarkDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRemark">确定</el-button>
      </template>
    </el-dialog>

    <!-- 备注弹窗 -->
    <el-dialog
      v-model="remarkDialogVisible"
      title="添加备注"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-input 
        v-model="currentRemark" 
        type="textarea"
        :rows="4"
        placeholder="请输入备注信息"
        maxlength="200"
        show-word-limit
      />
      <template #footer>
        <el-button @click="remarkDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRemark">确定</el-button>
      </template>
    </el-dialog>

    <!-- 备注弹窗 -->
    <el-dialog
      v-model="remarkDialogVisible"
      title="添加备注"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-input 
        v-model="currentRemark" 
        type="textarea"
        :rows="4"
        placeholder="请输入备注信息（可选）"
        maxlength="200"
        show-word-limit
      />
      
      <template #footer>
        <el-button @click="remarkDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRemark">确认</el-button>
      </template>
    </el-dialog>

    <!-- 出售/出租弹窗 -->
    <el-dialog
      v-model="sellRentDialogVisible"
      :title="sellRentDialogTitle"
      width="800px"
      :close-on-click-modal="false"
      class="sell-rent-dialog"
    >
      <div class="sell-rent-content">
        <div class="selected-items-list-with-inputs">
          <div class="list-header">
            <h4>选中的物品 ({{ selectedItems.length }}件)</h4>
            <div class="header-actions">
              <el-button 
                size="small" 
                type="success"
                @click="isGroupedView ? autoFillGroupPrices() : autoFillItemPrices()"
              >
                自动填充价格
              </el-button>
              <el-button 
                size="small" 
                @click="toggleGroupedView"
                :type="isGroupedView ? 'primary' : 'default'"
              >
                {{ isGroupedView ? '取消组合' : '组合显示' }}
              </el-button>
            </div>
          </div>
          
          <!-- 非组合显示 -->
          <div v-if="!isGroupedView" class="items-scroll">
            <div 
              v-for="(item, index) in selectedItems" 
              :key="item.assetid"
              class="selected-item-card"
            >
              <div class="item-left">
                <div class="item-thumb-wrapper">
                  <img
                    v-if="getWeaponImage(item.steam_hash_name)"
                    :src="getWeaponImage(item.steam_hash_name)"
                    :alt="item.item_name"
                    class="item-thumb"
                  />
                  
                  <!-- 印花覆盖层 - 左下角 -->
                  <div v-if="item.sticker && parseStickers(item.sticker).length > 0" class="item-sticker-overlay">
                    <div
                      v-for="(sticker, sIdx) in parseStickers(item.sticker)"
                      :key="sIdx"
                      class="item-sticker-mini"
                      :title="sticker.name || '未知印花'"
                    >
                      <img
                        v-if="sticker.image"
                        :src="sticker.image"
                        :alt="sticker.name"
                      />
                    </div>
                  </div>
                  
                  <!-- 挂件覆盖层 - 右上角 -->
                  <div v-if="item.pendant" class="item-pendant-overlay">
                    <div
                      class="item-pendant-mini"
                      :title="parsePendant(item.pendant).name || '挂件'"
                    >
                      <img
                        v-if="parsePendant(item.pendant).image"
                        :src="parsePendant(item.pendant).image"
                        :alt="parsePendant(item.pendant).name"
                      />
                    </div>
                  </div>
                </div>
                
                <div class="item-info">
                  <div class="item-name">{{ getCardTitle(item) }}</div>
                  <div class="item-details">
                    <!-- 磨损进度条 -->
                    <div class="item-float-bar" v-if="item.weapon_float && item.weapon_float !== '0' && item.weapon_float !== '0.0'">
                      <div class="float-row">
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
                        <div class="float-value-text">{{ item.weapon_float }}</div>
                      </div>
                    </div>
                    
                    <!-- 改名信息 -->
                    <div class="item-rename" v-if="item.rename">
                      <span class="rename-icon">🏷️</span>
                      <span class="rename-value" :title="item.rename">{{ item.rename }}</span>
                    </div>
                    
                    <!-- 购入价与悠悠底价在同一行 -->
                    <div class="item-price-row">
                      <div class="item-buy-price" v-if="item.buy_price">
                        购入: ¥{{ parseFloat(item.buy_price).toFixed(2) }}
                      </div>
                      
                      <!-- 悠悠底价 -->
                      <div class="item-yyyp-price">
                        <template v-if="yyypRealtimePrices[item.assetid]">
                          <div v-if="yyypRealtimePrices[item.assetid].loading" class="price-loading">
                            <el-icon class="is-loading"><Loading /></el-icon>
                            <span>查询中...</span>
                          </div>
                          <div v-else-if="yyypRealtimePrices[item.assetid].error" class="price-error">
                            悠悠: {{ yyypRealtimePrices[item.assetid].error }}
                          </div>
                          <div v-else 
                            :class="{
                              'price-higher': item.buy_price && parseFloat(yyypRealtimePrices[item.assetid].lowest_price) > parseFloat(item.buy_price),
                              'price-lower': item.buy_price && parseFloat(yyypRealtimePrices[item.assetid].lowest_price) < parseFloat(item.buy_price),
                              'price-equal': item.buy_price && parseFloat(yyypRealtimePrices[item.assetid].lowest_price) === parseFloat(item.buy_price),
                              'price-no-compare': !item.buy_price
                            }"
                          >
                            悠悠: ¥{{ parseFloat(yyypRealtimePrices[item.assetid].lowest_price).toFixed(2) }}
                            <span class="price-count">({{ yyypRealtimePrices[item.assetid].total_count }}件)</span>
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="item-right">
                <el-form :model="itemForms[index]" :rules="itemFormRules" :ref="el => itemFormRefs[index] = el" class="inline-form">
                  <div>
                    <el-form-item prop="price">
                      <el-input 
                        v-model="itemForms[index].price" 
                        placeholder="价格"
                        @input="validateItemPrice(index)"
                        size="small"
                        :disabled="itemForms[index].uploadStatus === 'uploading' || itemForms[index].uploadStatus === 'success'"
                      />
                    </el-form-item>
                    <el-button 
                      size="small" 
                      @click="openRemarkDialog(index)"
                      :type="itemForms[index].remark ? 'success' : 'default'"
                      :disabled="itemForms[index].uploadStatus === 'uploading' || itemForms[index].uploadStatus === 'success'"
                    >
                      {{ itemForms[index].remark ? '已备注' : '备注' }}
                    </el-button>
                  </div>
                  <!-- 上架状态显示 -->
                  <div v-if="itemForms[index].uploadStatus" class="upload-status">
                    <el-tag 
                      v-if="itemForms[index].uploadStatus === 'uploading'" 
                      type="info" 
                      size="small"
                    >
                      <el-icon class="is-loading"><Loading /></el-icon>
                      {{ itemForms[index].uploadMessage }}
                    </el-tag>
                    <el-tag 
                      v-else-if="itemForms[index].uploadStatus === 'success'" 
                      type="success" 
                      size="small"
                    >
                      ✓ {{ itemForms[index].uploadMessage }}
                    </el-tag>
                    <el-tag 
                      v-else-if="itemForms[index].uploadStatus === 'failed'" 
                      type="danger" 
                      size="small"
                      :title="itemForms[index].uploadMessage"
                    >
                      ✗ {{ itemForms[index].uploadMessage }}
                    </el-tag>
                  </div>
                </el-form>
              </div>
            </div>
          </div>
          
          <!-- 组合显示 -->
          <div v-else class="items-scroll">
            <div 
              v-for="group in groupedItems" 
              :key="group.classid"
              class="grouped-section"
            >
              <div class="group-card" @click="toggleGroupExpand(group.classid)">
                <div class="group-left">
                  <img
                    v-if="getWeaponImage(group.steamHashName)"
                    :src="getWeaponImage(group.steamHashName)"
                    class="group-thumb"
                  />
                  <div class="group-info">
                    <div class="group-name">{{ group.itemName }}</div>
                    <div class="group-meta">
                      <span class="group-count">{{ group.items.length }} 件</span>
                      <span v-if="getGroupAveragePrice(group)" class="group-avg-price">
                        均价: ¥{{ getGroupAveragePrice(group) }}
                      </span>
                      <!-- 悠悠底价显示 -->
                      <template v-if="group.items[0] && yyypRealtimePrices[group.items[0].assetid]">
                        <span v-if="yyypRealtimePrices[group.items[0].assetid].loading" class="group-yyyp-price price-loading">
                          <el-icon class="is-loading"><Loading /></el-icon>
                          <span>查询中...</span>
                        </span>
                        <span v-else-if="yyypRealtimePrices[group.items[0].assetid].error" class="group-yyyp-price price-error">
                          悠悠: {{ yyypRealtimePrices[group.items[0].assetid].error }}
                        </span>
                        <span v-else 
                          class="group-yyyp-price"
                          :class="{
                            'price-higher': getGroupAveragePrice(group) && parseFloat(yyypRealtimePrices[group.items[0].assetid].lowest_price) > parseFloat(getGroupAveragePrice(group)),
                            'price-lower': getGroupAveragePrice(group) && parseFloat(yyypRealtimePrices[group.items[0].assetid].lowest_price) < parseFloat(getGroupAveragePrice(group)),
                            'price-equal': getGroupAveragePrice(group) && parseFloat(yyypRealtimePrices[group.items[0].assetid].lowest_price) === parseFloat(getGroupAveragePrice(group)),
                            'price-no-compare': !getGroupAveragePrice(group)
                          }"
                        >
                          悠悠: ¥{{ parseFloat(yyypRealtimePrices[group.items[0].assetid].lowest_price).toFixed(2) }}
                          <span class="price-count">({{ yyypRealtimePrices[group.items[0].assetid].total_count }}件)</span>
                        </span>
                      </template>
                    </div>
                  </div>
                  <div class="group-expand-icon">
                    <el-icon :class="{ 'is-expanded': expandedGroups[group.classid] }">
                      <ArrowDown />
                    </el-icon>
                  </div>
                </div>
                
                <div class="group-right" @click.stop>
                  <el-form :model="groupForms[group.classid]" :rules="itemFormRules" :ref="el => groupFormRefs[group.classid] = el" class="inline-form">
                    <el-form-item prop="price">
                      <el-input 
                        v-model="groupForms[group.classid].price" 
                        placeholder="统一价格"
                        @input="validateGroupPrice(group.classid)"
                        size="small"
                      />
                    </el-form-item>
                    <el-button 
                      size="small" 
                      @click="openGroupRemarkDialog(group.classid)"
                      :type="groupForms[group.classid].remark ? 'success' : 'default'"
                    >
                      {{ groupForms[group.classid].remark ? '已备注' : '备注' }}
                    </el-button>
                  </el-form>
                </div>
              </div>
              
              <!-- 展开的物品列表 -->
              <div v-if="expandedGroups[group.classid]" class="group-items-list">
                <div 
                  v-for="item in group.items" 
                  :key="item.assetid"
                  class="group-item-detail"
                >
                  <div class="item-detail-row">
                    <span v-if="item.buy_price" class="detail-label">
                      购入: ¥{{ parseFloat(item.buy_price).toFixed(2) }}
                    </span>
                    <span v-if="item.weapon_float && item.weapon_float !== '0' && item.weapon_float !== '0.0'" class="detail-label">
                      磨损: {{ item.weapon_float }}
                    </span>
                    <span v-if="item.rename" class="detail-label rename" :title="item.rename">
                      🏷️ {{ item.rename }}
                    </span>
                    <span v-if="item.remark" class="detail-label remark" :title="item.remark">
                      ⚠️ {{ item.remark }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="sellRentDialogVisible = false">取消</el-button>
        <el-button type="success" @click="confirmSellRent(selectedRentPlatform)" :loading="submitting">上架</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      width="800px"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      class="preview-dialog"
    >
      <template #header>
        <div class="preview-dialog-header">
          <span class="preview-dialog-title">{{ previewItem ? getCardTitle(previewItem) : '' }}</span>
        </div>
      </template>
      <div v-if="previewItem" class="preview-content" @wheel.prevent="handlePreviewWheel">
        <div class="preview-main-layout">
          <!-- 左侧区域 -->
          <div class="preview-left-section">
            <!-- 图片区域 -->
            <div class="preview-image-section" @click="handleJumpToItemSearch" style="cursor: pointer;">
              <img
                v-if="getWeaponImage(previewItem.steam_hash_name)"
                :src="getWeaponImage(previewItem.steam_hash_name)"
                :alt="previewItem.item_name"
                class="preview-image"
              />
              <div v-else class="preview-image-placeholder">
                <span>无图片</span>
              </div>
            </div>

            <!-- 详细信息区域 -->
            <div class="preview-info-section">
              <!-- 磨损信息 -->
              <div v-if="previewItem.weapon_float" class="preview-float-section">
                <div class="preview-float-bar-container">
                  <div class="float-bar">
                    <div class="float-segment fn"></div>
                    <div class="float-segment mw"></div>
                    <div class="float-segment ft"></div>
                    <div class="float-segment ww"></div>
                    <div class="float-segment bs"></div>
                    <div
                      class="float-pointer"
                      :style="{ left: `${parseFloat(previewItem.weapon_float) * 100}%` }"
                    ></div>
                  </div>
                </div>
                <div class="preview-float-value">{{ previewItem.weapon_float }}</div>
                <div class="preview-float-range" v-if="previewItem.float_range">
                  {{ previewItem.float_range }}
                </div>
              </div>

              <!-- 价格信息 -->
              <div class="preview-prices">
                <div class="preview-price-row" v-if="previewItem.buy_price || previewItem.steam_price || true">
                  <div class="preview-price-item">
                    <span class="preview-price-label">购入:</span>
                    <span class="preview-price-value buy-price" v-if="previewItem.buy_price">¥{{ parseFloat(previewItem.buy_price).toFixed(2) }}</span>
                    <span class="preview-price-value" v-else style="color: var(--text-secondary);">-</span>
                  </div>
                  <div class="preview-price-item" v-if="previewItem.steam_price">
                    <span class="preview-price-label">Steam:</span>
                    <span class="preview-price-value">¥{{ parseFloat(previewItem.steam_price).toFixed(2) }}</span>
                  </div>
                </div>
                <div class="preview-price-row" v-if="previewItem.yyyp_price || previewItem.buff_price">
                  <div class="preview-price-item" v-if="previewItem.yyyp_price">
                    <span class="preview-price-label">悠悠:</span>
                    <span
                      class="preview-price-value"
                      :class="getPriceDiffClass(previewItem.yyyp_price, previewItem.buy_price)"
                    >
                      ¥{{ parseFloat(previewItem.yyyp_price).toFixed(2) }}
                    </span>
                  </div>
                  <div class="preview-price-item" v-if="previewItem.buff_price">
                    <span class="preview-price-label">BUFF:</span>
                    <span
                      class="preview-price-value"
                      :class="getPriceDiffClass(previewItem.buff_price, previewItem.buy_price)"
                    >
                      ¥{{ parseFloat(previewItem.buff_price).toFixed(2) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 入库时间 -->
              <div v-if="previewItem.order_time" class="preview-order-time">
                <span class="preview-info-label">入库时间:</span>
                <span class="preview-info-value">{{ previewItem.order_time }}</span>
              </div>

              <!-- 标签信息 -->
              <div class="preview-tags">
                <el-tooltip v-if="previewItem.remark && parseTradeLockDate(previewItem.remark) && !parseTradeLockDate(previewItem.remark).expired" :content="previewItem.remark" placement="top" effect="dark">
                  <el-tag type="warning" size="default">
                    交易限制至 {{ parseTradeLockDate(previewItem.remark).date }}
                  </el-tag>
                </el-tooltip>
                <el-tooltip v-else-if="previewItem.remark && !parseTradeLockDate(previewItem.remark)" :content="previewItem.remark" placement="top" effect="dark">
                  <el-tag type="warning" size="default">交易限制</el-tag>
                </el-tooltip>
              </div>
            </div>
          </div>

          <!-- 右侧区域 -->
          <div class="preview-right-section">
            <!-- 改名标签 -->
            <div class="preview-rename" v-if="previewItem.rename">
              <span class="preview-rename-icon">🏷️</span>
              <span class="preview-rename-text">{{ previewItem.rename }}</span>
            </div>

            <!-- 贴纸列表 -->
            <div v-if="previewItem.sticker && parseStickers(previewItem.sticker).length > 0" class="preview-sticker-list-section">
              <div class="preview-sticker-list">
                <div
                  v-for="(sticker, index) in parseStickers(previewItem.sticker)"
                  :key="index"
                  class="preview-sticker-list-item clickable-item"
                  @click="handleJumpToItemSearchBySticker(sticker)"
                >
                  <el-tooltip :content="sticker.name || '未知贴纸'" placement="left">
                    <div class="preview-sticker-list-img-wrapper">
                      <img
                        v-if="sticker.image"
                        :src="sticker.image"
                        :alt="sticker.name"
                        class="preview-sticker-list-img"
                        @error="(e) => e.target.style.display = 'none'"
                      />
                      <div v-else class="preview-sticker-list-placeholder">?</div>
                    </div>
                  </el-tooltip>
                  <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
                    <div class="preview-sticker-list-name">
                      {{ stickersPriceInfo.find(s => s.name === sticker.name)?.market_listing_item_name || sticker.name || '未知贴纸' }}
                    </div>
                    <!-- 印花价格信息（悠悠蓝色 + BUFF绿色，一行显示） -->
                    <div v-if="stickersPriceInfo.find(s => s.name === sticker.name)" class="preview-sticker-price-info" style="font-size: 12px; display: flex; gap: 12px; flex-wrap: wrap;">
                      <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.yyyp_price || stickersPriceInfo.find(s => s.name === sticker.name)?.yyyp_on_sale_count" style="color: var(--accent-blue);">
                        <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.yyyp_price">
                          悠悠: ¥{{ stickersPriceInfo.find(s => s.name === sticker.name).yyyp_price }}
                        </span>
                        <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.yyyp_on_sale_count" style="margin-left: 4px;">
                          ({{ stickersPriceInfo.find(s => s.name === sticker.name).yyyp_on_sale_count }})
                        </span>
                      </span>
                      <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.buff_price || stickersPriceInfo.find(s => s.name === sticker.name)?.buff_on_sale_count" style="color: var(--accent-green);">
                        <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.buff_price">
                          BUFF: ¥{{ stickersPriceInfo.find(s => s.name === sticker.name).buff_price }}
                        </span>
                        <span v-if="stickersPriceInfo.find(s => s.name === sticker.name)?.buff_on_sale_count" style="margin-left: 4px;">
                          ({{ stickersPriceInfo.find(s => s.name === sticker.name).buff_on_sale_count }})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 挂件信息 -->
            <div v-if="previewItem.pendant" class="preview-pendant-section">
              <div class="preview-pendant-list">
                <div class="preview-pendant-list-item clickable-item" @click="handleJumpToItemSearchByPendant(previewItem.pendant)">
                  <el-tooltip :content="parsePendant(previewItem.pendant)?.name || '挂件'" placement="left">
                    <div class="preview-pendant-list-img-wrapper">
                      <img
                        v-if="parsePendant(previewItem.pendant)?.image"
                        :src="parsePendant(previewItem.pendant).image"
                        :alt="parsePendant(previewItem.pendant).name"
                        class="preview-pendant-list-img"
                        @error="(e) => e.target.style.display = 'none'"
                      />
                      <div v-else class="preview-pendant-list-placeholder">🎗️</div>
                    </div>
                  </el-tooltip>
                  <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
                    <div class="preview-pendant-list-name">
                      {{ pendantPriceInfo?.market_listing_item_name || parsePendant(previewItem.pendant)?.name || '挂件' }}
                    </div>
                    <!-- 挂件价格信息（悠悠蓝色 + BUFF绿色，一行显示） -->
                    <div v-if="pendantPriceInfo" class="preview-pendant-price-info" style="font-size: 12px; display: flex; gap: 12px; flex-wrap: wrap;">
                      <span v-if="pendantPriceInfo.yyyp_price || pendantPriceInfo.yyyp_on_sale_count" style="color: var(--accent-blue);">
                        <span v-if="pendantPriceInfo.yyyp_price">
                          悠悠: ¥{{ pendantPriceInfo.yyyp_price }}
                        </span>
                        <span v-if="pendantPriceInfo.yyyp_on_sale_count" style="margin-left: 4px;">
                          ({{ pendantPriceInfo.yyyp_on_sale_count }})
                        </span>
                      </span>
                      <span v-if="pendantPriceInfo.buff_price || pendantPriceInfo.buff_on_sale_count" style="color: var(--accent-green);">
                        <span v-if="pendantPriceInfo.buff_price">
                          BUFF: ¥{{ pendantPriceInfo.buff_price }}
                        </span>
                        <span v-if="pendantPriceInfo.buff_on_sale_count" style="margin-left: 4px;">
                          ({{ pendantPriceInfo.buff_on_sale_count }})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 底部导航栏 -->
        <div v-if="selectedItems.length > 1" class="preview-nav-bar">
          <el-button :icon="ArrowLeft" size="small" :disabled="detailCurrentIndex <= 0" @click="prevDetailItem">上一个</el-button>
          <span class="preview-nav-index">{{ detailCurrentIndex + 1 }} / {{ selectedItems.length }}</span>
          <el-button size="small" :disabled="detailCurrentIndex >= selectedItems.length - 1" @click="nextDetailItem">下一个<el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 出售平台选择对话框 -->
    <PlatformSelectDialog
      v-model="sellPlatformSelectVisible"
      :item-count="selectedItems.length"
      mode="sell"
      @select="handleSellPlatformSelect"
      @cancel="handleSellPlatformSelectCancel"
    />

    <!-- 出租平台选择对话框 -->
    <PlatformSelectDialog
      v-model="rentPlatformSelectVisible"
      :item-count="selectedItems.length"
      mode="rent"
      @select="handleRentPlatformSelect"
      @cancel="handleRentPlatformSelectCancel"
    />

    <!-- 悠悠有品出租表单对话框 -->
    <el-dialog
      v-model="rentFormVisible"
      width="1000px"
      :show-header="false"
      :close-on-click-modal="false"
      class="rent-form-dialog"
      @closed="handleRentFormClosed"
    >
      <RentFormYYYP
        :items="formattedSelectedItems"
        :initData="rentInitData"
        :steamId="selectedSteamId"
        @cancel="rentFormVisible = false"
        @submit="handleRentFormSubmit"
      />
    </el-dialog>
  </div>
</template>


<script>
import { InfoFilled, Loading, ArrowDown, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import PlatformSelectDialog from '../PlatformSelectDialog/index.vue'
import RentFormYYYP from '../RentFormYYYP/index.vue'
import { useInventory } from './useInventory.js'

export default {
  name: 'Inventory',
  components: {
    InfoFilled,
    Loading,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    PlatformSelectDialog,
    RentFormYYYP
  },
  setup() {
    return useInventory()
  }
}
</script>

<style scoped src="./styles.css"></style>
