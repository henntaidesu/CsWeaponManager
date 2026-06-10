<template>
  <div>
    <!-- 卡片显示 -->
    <div class="card-container" v-if="displayMode === 'card'">
      <!-- 多选模式下的操作按钮 -->
      <div v-if="isMultiSelectMode && selectedItems.length > 0" class="multi-select-actions">
        <div class="selected-count">
          已选择 {{ selectedItems.length }} 件物品
        </div>
        <div class="action-buttons">
          <el-button type="danger" @click="handleClearSelection">清空选择</el-button>
          <el-button type="success" @click="handleBatchChangePrice">批量改价</el-button>
          <el-button type="primary" @click="handleBatchRemoveFromSale">
            {{ selectedTradeType === 'sublease' ? '批量取消转租' : '批量下架' }}
          </el-button>
        </div>
      </div>

      <div v-loading="loading" class="card-grid">
        <div
          v-for="item in displayData"
          :key="item.id"
          class="inventory-card"
          :class="{
            'selected': isItemSelected(item.id),
            'multi-select-mode': isMultiSelectMode
          }"
          @click="handleCardClick(item)"
        >
          <div class="card-image">
            <img
              v-if="getWeaponImage(item.steam_hash_name)"
              :src="getWeaponImage(item.steam_hash_name)"
              :alt="item.item_name"
              class="weapon-image"
              @error="(e) => handleImageError(e, item.steam_hash_name)"
            />
            <div v-else class="image-placeholder">
              <span>无图片</span>
            </div>
            <!-- 在售状态覆盖层 - 左上角 -->
            <div v-if="(item.trade_type === 'lease' || item.trade_type === 'sublease') && item.on_sale_time" class="status-overlay">
              {{ formatOnSaleTime(item.on_sale_time) }}
            </div>
            <!-- 贴纸覆盖层 - 左下角 -->
            <div v-if="item.sticker" class="sticker-overlay">
              <div
                v-for="(sticker, index) in parseStickers(item.sticker)"
                :key="index"
                class="sticker-item-overlay"
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
            <div v-if="item.pendant" class="pendant-overlay">
              <div
                class="pendant-item-overlay"
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
          <div class="card-content">
            <div class="card-title" :title="getCardTitle(item)">
              {{ getCardTitle(item) }}
            </div>
            <div class="card-info">
              <!-- 磨损值显示条 -->
              <div class="float-bar-container" v-if="item.weapon_float">
                <div class="float-bar">
                  <div class="float-segment fn" title="崭新出厂 (0.00 - 0.07)"></div>
                  <div class="float-segment mw" title="略有磨损 (0.07 - 0.15)"></div>
                  <div class="float-segment ft" title="久经沙场 (0.15 - 0.38)"></div>
                  <div class="float-segment ww" title="破损不堪 (0.38 - 0.45)"></div>
                  <div class="float-segment bs" title="战痕累累 (0.45 - 1.00)"></div>
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
            </div>
            <div class="card-prices">
              <!-- 预售类型：显示售价、市场价和保证金 -->
              <template v-if="item.trade_type === 'presale'">
                <div class="price-row">
                  <div class="price-group">
                    <span class="price-label">售价:</span>
                    <span class="price-value sale-price">¥{{ parseFloat(item.sale_price).toFixed(2) }}</span>
                  </div>
                  <div class="price-group" v-if="item.reference_price">
                    <span class="price-label">市场:</span>
                    <span class="price-value">{{ item.reference_price }}</span>
                  </div>
                </div>
                <div class="price-row">
                  <div class="price-group" v-if="item.guard_price_desc">
                    <span class="price-label">保证金:</span>
                    <span class="price-value" style="color: var(--accent-orange);">{{ item.guard_price_desc }}</span>
                  </div>
                  <div class="price-group" v-if="item.cache_expiration_desc">
                    <span class="price-label">冷却:</span>
                    <span class="price-value" style="color: var(--accent-green);">{{ item.cache_expiration_desc }}</span>
                  </div>
                </div>
              </template>

              <!-- 租赁类型：显示租金和押金 -->
              <template v-else-if="item.trade_type === 'lease' || item.trade_type === 'sublease'">
                <div class="price-row">
                  <div class="price-group">
                    <span class="price-label">短租:</span>
                    <span class="price-value sale-price">¥{{ parseFloat(item.short_lease_amount || 0).toFixed(2) }}/天</span>
                  </div>
                  <div class="price-group" v-if="item.lease_max_days > 21">
                    <span class="price-label">长租:</span>
                    <span class="price-value">¥{{ parseFloat(item.long_lease_amount || 0).toFixed(2) }}/天</span>
                  </div>
                </div>
                <div class="price-row">
                  <div class="price-group">
                    <span class="price-label">押金:</span>
                    <span class="price-value" style="color: var(--accent-orange);">¥{{ parseFloat(item.deposit_amount || 0).toFixed(2) }}</span>
                  </div>
                  <div class="price-group">
                    <span class="price-label">最长:</span>
                    <span class="price-value">{{ item.lease_max_days || 0 }}天</span>
                  </div>
                </div>
              </template>

              <!-- 出售类型：显示售价和购入价 -->
              <template v-else>
                <!-- 第一行：售价 购入 -->
                <div class="price-row">
                  <div class="price-group">
                    <span class="price-label">售价:</span>
                    <span
                      class="price-value"
                      :class="getSalePriceClass(item.sale_price, item.buy_price)"
                    >
                      ¥{{ parseFloat(item.sale_price).toFixed(2) }}
                    </span>
                  </div>
                  <div class="price-group" v-if="item.buy_price">
                    <span class="price-label">购入:</span>
                    <span class="price-value">¥{{ parseFloat(item.buy_price).toFixed(2) }}</span>
                  </div>
                </div>
                <!-- 第二行：市价 收益 -->
                <div class="price-row">
                  <div class="price-group" v-if="item.reference_price">
                    <span class="price-label">市价:</span>
                    <span
                      class="price-value"
                      :class="getMarketPriceClass(item.sale_price, item.reference_price)"
                    >
                      {{ item.reference_price }}
                    </span>
                  </div>
                  <div class="price-group" v-if="item.buy_price">
                    <span class="price-label">收益:</span>
                    <span
                      class="price-value"
                      :class="getPriceDiffClass(item.sale_price, item.buy_price)"
                    >
                      {{ (parseFloat(item.sale_price) - parseFloat(item.buy_price)) >= 0 ? '+' : '' }}¥{{ Math.abs(parseFloat(item.sale_price) - parseFloat(item.buy_price)).toFixed(2) }}
                    </span>
                  </div>
                </div>
              </template>
            </div>
            <div class="card-footer">
              <div class="card-tags">
                <el-tag v-if="item.rename" type="info" size="small" class="rename-tag">
                  <span class="tag-icon">🏷️</span>{{ item.rename }}
                </el-tag>
              </div>
              <div class="card-actions">
                <el-button size="small" type="success" @click.stop="handleUpdatePrice(item)">
                  改价
                </el-button>
                <el-button size="small" type="primary" @click.stop="handleRemoveFromSale(item)">
                  {{ item.trade_type === 'sublease' ? '取消转租' : '下架' }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="table-footer">
        <span>共 {{ displayData.length }} 条数据</span>
      </div>
    </div>

    <!-- 列表显示 -->
    <div class="table-container" v-if="displayMode === 'list'">
      <el-table
        :data="displayData"
        v-loading="loading"
        element-loading-text="加载中..."
        style="width: 100%"
        :row-style="{ backgroundColor: 'transparent' }"
        :header-row-style="{ backgroundColor: 'var(--bg-tertiary)' }"
        height="calc(100vh - 400px)"
        @row-click="openPreview"
      >
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
              <div class="item-extras" v-if="hasExtras(scope.row)">
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
                <div class="pendant-list" v-if="scope.row.pendant">
                  <img
                    v-if="parsePendant(scope.row.pendant)?.image"
                    :src="parsePendant(scope.row.pendant).image"
                    :alt="parsePendant(scope.row.pendant)?.name"
                    class="pendant-img"
                    @error="(e) => e.target.style.display = 'none'"
                  />
                </div>
                <div class="rename-text" v-if="scope.row.rename">
                  <span class="rename-value">{{ scope.row.rename }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="weapon_type" label="类型" min-width="100" />
        <el-table-column prop="platform" label="平台" width="120">
          <template #default="scope">
            <el-tag :type="getPlatformTagType(scope.row.platform)" size="small">
              {{ getPlatformLabel(scope.row.platform) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="weapon_float" label="磨损值" min-width="220">
          <template #default="scope">
            <div v-if="scope.row.weapon_float">
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

        <!-- 出售和过户类型的列 -->
        <template v-if="selectedTradeType === 'sale' || selectedTradeType === 'transfer'">
          <el-table-column prop="sale_price" label="售价" width="150">
            <template #default="scope">
              <span
                :class="getSalePriceClass(scope.row.sale_price, scope.row.buy_price)"
                style="font-weight: bold;"
              >
                ¥{{ parseFloat(scope.row.sale_price).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="buy_price" label="购入价" width="150">
            <template #default="scope">
              <span v-if="scope.row.buy_price" style="color: var(--text-primary);">¥{{ parseFloat(scope.row.buy_price).toFixed(2) }}</span>
              <span v-else style="color: var(--text-secondary);">-</span>
            </template>
          </el-table-column>
          <el-table-column label="收益" width="150">
            <template #default="scope">
              <span
                v-if="scope.row.buy_price"
                :class="getPriceDiffClass(scope.row.sale_price, scope.row.buy_price)"
                style="font-weight: bold;"
              >
                {{ (parseFloat(scope.row.sale_price) - parseFloat(scope.row.buy_price)) >= 0 ? '+' : '' }}¥{{ Math.abs(parseFloat(scope.row.sale_price) - parseFloat(scope.row.buy_price)).toFixed(2) }}
              </span>
              <span v-else style="color: var(--text-secondary);">-</span>
            </template>
          </el-table-column>
        </template>

        <!-- 预售类型的列 -->
        <template v-else-if="selectedTradeType === 'presale'">
          <el-table-column label="售价" width="150">
            <template #default="scope">
              <span style="color: var(--accent-green); font-weight: bold;">¥{{ parseFloat(scope.row.sale_price).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="市场价" width="150">
            <template #default="scope">
              <span v-if="scope.row.reference_price" style="color: var(--accent-blue);">{{ scope.row.reference_price }}</span>
              <span v-else style="color: var(--text-secondary);">-</span>
            </template>
          </el-table-column>
          <el-table-column label="保证金" width="120">
            <template #default="scope">
              <span v-if="scope.row.guard_price_desc" style="color: var(--accent-orange); font-weight: bold;">{{ scope.row.guard_price_desc }}</span>
              <span v-else style="color: var(--text-secondary);">-</span>
            </template>
          </el-table-column>
          <el-table-column label="冷却时间" width="120">
            <template #default="scope">
              <span v-if="scope.row.cache_expiration_desc" style="color: var(--accent-orange);">{{ scope.row.cache_expiration_desc }}</span>
              <span v-else style="color: var(--text-secondary);">-</span>
            </template>
          </el-table-column>
        </template>

        <!-- 租赁类型的列 -->
        <template v-else>
          <el-table-column label="短租租金" width="120">
            <template #default="scope">
              <span style="color: var(--accent-green); font-weight: bold;">¥{{ parseFloat(scope.row.short_lease_amount || 0).toFixed(2) }}/天</span>
            </template>
          </el-table-column>
          <el-table-column label="长租租金" width="120">
            <template #default="scope">
              <span v-if="scope.row.lease_max_days > 21" style="color: var(--accent-blue); font-weight: bold;">¥{{ parseFloat(scope.row.long_lease_amount || 0).toFixed(2) }}/天</span>
              <span v-else style="color: var(--text-secondary);">-</span>
            </template>
          </el-table-column>
          <el-table-column label="押金" width="150">
            <template #default="scope">
              <span style="color: var(--accent-orange); font-weight: bold;">¥{{ parseFloat(scope.row.deposit_amount || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="最长租期" width="100">
            <template #default="scope">
              <span style="color: var(--text-primary);">{{ scope.row.lease_max_days || 0 }}天</span>
            </template>
          </el-table-column>
        </template>

        <el-table-column prop="on_sale_time" label="上架时间" width="180">
          <template #default="scope">
            <span v-if="scope.row.on_sale_time" style="color: var(--text-secondary);">
              {{ scope.row.on_sale_time }}
            </span>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" type="success" @click.stop="handleUpdatePrice(scope.row)">
              改价
            </el-button>
            <el-button size="small" type="primary" @click.stop="handleRemoveFromSale(scope.row)">
              {{ scope.row.trade_type === 'sublease' ? '取消转租' : '下架' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-footer">
        <span>共 {{ displayData.length }} 条数据</span>
      </div>
    </div>
  </div>
</template>

<script src="./useSaleManagement.js"></script>
<style scoped src="./styles.css"></style>
