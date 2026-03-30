# Cafe 云平台数据导入指南 | Cafe Cloud Platform Data Import Guide

## 🎯 问题解决

你提出了一个非常关键的问题：**Cafe 云平台无法访问本地电脑文件！**

我已经修改了配置，现在支持**三种数据导入方式**：

---

## 📋 三种数据导入方式

### 方式 1: 直接输入数据（推荐新手）⭐

**适用场景**: 数据量较小（<1万条），可以直接复制粘贴

**优点**:
- ✅ 最简单，无需额外配置
- ✅ 即时预览，所见即所得
- ✅ 无需网络传输

**缺点**:
- ❌ 不适合大数据集
- ❌ 无法处理敏感数据

**如何使用**:

1. 在 Cafe 控制台选择 "数据来源类型" → "直接输入数据 / Direct Input"
2. 在 "直接输入数据 / Direct Input Data" 字段粘贴你的 JSON 数组

**示例**:
```json
[
  { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },
  { "id": 2, "name": "Product B", "price": 200, "category": "Books" },
  { "id": 3, "name": "Product C", "price": 150, "category": "Electronics" },
  { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },
  { "id": 4, "name": "Product D", "price": 300, "category": "Clothing" },
  { "id": 2, "name": "Product B", "price": 200, "category": "Books" }
]
```

**完整配置示例**:
```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },
    { "id": 2, "name": "Product B", "price": 200, "category": "Books" },
    { "id": 3, "name": "Product C", "price": 150, "category": "Electronics" },
    { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },
    { "id": 4, "name": "Product D", "price": 300, "category": "Clothing" },
    { "id": 2, "name": "Product B", "price": 200, "category": "Books" }
  ],
  "fields": ["id"]
}
```

---

### 方式 2: 网络 URL（推荐中等数据）

**适用场景**: 数据存储在云存储或可公开访问的服务器

**优点**:
- ✅ 支持大数据集
- ✅ 支持多个数据源
- ✅ 可重复使用相同 URL

**缺点**:
- ❌ 需要 URL 可公开访问
- ❌ 需要网络传输

**如何使用**:

1. 将数据文件上传到云存储（如 AWS S3、阿里云 OSS、GitHub 等）
2. 获取可访问的 URL
3. 在 Cafe 控制台选择 "数据来源类型" → "网络URL / Network URL"
4. 在 "网络数据URL列表 / Network Data URLs" 字段添加 URL

**示例 URL**:
```
https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data1.json
https://your-bucket.s3.amazonaws.com/data/sales.jsonl
https://cdn.yourdomain.com/data/products.json
```

**完整配置示例**:
```json
{
  "dataSourceType": "network-url",
  "inputUrls": [
    { "url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data1.json" },
    { "url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data2.json" },
    { "url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data3.jsonl" }
  ],
  "fields": ["id"]
}
```

**推荐的数据托管平台**:

| 平台 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **GitHub** | 免费、稳定、支持版本控制 | 单文件<100MB | ⭐⭐⭐⭐⭐ |
| **AWS S3** | 高速、稳定、支持大文件 | 需要付费 | ⭐⭐⭐⭐ |
| **阿里云 OSS** | 国内速度快 | 需要付费 | ⭐⭐⭐⭐ |
| **Google Drive** | 免费、易用 | 需要生成公开链接 | ⭐⭐⭐ |
| **腾讯云 COS** | 国内速度快 | 需要付费 | ⭐⭐⭐⭐ |

**如何获取公开 URL**:

#### GitHub（推荐）
1. 创建 GitHub 仓库
2. 上传数据文件到仓库
3. 点击文件 → Raw 按钮
4. 复制 Raw URL（类似 `https://raw.githubusercontent.com/...`）

#### AWS S3
1. 上传文件到 S3 Bucket
2. 设置 Bucket 策略或文件权限为公开
3. 获取文件 URL（`https://bucket-name.s3.amazonaws.com/path/to/file.json`）

#### 阿里云 OSS
1. 上传文件到 OSS Bucket
2. 设置读写权限为公开读
3. 获取文件 URL（`https://bucket-name.oss-cn-hangzhou.aliyuncs.com/path/to/file.json`）

---

### 方式 3: Cafe Dataset ID（推荐大数据）

**适用场景**: 数据已经在 Cafe 平台的其他 Worker 中生成

**优点**:
- ✅ 无需网络传输
- ✅ 支持大数据集
- ✅ 数据安全

**缺点**:
- ❌ 需要先用其他 Worker 生成 Dataset

**如何使用**:

1. 先运行其他 Worker（如 Web Scraper、Cheerio Scraper 等）生成 Dataset
2. 在 Dataset 页面复制 Dataset ID
3. 在 Cafe 控制台选择 "数据来源类型" → "Cafe Dataset ID"
4. 在 "Cafe Dataset ID 列表 / Cafe Dataset IDs" 字段粘贴 ID

**完整配置示例**:
```json
{
  "dataSourceType": "cafe-dataset",
  "datasetIds": ["dataset_abc123", "dataset_def456"],
  "fields": ["id"]
}
```

**典型工作流程**:

```
步骤1: 运行 Cheerio Scraper
   ↓
生成 Dataset (ID: dataset_abc123)
   ↓
步骤2: 运行 Dedup Datasets Worker
   输入: dataset_abc123
   ↓
输出: 去重后的 Dataset
```

---

## 🚀 立即可用的测试示例

### 示例 1: 直接输入数据（最简单）

