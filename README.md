<div align="center">

# 🔄 Dedup Datasets Worker

**Dataset Deduplication & Merge Tool for CafeScraper**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-3%2F3%20passed-success.svg)](./test)

[English](#english) | [中文](#chinese)

</div>

---

<a name="english"></a>

## 🇺🇸 English

### Overview

Dedup Datasets Worker is a powerful tool for merging and deduplicating datasets from multiple JSON/JSONL files. Fully optimized for the CafeScraper platform with enhanced features and robust error handling.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📦 **Multi-file Merge** | Load and merge data from multiple JSON/JSONL files |
| 🎯 **Field-based Deduplication** | Deduplicate based on single or multiple field combinations |
| 🔄 **Dual Processing Modes** | `dedup-after-load` (high memory, preserve order) or `dedup-as-loading` (low memory, streaming) |
| 🔧 **Custom Transformations** | Pre/post deduplication JavaScript transformation functions |
| 🚀 **Auto Format Detection** | Automatically detect JSON/JSONL based on file extension |
| 🌐 **Cross-platform Paths** | Support for Windows/Unix file paths and `file:///` protocol |
| 💾 **State Persistence** | Automatic state saving for recovery from interruptions |
| 🔍 **Duplicate Detection** | Find and output duplicate items separately |

### 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run local test
npm test

# Run comprehensive tests (all modes)
node test/comprehensive-test.js

# Run as CafeScraper Worker
npm start
```

### 📋 Input Parameters

#### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fields` | array | Fields to use for deduplication (e.g., `["id"]` or `["name", "price"]`) |

#### Data Source Parameters (Choose One)

| Parameter | Type | Description |
|-----------|------|-------------|
| `dataSourceType` | string | Data source type: `"direct-input"`, `"network-url"`, or `"cafe-dataset"` |
| `inputData` | string | JSON array data (when `dataSourceType="direct-input"`) |
| `inputUrls` | array | URL list of data files (when `dataSourceType="network-url"`) |
| `datasetIds` | array | Cafe Dataset ID list (when `dataSourceType="cafe-dataset"`) |

#### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `inputFormat` | string | `"json"` | File format: `json` or `jsonl` (auto-detected by extension) |
| `output` | string | `"unique-items"` | Output type: `unique-items`, `duplicate-items`, or `nothing` |
| `mode` | string | `"dedup-after-load"` | Processing mode |
| `fieldsToLoad` | array | `[]` | Only load specified fields to save memory |
| `preDedupTransformFunction` | string | `""` | JavaScript function to transform data before deduplication |
| `postDedupTransformFunction` | string | `""` | JavaScript function to transform data after deduplication |
| `customInputData` | string | `""` | Custom data object (JSON) passed to transform functions |
| `nullAsUnique` | boolean | `false` | Treat null/undefined values as unique |
| `parallelLoads` | integer | `10` | Number of parallel file loads (1-100) |
| `parallelPushes` | integer | `5` | Number of parallel data pushes (1-50, forced to 1 in streaming mode) |
| `batchSize` | integer | `5000` | Batch size for processing (100-50000) |
| `appendFileSource` | boolean | `false` | Add `__fileSource__` field to track file origin |
| `verboseLog` | boolean | `false` | Enable detailed logging |

### 💡 Usage Examples

#### Example 1: Direct Input (Simplest)

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"name\": \"iPhone\"}, {\"id\": 1, \"name\": \"iPhone\"}, {\"id\": 2, \"name\": \"iPad\"}]",
  "fields": ["id"]
}
```

**Result:** 2 unique items (iPhone, iPad)

#### Example 2: Network URL (Multiple Files)

```json
{
  "dataSourceType": "network-url",
  "inputUrls": [
    { "url": "https://example.com/batch1.json" },
    { "url": "https://example.com/batch2.json" }
  ],
  "fields": ["id"],
  "output": "unique-items"
}
```

#### Example 3: Multi-field Deduplication

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"name\": \"iPhone\", \"price\": 999}, {\"name\": \"iPhone\", \"price\": 999}, {\"name\": \"iPhone\", \"price\": 899}]",
  "fields": ["name", "price"]
}
```

