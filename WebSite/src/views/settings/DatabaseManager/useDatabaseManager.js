import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  Refresh,
  FolderAdd,
  Download,
  Upload,
  Tools,
  MagicStick,
  Grid,
  List,
  EditPen,
  Plus,
  Delete,
  Filter,
  CopyDocument,
  CaretRight,
  DocumentAdd
} from '@element-plus/icons-vue';
import axios from 'axios';
import { apiUrls } from '@/config/api.js';


export function useDatabaseManager() {
  // 侧边栏
  const sidebarCollapsed = ref(false);
  const tableSearchQuery = ref('');
  const tables = ref([]);
  const tablesLoading = ref(false);

  // 选中的表
  const selectedTable = ref('');
  const activeTab = ref('info'); // 默认显示信息页

  // 数据库信息
  const databaseInfo = ref({});
  const databaseInfoLoading = ref(false);
  const backupLoading = ref(false);
  const downloadLoading = ref(false);
  const restoreLoading = ref(false);
  const optimizeLoading = ref(false);
  const vacuumLoading = ref(false);
  const restoreDialogVisible = ref(false);
  const restoreFile = ref(null);

  // 表数据
  const tableData = ref([]);
  const tableColumns = ref([]);
  const tableStructure = ref([]);
  const tableInfo = ref({});
  const createTableSQL = ref('');
  const tableLoading = ref(false);

  // 数据视图
  const dataSearchQuery = ref('');
  const selectedRows = ref([]);
  const currentPage = ref(1);
  const pageSize = ref(20);

  // 筛选功能
  const filterDialogVisible = ref(false);
  const filters = ref([]);
  const activeFilters = ref([]);

  // 排序功能
  const sortColumn = ref('');
  const sortOrder = ref(''); // 'ascending' or 'descending'

  // 编辑对话框
  const editDialogVisible = ref(false);
  const editMode = ref('add'); // 'add' or 'edit'
  const editForm = ref({});
  const editIndex = ref(-1);

  // 查询视图
  const sqlQuery = ref('');
  const queryResult = ref([]);
  const queryResultColumns = ref([]);
  const queryError = ref('');
  const queryExecutionTime = ref(0);
  const queryLoading = ref(false);

  // 保存的查询
  const savedQueries = ref([]);
  const selectedSavedQuery = ref('');
  const saveQueryDialogVisible = ref(false);
  const saveQueryForm = ref({ name: '' });

  // SQL 执行（数据库首页）
  const sqlStatement = ref('');
  const sqlResult = ref([]);
  const sqlResultColumns = ref([]);
  const sqlError = ref('');
  const sqlExecutionTime = ref(0);
  const sqlExecuting = ref(false);
  const sqlMessage = ref('');
  const sqlExecutionDetails = ref([]);
  const sqlTotalStatements = ref(0);
  const sqlFileExecuting = ref(false);

  // 数据库后端配置 / 迁移
  const dbType = ref('sqlite');          // 当前选择的后端
  const activeBackend = ref('sqlite');   // 后端实际生效的后端
  const mysqlForm = ref({ host: '', port: 3306, user: '', password: '', database: 'csweaponmanager' });
  const mysqlHasPassword = ref(false);
  const dbConfigLoading = ref(false);
  const testingMysql = ref(false);
  const savingDbConfig = ref(false);
  const migratingToMysql = ref(false);
  const migratingToSqlite = ref(false);
  const dbCheckResult = ref(null);       // { type: 'success' | 'error', text } 测试/迁移的详细结果

  // 计算属性
  const filteredTables = computed(() => {
    if (!tableSearchQuery.value) return tables.value;
    return tables.value.filter(table =>
      table.name.toLowerCase().includes(tableSearchQuery.value.toLowerCase())
    );
  });

  const filteredTableData = computed(() => {
    let data = [...tableData.value];

    // 应用筛选条件
    if (activeFilters.value.length > 0) {
      data = data.filter(row => {
        return activeFilters.value.every(filter => {
          const cellValue = String(row[filter.field] || '');
          const filterValue = String(filter.value || '');

          switch (filter.operator) {
            case '=':
              return cellValue === filterValue;
            case '!=':
              return cellValue !== filterValue;
            case 'LIKE':
              return cellValue.toLowerCase().includes(filterValue.toLowerCase());
            case 'NOT LIKE':
              return !cellValue.toLowerCase().includes(filterValue.toLowerCase());
            case '>':
              return parseFloat(cellValue) > parseFloat(filterValue);
            case '<':
              return parseFloat(cellValue) < parseFloat(filterValue);
            case '>=':
              return parseFloat(cellValue) >= parseFloat(filterValue);
            case '<=':
              return parseFloat(cellValue) <= parseFloat(filterValue);
            case 'IS NULL':
              return !cellValue || cellValue === 'NULL' || cellValue === 'null';
            case 'IS NOT NULL':
              return cellValue && cellValue !== 'NULL' && cellValue !== 'null';
            default:
              return true;
          }
        });
      });
    }

    // 应用排序
    if (sortColumn.value && sortOrder.value) {
      data.sort((a, b) => {
        const aValue = a[sortColumn.value];
        const bValue = b[sortColumn.value];

        // 处理 null/undefined
        if (aValue === null || aValue === undefined) return sortOrder.value === 'ascending' ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortOrder.value === 'ascending' ? -1 : 1;

        // 尝试数字比较
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortOrder.value === 'ascending' ? aNum - bNum : bNum - aNum;
        }

        // 字符串比较
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        if (sortOrder.value === 'ascending') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return data;
  });

  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredTableData.value.slice(start, end);
  });

  // 加载表列表
  const refreshTables = async () => {
    tablesLoading.value = true;
    try {
      const response = await axios.get(apiUrls.dbManagerTables());
      tables.value = response.data;
    } catch (error) {
      ElMessage.error('加载表列表失败：' + (error.response?.data?.message || error.message));
    } finally {
      tablesLoading.value = false;
    }
  };

  // 显示数据库信息
  const showDatabaseInfo = () => {
    selectedTable.value = '';
    refreshDatabaseInfo();
  };

  // 选择表
  const selectTable = async (tableName) => {
    selectedTable.value = tableName;
    activeTab.value = 'data';
    await loadTableData();
    await loadTableStructure();
  };

  // 表选择变化
  const onTableChange = async () => {
    if (selectedTable.value) {
      activeTab.value = 'data';
      await loadTableData();
      await loadTableStructure();
    }
  };

  // 加载表数据
  const loadTableData = async () => {
    if (!selectedTable.value) return;

    tableLoading.value = true;
    try {
      const response = await axios.get(apiUrls.dbManagerTableData(selectedTable.value));
      tableData.value = response.data.rows;
      tableColumns.value = response.data.columns;
    } catch (error) {
      ElMessage.error('加载表数据失败：' + (error.response?.data?.message || error.message));
    } finally {
      tableLoading.value = false;
    }
  };

  // 加载表结构
  const loadTableStructure = async () => {
    if (!selectedTable.value) return;

    try {
      const response = await axios.get(apiUrls.dbManagerTableStructure(selectedTable.value));
      tableStructure.value = response.data.structure;
      tableInfo.value = response.data.info;
      createTableSQL.value = response.data.sql;
    } catch (error) {
      ElMessage.error('加载表结构失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 刷新表数据
  const refreshTableData = () => {
    loadTableData();
  };

  // 格式化单元格值
  const formatCellValue = (value) => {
    if (value === null) return 'NULL';
    if (value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // 选择变化
  const handleSelectionChange = (selection) => {
    selectedRows.value = selection;
  };

  // 分页
  const handleSizeChange = (val) => {
    pageSize.value = val;
    currentPage.value = 1;
  };

  const handleCurrentChange = (val) => {
    currentPage.value = val;
  };

  // 打开新增对话框
  const openAddDialog = () => {
    editMode.value = 'add';
    editForm.value = {};
    editDialogVisible.value = true;
  };

  // 编辑行
  const editRow = (row, index) => {
    editMode.value = 'edit';
    editForm.value = { ...row };
    editIndex.value = index;
    editDialogVisible.value = true;
  };

  // 保存编辑
  const saveEdit = async () => {
    try {
      if (editMode.value === 'add') {
        await axios.post(apiUrls.dbManagerTableAddRow(selectedTable.value), editForm.value);
        ElMessage.success('新增成功');
      } else {
        await axios.put(apiUrls.dbManagerTableUpdateRow(selectedTable.value), {
          data: editForm.value,
          index: editIndex.value
        });
        ElMessage.success('更新成功');
      }
      editDialogVisible.value = false;
      await loadTableData();
    } catch (error) {
      ElMessage.error('保存失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 删除行
  const deleteRow = async (row, index) => {
    try {
      await ElMessageBox.confirm('确定要删除这条数据吗？', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });

      await axios.delete(apiUrls.dbManagerTableDeleteRow(selectedTable.value), {
        data: { row, index }
      });

      ElMessage.success('删除成功');
      await loadTableData();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败：' + (error.response?.data?.message || error.message));
      }
    }
  };

  // 删除选中
  const deleteSelected = async () => {
    try {
      await ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条数据吗？`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });

      await axios.post(apiUrls.dbManagerTableDeleteBatch(selectedTable.value), {
        rows: selectedRows.value
      });

      ElMessage.success('批量删除成功');
      selectedRows.value = [];
      await loadTableData();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败：' + (error.response?.data?.message || error.message));
      }
    }
  };

  // 导出当前表
  const exportCurrentTable = async () => {
    try {
      const response = await axios.get(apiUrls.dbManagerTableExport(selectedTable.value), {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedTable.value}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      ElMessage.success('导出成功');
    } catch (error) {
      ElMessage.error('导出失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 复制SQL
  const copySQL = () => {
    navigator.clipboard.writeText(createTableSQL.value);
    ElMessage.success('SQL已复制到剪贴板');
  };

  // 执行查询
  const executeQuery = async () => {
    if (!sqlQuery.value.trim()) {
      ElMessage.warning('请输入SQL查询语句');
      return;
    }

    queryLoading.value = true;
    queryError.value = '';
    const startTime = Date.now();

    try {
      const response = await axios.post(apiUrls.dbManagerExecuteQuery(), {
        sql: sqlQuery.value
      });

      queryExecutionTime.value = Date.now() - startTime;
      queryResult.value = response.data.rows || [];
      queryResultColumns.value = response.data.columns || [];

      ElMessage.success(`查询成功，返回 ${queryResult.value.length} 行`);
    } catch (error) {
      queryError.value = error.response?.data?.message || error.message;
      queryResult.value = [];
      queryResultColumns.value = [];
    } finally {
      queryLoading.value = false;
    }
  };

  // 清空查询
  const clearQuery = () => {
    sqlQuery.value = '';
    queryResult.value = [];
    queryResultColumns.value = [];
    queryError.value = '';
  };

  // 格式化查询
  const formatQuery = () => {
    // 简单的SQL格式化
    let formatted = sqlQuery.value
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ',\n  ')
      .replace(/\s+(FROM|WHERE|ORDER BY|GROUP BY|HAVING|LIMIT)/gi, '\n$1')
      .replace(/\s+(AND|OR)/gi, '\n  $1');

    sqlQuery.value = formatted.trim();
  };

  // 保存查询
  const saveQuery = () => {
    if (!sqlQuery.value.trim()) {
      ElMessage.warning('请输入SQL查询语句');
      return;
    }
    saveQueryForm.value.name = '';
    saveQueryDialogVisible.value = true;
  };

  // 确认保存查询
  const confirmSaveQuery = async () => {
    if (!saveQueryForm.value.name) {
      ElMessage.warning('请输入查询名称');
      return;
    }

    try {
      await axios.post(apiUrls.dbManagerSaveQuery(), {
        name: saveQueryForm.value.name,
        sql: sqlQuery.value
      });

      ElMessage.success('查询已保存');
      saveQueryDialogVisible.value = false;
      await loadSavedQueries();
    } catch (error) {
      ElMessage.error('保存失败：' + (error.response?.data?.message || error.message));
    }
  };

  // 筛选功能
  const showFilterDialog = () => {
    if (filters.value.length === 0) {
      addFilter();
    }
    filterDialogVisible.value = true;
  };

  const addFilter = () => {
    filters.value.push({
      field: '',
      operator: '=',
      value: ''
    });
  };

  const removeFilter = (index) => {
    filters.value.splice(index, 1);
  };

  const applyFilters = () => {
    activeFilters.value = filters.value.filter(f => f.field && f.operator);
    filterDialogVisible.value = false;
    currentPage.value = 1; // 重置到第一页
    ElMessage.success(`已应用 ${activeFilters.value.length} 个筛选条件`);
  };

  const clearFilters = () => {
    filters.value = [];
    activeFilters.value = [];
    currentPage.value = 1;
    ElMessage.success('已清空筛选条件');
  };

  // 排序处理
  const handleSortChange = ({ column, prop, order }) => {
    sortColumn.value = prop || '';
    sortOrder.value = order || '';
    currentPage.value = 1; // 重置到第一页
  };

  // 加载已保存的查询
  const loadSavedQueries = async () => {
    try {
      const response = await axios.get(apiUrls.dbManagerSavedQueries());
      savedQueries.value = response.data;
    } catch (error) {
      console.error('加载已保存查询失败:', error);
    }
  };

  // 加载已保存的查询
  const loadSavedQuery = () => {
    const query = savedQueries.value.find(q => q.id === selectedSavedQuery.value);
    if (query) {
      sqlQuery.value = query.sql;
    }
  };

  // 数据库信息和操作
  const refreshDatabaseInfo = async () => {
    databaseInfoLoading.value = true;
    try {
      const response = await axios.get(apiUrls.dbManagerInfo());
      databaseInfo.value = response.data;
    } catch (error) {
      ElMessage.error('获取数据库信息失败：' + (error.response?.data?.message || error.message));
    } finally {
      databaseInfoLoading.value = false;
    }
  };

  const backupDatabase = async () => {
    try {
      await ElMessageBox.confirm(
        '将在数据库目录下创建备份文件，是否继续？',
        '确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info',
        }
      );

      backupLoading.value = true;
      const response = await axios.post(apiUrls.dbManagerBackup());
      ElMessage.success(response.data.message || '数据库备份成功');
      await refreshDatabaseInfo();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('备份失败：' + (error.response?.data?.message || error.message));
      }
    } finally {
      backupLoading.value = false;
    }
  };

  const downloadDatabase = async () => {
    downloadLoading.value = true;
    try {
      const response = await axios.get(apiUrls.dbManagerDownload(), {
        responseType: 'blob'
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.setAttribute('download', `csweaponmanager_${timestamp}.db`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      ElMessage.success('数据库下载成功');
    } catch (error) {
      ElMessage.error('下载失败：' + (error.response?.data?.message || error.message));
    } finally {
      downloadLoading.value = false;
    }
  };

  const showRestoreDialog = () => {
    restoreFile.value = null;
    restoreDialogVisible.value = true;
  };

  const handleFileChange = (file) => {
    restoreFile.value = file.raw;
  };

  const confirmRestore = async () => {
    if (!restoreFile.value) {
      ElMessage.warning('请选择备份文件');
      return;
    }

    try {
      await ElMessageBox.confirm(
        '确定要恢复数据库吗？此操作将覆盖当前所有数据，且不可逆！',
        '警告',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      restoreLoading.value = true;
      const formData = new FormData();
      formData.append('file', restoreFile.value);

      await axios.post(apiUrls.dbManagerRestore(), formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      ElMessage.success('数据库恢复成功，页面将刷新');
      restoreDialogVisible.value = false;

      // 刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('恢复失败：' + (error.response?.data?.message || error.message));
      }
    } finally {
      restoreLoading.value = false;
    }
  };

  const optimizeDatabase = async () => {
    try {
      await ElMessageBox.confirm(
        '优化数据库将执行以下操作：\n1. 收集统计信息优化查询计划\n2. 重建所有索引提高效率\n3. 检查数据库完整性\n\n是否继续？',
        '确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info',
        }
      );

      optimizeLoading.value = true;
      const response = await axios.post(apiUrls.dbManagerOptimize());

      // 显示优化操作详情
      if (response.data.operations && response.data.operations.length > 0) {
        const operations = response.data.operations.join('\n');
        await ElMessageBox.alert(operations, '优化完成', {
          confirmButtonText: '确定',
          type: 'success',
        });
      } else {
        ElMessage.success('数据库优化成功');
      }

      await refreshDatabaseInfo();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('优化失败：' + (error.response?.data?.message || error.message));
      }
    } finally {
      optimizeLoading.value = false;
    }
  };

  const vacuumDatabase = async () => {
    try {
      await ElMessageBox.confirm(
        '清理数据库将回收未使用的空间，减小文件大小。是否继续？',
        '确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'info',
        }
      );

      vacuumLoading.value = true;
      await axios.post(apiUrls.dbManagerVacuum());
      ElMessage.success('数据库清理成功');
      await refreshDatabaseInfo();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('清理失败：' + (error.response?.data?.message || error.message));
      }
    } finally {
      vacuumLoading.value = false;
    }
  };

  const truncateTable = async (tableName) => {
    try {
      await ElMessageBox.confirm(
        `确定要清空表 "${tableName}" 吗？此操作将删除表中所有数据，但保留表结构。`,
        '警告',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );

      tableLoading.value = true;
      await axios.post(apiUrls.dbManagerTruncate(), { tableName });
      ElMessage.success(`表 "${tableName}" 已清空`);

      // 刷新表列表和数据库信息
      await refreshTables();
      await refreshDatabaseInfo();

      // 如果当前选中的就是这个表，刷新数据
      if (selectedTable.value === tableName) {
        await loadTableData();
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('清空表失败：' + (error.response?.data?.message || error.message));
      }
    } finally {
      tableLoading.value = false;
    }
  };

  const dropTable = async (tableName) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除表 "${tableName}" 吗？此操作将永久删除表及其所有数据，且无法恢复！`,
        '危险操作',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'error',
          confirmButtonClass: 'el-button--danger',
        }
      );

      // 二次确认
      await ElMessageBox.confirm(
        `请再次确认：您真的要删除表 "${tableName}" 吗？`,
        '最终确认',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'error',
        }
      );

      tableLoading.value = true;
      await axios.post(apiUrls.dbManagerDrop(), { tableName });
      ElMessage.success(`表 "${tableName}" 已删除`);

      // 如果删除的是当前选中的表，返回数据库首页
      if (selectedTable.value === tableName) {
        selectedTable.value = null;
      }

      // 刷新表列表和数据库信息
      await refreshTables();
      await refreshDatabaseInfo();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除表失败：' + (error.response?.data?.message || error.message));
      }
    } finally {
      tableLoading.value = false;
    }
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // SQL 执行功能（数据库首页）
  const executeSQL = async () => {
    if (!sqlStatement.value.trim()) {
      ElMessage.warning('请输入 SQL 语句');
      return;
    }

    sqlExecuting.value = true;
    sqlError.value = '';
    sqlMessage.value = '';
    sqlResult.value = [];
    sqlResultColumns.value = [];
    sqlExecutionDetails.value = [];
    sqlTotalStatements.value = 0;
    const startTime = Date.now();

    try {
      const response = await axios.post(apiUrls.dbManagerExecuteQuery(), {
        sql: sqlStatement.value
      });

      sqlExecutionTime.value = Date.now() - startTime;
      sqlResult.value = response.data.rows || [];
      sqlResultColumns.value = response.data.columns || [];
      sqlMessage.value = response.data.message || '';
      sqlExecutionDetails.value = response.data.execution_details || [];
      sqlTotalStatements.value = response.data.total_statements || 0;

      if (sqlResult.value.length > 0) {
        ElMessage.success(`查询成功，返回 ${sqlResult.value.length} 行`);
      } else if (sqlMessage.value) {
        ElMessage.success(sqlMessage.value);
      } else {
        ElMessage.success('执行成功');
      }
    } catch (error) {
      sqlError.value = error.response?.data?.error || error.response?.data?.message || error.message;
      sqlResult.value = [];
      sqlResultColumns.value = [];
      sqlExecutionDetails.value = error.response?.data?.execution_details || [];

      // 显示错误信息，包括哪条语句出错
      if (error.response?.data?.statement_index) {
        ElMessage.error(`执行失败：第 ${error.response.data.statement_index} 条语句出错 - ${sqlError.value}`);
      } else {
        ElMessage.error('执行失败：' + sqlError.value);
      }
    } finally {
      sqlExecuting.value = false;
    }
  };

  // 执行 SQL 文件
  const handleExecuteSqlFile = async (file) => {
    if (!file) return false;

    sqlFileExecuting.value = true;
    sqlError.value = '';
    sqlMessage.value = '';
    sqlResult.value = [];
    sqlResultColumns.value = [];
    sqlExecutionDetails.value = [];
    sqlTotalStatements.value = 0;
    sqlExecutionTime.value = 0;

    const formData = new FormData();
    formData.append('file', file);

    const startTime = Date.now();

    try {
      const response = await axios.post(apiUrls.dbManagerExecuteFile(), formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      sqlExecutionTime.value = Date.now() - startTime;
      sqlResult.value = response.data.rows || [];
      sqlResultColumns.value = response.data.columns || [];
      sqlMessage.value = response.data.message || `文件 ${response.data.file || file.name} 执行完成`;
      sqlExecutionDetails.value = response.data.execution_details || [];
      sqlTotalStatements.value = response.data.total_statements || 0;

      if (sqlResult.value.length > 0) {
        ElMessage.success(`SQL 文件执行成功，最后一条查询返回 ${sqlResult.value.length} 行`);
      } else if (sqlMessage.value) {
        ElMessage.success(sqlMessage.value);
      } else {
        ElMessage.success('SQL 文件执行成功');
      }
    } catch (error) {
      // 后端可能返回带有 execution_details 的结构
      sqlExecutionTime.value = Date.now() - startTime;
      sqlError.value = error.response?.data?.error || error.response?.data?.message || error.message;
      sqlExecutionDetails.value = error.response?.data?.execution_details || [];

      if (error.response?.data?.statement_index) {
        ElMessage.error(`SQL 文件执行失败：第 ${error.response.data.statement_index} 条语句出错 - ${sqlError.value}`);
      } else {
        ElMessage.error('SQL 文件执行失败：' + sqlError.value);
      }
    } finally {
      sqlFileExecuting.value = false;
    }

    // 阻止 el-upload 默认上传行为
    return false;
  };

  const clearSQL = () => {
    sqlStatement.value = '';
    sqlResult.value = [];
    sqlResultColumns.value = [];
    sqlError.value = '';
    sqlMessage.value = '';
    sqlExecutionTime.value = 0;
    sqlExecutionDetails.value = [];
    sqlTotalStatements.value = 0;
  };

  const formatSQL = () => {
    // 简单的 SQL 格式化
    let formatted = sqlStatement.value
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ',\n  ')
      .replace(/\s+(FROM|WHERE|ORDER BY|GROUP BY|HAVING|LIMIT|SET|UPDATE|DELETE|INSERT INTO|VALUES)/gi, '\n$1')
      .replace(/\s+(AND|OR)/gi, '\n  $1');

    sqlStatement.value = formatted.trim();
  };

  // ===== 数据库后端配置 / 迁移 =====
  const loadDbConfig = async () => {
    dbConfigLoading.value = true;
    try {
      const response = await axios.get(apiUrls.dbManagerGetDbConfig());
      const data = response.data || {};
      dbType.value = data.db_type || 'sqlite';
      activeBackend.value = data.active || 'sqlite';
      const m = data.mysql || {};
      mysqlForm.value = {
        host: m.host || '',
        port: m.port || 3306,
        user: m.user || '',
        password: '',
        database: m.database || 'csweaponmanager',
      };
      mysqlHasPassword.value = !!m.has_password;
    } catch (error) {
      ElMessage.error('获取数据库配置失败：' + (error.response?.data?.error || error.message));
    } finally {
      dbConfigLoading.value = false;
    }
  };

  // 确认框需要用 HTML 换行，动态内容先转义
  const escapeHtml = (value) => String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

  // 迁移结果按表汇总为可读文本
  const formatMigrateStats = (stats) => {
    if (!stats) return '';
    const entries = Object.entries(stats);
    if (!entries.length) return '';
    const failed = entries.filter(([, v]) => typeof v !== 'number');
    const lines = failed.length ? failed.map(([t, v]) => `${t}: ${v}`) : [];
    const ok = entries.filter(([, v]) => typeof v === 'number');
    lines.push(...ok.map(([t, v]) => `${t}: ${v} 行`));
    return lines.join('\n');
  };

  const testMysqlConnection = async () => {
    if (!mysqlForm.value.host || !mysqlForm.value.user) {
      ElMessage.warning('请填写 MySQL 主机和用户名');
      return;
    }
    testingMysql.value = true;
    dbCheckResult.value = null;
    try {
      const response = await axios.post(apiUrls.dbManagerTestMysql(), { ...mysqlForm.value });
      if (response.data.success) {
        ElMessage.success('连接成功');
        dbCheckResult.value = { type: 'success', text: response.data.message || '连接成功' };
      } else {
        ElMessage.error('连接失败');
        dbCheckResult.value = { type: 'error', text: response.data.error || '连接失败' };
      }
    } catch (error) {
      const text = error.response?.data?.error || error.message;
      ElMessage.error('连接失败');
      dbCheckResult.value = { type: 'error', text };
    } finally {
      testingMysql.value = false;
    }
  };

  const saveDbConfig = async () => {
    savingDbConfig.value = true;
    dbCheckResult.value = null;
    try {
      const response = await axios.post(apiUrls.dbManagerSaveDbConfig(), {
        db_type: dbType.value,
        mysql: { ...mysqlForm.value },
      });
      if (response.data.success) {
        activeBackend.value = response.data.active;
        ElMessage.success(response.data.message || '已切换数据库后端');
        await loadDbConfig();
        await refreshTables();
        await refreshDatabaseInfo();
      } else {
        ElMessage.error('保存失败');
        dbCheckResult.value = { type: 'error', text: response.data.error || '保存失败' };
      }
    } catch (error) {
      const text = error.response?.data?.error || error.message;
      ElMessage.error('保存失败');
      dbCheckResult.value = { type: 'error', text };
    } finally {
      savingDbConfig.value = false;
    }
  };

  const migrateToMysql = async () => {
    if (!mysqlForm.value.host || !mysqlForm.value.user || !mysqlForm.value.database) {
      ElMessage.warning('请填写完整的 MySQL 连接参数（主机/用户/数据库）');
      return;
    }
    try {
      await ElMessageBox.confirm(
        `将把当前 SQLite 中的所有数据迁移到 MySQL`
        + `（${escapeHtml(mysqlForm.value.host)}/${escapeHtml(mysqlForm.value.database)}）：`
        + '<br>· 目标库中的同名表数据会被覆盖'
        + '<br>· 迁移完成后默认使用 MySQL'
        + '<br>· <b>迁移成功并校验行数一致后，本地 SQLite 只保留 config 配置表，其余数据会被删除且不可恢复</b>'
        + '<br><br>建议先「备份数据库」再继续。是否继续？',
        '迁移到 MySQL',
        {
          confirmButtonText: '开始迁移',
          cancelButtonText: '取消',
          type: 'warning',
          dangerouslyUseHTMLString: true,
        }
      );
    } catch (e) {
      return;
    }
    migratingToMysql.value = true;
    dbCheckResult.value = null;
    try {
      const response = await axios.post(apiUrls.dbManagerMigrateToMysql(), { ...mysqlForm.value });
      if (response.data.success) {
        ElMessage.success(response.data.message || '迁移完成');
        dbCheckResult.value = {
          type: 'success',
          text: [response.data.message, formatMigrateStats(response.data.stats)].filter(Boolean).join('\n'),
        };
        await loadDbConfig();
        await refreshTables();
        await refreshDatabaseInfo();
      } else {
        ElMessage.error('迁移失败');
        dbCheckResult.value = {
          type: 'error',
          text: [response.data.message || response.data.error || '迁移失败',
                 formatMigrateStats(response.data.stats)].filter(Boolean).join('\n'),
        };
      }
    } catch (error) {
      const data = error.response?.data || {};
      ElMessage.error('迁移失败');
      dbCheckResult.value = {
        type: 'error',
        text: [data.message || data.error || error.message, formatMigrateStats(data.stats)]
          .filter(Boolean).join('\n'),
      };
    } finally {
      migratingToMysql.value = false;
    }
  };

  const migrateToSqlite = async () => {
    try {
      await ElMessageBox.confirm(
        '将把当前 MySQL 中的所有数据迁移回基础 SQLite。\n基础 SQLite 中的同名表数据会被覆盖，迁移完成后默认使用 SQLite。是否继续？',
        '迁移到 SQLite',
        { confirmButtonText: '开始迁移', cancelButtonText: '取消', type: 'warning' }
      );
    } catch (e) {
      return;
    }
    migratingToSqlite.value = true;
    dbCheckResult.value = null;
    try {
      const response = await axios.post(apiUrls.dbManagerMigrateToSqlite());
      if (response.data.success) {
        ElMessage.success(response.data.message || '迁移完成');
        dbCheckResult.value = {
          type: 'success',
          text: [response.data.message, formatMigrateStats(response.data.stats)].filter(Boolean).join('\n'),
        };
        await loadDbConfig();
        await refreshTables();
        await refreshDatabaseInfo();
      } else {
        ElMessage.error('迁移失败');
        dbCheckResult.value = {
          type: 'error',
          text: [response.data.message || response.data.error || '迁移失败',
                 formatMigrateStats(response.data.stats)].filter(Boolean).join('\n'),
        };
      }
    } catch (error) {
      const data = error.response?.data || {};
      ElMessage.error('迁移失败');
      dbCheckResult.value = {
        type: 'error',
        text: [data.message || data.error || error.message, formatMigrateStats(data.stats)]
          .filter(Boolean).join('\n'),
      };
    } finally {
      migratingToSqlite.value = false;
    }
  };

  // 初始化
  onMounted(() => {
    refreshTables();
    loadSavedQueries();
    refreshDatabaseInfo();
    loadDbConfig();
  });

  return {
    // Icons
    Search, Refresh, FolderAdd, Download, Upload, Tools, MagicStick, Grid, List, EditPen, Plus, Delete, Filter, CopyDocument, CaretRight, DocumentAdd,
    // 侧边栏
    sidebarCollapsed, tableSearchQuery, tables, tablesLoading,
    // 选中的表
    selectedTable, activeTab,
    // 数据库信息
    databaseInfo, databaseInfoLoading, backupLoading, downloadLoading, restoreLoading, optimizeLoading, vacuumLoading, restoreDialogVisible, restoreFile,
    // 表数据
    tableData, tableColumns, tableStructure, tableInfo, createTableSQL, tableLoading,
    // 数据视图
    dataSearchQuery, selectedRows, currentPage, pageSize,
    // 筛选功能
    filterDialogVisible, filters, activeFilters,
    // 排序功能
    sortColumn, sortOrder,
    // 编辑对话框
    editDialogVisible, editMode, editForm, editIndex,
    // 查询视图
    sqlQuery, queryResult, queryResultColumns, queryError, queryExecutionTime, queryLoading,
    // 保存的查询
    savedQueries, selectedSavedQuery, saveQueryDialogVisible, saveQueryForm,
    // SQL 执行
    sqlStatement, sqlResult, sqlResultColumns, sqlError, sqlExecutionTime, sqlExecuting, sqlMessage, sqlExecutionDetails, sqlTotalStatements, sqlFileExecuting,
    // 数据库后端配置 / 迁移
    dbType, activeBackend, mysqlForm, mysqlHasPassword, dbConfigLoading, testingMysql, savingDbConfig, migratingToMysql, migratingToSqlite, dbCheckResult,
    loadDbConfig, testMysqlConnection, saveDbConfig, migrateToMysql, migrateToSqlite,
    // 计算属性
    filteredTables, filteredTableData, paginatedData,
    // 方法
    refreshTables, showDatabaseInfo, selectTable, onTableChange, loadTableData, loadTableStructure, refreshTableData,
    formatCellValue, handleSelectionChange, handleSizeChange, handleCurrentChange,
    openAddDialog, editRow, saveEdit, deleteRow, deleteSelected, exportCurrentTable, copySQL,
    executeQuery, clearQuery, formatQuery, saveQuery, confirmSaveQuery,
    showFilterDialog, addFilter, removeFilter, applyFilters, clearFilters, handleSortChange,
    loadSavedQueries, loadSavedQuery,
    refreshDatabaseInfo, backupDatabase, downloadDatabase, showRestoreDialog, handleFileChange, confirmRestore,
    optimizeDatabase, vacuumDatabase, truncateTable, dropTable, formatSize,
    executeSQL, handleExecuteSqlFile, clearSQL, formatSQL
  }
}
