import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export function useRentFormYYYPExample() {
  const submitResult = ref(null)

  const handleCancel = () => {
    ElMessage.info('取消操作')
    submitResult.value = null
  }

  const handleSubmit = (data) => {
    ElMessage.success('表单提交成功!')
    submitResult.value = data
  }

  return {
    submitResult,
    handleCancel,
    handleSubmit
  }
}
