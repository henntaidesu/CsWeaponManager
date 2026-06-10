<template>
  <div class="spider-weapon-rename-container">
    <div class="page-layout">
      <!-- 左侧配置管理栏 -->
      <aside 
        class="config-sidebar" 
        :class="{ collapsed: isConfigSectionsCollapsed }"
        @click="handleSidebarAreaClick"
      >
        <div class="sidebar-header clickable" @click.stop="toggleConfigSections">
          <div class="sidebar-header-row" :class="{ collapsed: isConfigSectionsCollapsed }">
            <div class="sidebar-header-title">配置管理</div>
            <div class="sidebar-header-actions">
              <el-button 
                type="success" 
                @click.stop="createNewConfig"
                :disabled="isCrawling"
              >
                <el-icon><Document /></el-icon>
                新建
              </el-button>
              
              <el-button 
                type="info" 
                @click.stop="loadConfigList"
              >
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </div>
        </div>

        <div class="sidebar-divider" v-show="!isConfigSectionsCollapsed"></div>

        <div class="config-list" v-show="!isConfigSectionsCollapsed">
          <div 
            v-for="config in savedConfigs" 
            :key="config.id"
            class="config-item"
            :class="{ active: selectedConfigId === config.id }"
            @click="selectConfig(config.id)"
          >
            <div class="config-item-header">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <span class="config-name">{{ config.dataName }}</span>
                <el-tag 
                  :type="getPlatformTagType(config.platformType)" 
                  size="small"
                >
                  {{ getSourceLabel(config.platformType) || '未设置' }}
                </el-tag>
              </div>
            </div>
            <div v-if="config.description" class="config-description">
              {{ config.description }}
            </div>
          </div>

          <div v-if="savedConfigs.length === 0" class="empty-config">
            <el-empty description="暂无保存的配置" :image-size="80" />
          </div>
        </div>
      </aside>

      <!-- 右侧主内容区域 -->
      <div class="main-content-area">

      <!-- 饰品搜索区域 -->
      <!-- 统一的工具区域 -->
      <div class="unified-tool-section" :class="{ collapsed: isConfigSectionsCollapsed }">
        <div class="tool-section-header" @click="toggleConfigSections">
          <h2 class="section-title">爬取配置</h2>
          <el-button type="text" class="collapse-btn">
            <el-icon :size="20">
              <ArrowUp v-if="!isConfigSectionsCollapsed" />
              <ArrowDown v-else />
            </el-icon>
          </el-button>
        </div>
        
        <div class="tool-section-content" v-show="!isConfigSectionsCollapsed">
        <div class="tool-section">
        
        <div class="form-container">
          <el-form :model="crawlForm" label-width="120px" ref="crawlFormRef">
            <div class="form-row">
              <el-form-item label="配置名称" required class="form-item-quarter">
                <el-input 
                  v-model="crawlForm.configName" 
                  placeholder="请输入配置名称"
                  clearable
                />
              </el-form-item>

              <el-form-item label="平台类型" required class="form-item-quarter">
                <el-select 
                  v-model="crawlForm.platformType" 
                  placeholder="选择平台类型"
                  style="width: 100%;"
                  :disabled="!!selectedConfigId || (weaponIdList && weaponIdList.length > 0)"
                  @change="handlePlatformTypeChange"
                >
                  <el-option label="悠悠有品" value="youpin" />
                  <el-option label="BUFF" value="buff" />
                  <el-option label="Steam 市场" value="steam" />
                </el-select>
              </el-form-item>

              <el-form-item label="爬取账号" required class="form-item-quarter">
                <el-select 
                  v-model="crawlForm.crawlAccountId" 
                  placeholder="选择爬取账号"
                  style="width: 100%;"
                  filterable
                  allow-create
                  default-first-option
                >
                  <el-option 
                    v-for="item in filteredSteamIdList" 
                    :key="item.steamID || item.steam_id" 
                    :label="`${item.dataName || '未命名'} (${item.steamID || item.steam_id || '无ID'})`" 
                    :value="item.steamID || item.steam_id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="购买账号" required class="form-item-quarter">
                <el-select 
                  v-model="crawlForm.steamId" 
                  placeholder="选择购买账号"
                  style="width: 100%;"
                  filterable
                  allow-create
                  default-first-option
                >
                  <el-option 
                    v-for="item in filteredSteamIdList" 
                    :key="item.steamID || item.steam_id" 
                    :label="`${item.dataName || '未命名'} (${item.steamID || item.steam_id || '无ID'})`" 
                    :value="item.steamID || item.steam_id"
                  />
                </el-select>
              </el-form-item>
            </div>

            <el-form-item label-width="0px" class="custom-config-form-item">
              <div class="custom-config-grid">
                <div class="custom-config-field">
                  <div class="field-label">自动查询间隔</div>
                  <div class="field-control no-spinner">
                    <el-input
                      v-model.number="customConfigForm['饰品自动查询间隔']"
                      type="number"
                      placeholder="例如 3"
                      min="1"
                      style="width: 100px;"
                    />
                  </div>
                </div>

                <div class="custom-config-field">
                  <div class="field-label">最大差价 (元)</div>
                  <div class="field-control no-spinner">
                    <el-input
                      v-model.number="customConfigForm['最大差价']"
                      type="number"
                      placeholder="例如 8"
                      min="0"
                      style="width: 100px;"
                    />
                  </div>
                </div>

                <div class="custom-config-field">
                  <div class="field-label">参考价来源</div>
                  <div class="field-control">
                    <el-select
                      v-model="customConfigForm['参考价来源']"
                      placeholder="请选择"
                      style="width: 120px;"
                    >
                      <el-option
                        v-for="option in referencePriceSources"
                        :key="`reference-source-${option.value}`"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </div>
                </div>

                <div class="custom-config-field">
                  <div class="field-label">是否自动购买</div>
                  <div class="field-control">
                    <el-select
                      v-model="customConfigForm['是否自动购买']"
                      placeholder="请选择"
                      style="width: 100px;"
                    >
                      <el-option
                        v-for="option in booleanOptions"
                        :key="`rename-auto-buy-${option.value}`"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </div>
                </div>

                <div class="custom-config-field">
                  <div class="field-label">只查询中文</div>
                  <div class="field-control">
                    <el-select
                      v-model="customConfigForm['只查询中文改名']"
                      placeholder="请选择"
                      style="width: 100px;"
                    >
                      <el-option
                        v-for="option in booleanOptions"
                        :key="`rename-chinese-only-${option.value}`"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </div>
                </div>

                <div class="custom-config-field">
                  <div class="field-label">搜索参数</div>
                  <div class="field-control">
                    <el-input
                      v-model="customConfigForm['搜索参数']"
                      placeholder="例如 sticker"
                      clearable
                      style="width: 160px;"
                    />
                  </div>
                </div>
              </div>
            </el-form-item>

            <el-form-item>
              <template #label>
                <div class="collapsible-label">
                  <span class="label-text" @click="toggleWeaponList">
                    饰品列表 ({{ weaponIdList.length }})
                    <el-icon 
                      class="collapse-icon-inline" 
                      :class="{ 'is-collapsed': isWeaponListCollapsed }"
                    >
                      <ArrowUp v-if="!isWeaponListCollapsed" />
                      <ArrowDown v-else />
                    </el-icon>
                  </span>
                </div>
              </template>
              <div class="weapon-id-section" v-show="!isWeaponListCollapsed">
                <div class="weapon-id-tags">
                  <el-tag
                    v-for="weapon in weaponIdList"
                    :key="weapon.id"
                    closable
                    @close="removeWeaponId(weapon.id)"
                    type="primary"
                    size="large"
                  >
                    {{ weapon.name }} (ID: {{ weapon.id }})
                  </el-tag>
                </div>
                <el-button 
                  v-if="weaponIdList && weaponIdList.length > 0"
                  type="danger" 
                  size="small"
                  @click="clearAllWeaponIds"
                  style="margin-left: 10px;"
                >
                  <el-icon><Delete /></el-icon>
                  一键清空
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>

        <div class="action-buttons">
          <el-button 
            type="success" 
            size="large"
            @click="saveConfig"
            :disabled="isCrawling"
          >
            <el-icon><Document /></el-icon>
            保存当前配置
          </el-button>

          <el-button 
            type="danger" 
            size="large"
            @click="deleteCurrentConfig"
            :disabled="isCrawling || !selectedConfigId"
          >
            <el-icon><Delete /></el-icon>
            删除当前配置
          </el-button>

          <el-button 
            type="primary" 
            size="large"
            @click="startCrawl"
            :disabled="isCrawling || !canStartCrawl"
            :loading="isCrawling"
          >
            {{ isCrawling ? '搜索中...' : '开始搜索' }}
          </el-button>
        </div>
        </div>

        <!-- 搜索饰品组件 -->
        <WeaponSearch 
          :platformType="crawlForm.platformType"
          @add-weapon="handleAddWeaponFromSearch"
          @add-all-weapons="handleAddAllWeaponsFromSearch"
        />

        </div>
        <!-- 结束 tool-section-content -->
      </div>
      <!-- 结束 unified-tool-section -->


      <!-- 查询结果区域 -->
      <div v-if="allCrawlItems && allCrawlItems.length > 0" class="result-section">
        <div class="result-header">
          <h2 class="section-title">查询结果 ({{ allCrawlItems?.length || 0 }} 件)</h2>
          <el-button 
            type="danger" 
            size="small"
            @click="clearCrawlHistory"
          >
            <el-icon><Delete /></el-icon>
            清空列表
          </el-button>
        </div>
        
        <!-- 统一商品列表 -->
        <el-table 
          :data="allCrawlItems" 
          style="width: 100%;"
          stripe
          table-layout="auto"
          :header-cell-style="tableHeaderStyle"
        >
          <el-table-column label="图标" width="80" fixed="left" align="center" resizable>
            <template #default="scope">
              <img 
                v-if="scope.row.iconUrl" 
                :src="scope.row.iconUrl" 
                class="weapon-icon"
                :alt="getWeaponDisplayName(scope.row)"
              />
              <span v-else class="no-icon">-</span>
            </template>
          </el-table-column>
          
          <el-table-column label="武器名称" :min-width="280" fixed="left" resizable>
            <template #default="scope">
              <el-tooltip 
                :content="getWeaponDisplayName(scope.row)" 
                placement="top"
                :disabled="!getWeaponDisplayName(scope.row) || getWeaponDisplayName(scope.row).length <= 20"
              >
                <div class="weapon-name-cell">{{ getWeaponDisplayName(scope.row) }}</div>
              </el-tooltip>
            </template>
          </el-table-column>
          
            <el-table-column label="价格" width="110" resizable>
              <template #default="scope">
                <span class="price">¥{{ scope.row.price }}</span>
              </template>
            </el-table-column>

            <el-table-column 
              v-if="crawlForm.platformType === 'steam'"
              label="Steam底价" 
              width="130" 
              resizable
            >
              <template #default="scope">
                <span class="price">¥{{ getSteamBottomPrice(scope.row).toFixed(2) }}</span>
              </template>
            </el-table-column>
            
            <el-table-column 
              v-if="crawlForm.platformType === 'steam'"
              label="参考价" 
              width="110" 
              resizable
            >
              <template #default="scope">
                <span class="reference-price">
                  {{ scope.row.referencePrice !== null && scope.row.referencePrice !== undefined 
                    ? '¥' + (typeof scope.row.referencePrice === 'number' ? scope.row.referencePrice.toFixed(2) : scope.row.referencePrice)
                    : '-' }}
                </span>
              </template>
            </el-table-column>
            
            <el-table-column label="溢价" width="120" resizable>
              <template #default="scope">
                <el-tag type="danger" size="small">
                  {{ scope.row.spread !== undefined && scope.row.spread !== null && typeof scope.row.spread === 'number' ? scope.row.spread.toFixed(2) : '0.00' }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column label="磨损" width="240" resizable>
              <template #default="scope">
                {{ scope.row.abrade }}
              </template>
            </el-table-column>
            
            <el-table-column label="改名" min-width="220" resizable>
              <template #default="scope">
                <span class="name-tag">{{ scope.row.nameTag || '-' }}</span>
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="120" fixed="right" resizable>
              <template #default="scope">
                <el-button 
                  :type="getBuyButtonType(scope.row)"
                  size="small"
                  @click="handleBuyWeapon(scope.row)"
                  :loading="buyingItems[scope.row.id]"
                  :disabled="purchasedItems.has(scope.row.id)"
                >
                  {{ purchasedItems.has(scope.row.id) ? '已购买' : '购买' }}
                </el-button>
              </template>
            </el-table-column>
        </el-table>
      </div>

      </div>
      <!-- 结束 main-content-area -->
    </div>
    <!-- 结束 page-layout -->

    <!-- 悠悠有品购买确认对话框 -->
    <el-dialog
      v-model="yyypBuyDialogVisible"
      title="确认付款"
      width="600px"
      :close-on-click-modal="false"
      class="yyyp-buy-dialog"
    >
      <div v-loading="yyypBuyDetailLoading" class="yyyp-buy-content">
        <div v-if="yyypBuyDetail && yyypBuyDetail.commodity" class="yyyp-buy-detail">
          <!-- 商品信息 -->
          <div class="commodity-info-section">
            <div class="commodity-image-large">
              <img
                v-if="yyypBuyDetail.commodity.templateInfo?.iconUrlLarge"
                :src="yyypBuyDetail.commodity.templateInfo.iconUrlLarge"
                :alt="yyypBuyDetail.commodity.commodityName"
                style="max-width: 100%; max-height: 200px;"
              />
            </div>
            <div class="commodity-info-details">
              <h3>{{ yyypBuyDetail.commodity.commodityName }}</h3>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item v-if="yyypBuyDetail.orderNo" label="订单号">
                  <span style="color: var(--accent-blue); font-size: 14px; font-weight: bold;">
                    {{ yyypBuyDetail.orderNo }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="价格">
                  <span style="color: var(--accent-red-light); font-size: 18px; font-weight: bold;">
                    {{ yyypBuyDetail.commodity.sellPrice }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="品质">
                  <span :style="{ color: '#' + yyypBuyDetail.commodity.templateInfo?.qualityColor }">
                    {{ yyypBuyDetail.commodity.templateInfo?.qualityName }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="稀有度">
                  <span :style="{ color: '#' + yyypBuyDetail.commodity.templateInfo?.rarityColor }">
                    {{ yyypBuyDetail.commodity.templateInfo?.rarityName }}
                  </span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <!-- 支付方式 -->
          <div class="payment-section">
            <div class="payment-info" v-if="filteredYYYPPayList.length > 0">
              <span style="font-size: 16px; font-weight: 600; margin-right: 20px;">支付方式</span>
              <img
                :src="filteredYYYPPayList[0].channelLogo"
                :alt="filteredYYYPPayList[0].channelName"
                style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;"
              />
              <span style="font-size: 14px;">{{ filteredYYYPPayList[0].channelName }}</span>
              <span v-if="filteredYYYPPayList[0].balance" style="color: var(--accent-green); margin-left: 10px; font-weight: bold;">
                ¥{{ filteredYYYPPayList[0].balance }}
              </span>
            </div>
          </div>

          <!-- 购买选项 -->
          <div class="buy-options-section">
            <el-checkbox v-model="yyypBuyForm.autoConfirmPayment">
              自动确认支付
            </el-checkbox>
            <el-checkbox v-model="yyypBuyForm.pollPayment">
              轮询支付状态
            </el-checkbox>
          </div>
        </div>

        <div v-else-if="!yyypBuyDetailLoading" class="no-detail-section">
          <el-empty description="无法加载商品详情" />
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelYYYPOrder">取消订单</el-button>
          <el-button
            type="primary"
            :loading="buyingYYYP"
            :disabled="!yyypBuyDetail || yyypBuyDetailLoading || !isYYYPBalanceSufficient"
            @click="confirmYYYPBuy"
          >
            {{ isYYYPBalanceSufficient ? '确认付款' : '余额不足' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>

<script>
import { Document, Delete, Refresh, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import WeaponSearch from '@/views/Units/weapon_search/index.vue'
import { useSearchWeaponRename } from './useSearchWeaponRename.js'

export default {
  name: 'SpiderWeaponRename',
  components: {
    WeaponSearch,
    Document,
    Delete,
    Refresh,
    ArrowUp,
    ArrowDown
  },
  setup() {
    return useSearchWeaponRename()
  }
}
</script>

<style scoped>
@import './styles.css';

.spider-weapon-rename-container {
  min-height: 100vh;
  padding: 2rem;
}

.page-header {
  margin-bottom: 1rem;
  padding: 1rem;
}

.page-layout {
  display: flex;
  gap: 1.5rem;
  min-height: calc(100vh - 150px);
  max-width: 100%;
}

/* 左侧配置管理栏 */
.config-sidebar {
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
  transition: width 0.25s ease, min-width 0.25s ease;
}

.config-sidebar.collapsed {
  width: 48px;
  min-width: 48px;
}

.sidebar-header {
  margin-bottom: 1.25rem;
}

.sidebar-header-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--accent-green);
  white-space: nowrap;
  margin-bottom: 0.5rem;
}

.sidebar-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  overflow: hidden;
  max-width: 100%;
  opacity: 1;
  transition: max-width 0.25s ease, opacity 0.25s ease;
}

.sidebar-header-row.collapsed {
  max-width: 0;
  opacity: 0;
  pointer-events: none;
}

.sidebar-header-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-green);
  white-space: nowrap;
}

.sidebar-divider {
  height: 1px;
  background-color: #2f2f2f;
  border-radius: 1px;
  margin-bottom: 1rem;
  margin-top: 0.5rem;
}

.sidebar-header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-shrink: 0;
}

.sidebar-header-actions .el-button {
  min-width: 64px;
}

.sidebar-header.clickable {
  cursor: pointer;
}

.sidebar-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-green);
  margin: 0;
}

