# ECDICT 导入脚本优化说明

## 主要改进

### 1. 性能优化
- **批量处理**: 从逐行插入改为批量插入，默认批处理大小为 5000 条记录
- **减少数据库连接开销**: 批量提交减少了频繁的数据库交互
- **优化内存使用**: 分批处理避免一次性加载所有数据到内存

### 2. 断点续传功能
- **进度保存**: 自动保存导入进度到 `import_progress.json` 文件
- **多种恢复方式**: 支持从指定索引或指定单词开始导入
- **自动恢复**: 检测到之前的进度文件时可选择继续导入

### 3. 错误处理和重试机制
- **指数退避重试**: 失败时使用指数退避策略重试，最多重试 3 次
- **连接恢复**: 自动检测和恢复数据库连接
- **详细错误日志**: 提供更详细的错误信息和处理状态

## 使用方法

### 命令行模式（推荐）

```bash
# 基本使用
python import_ecdict_to_mysql.py

# 指定参数
python import_ecdict_to_mysql.py \
  --csv-path /path/to/ecdict.csv \
  --batch-size 10000 \
  --host 192.168.50.26 \
  --port 13306 \
  --user root \
  --password your_password \
  --database enreading

# 从指定索引开始（断点续传）
python import_ecdict_to_mysql.py --start-index 1500000

# 从指定单词开始
python import_ecdict_to_mysql.py --start-word "apple"

# 使用交互模式
python import_ecdict_to_mysql.py --interactive
```

### 参数说明

- `--csv-path`: CSV 文件路径
- `--start-index`: 起始索引（0-based）
- `--start-word`: 起始单词
- `--batch-size`: 批处理大小（默认 5000）
- `--host`: MySQL 主机地址
- `--user`: MySQL 用户名
- `--password`: MySQL 密码
- `--database`: MySQL 数据库名
- `--port`: MySQL 端口
- `--interactive`: 使用交互模式

## 性能对比

### 优化前
- 批处理大小: 1000
- 逐行插入 + 频繁提交
- 预估 300 万条记录需要: **8-12 小时**

### 优化后
- 批处理大小: 5000
- 批量插入 + 减少提交频率
- 预估 300 万条记录需要: **2-4 小时**

## 断点续传示例

### 场景 1: 程序意外中断
```bash
# 程序在处理到第 150 万条记录时中断
# 重新运行时会自动检测进度文件
python import_ecdict_to_mysql.py
# 提示: Found previous progress: {...}
# 选择 'y' 继续从中断点开始
```

### 场景 2: 手动指定起始位置
```bash
# 从第 200 万条记录开始
python import_ecdict_to_mysql.py --start-index 2000000

# 从单词 "hello" 开始
python import_ecdict_to_mysql.py --start-word "hello"
```

## 监控和日志

脚本会输出详细的进度信息：
```
Processing 3000000 records with batch size 5000
Processing batch 1 (records 1 to 5000)
Batch 1 completed. Total: imported=4950, skipped=50
Processing batch 2 (records 5001 to 10000)
...
```

## 故障排除

### 常见问题

1. **内存不足**
   - 减少批处理大小: `--batch-size 2000`

2. **数据库连接超时**
   - 脚本会自动重试连接
   - 检查网络连接和数据库配置

3. **CSV 文件损坏**
   - 检查 CSV 文件完整性
   - 使用 `--start-index` 跳过损坏的部分

4. **磁盘空间不足**
   - 确保有足够的磁盘空间存储数据
   - 300 万条记录大约需要 2-3 GB 空间

### 性能调优建议

1. **批处理大小**
   - 内存充足: 5000-10000
   - 内存有限: 2000-3000
   - 网络较慢: 1000-2000

2. **数据库配置**
   - 增加 `innodb_buffer_pool_size`
   - 设置 `innodb_flush_log_at_trx_commit=2`
   - 临时禁用 `autocommit`

3. **系统资源**
   - 确保充足的内存和 CPU 资源
   - 使用 SSD 存储提高 I/O 性能

## 注意事项

1. **备份数据**: 导入前请备份现有数据
2. **测试环境**: 建议先在测试环境验证
3. **监控资源**: 导入过程中监控系统资源使用情况
4. **网络稳定**: 确保网络连接稳定，避免中断