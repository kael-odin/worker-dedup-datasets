# Dedup Datasets Worker 改造方案

## 一、原始 Actor 分析

### 1.1 核心功能
- **数据集合并**: 从多个 Apify Dataset 加载数据并合并
- **数据去重**: 基于指定字段组合进行去重
- **数据转换**: 支持去重前后的自定义 JavaScript 转换函数
- **两种模式**:
  - `dedup-after-load`: 先加载所有数据再去重(高内存,保持顺序)
  - `dedup-as-loading`: 边加载边去重(低内存,不保持顺序)

### 1.2 技术特点
- 使用 Apify SDK 2.1+
- 支持并行加载(最多100个并行请求)
- 支持并行推送(最多50个并行推送)
- 迁移状态持久化(KeyValueStore)
- 支持大数据集(10M+ 条记录)
- 支持嵌套对象/数组的深度比较

### 1.3 主要依赖
```json
{
  "apify": "^2.1",
  "big-map-simple": "^2.0.0",
  "big-set": "^1.0.2",
  "bluebird": "^3.7.2",
  "fast-diff": "^1.3.0"
}
```

---

## 二、平台差异对比

### 2.1 核心差异

| 功能 | Apify | CafeScraper | 影响 |
|------|-------|-------------|------|
| **Dataset API** | ✅ `Apify.openDataset()` | ❌ 无 | 🔴 致命 |
| **KeyValueStore** | ✅ `Apify.setValue/getValue` | ❌ 无 | 🔴 致命 |
| **数据输出** | `Actor.pushData()` | `cafesdk.result.pushData()` | ⚠️ 需适配 |
| **输入获取** | `Apify.getInput()` | `cafesdk.parameter.getInputJSONObject()` | ⚠️ 需适配 |
| **日志系统** | `Apify.utils.log` | `cafesdk.log.*` | ⚠️ 需适配 |
| **迁移事件** | `Apify.events.on('migrating')` | ❌ 无 | 🔴 功能受限 |
| **状态持久化** | KeyValueStore | 文件系统 | 🔴 需重写 |

### 2.2 无法直接迁移的功能

#### ❌ Dataset API 依赖
**原始代码**:
```javascript
const outputDataset = await Apify.openDataset(outputDatasetId);
await outputDataset.pushData(items);
```

**问题**: Cafe 没有 Dataset API,只有 Result 输出

**解决方案**: 
- 方案A: 直接用 `cafesdk.result.pushData()` 替代
- 方案B: 输出到文件系统,用户手动处理

#### ❌ KeyValueStore 状态持久化
**原始代码**:
```javascript
await Apify.setValue('PUSHED', pushState);
await Apify.setValue('PERSISTED-OBJECT', persistedSharedObject);
```

**问题**: Cafe 没有 KeyValueStore

**解决方案**:
- 方案A: 使用文件系统持久化(`/tmp/` 或工作目录)
- 方案B: 简化逻辑,不实现迁移恢复

#### ❌ 跨 Dataset 数据加载
**原始代码**:
```javascript
const items = await Apify.newClient().dataset(datasetId).listItems({ offset, limit, fields });
```

**问题**: 无法从其他 Dataset 加载数据

**解决方案**:
- **功能变更**: 改为从 JSON 文件或 JSONL 文件加载数据
- 用户需要先从 Apify/Cafe 导出数据到文件

---

## 三、改造策略

### 3.1 核心功能保留

✅ **可保留功能**:
- 数据去重逻辑(基于字段组合)
- 数据转换函数
- 两种去重模式
- 并行处理逻辑
- BigSet/BigMap 大数据集支持

⚠️ **需要适配的功能**:
- 数据输入方式(从 Dataset → 从文件)
- 数据输出方式(Dataset API → Result API)
- 状态持久化(KeyValueStore → 文件系统)

❌ **无法实现的功能**:
- 直接从 Apify Dataset 加载数据
- 迁移状态自动恢复
- 输出到指定的 Dataset

### 3.2 架构改造

#### 原始架构
```
输入: Apify Dataset IDs
  ↓
加载: Apify.newClient().dataset().listItems()
  ↓
去重: BigSet + 字段组合
  ↓
转换: 用户自定义函数
  ↓
输出: Dataset.pushData()
持久化: KeyValueStore.setValue()
```

#### 改造后架构
```
输入: JSON/JSONL 文件路径列表
  ↓
加载: fs.readFile() + JSON.parse()
  ↓
去重: BigSet + 字段组合(保持不变)
  ↓
转换: 用户自定义函数(保持不变)
  ↓
输出: cafesdk.result.pushData()
持久化: fs.writeFileSync('/tmp/')
```

---

## 四、详细改造方案

### 4.1 input_schema.json 转换

**原始字段**:
- `datasetIds` (stringList) - Dataset ID 列表
- `outputDatasetId` - 输出 Dataset ID
- `actorOrTaskId` - 从 Actor/Task 运行记录加载数据

**改造后字段**:
- `inputFiles` (requestList) - 输入文件列表(JSON/JSONL)
- 移除 `outputDatasetId`
- 移除 `actorOrTaskId` 相关字段

