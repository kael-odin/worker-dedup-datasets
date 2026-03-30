# 🚀 快速修复指南 - 解决构建失败

## ⚡ 快速修复步骤

### 步骤 1: 一键切换到最小化版本

**Windows PowerShell**:
```powershell
cd d:/kael_odin/kael_study/worker-dedup-datasets
.\switch-to-minimal.ps1
```

**手动操作**:
```bash
# 备份
cp package.json package-full.json.bak
cp src/utils.js src/utils-full.js.bak

# 替换
cp package-minimal.json package.json
cp src/utils-minimal.js src/utils.js
cp src/dedup-after-load-minimal.js src/dedup-after-load.js
cp src/dedup-as-loading-minimal.js src/dedup-as-loading.js

# 清理
rm -rf node_modules package-lock.json
```

---

### 步骤 2: 推送到GitHub

```bash
git add -A
git commit -m "fix: 使用最小化版本移除有问题的依赖"
git push origin main
```

---

### 步骤 3: 在Cafe平台重新部署

1. 登录 Cafe 平台
2. **删除旧的 Worker**
3. 从 GitHub 重新导入
4. 等待构建
5. 测试运行

---

## 🎯 最小化版本的变更

### 移除的依赖

| 依赖包 | 原用途 | 替代方案 |
|--------|--------|----------|
| big-set | 支持大数据集去重 | 原生 Set（限制100万条） |
| bluebird | Promise 并发控制 | mapWithConcurrency |

### 保留的依赖

```json
{
  "dependencies": {
    "@grpc/grpc-js": "^1.13.4",
    "google-protobuf": "^4.0.0"
  }
}
```

---

## ⚠️ 最小化版本的限制

### 数据集大小限制

- **最大支持**: ~100万条记录
- **原因**: 使用原生 Set，受 Node.js 内存限制
- **建议**: 大数据集请分批处理

### 性能影响

- **并发控制**: 手动实现，性能略低于 bluebird
- **内存占用**: 使用原生 Set，大数据集可能内存不足

---

## ✅ 预期结果

### 成功标志

1. ✅ Cafe 平台构建成功
2. ✅ Worker 可以运行
3. ✅ 基本功能正常

### 测试用例

使用最简单的测试：

```json
{
  "dataSourceType": "direct-input",
  "inputData": [
    { "id": 1, "name": "Product A" },
    { "id": 2, "name": "Product B" },
    { "id": 1, "name": "Product A" }
  ],
  "fields": ["id"]
}
```

**预期输出**: 2条唯一数据

---

## 🔄 如果仍然失败

### 方案 B: 重构文件结构

将所有文件移到根目录（与其他成功的 Worker 一致）

**步骤**:
```bash
# 移动文件
mv src/main.js main.js
mv src/utils.js utils.js
mv src/consts.js consts.js
mv src/dedup-after-load.js dedup-after-load.js
mv src/dedup-as-loading.js dedup-as-loading.js

# 更新 package.json
# "main": "src/main.js" → "main": "main.js"

# 提交
git add -A
git commit -m "refactor: move files to root directory"
git push origin main
```

---

## 📊 对比成功的 Worker

| 特征 | worker-rag-web-browser | worker-cheerio-scraper | worker-dedup-datasets (原) | worker-dedup-datasets (新) |
|------|------------------------|------------------------|---------------------------|---------------------------|
| 文件结构 | 根目录 | 根目录 | src/ 子目录 | src/ 子目录 |
| big-set | ❌ | ❌ | ✅ | ❌ |
| bluebird | ❌ | ❌ | ✅ | ❌ |
| 依赖数量 | 8个 | 4个 | 4个 | **2个** |

**结论**: 最小化版本应该能成功构建

---

## 🎊 总结

### 核心修复

- **移除**: big-set 和 bluebird
- **简化**: 只保留必要的 gRPC 和 protobuf 依赖
- **限制**: 数据集大小限制在100万条

### 为什么这个方案应该成功？

1. ✅ 只使用 Cafe 平台支持的依赖
2. ✅ 与其他成功的 Worker 保持一致
3. ✅ 最小化依赖数量（只有2个）
4. ✅ 避免使用可能有兼容性问题的第三方包

---

## 📞 后续步骤

1. ✅ 执行一键切换脚本
2. ⏳ 推送到 GitHub
3. ⏳ 在 Cafe 平台重新部署
4. ⏳ 测试基本功能
5. ⏳ 如果成功，可以逐步添加功能

---

**立即执行**: `.\switch-to-minimal.ps1`