.config-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding-right: 0.5rem;
  padding-left: 0.25rem;
}

/* 优化配置列表中的标签显示 */
.config-item :deep(.el-tag) {
  flex-shrink: 0;
  font-size: 0.75rem;
  padding: 2px 8px;
  height: auto;
  line-height: 1.4;
  border-radius: 4px;
  font-weight: 500;
}

.config-item {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 0.5rem;
  padding: 0.875rem;
  margin-bottom: 0.625rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.config-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: transparent;
  transition: background-color 0.3s ease;
}

.config-item:hover {
  border-color: var(--accent-green);
  background-color: var(--bg-tertiary);
  transform: translateX(2px);
}

.config-item:hover::before {
  background-color: var(--accent-green);
}

.config-item.active {
  border-color: var(--accent-green);
  background-color: rgba(76, 175, 80, 0.15);
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.4);
  transform: translateX(0);
}

.config-item.active::before {
  background-color: var(--accent-green);
  width: 4px;
}

.config-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.375rem;
  gap: 0.5rem;
}

.config-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.config-item.active .config-name {
  color: var(--accent-green);
}

.config-item-meta {
  margin-bottom: 0.25rem;
}

.config-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.config-description {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.375rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  padding-left: 0.25rem;
}

.config-item.active .config-description {
  color: #bbb;
}