**Deduplication Logic:**
```javascript
{ "name": "iPhone", "price": 999 }  // Unique
{ "name": "iPhone", "price": 999 }  // Duplicate ❌
{ "name": "iPhone", "price": 899 }  // Unique (different price)
```

#### Example 4: Data Transformation

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"price\": -10}, {\"id\": 2, \"price\": 100}]",
  "fields": ["id"],
  "preDedupTransformFunction": "async (items, customInputData) => {\n  return items.filter(item => item.price > 0);\n}",
  "postDedupTransformFunction": "async (items) => {\n  return items.map(item => ({...item, processedAt: Date.now()}));\n}",
  "customInputData": "{\"minPrice\": 0}"
}
```

**Result:** Only item with id=2 is kept (price > 0 filter)

#### Example 5: Large Dataset Processing (>100K records)

```json
{
  "dataSourceType": "network-url",
  "inputUrls": [{ "url": "https://example.com/large-dataset.jsonl" }],
  "inputFormat": "jsonl",
  "fields": ["id"],
  "mode": "dedup-as-loading",
  "batchSize": 10000,
  "fieldsToLoad": ["id", "name", "price"],
  "verboseLog": true
}
```

**Recommended Configuration:**
- Use `jsonl` format (better memory efficiency)
- Use `dedup-as-loading` mode (low memory)
- Use `fieldsToLoad` to load only necessary fields
- Increase `batchSize` to 10000-50000

#### Example 6: Find Duplicates

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"email\": \"a@test.com\"}, {\"email\": \"a@test.com\"}, {\"email\": \"b@test.com\"}]",
  "fields": ["email"],
  "output": "duplicate-items"
}
```

**Result:** 1 duplicate item (a@test.com)

#### Example 7: Cafe Dataset Source

```json
{
  "dataSourceType": "cafe-dataset",
  "datasetIds": ["dataset-id-1", "dataset-id-2"],
  "fields": ["id"]
}
```

### 📊 Performance Guide

| Dataset Size | Recommended Mode | Memory Usage | Speed |
|--------------|-----------------|--------------|-------|
| < 10K records | `dedup-after-load` | Low | Fast |
| 10K-100K records | `dedup-after-load` | Medium | Fast |
| 100K-1M records | `dedup-as-loading` | Low | Medium |
| > 1M records | `dedup-as-loading` | Low | Slow |

### 🔧 Optimization Tips

1. **Load Only Required Fields**: Use `fieldsToLoad` parameter
2. **Use JSONL Format**: More memory-efficient than JSON
3. **Adjust Batch Size**: Tune `batchSize` based on available memory
4. **Enable Parallel Loading**: Increase `parallelLoads` for faster processing
5. **File Format Auto-detection**: Worker automatically detects `.jsonl` files regardless of `inputFormat`

### 📁 Data Preparation

Before using this worker, you need to prepare your data files:

**JSON Format:**
```json
[
  {"id": 1, "name": "Item 1"},
  {"id": 2, "name": "Item 2"}
]
```

**JSONL Format:**
```
{"id": 1, "name": "Item 1"}
{"id": 2, "name": "Item 2"}
```

