<template>
  <el-dialog
    v-model="dialogVisible"
    title="从钱包余额转入"
    width="440px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="ti-body">

      <!-- 可用余额 -->
      <div class="ti-balance-block">
        <span class="ti-balance-label">钱包可用余额</span>
        <span class="ti-balance-amount">¥{{ availableYuan.toFixed(2) }}</span>
      </div>

      <!-- 快捷选择 + 输入框 -->
      <div class="ti-quick-row">
        <span class="ti-section-label">快捷选择</span>
        <el-button size="small" @click="setPercent(25)">25%</el-button>
        <el-button size="small" @click="setPercent(50)">50%</el-button>
        <el-button size="small" @click="setPercent(75)">75%</el-button>
        <el-button size="small" type="primary" @click="setAll">全部转入</el-button>
      </div>

      <!-- 金额输入 -->
      <el-input
        v-model="inputAmount"
        placeholder="最低 ¥10"
        size="large"
        @input="onAmountInput"
      >
        <template #prepend>¥</template>
      </el-input>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="ti-error">{{ errorMsg }}</div>

    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!canSubmit" @click="handleConfirm">
        确认转入
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ref, computed, watch } from 'vue'

export default {
  name: 'TransferInDialog',
  props: {
    visible: { type: Boolean, default: false },
    availableYuan: { type: Number, default: 0 }
  },
  emits: ['update:visible', 'confirm'],
  setup(props, { emit }) {
    const dialogVisible = computed({
      get: () => props.visible,
      set: (val) => emit('update:visible', val)
    })

    const inputAmount = ref('')
    const errorMsg = ref('')

    const onAmountInput = (val) => {
      let cleaned = val.replace(/[^\d.]/g, '')
      const parts = cleaned.split('.')
      if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('')
      if (cleaned.includes('.')) {
        const [int, dec] = cleaned.split('.')
        cleaned = int + '.' + dec.slice(0, 2)
      }
      inputAmount.value = cleaned
      errorMsg.value = ''
    }

    const setPercent = (percent) => {
      const raw = Math.floor(props.availableYuan * percent) / 100
      inputAmount.value = raw.toFixed(2)
      errorMsg.value = ''
    }

    const setAll = () => {
      inputAmount.value = props.availableYuan.toFixed(2)
      errorMsg.value = ''
    }

    const canSubmit = computed(() => {
      const amount = parseFloat(inputAmount.value)
      return !isNaN(amount) && amount >= 10 && amount <= props.availableYuan
    })

    const handleConfirm = () => {
      const amount = parseFloat(inputAmount.value)
      if (isNaN(amount) || amount <= 0) {
        errorMsg.value = '请输入有效金额'
        return
      }
      if (amount < 10) {
        errorMsg.value = '最低转入金额为 ¥10'
        return
      }
      if (amount > props.availableYuan) {
        errorMsg.value = `不能超过可用余额 ¥${props.availableYuan.toFixed(2)}`
        return
      }
      emit('confirm', inputAmount.value)
    }

    const handleClose = () => {
      inputAmount.value = ''
      errorMsg.value = ''
      emit('update:visible', false)
    }

    watch(() => props.visible, (val) => {
      if (val) {
        inputAmount.value = ''
        errorMsg.value = ''
      }
    })

    return {
      dialogVisible,
      inputAmount,
      errorMsg,
      onAmountInput,
      setPercent,
      setAll,
      canSubmit,
      handleConfirm,
      handleClose
    }
  }
}
</script>

<style scoped>
.ti-body {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 0.25rem 0;
}

.ti-balance-block {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.ti-balance-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.ti-balance-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-green);
}

.ti-quick-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.ti-section-label {
  font-size: 0.85rem;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.ti-error {
  font-size: 0.82rem;
  color: var(--accent-red-light);
  margin-top: -0.5rem;
}
</style>