.empty-config {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  padding: 2rem 1rem;
}

.empty-config :deep(.el-empty__description) {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 右侧主内容区域 */
.main-content-area {
  flex: 1;
  min-width: 0;
  width: auto;
  overflow-x: hidden;
}

/* 统一工具区域容器 */
.unified-tool-section {
  background-color: var(--bg-secondary);
  border-radius: 1rem;
  padding: 1.5rem 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.unified-tool-section.collapsed {
  padding: 1rem 2rem;
}

.tool-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  user-select: none;
  transition: all 0.3s ease;
}

.tool-section-header:hover {
  background-color: var(--bg-overlay);
}

.tool-section-header .section-title {
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.unified-tool-section.collapsed .tool-section-header {
  margin-bottom: 0;
}

.main-section-title {
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.collapse-btn {
  padding: 0.25rem;
  color: var(--accent-green);
  transition: color 0.3s ease, transform 0.3s ease;
}

.collapse-btn:hover {
  color: var(--accent-green);
  transform: scale(1.1);
}

.tool-section-content {
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-card {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-default);
}

.search-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-default);
}

.search-container {
  margin-bottom: 1.5rem;
}

.search-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.weapon-search-input {
  width: 100%;
}

.no-spinner :deep(input[type="number"]::-webkit-outer-spin-button),
.no-spinner :deep(input[type="number"]::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.no-spinner :deep(input[type="number"]) {
  -moz-appearance: textfield;
  appearance: textfield;
}

.search-results-table {
  margin-top: 1rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--bg-tertiary);
  border-radius: 0.5rem 0.5rem 0 0;
  border: 1px solid var(--border-default);
  border-bottom: none;
  cursor: pointer;
}

.results-header:hover {
  background-color: var(--bg-tertiary);
}

.results-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-green);
}

