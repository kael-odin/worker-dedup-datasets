# 一键切换到最小化版本（移除big-set和bluebird依赖）

Write-Host "=== 开始切换到最小化版本 ===" -ForegroundColor Green

# 1. 备份原文件
Write-Host "`n[1/6] 备份原文件..." -ForegroundColor Yellow
Copy-Item -Path "package.json" -Destination "package-full.json.bak" -Force
Copy-Item -Path "src/utils.js" -Destination "src/utils-full.js.bak" -Force
Copy-Item -Path "src/dedup-after-load.js" -Destination "src/dedup-after-load-full.js.bak" -Force
Copy-Item -Path "src/dedup-as-loading.js" -Destination "src/dedup-as-loading-full.js.bak" -Force
Write-Host "✓ 备份完成" -ForegroundColor Green

# 2. 替换为最小化版本
Write-Host "`n[2/6] 替换为最小化版本..." -ForegroundColor Yellow
Copy-Item -Path "package-minimal.json" -Destination "package.json" -Force
Copy-Item -Path "src/utils-minimal.js" -Destination "src/utils.js" -Force
Copy-Item -Path "src/dedup-after-load-minimal.js" -Destination "src/dedup-after-load.js" -Force
Copy-Item -Path "src/dedup-as-loading-minimal.js" -Destination "src/dedup-as-loading.js" -Force
Write-Host "✓ 替换完成" -ForegroundColor Green

# 3. 删除node_modules和package-lock.json
Write-Host "`n[3/6] 清理旧的依赖..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force
    Write-Host "✓ 删除 node_modules" -ForegroundColor Green
}
if (Test-Path "package-lock.json") {
    Remove-Item -Path "package-lock.json" -Force
    Write-Host "✓ 删除 package-lock.json" -ForegroundColor Green
}

# 4. 验证语法
Write-Host "`n[4/6] 验证语法..." -ForegroundColor Yellow
$files = @("src/main.js", "src/utils.js", "src/dedup-after-load.js", "src/dedup-as-loading.js", "src/consts.js")
$allPassed = $true
foreach ($file in $files) {
    $result = node --check $file 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $file" -ForegroundColor Green
    } else {
        Write-Host "✗ $file - 语法错误" -ForegroundColor Red
        $allPassed = $false
    }
}

if (-not $allPassed) {
    Write-Host "`n❌ 语法检查失败，请修复错误后重试" -ForegroundColor Red
    exit 1
}

# 5. Git操作
Write-Host "`n[5/6] Git提交..." -ForegroundColor Yellow
git add -A
git commit -m "fix: 切换到最小化版本 - 移除big-set和bluebird依赖

变更:
- 移除 big-set 依赖（使用原生Set）
- 移除 bluebird 依赖（使用mapWithConcurrency）
- 更新 package.json 只包含必要依赖
- 所有文件使用最小化版本

限制:
- 数据集大小限制在100万条以内
- 使用原生Set可能影响大数据集性能

目的:
- 解决Cafe平台构建失败问题
- 确保依赖兼容性"

Write-Host "✓ Git提交完成" -ForegroundColor Green

# 6. 提示推送到GitHub
Write-Host "`n[6/6] 准备推送到GitHub..." -ForegroundColor Yellow
Write-Host "请执行以下命令推送:" -ForegroundColor Cyan
Write-Host "  git push origin main" -ForegroundColor White
Write-Host "`n推送后，在Cafe平台重新部署Worker" -ForegroundColor Cyan

Write-Host "`n=== 切换完成 ===" -ForegroundColor Green
Write-Host "备份文件位置:" -ForegroundColor Yellow
Write-Host "  - package-full.json.bak" -ForegroundColor White
Write-Host "  - src/utils-full.js.bak" -ForegroundColor White
Write-Host "  - src/dedup-after-load-full.js.bak" -ForegroundColor White
Write-Host "  - src/dedup-as-loading-full.js.bak" -ForegroundColor White