**复制以下内容到 Cafe 控制台**:

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },
    { "id": 2, "name": "Product B", "price": 200, "category": "Books" },
    { "id": 3, "name": "Product C", "price": 150, "category": "Electronics" },
    { "id": 1, "name": "Product A", "price": 100, "category": "Electronics" },
    { "id": 4, "name": "Product D", "price": 300, "category": "Clothing" },
    { "id": 2, "name": "Product B", "price": 200, "category": "Books" },
    { "id": 5, "name": "Product E", "price": 250, "category": "Electronics" },
    { "id": 3, "name": "Product C", "price": 150, "category": "Electronics" }
  ],
  "fields": ["id"]
}
```

**预期结果**:
- 总输入: 8条
- 去重字段: id
- 唯一项: 5条
- 重复项: 3条

---

### 示例 2: 使用网络 URL（我的测试数据）

**复制以下内容到 Cafe 控制台**:

```json
{
  "dataSourceType": "network-url",
  "inputUrls": [
    { "url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data1.json" },
    { "url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data2.json" },
    { "url": "https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data3.jsonl" }
  ],
  "fields": ["id"]
}
```

**说明**:
- 这是我为你准备的真实测试数据，托管在 GitHub 上
- 可以直接使用，无需修改
- 包含 14条数据，去重后 10条

---

### 示例 3: 数据过滤 + 去重

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    { "id": 1, "name": "Product A", "price": 100 },
    { "id": 2, "name": "Product B", "price": 200 },
    { "id": 3, "name": "Product C", "price": 50 },
    { "id": 4, "name": "Product D", "price": 300 },
    { "id": 5, "name": "Product E", "price": 80 }
  ],
  "fields": ["id"],
  "preDedupTransformFunction": "async (items) => {\n  return items.filter(item => item.price >= 100);\n}"
}
```

**说明**: 只保留价格 >= 100 的商品

---

### 示例 4: 查看重复数据

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    { "id": 1, "name": "Product A", "price": 100 },
    { "id": 2, "name": "Product B", "price": 200 },
    { "id": 1, "name": "Product A", "price": 100 },
    { "id": 3, "name": "Product C", "price": 150 },
    { "id": 2, "name": "Product B", "price": 200 }
  ],
  "fields": ["id"],
  "output": "duplicate-items"
}
```

**说明**: 输出被判定为重复的数据（id: 1 和 id: 2）

---

## 💡 最佳实践建议

### 数据量 < 1万条
- ✅ 使用 **直接输入数据**
- ✅ 或使用 **网络 URL**（如果数据已在云存储）

### 数据量 1-10万条
- ✅ 使用 **网络 URL**（推荐 GitHub）
- ✅ 或使用 **Cafe Dataset**（如果数据来自其他 Worker）

### 数据量 > 10万条
- ✅ 使用 **Cafe Dataset**（最稳定）
- ✅ 或使用 **网络 URL**（AWS S3/阿里云 OSS）

### 敏感数据
- ✅ 使用 **Cafe Dataset**（数据不离开平台）
- ❌ 避免使用 **网络 URL**（数据可能被公开）

---

## 📊 各方式对比表

| 方式 | 数据量 | 速度 | 安全性 | 易用性 | 推荐度 |
|------|--------|------|--------|--------|--------|
| 直接输入 | <1万条 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 网络URL | 任意 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cafe Dataset | 任意 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 推荐工作流程

### 场景 1: 手头有数据文件
```
1. 打开数据文件
2. 复制数据内容
3. 选择"直接输入数据"
4. 粘贴到输入框
5. 运行
```

### 场景 2: 数据在本地，但较大
```
1. 上传数据到 GitHub
2. 获取 Raw URL
3. 选择"网络URL"
4. 粘贴 URL
5. 运行
```

### 场景 3: 数据来自其他 Worker
```
1. 运行数据抓取 Worker（如 Cheerio Scraper）
2. 复制 Dataset ID
3. 选择"Cafe Dataset ID"
4. 粘贴 Dataset ID
5. 运行
```

---

## ⚠️ 常见问题

### Q1: 我的数据在本地，怎么上传到云平台？

**A**: 有几种方法：

1. **GitHub（推荐）**:
   - 创建 GitHub 仓库
   - 上传文件
   - 获取 Raw URL

2. **云存储服务**:
   - AWS S3 / 阿里云 OSS / 腾讯云 COS
   - 上传文件
   - 设置公开权限
   - 获取 URL

3. **直接粘贴（小数据）**:
   - 打开文件
   - 复制内容
   - 粘贴到 "直接输入数据" 字段

### Q2: 网络URL 无法访问怎么办？

**A**: 检查以下几点：
- ✅ URL 是否正确（支持 HTTP/HTTPS）
- ✅ 文件是否可公开访问（不需要登录）
- ✅ 文件格式是否正确（JSON 或 JSONL）
- ✅ 服务器是否支持 CORS

### Q3: 如何判断数据量？

**A**: 
- < 100KB → 直接输入
- 100KB - 10MB → 网络 URL
- > 10MB → Cafe Dataset

### Q4: Cafe Dataset ID 在哪里？

**A**: 
1. 运行其他 Worker（如 Web Scraper）
2. 在结果页面找到 Dataset
3. 复制 Dataset ID（类似 `dataset_abc123`）

---

## 🚀 立即开始

**最快方法**: 复制"示例 1"或"示例 2"，直接粘贴到 Cafe 控制台运行！

预计耗时: < 5秒

---

生成时间: 2026-03-30