.results-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.collapse-indicator {
  padding: 0;
  margin-left: 0.5rem;
}

.price-text {
  color: var(--accent-green);
  font-weight: 600;
  font-size: 0.95rem;
}

.count-text {
  color: var(--accent-blue);
  font-weight: 500;
  font-size: 0.9rem;
}

.rarity-tag {
  font-weight: 600;
  font-size: 0.9rem;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}

.weapon-name {
  color: var(--text-primary);
  font-weight: 500;
}

.hash-name-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.no-data {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.weapon-row {
  cursor: pointer;
}

.weapon-row:hover {
  background-color: rgba(76, 175, 80, 0.1) !important;
}

.tool-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--border-default);
}

.form-container {
  background-color: var(--bg-tertiary);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.custom-config-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  column-gap: 20px;
  row-gap: 8px;
  width: 100%;
}

.custom-config-field {
  display: flex;
  align-items: center;
  min-height: 44px;
  min-width: 0;
}

.custom-config-field .field-label {
  width: 100px;
  font-size: 0.9rem;
  color: var(--text-primary);
  text-align: left;
  margin-right: 10px;
}

.custom-config-field .field-control {
  flex: 1;
  min-width: 90px;
}

.custom-config-field .field-control :deep(.el-select),
.custom-config-field .field-control :deep(.el-input) {
  width: 100%;
}

