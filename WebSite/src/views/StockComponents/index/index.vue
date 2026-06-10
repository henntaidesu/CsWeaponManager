<template>
  <div>
    <!-- 搜索与统计数据 -->
    <div class="stats-summary">
      <div class="card">
        <!-- 搜索栏 -->
        <div class="search-section">
          <div class="flex flex-wrap gap-4 items-center">
            <el-select 
              v-model="selectedSteamId" 
              placeholder="选择完美世界账号" 
              class="steam-id-select"
              @change="handleSteamIdChange"
              filterable
            >
              <el-option
                v-for="item in steamIdList"
                :key="item.dataID"
                :label="`${item.dataName} (${item.steamID})`"
                :value="item.steamID"
              >
                <span>{{ item.dataName }} ({{ item.steamID }})</span>
              </el-option>
            </el-select>
            <el-select
              v-model="selectedComponent"
              placeholder="选择库存组件（选中后只显示该组件）"
              class="component-select"
              @change="handleComponentSelect"
              filterable
              clearable
            >
              <el-option
                v-for="item in inventoryComponents"
                :key="item.assetid"
                :label="getComponentLabel(item)"
                :value="item.assetid"
              >
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <span style="flex: 0 0 auto; max-width: 35%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.item_name }}</span>
                  <span style="flex: 0 0 auto; color: var(--el-text-color-secondary); font-size: 13px; margin-left: 8px; font-family: monospace;">
                    <template v-if="hasCountMismatch(item)">
                      <span style="color: var(--accent-red-light); font-weight: bold; margin-right: 4px;" title="数量不一致">⚠</span>
                    </template>
                    显示: <span style="display: inline-block; text-align: right; min-width: 2em;">{{ item.weapon_float || 0 }}</span>
                    <template v-if="item.actual_count !== null && item.actual_count !== undefined">
                      | 实际: <span style="display: inline-block; text-align: right; min-width: 2em;">{{ item.actual_count }}</span>
                    </template>
                  </span>
                </div>
              </el-option>
            </el-select>
            <el-input
              v-model="searchText"
              placeholder="搜索武器名称或物品名称..."
              prefix-icon="Search"
              class="search-input"
              @keyup.enter="handleSearch"
              @clear="handleClearSearch"
              clearable
            />
            <el-select
              v-model="weaponTypeFilter"
              placeholder="武器类型"
              class="type-select"
              @change="handleWeaponTypeChange"
              clearable
            >
              <el-option v-for="type in weaponTypes" :key="type" :label="type" :value="type" />
            </el-select>
            <el-select
              v-model="weaponNameFilter"
              placeholder="磨损等级"
              class="weapon-name-select"
              @change="handleWeaponNameChange"
              clearable
            >
              <el-option v-for="name in weaponNames" :key="name" :label="name" :value="name" />
            </el-select>
            <el-button type="primary" @click="handleSearch" :loading="loading">
              搜索
            </el-button>
            <el-button @click="handleClearSearch" :disabled="loading">
              重置
            </el-button>
            <el-button type="success" @click="handleUpdateAbnormalComponents" :loading="updateAbnormalLoading" :disabled="!selectedSteamId || abnormalComponentsCount === 0">
              更新异常组件数据 {{ abnormalComponentsCount > 0 ? `(${abnormalComponentsCount})` : '' }}
            </el-button>
            <el-button type="primary" plain @click="handleFillAllPlatformPrices" :loading="platformPriceLoading" :disabled="!selectedSteamId">
              更新平台价格
            </el-button>
            <el-button 
              :type="showPriceDiff ? 'info' : 'primary'" 
              @click="showPriceDiff = !showPriceDiff" 
              class="action-button"
            >
              {{ showPriceDiff ? '显示价格' : '显示差价' }}
            </el-button>
            <div style="margin-left: auto; display: flex; gap: 0.5rem; align-items: center;">
              <!-- 组合模式开关（列表和卡片模式都显示） -->
              <el-switch
                v-model="groupMode"
                active-text="组合模式"
                inactive-text="明细模式"
                @change="handleToggleGroupMode"
              />

              <!-- 视图模式切换 -->
              <el-button-group>
                <el-button
                  :type="displayMode === 'list' ? 'primary' : ''"
                  @click="displayMode = 'list'"
                >
                  列表
                </el-button>
                <el-button
                  :type="displayMode === 'card' ? 'primary' : ''"
                  @click="displayMode = 'card'"
                >
                  卡片
                </el-button>
              </el-button-group>
            </div>
          </div>
        </div>
        
        <!-- 分隔线 -->
        <div class="search-stats-divider"></div>
        
        <!-- 统计数据 -->
        <div class="inventory-stats">
          <div class="grid grid-stats-custom">
            <div class="card card-square">
              <h3>组件数量</h3>
              <p class="stat-number">{{ totalStats.componentCount }}</p>
            </div>
            <div class="card card-square">
              <h3>组件内饰品</h3>
              <p class="stat-number">{{ totalStats.totalCount }}</p>
            </div>
            <div class="card">
              <h3>购入总价值</h3>
              <p class="stat-number">¥{{ totalStats.totalCost }}</p>
            </div>
            <div class="card">
              <h3>悠悠有品最低价</h3>
              <div class="stat-price-container">
                <p class="stat-number">¥{{ totalStats.totalYYYPPrice }}</p>
                <p class="stat-diff-right" :style="{ color: totalStats.yyypDiff >= 0 ? 'var(--accent-red-light)' : 'var(--accent-green)' }">
                  {{ totalStats.yyypDiff >= 0 ? '+' : '' }}¥{{ totalStats.yyypDiff }}
                </p>
              </div>
            </div>
            <div class="card">
              <h3>BUFF最低价</h3>
              <div class="stat-price-container">
                <p class="stat-number">¥{{ totalStats.totalBuffPrice }}</p>
                <p class="stat-diff-right" :style="{ color: totalStats.buffDiff >= 0 ? 'var(--accent-red-light)' : 'var(--accent-green)' }">
                  {{ totalStats.buffDiff >= 0 ? '+' : '' }}¥{{ totalStats.buffDiff }}
                </p>
              </div>
            </div>
            <div class="card">
              <h3>Steam参考价</h3>
              <div class="stat-price-container">
                <p class="stat-number">¥{{ totalStats.totalSteamPrice }}</p>
                <p class="stat-diff-right" :style="{ color: totalStats.steamDiff >= 0 ? 'var(--accent-red-light)' : 'var(--accent-green)' }">
                  {{ totalStats.steamDiff >= 0 ? '+' : '' }}¥{{ totalStats.steamDiff }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="table-container">
      <!-- 列表显示 -->
      <div v-if="displayMode === 'list'" class="table-wrapper">
        <div class="table-toolbar">
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
        </div>
        
        <el-table
          ref="tableRef"
          :data="groupMode ? groupedData : componentData"
          v-loading="loading"
          element-loading-text="加载中..."
          style="width: 100%"
          :row-style="getRowStyle"
          :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
          :flexible="true"
          :scrollbar-always-on="true"
          @row-click="handleRowClick"
          @sort-change="handleSortChange"
          :row-key="row => row.goods_assetid"
        >
          <el-table-column v-if="groupMode" type="expand" width="1">
            <template #default="scope">
              <div class="expand-content" v-if="scope.row.item_count > 1">
                <div class="expand-two-columns">
                  <div
                    v-for="(item, index) in getExpandedItems(scope.row)"
                    :key="item.goods_assetid"
                    class="expand-item-card"
                    @click="handleExpandedItemClick(item, $event)"
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
                              class="sticker-item-overlay-expand clickable-overlay"
                              :title="sticker.name || '未知贴纸'"
                              @click.stop="handleJumpToItemSearchBySticker(sticker)"
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
                              class="pendant-item-overlay-expand clickable-overlay"
                              :title="parsePendant(item.pendant).name || '挂件'"
                              @click.stop="handleJumpToItemSearchByPendant(item.pendant)"
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
                  @error="(e) => e.target.style.display = 'none'"
                />
                <span v-else class="no-image">无图</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="物品名称" min-width="250" show-overflow-tooltip fixed="left">
            <template #default="scope">
              <div class="item-name-cell">
                <div class="item-title">{{ getItemTitle(scope.row) }}</div>
                <!-- 组合模式下显示分页器 - 固定在名称下方 -->
                <div v-if="groupMode && getExpandedTotal(scope.row) > getItemsPerPage()" class="inline-pagination-below" @click.stop>
                  <el-pagination
                    small
                    :current-page="expandedRowPages[scope.row.goods_assetid] || 1"
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
          <el-table-column prop="weapon_type" label="武器类型" min-width="120" />
          <el-table-column prop="weapon_level" label="武器等级" min-width="120" />
          <el-table-column v-if="!groupMode" prop="assetid" label="所属组件" min-width="160" show-overflow-tooltip>
            <template #default="scope">
              <span style="font-family: monospace;">{{ scope.row.assetid || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="!groupMode" prop="goods_assetid" label="组件ID" min-width="160" show-overflow-tooltip>
            <template #default="scope">
              <span style="font-family: monospace;">{{ scope.row.goods_assetid || scope.row.component_id || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="groupMode"
            prop="item_count"
            label="数量"
            width="120"
            align="center"
            sortable="custom"
            :sort-orders="['descending', 'ascending']"
          >
            <template #default="scope">
              <span>{{ scope.row.item_count || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="weapon_float" label="磨损值" width="200" align="left">
            <template #default="scope">
              <!-- 组合模式下，数量大于1时不显示磨损值 -->
              <div v-if="groupMode && scope.row.item_count > 1" style="color: var(--text-secondary);">
                多个磨损值
              </div>
              <div v-else-if="scope.row.weapon_float && formatWeaponFloat(scope.row.weapon_float)">
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
          <el-table-column prop="float_range" label="磨损范围" min-width="120" />
          <el-table-column 
            prop="buy_price" 
            label="购入价格" 
            min-width="180" 
            sortable="custom"
          >
            <template #default="scope">
              <div v-if="editingGoodsAssetId !== scope.row.goods_assetid"
                   @click="startEdit(scope.row)"
                   style="cursor: pointer; padding: 5px;">
                <div v-if="scope.row.buy_price" style="display: flex; align-items: center; gap: 5px;">
                  <span style="color: var(--text-primary); font-weight: bold;">
                    ¥{{ formatPrice(scope.row.buy_price) }}
                    <span v-if="groupMode && scope.row.item_count > 0" style="color: var(--text-primary);"> / ¥{{ calcAvg(scope.row.buy_price, scope.row.item_count) }}</span>
                  </span>
                </div>
                <span v-else style="color: var(--text-secondary);">点击输入</span>
              </div>
              <el-input
                v-else
                v-model="editingPrice"
                placeholder="输入价格"
                size="small"
                :id="'price-input-' + scope.row.goods_assetid"
                @blur="finishEdit(scope.row)"
                @keyup.enter="finishEdit(scope.row)"
                @keyup.esc="cancelEdit"
              />
            </template>
          </el-table-column>
          <el-table-column
            prop="yyyp_price"
            label="悠悠价格"
            min-width="180"
            sortable="custom"
            :sort-orders="['descending', 'ascending']"
          >
            <template #default="scope">
              <span 
                v-if="scope.row.yyyp_price && scope.row.buy_price"
                :style="{
                  color: parseFloat(scope.row.yyyp_price) === parseFloat(scope.row.buy_price) ? 'var(--text-primary)' : (parseFloat(scope.row.yyyp_price) < parseFloat(scope.row.buy_price) ? 'var(--accent-green)' : 'var(--accent-red-light)'),
                  fontWeight: 'bold'
                }"
              >
                {{ showPriceDiff ? (parseFloat(scope.row.yyyp_price) < parseFloat(scope.row.buy_price) ? '-' : '+') : '' }}¥{{ showPriceDiff ? Math.abs(parseFloat(scope.row.yyyp_price) - parseFloat(scope.row.buy_price)).toFixed(2) : formatPrice(scope.row.yyyp_price) }}
                <span 
                  v-if="groupMode && scope.row.item_count > 0" 
                  :style="{ 
                    color: parseFloat(calcAvg(scope.row.yyyp_price, scope.row.item_count)) === parseFloat(calcAvg(scope.row.buy_price, scope.row.item_count)) ? 'var(--text-primary)' : (parseFloat(calcAvg(scope.row.yyyp_price, scope.row.item_count)) < parseFloat(calcAvg(scope.row.buy_price, scope.row.item_count)) ? 'var(--accent-green)' : 'var(--accent-red-light)')
                  }"
                > / ¥{{ calcAvg(scope.row.yyyp_price, scope.row.item_count) }}</span>
              </span>
              <span v-else-if="scope.row.yyyp_price" style="color: var(--text-primary); font-weight: bold;">
                ¥{{ formatPrice(scope.row.yyyp_price) }}
                <span v-if="groupMode && scope.row.item_count > 0" style="color: var(--accent-green);"> / ¥{{ calcAvg(scope.row.yyyp_price, scope.row.item_count) }}</span>
              </span>
              <span v-else style="color: var(--text-secondary);">-</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="buff_price"
            label="BUFF价格"
            min-width="180"
            sortable="custom"
            :sort-orders="['descending', 'ascending']"
          >
            <template #default="scope">
              <span 
                v-if="scope.row.buff_price && scope.row.buy_price"
                :style="{
                  color: parseFloat(scope.row.buff_price) === parseFloat(scope.row.buy_price) ? 'var(--text-primary)' : (parseFloat(scope.row.buff_price) < parseFloat(scope.row.buy_price) ? 'var(--accent-green)' : 'var(--accent-red-light)'),
                  fontWeight: 'bold'
                }"
              >
                {{ showPriceDiff ? (parseFloat(scope.row.buff_price) < parseFloat(scope.row.buy_price) ? '-' : '+') : '' }}¥{{ showPriceDiff ? Math.abs(parseFloat(scope.row.buff_price) - parseFloat(scope.row.buy_price)).toFixed(2) : formatPrice(scope.row.buff_price) }}
                <span 
                  v-if="groupMode && scope.row.item_count > 0" 
                  :style="{ 
                    color: parseFloat(calcAvg(scope.row.buff_price, scope.row.item_count)) === parseFloat(calcAvg(scope.row.buy_price, scope.row.item_count)) ? 'var(--text-primary)' : (parseFloat(calcAvg(scope.row.buff_price, scope.row.item_count)) < parseFloat(calcAvg(scope.row.buy_price, scope.row.item_count)) ? 'var(--accent-green)' : 'var(--accent-red-light)')
                  }"
                > / ¥{{ calcAvg(scope.row.buff_price, scope.row.item_count) }}</span>
              </span>
              <span v-else-if="scope.row.buff_price" style="color: var(--text-primary); font-weight: bold;">
                ¥{{ formatPrice(scope.row.buff_price) }}
                <span v-if="groupMode && scope.row.item_count > 0" style="color: var(--accent-green);"> / ¥{{ calcAvg(scope.row.buff_price, scope.row.item_count) }}</span>
              </span>
              <span v-else style="color: var(--text-secondary);">-</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="steam_price"
            label="Steam价格"
            min-width="180"
            sortable="custom"
            :sort-orders="['descending', 'ascending']"
          >
            <template #default="scope">
              <span 
                v-if="scope.row.steam_price && scope.row.buy_price"
                :style="{
                  color: parseFloat(scope.row.steam_price) === parseFloat(scope.row.buy_price) ? 'var(--text-primary)' : (parseFloat(scope.row.steam_price) < parseFloat(scope.row.buy_price) ? 'var(--accent-green)' : 'var(--accent-red-light)'),
                  fontWeight: 'bold'
                }"
              >
                {{ showPriceDiff ? (parseFloat(scope.row.steam_price) < parseFloat(scope.row.buy_price) ? '-' : '+') : '' }}¥{{ showPriceDiff ? Math.abs(parseFloat(scope.row.steam_price) - parseFloat(scope.row.buy_price)).toFixed(2) : formatPrice(scope.row.steam_price) }}
                <span 
                  v-if="groupMode && scope.row.item_count > 0" 
                  :style="{ 
                    color: parseFloat(calcAvg(scope.row.steam_price, scope.row.item_count)) === parseFloat(calcAvg(scope.row.buy_price, scope.row.item_count)) ? 'var(--text-primary)' : (parseFloat(calcAvg(scope.row.steam_price, scope.row.item_count)) < parseFloat(calcAvg(scope.row.buy_price, scope.row.item_count)) ? 'var(--accent-green)' : 'var(--accent-red-light)')
                  }"
                > / ¥{{ calcAvg(scope.row.steam_price, scope.row.item_count) }}</span>
              </span>
              <span v-else-if="scope.row.steam_price" style="color: var(--text-primary); font-weight: bold;">
                ¥{{ formatPrice(scope.row.steam_price) }}
                <span v-if="groupMode && scope.row.item_count > 0" style="color: var(--accent-green);"> / ¥{{ calcAvg(scope.row.steam_price, scope.row.item_count) }}</span>
              </span>
              <span v-else style="color: var(--text-secondary);">-</span>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination">
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

      <!-- 卡片显示 -->
      <div v-if="displayMode === 'card'" class="card-container">
        <div v-loading="loading" class="card-grid">
          <div
            v-for="item in (groupMode ? groupedData : componentData)"
            :key="item.goods_assetid"
            :class="['inventory-card', { 'selected': isItemSelected(item.goods_assetid) }]"
            @click="handleCardClick(item, $event)"
          >
            <!-- 选中标记 -->
            <div v-if="isItemSelected(item.goods_assetid)" class="selected-indicator">
              <span class="checkmark">✓</span>
            </div>
            <div class="card-image">
              <!-- 组合模式数量标记 - 左上角 -->
              <div v-if="groupMode && item.item_count > 1" class="item-count-badge">
                × {{ item.item_count }}
              </div>
              <img
                v-if="getWeaponImage(item.steam_hash_name)"
                :data-src="getWeaponImage(item.steam_hash_name)"
                :alt="item.item_name"
                class="lazy-image"
                @error="(e) => e.target.style.display = 'none'"
              />
              <div v-else class="image-placeholder">
                <span>无图片</span>
              </div>
              <!-- 贴纸图片覆盖层 - 左下角 -->
              <div v-if="item.sticker" class="sticker-overlay">
                <div
                  v-for="(sticker, index) in parseStickers(item.sticker)"
                  :key="index"
                  class="sticker-item-overlay clickable-overlay"
                  :title="sticker.name || '未知贴纸'"
                  @click.stop="handleJumpToItemSearchBySticker(sticker)"
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
                  class="pendant-item-overlay clickable-overlay"
                  :title="parsePendant(item.pendant).name || '挂件'"
                  @click.stop="handleJumpToItemSearchByPendant(item.pendant)"
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
              <div class="card-title" :title="getItemTitle(item)">
                {{ getItemTitle(item) }}
              </div>
              <div class="card-info">
                <div class="float-bar-container" v-if="item.weapon_float && formatWeaponFloat(item.weapon_float)">
                  <div class="float-bar">
                    <div class="float-segment fn"></div>
                    <div class="float-segment mw"></div>
                    <div class="float-segment ft"></div>
                    <div class="float-segment ww"></div>
                    <div class="float-segment bs"></div>
                    <div
                      class="float-pointer"
                      :style="{ left: `${parseFloat(item.weapon_float) * 100}%` }"
                      :title="`磨损值: ${item.weapon_float}`"
                    ></div>
                  </div>
                </div>
                <div class="float-value" v-if="item.weapon_float && formatWeaponFloat(item.weapon_float)">
                  {{ item.weapon_float }}
                </div>
              </div>
              <div class="card-prices">
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
                  <el-tag v-if="item.rename" type="info" size="small" class="rename-tag">
                    <span class="tag-icon">🏷️</span>{{ item.rename }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="table-footer">
          <span>共 {{ groupMode ? groupedData.length : componentData.length }} 条数据</span>
          <span v-if="hasMore && !loadingMore" style="margin-left: 1rem; color: var(--text-secondary);">滚动加载更多...</span>
          <span v-if="loadingMore" style="margin-left: 1rem; color: var(--accent-green);">正在加载更多...</span>
          <span v-if="!hasMore && (groupMode ? groupedData.length : componentData.length) > 0" style="margin-left: 1rem; color: var(--text-secondary);">已加载全部数据</span>
        </div>
        <!-- 滚动触发元素 -->
        <div id="load-more-trigger-card" style="height: 1px;"></div>
      </div>
    </div>

    <!-- 多选模式下的操作按钮 -->
    <div v-if="selectedComponent && selectedItems.length > 0" class="multi-select-actions">
      <div class="selected-count">
        已选择 {{ selectedItems.length }} 件物品
      </div>
      <div class="action-buttons">
        <el-button type="primary" @click="selectAllCurrentPage">
          {{ selectedItems.length === componentData.length ? '取消全选' : '全选' }}
        </el-button>
        <el-button type="success" @click="removeFromComponent" :loading="removeLoading">
          移出组件
        </el-button>
        <el-button @click="clearSelection">清空选择</el-button>
      </div>
    </div>

    <!-- 跳转到组件的 Popover -->
    <div 
      v-if="popoverVisible" 
      class="component-popover"
      :style="{ left: popoverPosition.x + 'px', top: popoverPosition.y + 'px' }"
      @click.stop
    >
      <el-button type="primary" @click="jumpToComponent">跳转组件</el-button>
    </div>

    <!-- 点击遮罩关闭 popover -->
    <div v-if="popoverVisible" class="popover-overlay" @click="closePopover"></div>

    <!-- 移出数量选择对话框 -->
    <el-dialog
      v-model="removeQuantityDialogVisible"
      title="选择移出数量"
      width="500px"
      :close-on-click-modal="false"
    >
      <div style="padding: 20px;">
        <div style="margin-bottom: 20px;">
          <div style="font-size: 14px; color: #606266; margin-bottom: 10px;">
            当前组合共有 <span style="font-weight: bold; color: var(--accent-blue);">{{ maxRemoveQuantity }}</span> 件物品
          </div>
          <el-input-number
            v-model="removeQuantity"
            :min="1"
            :max="maxRemoveQuantity"
            :step="1"
            style="width: 100%;"
          />
        </div>

        <div style="margin-bottom: 10px; font-size: 14px; color: #606266;">快速选择：</div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <el-button size="small" @click="setRemoveQuantityPercent(0.1)">10%</el-button>
          <el-button size="small" @click="setRemoveQuantityPercent(0.25)">25%</el-button>
          <el-button size="small" @click="setRemoveQuantityPercent(0.5)">50%</el-button>
          <el-button size="small" @click="setRemoveQuantityPercent(0.75)">75%</el-button>
          <el-button size="small" @click="setRemoveQuantityPercent(1)">全部</el-button>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="removeQuantityDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmRemoveQuantity" :loading="removeLoading">
            确定移出
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 更新平台价格：选择数据来源 -->
    <el-dialog
      v-model="platformPriceDialogVisible"
      title="更新平台价格"
      width="400px"
      :close-on-click-modal="true"
    >
      <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
        <el-button type="primary" @click="handleFillFromDatabase" :loading="platformPriceLoading">
          从数据库同步
        </el-button>
        <el-button type="success" @click="handleFillFromCsqaq" :loading="platformPriceLoading">
          从 CSQAQ 获取
        </el-button>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="platformPriceDialogVisible = false">取消</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>


<script>
import { useStockComponents } from './useStockComponents.js'

export default {
  name: 'StockComponents',
  setup() {
    return useStockComponents()
  }
}
</script>

<style scoped src="./styles-scoped.css"></style>
<style src="./styles-global.css"></style>