**新增字段**:
- `inputFormat` (select) - 输入格式(json/jsonl)
- `outputFormat` (select) - 输出格式(table/json)

### 4.2 数据加载改造

**原始代码** (`loader.js`):
```javascript
const items = await Apify.newClient().dataset(datasetId).listItems({
    offset, limit, fields
}).then(res => res.items);
```

**改造后**:
```javascript
const fs = require('fs').promises;
const path = require('path');

async function loadFromFile(filePath, format = 'json') {
    const content = await fs.readFile(filePath, 'utf-8');
    
    if (format === 'json') {
        return JSON.parse(content);
    } else if (format === 'jsonl') {
        return content.trim().split('\n').map(line => JSON.parse(line));
    }
}
```

### 4.3 数据输出改造

**原始代码** (`utils.js`):
```javascript
await outputDataset.pushData(itemsToPush);
```

**改造后**:
```javascript
for (const item of itemsToPush) {
    await cafesdk.result.pushData(item);
}
```

### 4.4 状态持久化改造

**原始代码**:
```javascript
await Apify.setValue('PUSHED', pushState);
await Apify.setValue('PERSISTED-OBJECT', persistedSharedObject);
```

**改造后**:
```javascript
const STATE_DIR = '/tmp/dedup-worker-state';

async function saveState(key, data) {
    await fs.writeFile(
        path.join(STATE_DIR, `${key}.json`),
        JSON.stringify(data)
    );
}

async function loadState(key) {
    const filePath = path.join(STATE_DIR, `${key}.json`);
    if (fs.existsSync(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    return null;
}
```

### 4.5 迁移事件处理

**原始代码**:
```javascript
Apify.events.on('migrating', async () => {
    migrationState.isMigrating = true;
    await saveState('PUSHED', pushState);
});
```

**改造后**:
```javascript
// Cafe 平台无迁移事件,简化处理
// 定期自动保存状态
setInterval(async () => {
    await saveState('PUSHED', pushState);
}, 15000); // 每15秒保存一次
```

---

## 五、功能限制说明

### 5.1 输入限制
- ⚠️ 无法直接从 Apify Dataset 加载数据
- ✅ 支持从 JSON/JSONL 文件加载
- ⚠️ 用户需要先从 Apify/Cafe 导出数据

### 5.2 输出限制
- ⚠️ 无法输出到指定的 Dataset
- ✅ 输出到默认 Result
- ✅ 支持 JSON/CSV 导出(Cafe Console UI)

### 5.3 状态管理限制
- ⚠️ 无迁移自动恢复功能
- ✅ 支持状态持久化到文件系统
- ⚠️ Worker 重启后需要手动处理

### 5.4 性能影响
- ✅ 去重性能不受影响(BigSet/BigMap)
- ⚠️ 文件加载可能比 API 慢(取决于文件大小)
- ✅ 并行处理逻辑仍然有效

---

## 六、实施步骤

### Step 1: 创建基础结构
- [x] 创建 worker 目录
- [ ] 创建 input_schema.json
- [ ] 创建 package.json

### Step 2: 改造核心逻辑
- [ ] 改造 main.js(SDK 替换)
- [ ] 改造 loader.js(文件加载)
- [ ] 改造 utils.js(Result 输出)
- [ ] 改造 dedup-*.js(状态持久化)

### Step 3: 功能测试
- [ ] 本地模拟器测试
- [ ] 小数据集测试(100条)
- [ ] 中等数据集测试(1万条)
- [ ] 大数据集测试(10万条)

### Step 4: 文档编写
- [ ] README.md
- [ ] 使用示例
- [ ] 限制说明

---

## 七、风险评估

### 7.1 高风险项
| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 无法从 Dataset 加载数据 | 🔴 功能受限 | 提供数据导出指南 |
| 无迁移恢复 | 🟡 数据可能丢失 | 定期保存状态 |
| 大文件加载性能 | 🟡 执行时间长 | 优化加载逻辑 |

### 7.2 中风险项
| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 依赖包兼容性 | 🟡 可能报错 | 本地测试验证 |
| 内存限制 | 🟡 大数据集可能崩溃 | 推荐使用 dedup-as-loading 模式 |

---

## 八、后续优化方向

### 8.1 短期优化
- [ ] 支持压缩文件输入(.gz)
- [ ] 优化大文件加载性能(流式处理)
- [ ] 添加进度日志

### 8.2 长期优化
- [ ] 支持从 Cafe Storage API 加载(如果平台支持)
- [ ] 支持分布式处理(多个 Worker)
- [ ] 支持增量去重

---

## 九、结论

**可改造性**: ✅ 可行(需功能调整)

**核心保留**:
- ✅ 去重逻辑(100%保留)
- ✅ 转换函数(100%保留)
- ✅ 两种模式(100%保留)

**功能变更**:
- ⚠️ 输入方式: Dataset API → 文件系统
- ⚠️ 输出方式: Dataset API → Result API
- ⚠️ 状态持久化: KeyValueStore → 文件系统

**建议**:
1. ✅ 开始改造,明确告知用户功能差异
2. 📝 提供详细的数据导出指南
3. 🧪 重点测试大文件加载性能