.custom-config-form-item :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0;
}

.form-row :deep(.el-form-item__label) {
  color: var(--text-primary) !important;
  justify-content: flex-start;
  text-align: left;
  padding: 0 10px 0 0;
  width: auto !important;
  min-width: 0;
  flex: 0 0 auto;
}

.form-row :deep(.el-form-item__content) {
  margin-left: 0 !important;
  flex: 1 1 auto;
}

.form-item-half {
  flex: 1;
  margin-bottom: 18px;
}

.form-item-third {
  flex: 1;
  margin-bottom: 18px;
}

.form-item-quarter {
  flex: 1;
  margin-bottom: 18px;
}

.form-hint {
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-left: 0.5rem;
}

.weapon-id-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.weapon-id-section {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.collapsible-label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}

.collapsible-label .label-text {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.collapsible-label .label-text:hover {
  color: var(--accent-blue);
}

.collapse-icon-inline {
  font-size: 0.875rem;
  transition: transform 0.3s ease;
  color: inherit;
}

.collapse-icon-inline.is-collapsed {
  transform: rotate(0deg);
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  min-width: 140px;
}

/* 结果区域样式已移至 resultSection.css */

.log-section {
  background-color: var(--bg-tertiary);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-default);
}

.log-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.log-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.log-count {
  color: #bbb;
  font-size: 0.9rem;
}

