<template>
  <el-dialog
    v-model="dialogVisible"
    title="发布求购"
    width="520px"
    :close-on-click-modal="false"
    class="publish-purchase-dialog-wrapper"
    @close="handleClose"
  >
    <div v-if="templateData" class="publish-purchase-dialog">

      <!-- 求购余额 + 从钱包转入 -->
      <div class="balance-row">
        <div class="balance-display">
          <span class="balance-label">求购余额</span>
          <span class="balance-value" v-loading="balanceLoading">
            ¥{{ purchaseBalance != null ? Number(purchaseBalance.balance_yuan).toFixed(2) : '--' }}
          </span>
        </div>
        <el-button size="small" type="primary" @click="$emit('transfer-in')">
          从钱包转入
        </el-button>
      </div>

      <div class="section-divider"></div>

      <!-- 物品信息 -->
      <div class="item-info-row">
        <div class="item-image">
          <img
            v-if="templateData.template_info.icon_url"
            :src="templateData.template_info.icon_url"
            :alt="templateData.template_info.commodity_name"
            @error="(e) => e.target.style.display = 'none'"
          />
          <div v-else class="image-placeholder">无图</div>
        </div>
        <div class="item-details">
          <div class="item-name">{{ templateData.template_info.commodity_name }}</div>
          <div class="item-ref-price">
            <span class="ref-label">参考价：</span>
            <span class="ref-value">¥{{ templateData.template_info.reference_price }}</span>
          </div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- 市场信息 -->
      <div class="market-info-row">
        <div class="market-info-item">
          <div class="market-value orange">¥{{ templateData.template_info.min_sell_price }}</div>
          <div class="market-label">在售最低</div>
        </div>
        <div class="market-divider"></div>
        <div class="market-info-item">
          <div class="market-value yellow">¥{{ templateData.template_info.max_purchase_price }}</div>
          <div class="market-label">求购最高</div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- 编辑表单 -->
      <div class="form-row">
        <div class="form-label-col">
          <span class="form-label required">求购单价¥</span>
        </div>
        <div class="form-input-col form-input-with-btn">
          <el-input
            v-model="formData.unitPrice"
            :placeholder="`最低¥${templateData.purchase_info.min_price}`"
            @input="onPriceInput"
          />
          <el-button
            type="primary"
            size="small"
            class="one-click-price-btn"
            @click="fillMaxPurchasePrice"
          >
            一键定价
          </el-button>
        </div>
      </div>

      <div class="section-divider"></div>

      <div class="form-row">
        <div class="form-label-col">
          <span class="form-label required">求购数量</span>
        </div>
        <div class="form-input-col">
          <el-input
            v-model="formData.quantity"
            placeholder="请输入求购数量"
            @input="onQuantityInput"
          />
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- 增值服务 -->
      <div class="vas-row">
        <div class="vas-info">
          <span class="vas-label">增值服务</span>
          <el-tag size="small" type="primary" class="vas-tag">自动接收</el-tag>
        </div>
        <el-switch v-model="formData.autoReceived" />
      </div>

      <div class="section-divider"></div>

      <!-- 求购规则 -->
      <div class="rules-section">
        <div class="rules-title">求购规则</div>
        <ul class="rules-list">
          <li>求购账户余额≥求购总价(求购单价*数量)，可无限发布求购；账户余额不足可补足差额继续发布，差额将充值进求购账户。</li>
          <li>卖家供应发起报价后，你需要在24小时内接收报价，取消报价或24小时未接收会扣除2%求购金额作为处罚。</li>
          <li>求购账户余额随时可提现，0手续费。</li>
        </ul>
      </div>

    </div>

    <div v-else class="publish-wanted-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载发布详情...</span>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <div class="footer-total">
          <span class="total-label">总计</span>
          <span class="total-price">¥{{ totalPrice }}</span>
        </div>
        <div class="footer-actions">
          <el-button @click="handleClose">取消</el-button>
          <el-button
            type="primary"
            :disabled="!canSubmit"
            @click="handleConfirm"
          >
            {{ !isBalanceSufficient && !balanceLoading && totalPriceNum > 0 ? '余额不足' : '确定' }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
/**
 * 饰品搜索页-发布求购弹窗
 * 复制自 on_sale/OnSaleYYYP/MyPurchaseRequest/PublishPurchaseDialog.vue，与 on_sale 页面模板一致。
 */
import { ref, computed, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  templateData: { type: Object, default: null },
  /** 求购账户余额 { balance_yuan }，由父组件请求 getBalance 传入 */
  purchaseBalance: { type: Object, default: null },
  balanceLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'submit', 'transfer-in'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const formData = ref({ unitPrice: '', quantity: '', autoReceived: false })

// 当 templateData 变化时初始化表单
watch(() => props.templateData, (newData) => {
  if (newData) {
    formData.value = {
      unitPrice: '',
      quantity: '',
      autoReceived: Boolean(newData.purchase_info?.auto_received)
    }
  }
}, { immediate: true })

const totalPrice = computed(() => {
  const price = parseFloat(formData.value.unitPrice)
  const qty = parseInt(formData.value.quantity)
  if (isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) return '0.00'
  return (price * qty).toFixed(2)
})

/** 求购总价（数字，用于与余额比较） */
const totalPriceNum = computed(() => parseFloat(totalPrice.value) || 0)

/** 求购余额（数字） */
const balanceYuan = computed(() =>
  props.purchaseBalance != null ? Number(props.purchaseBalance.balance_yuan) : NaN
)

/** 余额是否充足：余额 ≥ 求购总价 */
const isBalanceSufficient = computed(() =>
  !isNaN(balanceYuan.value) && balanceYuan.value >= totalPriceNum.value
)

const canSubmit = computed(() => {
  const price = parseFloat(formData.value.unitPrice)
  const qty = parseInt(formData.value.quantity)
  const formValid = !isNaN(price) && price > 0 && !isNaN(qty) && qty >= 1
  if (!formValid) return false
  if (props.balanceLoading) return false
  return isBalanceSufficient.value
})

const onPriceInput = () => {
  formData.value.unitPrice = formData.value.unitPrice.replace(/[^0-9.]/g, '')
}

const onQuantityInput = () => {
  formData.value.quantity = formData.value.quantity.replace(/[^0-9]/g, '')
}

/** 一键定价：按求购最高价填入单价 */
const fillMaxPurchasePrice = () => {
  const maxPrice = props.templateData?.template_info?.max_purchase_price
  if (maxPrice != null && maxPrice !== '') {
    const str = String(maxPrice).replace(/[^0-9.]/g, '')
    formData.value.unitPrice = str || '0'
  }
}

const handleClose = () => {
  dialogVisible.value = false
}

const handleConfirm = async () => {
  const price = parseFloat(formData.value.unitPrice)
  const qty = parseInt(formData.value.quantity)

  if (isNaN(price) || price <= 0) {
    ElMessageBox.alert('请输入有效的求购单价', '提示', { type: 'warning' })
    return
  }

  const minPrice = parseFloat(props.templateData?.purchase_info?.min_price || '0.01')
  const maxPrice = parseFloat(props.templateData?.purchase_info?.check_max_price || '9999999.99')

  if (price < minPrice) {
    ElMessageBox.alert(`求购单价不能低于 ¥${minPrice}`, '提示', { type: 'warning' })
    return
  }
  if (price > maxPrice) {
    ElMessageBox.alert(`求购单价不能超过 ¥${maxPrice}`, '提示', { type: 'warning' })
    return
  }
  if (isNaN(qty) || qty < 1) {
    ElMessageBox.alert('数量至少为1', '提示', { type: 'warning' })
    return
  }
  const maxQty = props.templateData?.purchase_info?.quantity || 999
  if (qty > maxQty) {
    ElMessageBox.alert(`数量不能超过 ${maxQty}`, '提示', { type: 'warning' })
    return
  }

  const total = price * qty
  const balance = props.purchaseBalance != null ? Number(props.purchaseBalance.balance_yuan) : 0
  if (balance < total) {
    ElMessageBox.alert(
      `求购余额不足，无法发布求购。当前余额 ¥${balance.toFixed(2)}，需要 ¥${total.toFixed(2)}。请从钱包转入或减少求购数量/单价。`,
      '提示',
      { type: 'warning' }
    )
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定以 ¥${price} 的单价，求购 ${qty} 件吗？<br><span style="color: #909399;">总计：¥${totalPrice.value}</span>`,
      '确认发布求购',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    )
    emit('submit', {
      unitPrice: String(price),
      quantity: qty,
      autoReceived: formData.value.autoReceived,
      templateData: props.templateData
    })
  } catch { /* 用户取消 */ }
}
</script>

<style scoped>
.publish-purchase-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.publish-wanted-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: var(--el-text-color-secondary);
}

/* 物品信息 */
.item-info-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.item-image {
  width: 88px;
  height: 66px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-placeholder {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.item-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.item-ref-price {
  font-size: 13px;
}

.ref-label {
  color: var(--el-text-color-secondary);
}

.ref-value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

/* 市场信息 */
.market-info-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
}

.market-info-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.market-divider {
  width: 1px;
  height: 40px;
  background: var(--bg-tertiary);
}

.market-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.market-value {
  font-size: 20px;
  font-weight: 700;
}

.market-value.orange { color: var(--accent-orange); }
.market-value.yellow { color: var(--accent-orange); }

/* 表单 */
.form-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 36px;
}

.form-label-col {
  width: 90px;
  flex-shrink: 0;
}

.form-input-col {
  flex: 1;
  min-width: 0;
}

.form-input-with-btn {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-input-with-btn .el-input {
  flex: 1;
  min-width: 0;
}

.form-input-with-btn .el-input .el-input__wrapper {
  height: 32px;
  box-sizing: border-box;
}

.one-click-price-btn {
  flex-shrink: 0;
  height: 32px;
  padding-top: 0;
  padding-bottom: 0;
}

.form-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.form-label.required::before {
  content: '* ';
  color: var(--accent-red-light);
}

/* 增值服务 */
.vas-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vas-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vas-label {
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.vas-tag {
  font-size: 12px;
}

/* 规则 */
.rules-section {
  padding-bottom: 4px;
}

.rules-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-orange);
  margin-bottom: 8px;
}

.rules-list {
  margin: 0;
  padding-left: 18px;
}

.rules-list li {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.9;
}

.section-divider {
  height: 1px;
  background: var(--bg-tertiary);
  margin: 0 -20px;
}

/* 求购余额 + 从钱包转入 */
.balance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.balance-display {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 6px 12px;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 4px;
}

.balance-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.balance-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-green);
  min-width: 64px;
}

/* 底部 */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-total {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.total-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.total-price {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-red-light);
}

.footer-actions {
  display: flex;
  gap: 12px;
}
</style>

<style>
.publish-purchase-dialog-wrapper .el-dialog {
  background: var(--el-bg-color-overlay) !important;
  border: 1px solid var(--el-border-color);
  border-radius: 8px !important;
  overflow: hidden;
}

.publish-purchase-dialog-wrapper .el-dialog__header {
  background: transparent !important;
  border-bottom: none;
  padding: 16px 20px;
  margin: 0;
}

.publish-purchase-dialog-wrapper .el-dialog__title {
  color: var(--el-text-color-primary) !important;
  font-size: 15px;
  font-weight: 600;
}

.publish-purchase-dialog-wrapper .el-dialog__headerbtn .el-dialog__close {
  color: var(--el-text-color-secondary) !important;
}

.publish-purchase-dialog-wrapper .el-dialog__headerbtn:hover .el-dialog__close {
  color: var(--el-text-color-primary) !important;
}

.publish-purchase-dialog-wrapper .el-dialog__body {
  background: transparent !important;
  padding: 0 20px 16px;
}

.publish-purchase-dialog-wrapper .el-dialog__footer {
  background: transparent !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px 20px;
}

.publish-purchase-dialog-wrapper .el-input .el-input__wrapper {
  background: var(--el-fill-color-light) !important;
  border-color: var(--el-border-color) !important;
}

.publish-purchase-dialog-wrapper .el-input .el-input__wrapper:hover {
  border-color: var(--el-color-primary) !important;
}

.publish-purchase-dialog-wrapper .el-input .el-input__wrapper.is-focus {
  border-color: var(--el-color-primary) !important;
}

.publish-purchase-dialog-wrapper .el-input .el-input__inner {
  color: var(--el-text-color-primary) !important;
}
</style>
