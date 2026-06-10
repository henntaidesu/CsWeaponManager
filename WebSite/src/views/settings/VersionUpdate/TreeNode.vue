<template>
  <div class="tree-node">
    <div
      :class="['node-label', {
        'is-file': node.type === 'file',
        'is-directory': node.type === 'directory',
        'is-selected': isSelected
      }]"
      @click="handleClick"
    >
      <el-icon v-if="node.type === 'directory'" class="node-icon">
        <template v-if="isExpanded">
          <FolderOpened />
        </template>
        <template v-else>
          <Folder />
        </template>
      </el-icon>
      <el-icon v-else class="node-icon">
        <Document />
      </el-icon>
      <span class="node-name">{{ node.name }}</span>
    </div>

    <div v-if="node.type === 'directory' && isExpanded" class="node-children">
      <TreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :selected-path="selectedPath"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Document, Folder, FolderOpened } from '@element-plus/icons-vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  selectedPath: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select'])

const isExpanded = ref(false)

const isSelected = computed(() => {
  return props.node.path === props.selectedPath
})

const handleClick = () => {
  if (props.node.type === 'directory') {
    isExpanded.value = !isExpanded.value
  } else {
    emit('select', props.node.path)
  }
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.node-label {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  gap: 6px;
}

.node-label:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.node-label.is-selected {
  background-color: rgba(64, 158, 255, 0.2);
  color: var(--accent-blue);
}

.node-label.is-directory {
  font-weight: 500;
}

.node-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.node-children {
  margin-left: 16px;
}
</style>