.log-list {
  max-height: 320px;
  overflow-y: auto;
  background-color: var(--bg-secondary);
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--border-default);
}

.log-entry {
  display: flex;
  gap: 0.75rem;
  padding: 0.35rem 0;
  border-left: 3px solid transparent;
  padding-left: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.4;
}

.log-entry.log-info {
  border-color: var(--accent-blue);
}

.log-entry.log-success {
  border-color: var(--accent-green);
}

.log-entry.log-warning {
  border-color: var(--accent-orange);
}

.log-entry.log-error {
  border-color: var(--accent-red-light);
}

.log-time {
  color: var(--text-secondary);
  min-width: 72px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.log-message {
  color: #f2f2f2;
  flex: 1;
}

.log-entry.log-success .log-message {
  color: var(--accent-green);
}

.log-entry.log-warning .log-message {
  color: var(--accent-orange);
}

.log-entry.log-error .log-message {
  color: var(--accent-red-light);
}

.log-empty {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
}

/* 查询结果相关样式已移至 resultSection.css */

.result-info {
  display: grid;
  gap: 1rem;
}

.result-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-default);
}

.result-item:last-child {
  border-bottom: none;
}

.result-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.result-value {
  color: var(--text-primary);
  font-weight: 600;
}

.result-value.success {
  color: var(--accent-green);
}

