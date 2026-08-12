<template>
  <div>
    <!-- 筛选器 -->
    <div class="filters card">
      <div class="flex flex-wrap gap-4 items-center">
        <el-select
          v-model="selectedAccount"
          placeholder="选择IGXE账号"
          class="type-select"
          @change="handleAccountChange"
        >
          <el-option
            v-for="acc in accountList"
            :key="acc.id"
            :label="acc.name"
            :value="acc.id"
          />
        </el-select>
        <el-input
          v-model="searchText"
          placeholder="搜索饰品名称..."
          prefix-icon="Search"
          class="search-input"
          @keyup.enter="loadOnSaleData"
          clearable
        />
        <el-select v-model="weaponTypeFilter" placeholder="武器类型" class="type-select" clearable>
          <el-option label="全部" value="" />
          <el-option label="步枪" value="步枪" />
          <el-option label="手枪" value="手枪" />
          <el-option label="狙击枪" value="狙击枪" />
          <el-option label="冲锋枪" value="冲锋枪" />
          <el-option label="霰弹枪" value="霰弹枪" />
          <el-option label="机枪" value="机枪" />
          <el-option label="手套" value="手套" />
          <el-option label="匕首" value="匕首" />
        </el-select>
        <el-select v-model="floatRangeFilter" placeholder="磨损等级" class="wear-select" clearable>
          <el-option label="全部" value="" />
          <el-option label="崭新出厂" value="崭新出厂" />
          <el-option label="略有磨损" value="略有磨损" />
          <el-option label="久经沙场" value="久经沙场" />
          <el-option label="破损不堪" value="破损不堪" />
          <el-option label="战痕累累" value="战痕累累" />
        </el-select>
        <el-button type="primary" @click="loadOnSaleData" :loading="loading">
          搜索
        </el-button>
        <el-button @click="handleReset">重置</el-button>
        <div style="margin-left: auto;">
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

    <!-- 统计信息 -->
    <div class="inventory-stats">
      <div class="grid grid-4">
        <div class="card">
          <h3>在售数量</h3>
          <p class="stat-number">{{ onSaleStats.totalCount }}</p>
        </div>
        <div class="card">
          <h3>在售总价值</h3>
          <p class="stat-number">¥{{ onSaleStats.totalPrice }}</p>
        </div>
        <div class="card">
          <h3>平均售价</h3>
          <p class="stat-number">¥{{ onSaleStats.avgPrice }}</p>
        </div>
        <div class="card">
          <h3>预期收益</h3>
          <p class="stat-number" :style="{ color: onSaleStats.expectedProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red-light)' }">
            {{ onSaleStats.expectedProfit >= 0 ? '+' : '' }}¥{{ onSaleStats.expectedProfit }}
          </p>
        </div>
      </div>
    </div>

    <!-- 卡片显示 -->
    <div class="card-container" v-if="displayMode === 'card'">
      <div v-loading="loading" class="card-grid">
        <div
          v-for="item in currentDisplayData"
          :key="item.id"
          class="inventory-card"
          @click="openPreview(item)"
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
            <!-- 平台标签 -->
            <div class="platform-badge">
              <el-tag :type="getPlatformTagType(item.platform)" size="small">
                {{ getPlatformLabel(item.platform) }}
              </el-tag>
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
              <!-- 第一行：售价和购入价 -->
              <div class="price-row">
                <div class="price-group">
                  <span class="price-label">售价:</span>
                  <span class="price-value sale-price">¥{{ parseFloat(item.sale_price).toFixed(2) }}</span>
                </div>
                <div class="price-group" v-if="item.buy_price">
                  <span class="price-label">购入:</span>
                  <span class="price-value">¥{{ parseFloat(item.buy_price).toFixed(2) }}</span>
                </div>
              </div>
              <!-- 第二行：预期收益 -->
              <div class="price-row" v-if="item.buy_price">
                <div class="price-group">
                  <span class="price-label">预期收益:</span>
                  <span 
                    class="price-value"
                    :style="{ color: (parseFloat(item.sale_price) - parseFloat(item.buy_price)) >= 0 ? 'var(--accent-green)' : 'var(--accent-red-light)' }"
                  >
                    {{ (parseFloat(item.sale_price) - parseFloat(item.buy_price)) >= 0 ? '+' : '' }}¥{{ Math.abs(parseFloat(item.sale_price) - parseFloat(item.buy_price)).toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <div class="card-tags">
                <el-tag v-if="item.rename" type="info" size="small" class="rename-tag">
                  <span class="tag-icon">🏷️</span>{{ item.rename }}
                </el-tag>
                <el-tag v-if="item.on_sale_time" type="success" size="small">
                  {{ formatOnSaleTime(item.on_sale_time) }}
                </el-tag>
              </div>
              <div class="card-actions">
                <el-button size="small" type="warning" @click.stop="handleUpdatePrice(item)">
                  改价
                </el-button>
                <el-button size="small" type="danger" @click.stop="handleRemoveFromSale(item)">
                  下架
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="table-footer">
        <span>共 {{ currentDisplayData.length }} 条数据</span>
      </div>
    </div>

    <!-- 列表显示 -->
    <div class="table-container" v-if="displayMode === 'list'">
      <el-table
        :data="currentDisplayData"
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
        <el-table-column prop="sale_price" label="售价" width="150">
          <template #default="scope">
            <span style="color: var(--text-primary); font-weight: bold;">¥{{ parseFloat(scope.row.sale_price).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="buy_price" label="购入价" width="150">
          <template #default="scope">
            <span v-if="scope.row.buy_price" style="color: var(--text-primary);">¥{{ parseFloat(scope.row.buy_price).toFixed(2) }}</span>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
        <el-table-column label="预期收益" width="150">
          <template #default="scope">
            <span 
              v-if="scope.row.buy_price"
              :style="{ 
                color: (parseFloat(scope.row.sale_price) - parseFloat(scope.row.buy_price)) >= 0 ? 'var(--accent-green)' : 'var(--accent-red-light)',
                fontWeight: 'bold'
              }"
            >
              {{ (parseFloat(scope.row.sale_price) - parseFloat(scope.row.buy_price)) >= 0 ? '+' : '' }}¥{{ Math.abs(parseFloat(scope.row.sale_price) - parseFloat(scope.row.buy_price)).toFixed(2) }}
            </span>
            <span v-else style="color: var(--text-secondary);">-</span>
          </template>
        </el-table-column>
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
            <el-button size="small" type="warning" @click.stop="handleUpdatePrice(scope.row)">
              改价
            </el-button>
            <el-button size="small" type="danger" @click.stop="handleRemoveFromSale(scope.row)">
              下架
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-footer">
        <span>共 {{ currentDisplayData.length }} 条数据</span>
      </div>
    </div>

    <!-- 改价弹窗 -->
    <el-dialog
      v-model="updatePriceDialogVisible"
      title="修改售价"
      width="500px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedItem" class="update-price-content">
        <div class="item-preview">
          <img
            v-if="getWeaponImage(selectedItem.steam_hash_name)"
            :src="getWeaponImage(selectedItem.steam_hash_name)"
            :alt="selectedItem.item_name"
            class="preview-thumb"
          />
          <div class="item-info">
            <div class="item-name">{{ getCardTitle(selectedItem) }}</div>
            <div class="current-price">当前售价: ¥{{ parseFloat(selectedItem.sale_price).toFixed(2) }}</div>
          </div>
        </div>
        <el-form :model="updatePriceForm" label-width="80px">
          <el-form-item label="新售价">
            <el-input 
              v-model="updatePriceForm.newPrice" 
              placeholder="请输入新的售价"
              type="number"
              step="0.01"
            >
              <template #prepend>¥</template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="updatePriceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmUpdatePrice" :loading="updating">确定</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewItem ? getCardTitle(previewItem) : ''"
      width="800px"
      :close-on-click-modal="true"
      class="preview-dialog"
    >
      <div v-if="previewItem" class="preview-content">
        <div class="preview-main-layout">
          <div class="preview-left-section">
            <div class="preview-image-section">
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
            <div class="preview-info-section">
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
              </div>
              <div class="preview-prices">
                <div class="preview-price-row">
                  <div class="preview-price-item">
                    <span class="preview-price-label">售价:</span>
                    <span class="preview-price-value sale-price">¥{{ parseFloat(previewItem.sale_price).toFixed(2) }}</span>
                  </div>
                  <div class="preview-price-item" v-if="previewItem.buy_price">
                    <span class="preview-price-label">购入:</span>
                    <span class="preview-price-value">¥{{ parseFloat(previewItem.buy_price).toFixed(2) }}</span>
                  </div>
                </div>
                <div class="preview-price-row" v-if="previewItem.buy_price">
                  <div class="preview-price-item">
                    <span class="preview-price-label">预期收益:</span>
                    <span
                      class="preview-price-value"
                      :style="{ color: (parseFloat(previewItem.sale_price) - parseFloat(previewItem.buy_price)) >= 0 ? 'var(--accent-green)' : 'var(--accent-red-light)' }"
                    >
                      {{ (parseFloat(previewItem.sale_price) - parseFloat(previewItem.buy_price)) >= 0 ? '+' : '' }}¥{{ Math.abs(parseFloat(previewItem.sale_price) - parseFloat(previewItem.buy_price)).toFixed(2) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="preview-action-buttons">
                <el-button type="warning" @click="handleUpdatePrice(previewItem)">修改售价</el-button>
                <el-button type="danger" @click="handleRemoveFromSale(previewItem)">下架商品</el-button>
              </div>
            </div>
          </div>
          <div class="preview-right-section">
            <div class="preview-rename" v-if="previewItem.rename">
              <span class="preview-rename-icon">🏷️</span>
              <span class="preview-rename-text">{{ previewItem.rename }}</span>
            </div>
            <div v-if="previewItem.sticker && parseStickers(previewItem.sticker).length > 0" class="preview-sticker-list-section">
              <div class="preview-sticker-list">
                <div
                  v-for="(sticker, index) in parseStickers(previewItem.sticker)"
                  :key="index"
                  class="preview-sticker-list-item"
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
                  <div class="preview-sticker-list-name">{{ sticker.name || '未知贴纸' }}</div>
                </div>
              </div>
            </div>
            <div v-if="previewItem.pendant" class="preview-pendant-section">
              <div class="preview-pendant-list">
                <div class="preview-pendant-list-item">
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
                  <div class="preview-pendant-list-name">{{ parsePendant(previewItem.pendant)?.name || '挂件' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>


<script>
import { useOnSaleIGXE } from './useOnSaleIGXE.js'

export default {
  name: 'OnSaleIGXE',
  setup() {
    return useOnSaleIGXE()
  }
}
</script>

<style scoped src="./styles.css"></style>