**Supported Data Sources:**
- Local files (file:///path/to/data.json)
- Network accessible files
- Cloud storage URLs

### 🐛 Troubleshooting

#### Problem 1: File Loading Failed

**Error:** `ENOENT: no such file or directory`

**Solution:**
- Check file path is correct
- Use absolute paths or `file:///` protocol
- Ensure file exists
- On Windows, use forward slashes or `file:///C:/path`

#### Problem 2: Out of Memory

**Error:** `JavaScript heap out of memory`

**Solution:**
- Switch to `dedup-as-loading` mode
- Reduce `batchSize`
- Use `fieldsToLoad` to load only necessary fields
- Use JSONL format instead of JSON

#### Problem 3: Deduplication Field Not Found

**Symptom:** All items appear as unique

**Solution:**
- Verify field names are correct
- Enable `verboseLog: true` to see details
- Confirm data contains the specified fields

### 📚 Technical Details

- **Native Set**: Uses JavaScript native `Set` for efficient deduplication (sufficient for most use cases)
- **Parallel Processing**: Custom `mapWithConcurrency` function for concurrent file loading
- **Auto Format Detection**: Automatically switches between JSON/JSONL based on file extension
- **Cross-platform**: Handles Windows/Unix path differences automatically
- **State Recovery**: Saves processing state every 15 seconds
- **Zero External Dependencies**: Only requires CafeScraper SDK (no additional npm packages needed)

### 📦 Dependencies

```json
{
  "@grpc/grpc-js": "^1.13.4",
  "google-protobuf": "^4.0.0"
}
```

**Note**: This worker uses native JavaScript features instead of external packages:
- `Set` (native) instead of `big-set` - sufficient for datasets up to millions of records
- `mapWithConcurrency` (custom) instead of `bluebird.map` - same functionality with zero dependencies

### 🧪 Testing

```bash
# Run basic test
npm test

# Run comprehensive tests (all 3 modes)
node test/comprehensive-test.js

# Check test output
cat outputs/results.json
cat outputs/logs.txt
```

### 📝 Changelog

#### v1.0.0 (2026-03-30)
- ✅ Initial release
- ✅ JSON/JSONL file support with auto-detection
- ✅ State persistence to file system
- ✅ Cross-platform path handling (Windows/Unix)
- ✅ Comprehensive test suite (8 scenarios)
- ✅ Optimized for CafeScraper cloud environment
- ✅ Enhanced error handling and logging

### 📄 License

MIT License

### 👤 Author

kael-odin

---

<a name="chinese"></a>

## 🇨🇳 中文

### 概述

Dedup Datasets Worker 是一个强大的数据集合并和去重工具，可以从多个 JSON/JSONL 文件加载数据并基于字段组合进行去重。针对 CafeScraper 平台进行了全面优化，增强了功能并改进了错误处理。

### ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 📦 **多文件合并** | 从多个 JSON/JSONL 文件加载并合并数据 |
| 🎯 **字段去重** | 基于单个或多个字段组合进行去重 |
| 🔄 **双处理模式** | `先加载后去重`（高内存，保持顺序）或 `边加载边去重`（低内存，流式处理） |
| 🔧 **自定义转换** | 去重前/后的 JavaScript 转换函数 |
| 🚀 **自动格式检测** | 根据文件扩展名自动检测 JSON/JSONL 格式 |
| 🌐 **跨平台路径** | 支持 Windows/Unix 文件路径和 `file:///` 协议 |
| 💾 **状态持久化** | 自动保存处理状态，支持中断恢复 |
| 📊 **大数据支持** | 使用 BigSet 支持 1000万+ 条记录 |
| 🔍 **重复项检测** | 单独查找并输出重复项 |

### 🚀 快速开始

```bash
# 安装依赖
npm install

# 运行本地测试
npm test

# 运行综合测试（所有模式）
node test/comprehensive-test.js

# 作为 CafeScraper Worker 运行
npm start
```

### 📋 输入参数

#### 必填参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `fields` | array | 用于去重的字段列表（例如 `["id"]` 或 `["name", "price"]`） |

#### 数据来源参数（三选一）

| 参数 | 类型 | 说明 |
|------|------|------|
| `dataSourceType` | string | 数据来源类型：`"direct-input"`、`"network-url"` 或 `"cafe-dataset"` |
| `inputData` | string | JSON 数组数据（当 `dataSourceType="direct-input"` 时） |
| `inputUrls` | array | 数据文件 URL 列表（当 `dataSourceType="network-url"` 时） |
| `datasetIds` | array | Cafe Dataset ID 列表（当 `dataSourceType="cafe-dataset"` 时） |

#### 可选参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `inputFormat` | string | `"json"` | 文件格式: `json` 或 `jsonl`（根据扩展名自动检测） |
| `output` | string | `"unique-items"` | 输出类型: `unique-items`、`duplicate-items` 或 `nothing` |
| `mode` | string | `"dedup-after-load"` | 处理模式 |
| `fieldsToLoad` | array | `[]` | 仅加载指定字段以节省内存 |
| `preDedupTransformFunction` | string | `""` | 去重前的数据转换函数 |
| `postDedupTransformFunction` | string | `""` | 去重后的数据转换函数 |
| `customInputData` | string | `""` | 传递给转换函数的自定义数据对象（JSON格式） |
| `nullAsUnique` | boolean | `false` | 将 null/undefined 值视为唯一值 |
| `parallelLoads` | integer | `10` | 并行加载文件数 (1-100) |
| `parallelPushes` | integer | `5` | 并行推送数据数 (1-50, 流式模式下固定为 1) |
| `batchSize` | integer | `5000` | 批处理大小 (100-50000) |
| `appendFileSource` | boolean | `false` | 添加 `__fileSource__` 字段记录文件来源 |
| `verboseLog` | boolean | `false` | 启用详细日志 |

### 💡 使用示例

#### 示例 1: 直接输入（最简单）

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"name\": \"iPhone\"}, {\"id\": 1, \"name\": \"iPhone\"}, {\"id\": 2, \"name\": \"iPad\"}]",
  "fields": ["id"]
}
```

**结果：** 2个唯一项（iPhone, iPad）

#### 示例 2: 网络 URL（多文件）

```json
{
  "dataSourceType": "network-url",
  "inputUrls": [
    { "url": "https://example.com/batch1.json" },
    { "url": "https://example.com/batch2.json" }
  ],
  "fields": ["id"],
  "output": "unique-items"
}
```

#### 示例 3: 多字段组合去重

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"name\": \"iPhone\", \"price\": 999}, {\"name\": \"iPhone\", \"price\": 999}, {\"name\": \"iPhone\", \"price\": 899}]",
  "fields": ["name", "price"]
}
```