.result-value.error {
  color: var(--accent-red-light);
}

.result-value.highlight {
  color: var(--accent-orange);
  font-size: 1.1rem;
}

/* Element Plus 组件深色主题适配 */
:deep(.el-input__inner) {
  color: var(--text-primary);
}

:deep(.el-textarea__inner) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--border-default);
}

:deep(.el-textarea__inner:hover) {
  border-color: var(--accent-green);
}

:deep(.el-textarea__inner:focus) {
  border-color: var(--accent-green);
}

:deep(.el-form-item__label) {
  color: var(--text-secondary);
}

:deep(.el-switch) {
  --el-switch-on-color: var(--accent-green);
  --el-switch-off-color: #555;
}

/* JSON 编辑器样式 */
/* 响应式设计 */
/* 大屏幕优化 */
@media (min-width: 1920px) {
  .config-sidebar {
    width: 320px;
    min-width: 320px;
  }
}

/* iPad Pro 横屏 (1024px - 1366px) */
@media (min-width: 1024px) and (max-width: 1366px) {
  .spider-weapon-rename-container {
    padding: 1.5rem;
  }

  .page-layout {
    gap: 1rem;
  }

  .config-sidebar {
    width: 240px;
    min-width: 240px;
    padding: 1.25rem;
  }

  .unified-tool-section {
    padding: 1.25rem 1.5rem;
  }

  .form-container {
    padding: 1.25rem;
  }

  .custom-config-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 15px;
    row-gap: 12px;
  }

  .form-row {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .form-item-quarter {
    flex: 0 0 calc(50% - 0.375rem);
    min-width: 0;
  }

  .action-buttons {
    gap: 0.75rem;
  }

  .action-buttons .el-button {
    min-width: 120px;
    font-size: 0.9rem;
  }

  /* 表格优化 */
  .result-section {
    padding: 1.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .result-section :deep(.el-table) {
    font-size: 0.875rem;
  }

  .result-section :deep(.el-table th),
  .result-section :deep(.el-table td) {
    padding: 8px 6px;
  }

  .result-section :deep(.el-table__header-wrapper),
  .result-section :deep(.el-table__body-wrapper) {
    overflow-x: auto;
  }

  /* 优化表格列宽 */
  .result-section :deep(.el-table-column--selection) {
    width: 50px !important;
  }

  .weapon-icon {
    width: 50px;
    height: 50px;
  }

  .section-title {
    font-size: 1.3rem;
  }

  .tool-section-header .section-title {
    font-size: 1.1rem;
  }

  /* 优化按钮大小 */
  .result-section :deep(.el-button--small) {
    padding: 5px 10px;
    font-size: 0.8rem;
  }

  /* 触摸优化 */
  .config-item,
  .action-buttons .el-button,
  .result-section :deep(.el-button) {
    -webkit-tap-highlight-color: rgba(76, 175, 80, 0.2);
    touch-action: manipulation;
  }

  /* 优化输入框在 iPad 上的显示 */
  .form-container :deep(.el-input),
  .form-container :deep(.el-select) {
    font-size: 0.9rem;
  }

  /* 优化标签间距 */
  .weapon-id-tags {
    gap: 6px;
  }

  .weapon-id-tags :deep(.el-tag) {
    margin: 0;
    font-size: 0.85rem;
    padding: 4px 8px;
  }

  /* 配置管理优化 */
  .config-item {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .config-name {
    font-size: 0.9rem;
  }

  .config-item :deep(.el-tag) {
    font-size: 0.7rem;
    padding: 2px 6px;
  }

  .config-description {
    font-size: 0.75rem;
  }
}

/* iPad 竖屏 / 小屏幕平板 (768px - 1024px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .spider-weapon-rename-container {
    padding: 1rem;
  }

  .page-layout {
    flex-direction: column;
    gap: 1rem;
  }

  .config-sidebar {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    max-height: 350px;
    position: static;
    margin-bottom: 0;
  }

  .config-list {
    max-height: 200px;
  }

  .unified-tool-section {
    padding: 1rem 1.25rem;
  }

  .form-container {
    padding: 1rem;
  }

  .custom-config-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 12px;
    row-gap: 10px;
  }

  .form-row {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .form-item-quarter {
    flex: 0 0 calc(50% - 0.25rem);
    min-width: 0;
  }

  .action-buttons {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .action-buttons .el-button {
    flex: 1 1 calc(50% - 0.25rem);
    min-width: 140px;
  }

  /* 表格优化 */
  .result-section {
    padding: 1rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .result-section :deep(.el-table) {
    font-size: 0.85rem;
    min-width: 1000px;
  }

  .result-section :deep(.el-table th),
  .result-section :deep(.el-table td) {
    padding: 6px 4px;
  }

  .result-section :deep(.el-table__header-wrapper),
  .result-section :deep(.el-table__body-wrapper) {
    overflow-x: auto;
  }

  .weapon-icon {
    width: 45px;
    height: 45px;
  }

  /* 优化按钮大小 */
  .result-section :deep(.el-button--small) {
    padding: 4px 8px;
    font-size: 0.75rem;
  }

  /* 优化标签显示 */
  .result-section :deep(.el-tag) {
    font-size: 0.75rem;
    padding: 2px 6px;
  }

  /* 触摸优化 */
  .config-item,
  .action-buttons .el-button,
  .result-section :deep(.el-button) {
    -webkit-tap-highlight-color: rgba(76, 175, 80, 0.2);
    touch-action: manipulation;
    min-height: 36px;
  }

  /* 优化输入框在 iPad 上的显示 */
  .form-container :deep(.el-input),
  .form-container :deep(.el-select) {
    font-size: 0.85rem;
  }

  /* 优化标签间距 */
  .weapon-id-tags {
    gap: 6px;
  }

  .weapon-id-tags :deep(.el-tag) {
    margin: 0;
    font-size: 0.8rem;
    padding: 3px 6px;
  }

  /* 配置管理优化 */
  .config-item {
    padding: 0.625rem;
    margin-bottom: 0.5rem;
  }

  .config-name {
    font-size: 0.85rem;
  }

  .config-item :deep(.el-tag) {
    font-size: 0.65rem;
    padding: 1px 5px;
  }

  .config-description {
    font-size: 0.7rem;
  }

  .config-list {
    padding-right: 0.25rem;
  }

  .sidebar-header-actions {
    flex-direction: column;
    gap: 0.375rem;
  }

  .sidebar-header-actions .el-button {
    width: 100%;
    min-width: auto;
    font-size: 0.8rem;
    padding: 6px 12px;
  }
}

/* 中等屏幕 */
@media (max-width: 1440px) and (min-width: 1367px) {
  .config-sidebar {
    width: 260px;
    min-width: 260px;
    padding: 1rem;
  }
}

/* 小屏幕 - 切换为垂直布局 */
@media (max-width: 1024px) {
  .page-layout {
    flex-direction: column;
  }

  .config-sidebar {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    max-height: 400px;
    position: static;
    margin-bottom: 1rem;
  }
  
  .config-list {
    max-height: 250px;
  }
}

@media (max-width: 768px) {
  .spider-weapon-rename-container {
    padding: 1rem;
  }

  .page-header {
    padding: 0.5rem;
  }

  .back-button {
    width: 100%;
  }

  .config-sidebar {
    padding: 1rem;
  }

  .sidebar-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-section {
    padding: 1rem;
  }

  .form-container {
    padding: 1rem;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .form-item-half {
    width: 100%;
  }

  .form-item-third {
    width: 100%;
  }

  .form-item-quarter {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }
}

/* 滚动条样式 */
.config-list::-webkit-scrollbar {
  width: 8px;
}

.config-list::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

.config-list::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.config-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>

