<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="500px"
    :close-on-click-modal="false"
    class="platform-select-dialog"
    @closed="handleClosed"
  >
    <div class="platform-select-content">
      <div class="platform-list">
        <!-- 悠悠有品 -->
        <div
          class="platform-card clickable"
          @click="handleCardClick('yyyp')"
        >
          <div class="platform-icon yyyp-icon">
            <span>悠</span>
          </div>
          <div class="platform-info">
            <div class="platform-name">悠悠有品</div>
            <div class="platform-desc" v-if="isRentMode">支持短租、长租多种模式</div>
          </div>
        </div>

        <!-- BUFF -->
        <div
          class="platform-card clickable"
          @click="handleCardClick('buff')"
        >
          <div class="platform-icon buff-icon">
            <span>B</span>
          </div>
          <div class="platform-info">
            <div class="platform-name">BUFF</div>
            <div class="platform-desc" v-if="isRentMode">需填写日租金、押金与最长租期</div>
          </div>
        </div>
      </div>

      <div class="item-count-info">
        <el-icon><Box /></el-icon>
        <span>已选择 {{ itemCount }} 件饰品</span>
      </div>
    </div>
  </el-dialog>
</template>


<script>
import { InfoFilled, Check, Box } from '@element-plus/icons-vue'
import { usePlatformSelectDialog } from './usePlatformSelectDialog.js'

export default {
  name: 'PlatformSelectDialog',
  components: {
    InfoFilled,
    Check,
    Box
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    itemCount: {
      type: Number,
      default: 0
    },
    mode: {
      type: String,
      default: 'rent', // 'rent' 或 'sell'
      validator: (value) => ['rent', 'sell'].includes(value)
    }
  },
  emits: ['update:modelValue', 'select', 'cancel'],
  setup(props, context) {
    return usePlatformSelectDialog(props, context)
  }
}
</script>

<style scoped src="./styles.css"></style>
