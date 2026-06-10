<template>
  <el-dialog
    v-model="dialogVisible"
    title="修改求购"
    width="520px"
    :close-on-click-modal="false"
    class="edit-order-dialog-wrapper"
    @close="handleClose"
  >
    <div v-if="orderData" class="edit-order-dialog">

      <!-- 物品信息 -->
      <div class="item-info-row">
        <div class="item-image">
          <img
            v-if="orderData.icon_url"
            :src="orderData.icon_url"
            :alt="orderData.commodity_name"
            @error="(e) => e.target.style.display = 'none'"
          />
          <div v-else class="image-placeholder">无图</div>
        </div>
        <div class="item-details">
          <div class="item-name">{{ orderData.commodity_name }}</div>
          <span v-if="orderData.abrade_text" class="abrade-text">{{ orderData.abrade_text }}</span>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- 市场信息 -->
      <div class="market-info-row">
        <div class="market-info-item">
          <div class="market-label">在售最低价</div>
          <div class="market-value blue">¥{{ orderData.lowest_selling_price || '-' }}</div>
        </div>
        <div class="market-info-item">
          <div class="market-label">求购最高价</div>
          <div class="market-value red">¥{{ orderData.highest_purchase_price || '-' }}</div>
        </div>
        <div class="market-info-item">
          <div class="market-label">参考价</div>
          <div class="market-value green">¥{{ orderData.reference_price || '-' }}</div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- 编辑表单 -->
      <div class="form-inline-row">
        <div class="inline-field">
          <div class="form-label required">单价</div>
          <el-input v-model="formData.unitPrice" placeholder="请输入单价" />
        </div>
        <div class="inline-field">
          <div class="form-label required">数量</div>
          <el-input v-model="formData.quantity" placeholder="请输入数量" />
        </div>
      </div>

      <div class="total-row">
        <span class="total-label">总价</span>
        <div class="total-price">¥{{ totalPrice }}</div>
        <div class="total-bought">
          已购买: <span class="hint-green">{{ orderData.buy_quantity }}</span> / {{ orderData.total_quantity }}
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- 增值服务 -->
      <div class="vas-row">
        <div class="vas-info">
          <span class="vas-label">增值服务</span>
          <span class="vas-name">自动接受</span>
        </div>
        <el-switch v-model="formData.autoReceived" />
      </div>

      <div class="section-divider"></div>

      <!-- 规则说明 -->
      <div class="rules-section">
        <div class="rules-title">规则说明</div>
        <ul class="rules-list">
          <li>修改单价后，订单将重新排队</li>
          <li>修改数量不影响当前排队位置</li>
          <li>单价不能超过最高求购价限制</li>
        </ul>
      </div>

    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessageBox } from 'element-plus'

const props = defineProps({
  visible: { type: Boolean, default: false },
  orderData: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'submit'])

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const formData = ref({ unitPrice: '', quantity: '', autoReceived: false })

const totalPrice = computed(() => {
  const price = parseFloat(formData.value.unitPrice)
  const qty = parseInt(formData.value.quantity)
  if (isNaN(price) || isNaN(qty)) return '0.00'
  return (price * qty).toFixed(2)
})

watch(() => props.orderData, (newData) => {
  if (newData) {
    formData.value = {
      unitPrice: newData.unit_price || '',
      quantity: String(newData.quantity || 1),
      autoReceived: Boolean(newData.auto_received)
    }
  }
}, { immediate: true })

const handleClose = () => { dialogVisible.value = false }

const handleConfirm = async () => {
  const price = parseFloat(formData.value.unitPrice)
  const qty = parseInt(formData.value.quantity)

  if (isNaN(price) || price <= 0) {
    ElMessageBox.alert('请输入有效的单价', '提示', { type: 'warning' })
    return
  }
  if (isNaN(qty) || qty < 1) {
    ElMessageBox.alert('数量至少为1', '提示', { type: 'warning' })
    return
  }
  const maxPrice = parseFloat(props.orderData?.max_price || '9999999.99')
  if (price > maxPrice) {
    ElMessageBox.alert(`单价不能超过 ¥${maxPrice}`, '提示', { type: 'warning' })
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要将单价修改为 ¥${price}，数量修改为 ${qty} 吗？`,
      '确认修改',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    emit('submit', { unitPrice: String(price), quantity: qty, autoReceived: formData.value.autoReceived })
  } catch { /* 用户取消 */ }
}
</script>

<style scoped>
.edit-order-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  color: var(--text-secondary);
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
  color: var(--text-primary);
  line-height: 1.4;
}

.abrade-text {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 市场信息 */
.market-info-row {
  display: flex;
}

.market-info-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.market-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.market-value {
  font-size: 16px;
  font-weight: 700;
}

.market-value.blue  { color: var(--accent-blue); }
.market-value.red   { color: var(--accent-red-light); }
.market-value.green { color: var(--accent-green); }

/* 表单 */
.form-inline-row {
  display: flex;
  gap: 16px;
}

.inline-field {
  flex: 1;
  min-width: 0;
}

.form-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-label.required::before {
  content: '* ';
  color: var(--accent-red-light);
}

/* 总价行 */
.total-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.total-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.total-price {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent-red-light);
}

.total-bought {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
}

.hint-green {
  color: var(--accent-green);
  font-weight: 600;
}

.section-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0 -20px;
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
  font-size: 12px;
  color: var(--text-secondary);
}

.vas-name {
  font-size: 14px;
  color: var(--text-primary);
}

/* 规则 */
.rules-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-orange);
  margin-bottom: 6px;
}

.rules-list {
  margin: 0;
  padding-left: 18px;
}

.rules-list li {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.9;
}

/* 底部 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

<style>
.edit-order-dialog-wrapper .el-dialog {
  background: var(--bg-secondary) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px !important;
  overflow: hidden;
}

.edit-order-dialog-wrapper .el-dialog__header {
  background: transparent !important;
  border-bottom: none;
  padding: 16px 20px;
  margin: 0;
}

.edit-order-dialog-wrapper .el-dialog__title {
  color: var(--text-primary) !important;
  font-size: 15px;
  font-weight: 600;
}

.edit-order-dialog-wrapper .el-dialog__headerbtn .el-dialog__close {
  color: var(--text-secondary) !important;
}

.edit-order-dialog-wrapper .el-dialog__headerbtn:hover .el-dialog__close {
  color: var(--text-primary) !important;
}

.edit-order-dialog-wrapper .el-dialog__body {
  background: transparent !important;
  padding: 0 20px 16px;
}

.edit-order-dialog-wrapper .el-dialog__footer {
  background: transparent !important;
  border-top: none;
  padding: 12px 20px;
}

/* Input 暗色适配 */
.edit-order-dialog-wrapper .el-input .el-input__wrapper {
  background: transparent !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  box-shadow: none !important;
}

.edit-order-dialog-wrapper .el-input .el-input__wrapper:hover {
  border-color: rgba(255, 255, 255, 0.25) !important;
}

.edit-order-dialog-wrapper .el-input .el-input__wrapper.is-focus {
  border-color: var(--el-color-primary) !important;
}

.edit-order-dialog-wrapper .el-input .el-input__inner {
  color: var(--text-primary) !important;
}
</style>