**去重逻辑:**
```javascript
{ "name": "iPhone", "price": 999 }  // 唯一
{ "name": "iPhone", "price": 999 }  // 重复 ❌
{ "name": "iPhone", "price": 899 }  // 唯一（价格不同）
```

#### 示例 4: 数据转换

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"id\": 1, \"price\": -10}, {\"id\": 2, \"price\": 100}]",
  "fields": ["id"],
  "preDedupTransformFunction": "async (items, customInputData) => {\n  return items.filter(item => item.price > 0);\n}",
  "postDedupTransformFunction": "async (items) => {\n  return items.map(item => ({...item, processedAt: Date.now()}));\n}",
  "customInputData": "{\"minPrice\": 0}"
}
```

**结果：** 仅保留 id=2 的数据（price > 0 过滤）

#### 示例 5: 大数据集处理 (>10万条)

```json
{
  "dataSourceType": "network-url",
  "inputUrls": [{ "url": "https://example.com/large-dataset.jsonl" }],
  "inputFormat": "jsonl",
  "fields": ["id"],
  "mode": "dedup-as-loading",
  "batchSize": 10000,
  "fieldsToLoad": ["id", "name", "price"],
  "verboseLog": true
}
```

**推荐配置:**
- 使用 `jsonl` 格式（内存效率更高）
- 使用 `边加载边去重` 模式（低内存）
- 使用 `fieldsToLoad` 仅加载必要字段
- 将 `batchSize` 增大到 10000-50000

#### 示例 6: 查找重复项

```json
{
  "dataSourceType": "direct-input",
  "inputData": "[{\"email\": \"a@test.com\"}, {\"email\": \"a@test.com\"}, {\"email\": \"b@test.com\"}]",
  "fields": ["email"],
  "output": "duplicate-items"
}
```

**结果：** 1个重复项（a@test.com）

#### 示例 7: Cafe Dataset 数据源

```json
{
  "dataSourceType": "cafe-dataset",
  "datasetIds": ["dataset-id-1", "dataset-id-2"],
  "fields": ["id"]
}
```

### 📊 性能指南

| 数据量 | 推荐模式 | 内存占用 | 速度 |
|--------|---------|----------|------|
| < 1万条 | `先加载后去重` | 低 | 快 |
| 1万-10万条 | `先加载后去重` | 中 | 快 |
| 10万-100万条 | `边加载边去重` | 低 | 中 |
| > 100万条 | `边加载边去重` | 低 | 慢 |

### 🔧 优化技巧

1. **仅加载必要字段**: 使用 `fieldsToLoad` 参数
2. **使用 JSONL 格式**: 比 JSON 更省内存
3. **调整批次大小**: 根据内存情况调整 `batchSize`
4. **开启并行加载**: 增加 `parallelLoads` 加快处理
5. **文件格式自动检测**: Worker 会根据 `.jsonl` 扩展名自动识别格式，不受 `inputFormat` 参数限制

### 📁 数据准备

使用本 worker 前，需要准备数据文件：

**JSON 格式：**
```json
[
  {"id": 1, "name": "项目 1"},
  {"id": 2, "name": "项目 2"}
]
```

**JSONL 格式：**
```
{"id": 1, "name": "项目 1"}
{"id": 2, "name": "项目 2"}
```

**支持的数据源：**
- 本地文件 (file:///path/to/data.json)
- 网络可访问文件
- 云存储 URL

### 🐛 故障排查

#### 问题 1: 文件加载失败

**错误:** `ENOENT: no such file or directory`

**解决方案:**
- 检查文件路径是否正确
- 使用绝对路径或 `file:///` 协议
- 确保文件存在
- Windows 系统使用正斜杠或 `file:///C:/path`

