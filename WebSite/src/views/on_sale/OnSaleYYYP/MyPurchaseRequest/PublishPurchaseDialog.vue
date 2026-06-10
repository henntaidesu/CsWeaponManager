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
        <div class="form-input-col">
          <el-input
            v-model="formData.unitPrice"
            :placeholder="`最低¥${templateData.purchase_info.min_price}`"
            @input="onPriceInput"
          />
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

    <template #footer>
      <div class="dialog-footer">
        <div class="footer-total">
          <span class="total-label">总计</span>
          <span class="total-price">¥{{ totalPrice }}</span>
        </div>
        <div class="footer-actions">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" :disabled="!canSubmit" @click="handleConfirm">确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessageBox } from 'element-plus'

const props = defineProps({
  visible: { type: Boolean, default: false },
  templateData: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'submit'])

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

const canSubmit = computed(() => {
  const price = parseFloat(formData.value.unitPrice)
  const qty = parseInt(formData.value.quantity)
  return !isNaN(price) && price > 0 && !isNaN(qty) && qty >= 1
})

const onPriceInput = () => {
  // 只允许数字和小数点
  formData.value.unitPrice = formData.value.unitPrice.replace(/[^0-9.]/g, '')
}

const onQuantityInput = () => {
  // 只允许正整数
  formData.value.quantity = formData.value.quantity.replace(/[^0-9]/g, '')
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

.item-ref-price {
  font-size: 13px;
}

.ref-label {
  color: var(--text-secondary);
}

.ref-value {
  color: var(--text-primary);
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
  background: rgba(255, 255, 255, 0.1);
}

.market-label {
  font-size: 12px;
  color: var(--text-secondary);
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

.form-label {
  font-size: 14px;
  color: var(--text-primary);
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
  color: var(--text-primary);
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
  color: var(--text-secondary);
  line-height: 1.9;
}

.section-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0 -20px;
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
  color: var(--text-secondary);
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
  background: var(--bg-secondary) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
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
  color: var(--text-primary) !important;
  font-size: 15px;
  font-weight: 600;
}

.publish-purchase-dialog-wrapper .el-dialog__headerbtn .el-dialog__close {
  color: var(--text-secondary) !important;
}

.publish-purchase-dialog-wrapper .el-dialog__headerbtn:hover .el-dialog__close {
  color: var(--text-primary) !important;
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

/* Input 暗色适配 */
.publish-purchase-dialog-wrapper .el-input .el-input__wrapper {
  background: transparent !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  box-shadow: none !important;
}

.publish-purchase-dialog-wrapper .el-input .el-input__wrapper:hover {
  border-color: rgba(255, 255, 255, 0.25) !important;
}

.publish-purchase-dialog-wrapper .el-input .el-input__wrapper.is-focus {
  border-color: var(--el-color-primary) !important;
}

.publish-purchase-dialog-wrapper .el-input .el-input__inner {
  color: var(--text-primary) !important;
}
</style>
