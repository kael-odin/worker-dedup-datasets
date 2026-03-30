/**
 * 本地测试脚本
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 设置环境变量
process.env.LOCAL_DEV = '1';
process.env.INPUT_FILE = path.join(__dirname, 'test-input.json');

console.log('========================================');
console.log('Dedup Datasets Worker - 本地测试');
console.log('========================================');
console.log('');

// 清理之前的输出
const outputDir = path.join(__dirname, 'outputs');
if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
}
fs.mkdirSync(outputDir, { recursive: true });

console.log('测试配置:');
console.log('- 输入文件: test-input.json');
console.log('- 模式: 先加载后去重');
console.log('- 去重字段: id');
console.log('');

// 执行主程序
const mainPath = path.join(__dirname, '../src/main.js');
const child = exec(`node ${mainPath}`, {
    env: process.env,
    cwd: __dirname
});

child.stdout.on('data', (data) => {
    process.stdout.write(data);
});

child.stderr.on('data', (data) => {
    process.stderr.write(data);
});

child.on('close', (code) => {
    console.log('');
    console.log('========================================');
    
    if (code === 0) {
        console.log('✅ 测试完成!');
        console.log('');
        
        // 显示输出结果
        const resultsFile = path.join(outputDir, 'results.json');
        if (fs.existsSync(resultsFile)) {
            const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
            console.log(`📊 输出统计:`);
            console.log(`   - 总记录数: ${results.length}`);
            console.log(`   - 输出文件: outputs/results.json`);
            console.log('');
            console.log('前5条记录:');
            console.log(JSON.stringify(results.slice(0, 5), null, 2));
        }
    } else {
        console.log('❌ 测试失败!');
        console.log(`退出码: ${code}`);
    }
    
    console.log('========================================');
});
