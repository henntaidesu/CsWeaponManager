"""
DatabaseManager API 模块
层级蓝图注册：
- 从 settings/API.py 接收前缀 /backENDV2/src/use_webside/settings
- 注册所有 DatabaseManager 路由，添加 /database_manager/units/data/xxx 路径段
"""
from flask import Blueprint
from .units.database_manager_data import DatabaseManagerData
from .units.db_migration import DatabaseMigration

database_manager_blueprint = Blueprint('database_manager_v2', __name__)

# 表信息
database_manager_blueprint.route('/database_manager/units/data/getTables', methods=['GET'])(DatabaseManagerData.get_tables)
database_manager_blueprint.route('/database_manager/units/data/table/<table_name>/getData', methods=['GET'])(DatabaseManagerData.get_table_data)
database_manager_blueprint.route('/database_manager/units/data/table/<table_name>/getStructure', methods=['GET'])(DatabaseManagerData.get_table_structure)

# 行操作
database_manager_blueprint.route('/database_manager/units/data/table/<table_name>/addRow', methods=['POST'])(DatabaseManagerData.add_row)
database_manager_blueprint.route('/database_manager/units/data/table/<table_name>/updateRow', methods=['PUT'])(DatabaseManagerData.update_row)
database_manager_blueprint.route('/database_manager/units/data/table/<table_name>/deleteRow', methods=['DELETE'])(DatabaseManagerData.delete_row)
database_manager_blueprint.route('/database_manager/units/data/table/<table_name>/deleteBatch', methods=['POST'])(DatabaseManagerData.delete_batch)
database_manager_blueprint.route('/database_manager/units/data/table/<table_name>/export', methods=['GET'])(DatabaseManagerData.export_table)

# SQL 查询
database_manager_blueprint.route('/database_manager/units/data/executeQuery', methods=['POST'])(DatabaseManagerData.execute_query)
database_manager_blueprint.route('/database_manager/units/data/executeSqlFile', methods=['POST'])(DatabaseManagerData.execute_sql_file)
database_manager_blueprint.route('/database_manager/units/data/getSavedQueries', methods=['GET'])(DatabaseManagerData.get_saved_queries)
database_manager_blueprint.route('/database_manager/units/data/saveQuery', methods=['POST'])(DatabaseManagerData.save_query)

# 数据库管理
database_manager_blueprint.route('/database_manager/units/data/getStats', methods=['GET'])(DatabaseManagerData.get_database_stats)
database_manager_blueprint.route('/database_manager/units/data/getInfo', methods=['GET'])(DatabaseManagerData.get_database_info)
database_manager_blueprint.route('/database_manager/units/data/backup', methods=['POST'])(DatabaseManagerData.backup_database)
database_manager_blueprint.route('/database_manager/units/data/download', methods=['GET'])(DatabaseManagerData.download_database)
database_manager_blueprint.route('/database_manager/units/data/restore', methods=['POST'])(DatabaseManagerData.restore_database)
database_manager_blueprint.route('/database_manager/units/data/optimize', methods=['POST'])(DatabaseManagerData.optimize_database)
database_manager_blueprint.route('/database_manager/units/data/vacuum', methods=['POST'])(DatabaseManagerData.vacuum_database)
database_manager_blueprint.route('/database_manager/units/data/truncate', methods=['POST'])(DatabaseManagerData.truncate_table)
database_manager_blueprint.route('/database_manager/units/data/drop', methods=['POST'])(DatabaseManagerData.drop_table)

# 数据库后端配置与迁移（SQLite / MySQL）
database_manager_blueprint.route('/database_manager/units/data/getDbConfig', methods=['GET'])(DatabaseMigration.get_db_config)
database_manager_blueprint.route('/database_manager/units/data/saveDbConfig', methods=['POST'])(DatabaseMigration.save_db_config)
database_manager_blueprint.route('/database_manager/units/data/testMysql', methods=['POST'])(DatabaseMigration.test_mysql_connection)
database_manager_blueprint.route('/database_manager/units/data/migrateToMysql', methods=['POST'])(DatabaseMigration.migrate_to_mysql)
database_manager_blueprint.route('/database_manager/units/data/migrateToSqlite', methods=['POST'])(DatabaseMigration.migrate_to_sqlite)