#### 问题 2: 内存不足

**错误:** `JavaScript heap out of memory`

**解决方案:**
- 切换到 `边加载边去重` 模式
- 减小 `batchSize`
- 使用 `fieldsToLoad` 仅加载必要字段
- 使用 JSONL 格式而非 JSON

#### 问题 3: 去重字段不存在

**现象:** 所有项都被判定为唯一

**解决方案:**
- 检查字段名是否正确
- 启用 `verboseLog: true` 查看详细信息
- 确认数据中包含该字段

### 📚 技术细节

- **原生 Set**: 使用 JavaScript 原生 `Set` 进行高效去重（适用于绝大多数场景）
- **并行处理**: 自定义 `mapWithConcurrency` 函数实现并发文件加载
- **自动格式检测**: 根据文件扩展名自动切换 JSON/JSONL 格式
- **跨平台支持**: 自动处理 Windows/Unix 路径差异
- **状态恢复**: 每 15 秒自动保存处理状态
- **零外部依赖**: 仅依赖 CafeScraper SDK（无需额外 npm 包）

### 📦 依赖项

```json
{
  "@grpc/grpc-js": "^1.13.4",
  "google-protobuf": "^4.0.0"
}
```

**注意**: 本 Worker 使用原生 JavaScript 特性代替外部包：
- `Set`（原生）代替 `big-set` - 足以处理百万级数据集
- `mapWithConcurrency`（自定义）代替 `bluebird.map` - 相同功能，零依赖

### 🧪 测试

```bash
# 运行基础测试
npm test

# 运行综合测试（3个场景）
node test/comprehensive-test.js

# 查看测试输出
cat outputs/results.json
cat outputs/logs.txt
```

### 📝 更新日志

#### v1.0.0 (2026-03-30)
- ✅ 首次发布
- ✅ JSON/JSONL 文件支持及自动检测
- ✅ 文件系统状态持久化
- ✅ 跨平台路径处理 (Windows/Unix)
- ✅ 综合测试套件（8个场景）
- ✅ 针对 CafeScraper 云环境优化
- ✅ 增强错误处理和日志记录

### 📄 许可证

MIT License

### 👤 作者

kael-odin

---

**Need Help?** Check [Troubleshooting](#🐛-故障排查) or submit an Issue

**需要帮助?** 查看 [故障排查](#🐛-故障排查) 或提交 Issue
