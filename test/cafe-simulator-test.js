/**
 * Cafe 云平台本地模拟测试
 * 完整模拟 Cafe SDK 行为，测试所有数据源类型
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// 设置环境变量
process.env.LOCAL_DEV = '1';

const testCases = [
    {
        name: '测试1: 直接输入数据 - 基础去重',
        description: '最简单的测试，直接粘贴JSON数组',
        input: {
            dataSourceType: 'direct-input',
            inputData: [
                { "id": 1, "name": "Product A", "price": 100 },
                { "id": 2, "name": "Product B", "price": 200 },
                { "id": 1, "name": "Product A", "price": 100 },
                { "id": 3, "name": "Product C", "price": 150 }
            ],
            fields: ['id']
        },
        expected: '3条唯一数据（id: 1, 2, 3）'
    },
    {
        name: '测试2: 网络URL - GitHub数据',
        description: '从GitHub加载真实测试数据',
        input: {
            dataSourceType: 'network-url',
            inputUrls: [
                { url: 'https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data1.json' },
                { url: 'https://raw.githubusercontent.com/kael-odin/worker-dedup-datasets/main/test/data2.json' }
            ],
            fields: ['id']
        },
        expected: '8条唯一数据（data1: 6条, data2: 4条, 去重后: 8条）'
    },
    {
        name: '测试3: 查看重复数据',
        description: '输出被判定为重复的数据',
        input: {
            dataSourceType: 'direct-input',
            inputData: [
                { "id": 1, "name": "Product A", "price": 100 },
                { "id": 2, "name": "Product B", "price": 200 },
                { "id": 1, "name": "Product A", "price": 100 },
                { "id": 2, "name": "Product B", "price": 200 }
            ],
            fields: ['id'],
            output: 'duplicate-items'
        },
        expected: '2条重复数据（id: 1 和 id: 2）'
    },
    {
        name: '测试4: 数据转换 + 去重',
        description: '先过滤价格>=100的数据再去重',
        input: {
            dataSourceType: 'direct-input',
            inputData: [
                { "id": 1, "name": "Product A", "price": 50 },
                { "id": 2, "name": "Product B", "price": 150 },
                { "id": 3, "name": "Product C", "price": 200 },
                { "id": 1, "name": "Product A", "price": 50 }
            ],
            fields: ['id'],
            customInputData: { minPrice: 100 },
            preDedupTransformFunction: 'async (items, { customInputData }) => {\n  const { minPrice } = customInputData;\n  return items.filter(item => item.price >= minPrice);\n}'
        },
        expected: '2条唯一数据（price >= 100: id 2和3）'
    },
    {
        name: '测试5: 边加载边去重模式',
        description: '大数据集推荐模式',
        input: {
            dataSourceType: 'direct-input',
            inputData: [
                { "id": 1, "name": "Product A", "price": 100 },
                { "id": 2, "name": "Product B", "price": 200 },
                { "id": 3, "name": "Product C", "price": 150 }
            ],
            fields: ['id'],
            mode: 'dedup-as-loading'
        },
        expected: '3条唯一数据'
    }
];

async function runTest(testCase, index) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`描述: ${testCase.description}`);
    console.log(`预期: ${testCase.expected}`);
    console.log('');

    // 创建临时输入文件
    const inputFile = path.join(__dirname, `temp-input-${index}.json`);
    await fs.writeFile(inputFile, JSON.stringify(testCase.input, null, 2), 'utf-8');
    
    // 设置环境变量
    process.env.INPUT_FILE = inputFile;

    return new Promise((resolve) => {
        const mainPath = path.join(__dirname, '../src/main.js');
        const child = exec(`node ${mainPath}`, {
            env: process.env,
            cwd: __dirname
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data;
            process.stdout.write(data);
        });

        child.stderr.on('data', (data) => {
            stderr += data;
            process.stderr.write(data);
        });

        child.on('close', async (code) => {
            // 清理临时文件
            await fs.unlink(inputFile).catch(() => {});
            
            // 检查结果
            const outputDir = path.join(__dirname, '../outputs');
            const resultsFile = path.join(outputDir, 'results.json');
            
            let result = null;
            try {
                const content = await fs.readFile(resultsFile, 'utf-8');
                result = JSON.parse(content);
                
                // 清空输出文件
                await fs.writeFile(resultsFile, '[]', 'utf-8');
            } catch (error) {
                // 忽略错误
            }

            resolve({
                name: testCase.name,
                success: code === 0,
                exitCode: code,
                resultCount: result ? result.length : 0,
                result: result
            });
        });
    });
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 Cafe 云平台本地模拟测试');
    console.log('='.repeat(60));
    console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`测试用例: ${testCases.length} 个`);
    console.log('='.repeat(60));

    const results = [];

    for (let i = 0; i < testCases.length; i++) {
        const result = await runTest(testCases[i], i);
        results.push(result);
        
        // 等待1秒再执行下一个测试
        if (i < testCases.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // 输出测试报告
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试报告');
    console.log('='.repeat(60));
    
    let successCount = 0;
    results.forEach((result, index) => {
        const status = result.success ? '✅ 通过' : '❌ 失败';
        console.log(`${index + 1}. ${result.name}: ${status} (${result.resultCount} 条输出)`);
        if (result.success) successCount++;
    });

    console.log('');
    console.log(`总计: ${results.length} 个测试`);
    console.log(`成功: ${successCount} 个`);
    console.log(`失败: ${results.length - successCount} 个`);
    console.log(`成功率: ${(successCount / results.length * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    // 输出Cafe平台实际测试示例
    console.log('\n' + '='.repeat(60));
    console.log('📋 Cafe 平台实际测试示例');
    console.log('='.repeat(60));
    console.log('\n以下是可以直接复制到 Cafe 平台的 JSON 输入示例：\n');

    testCases.forEach((testCase, index) => {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`${index + 1}. ${testCase.name}`);
        console.log(`${'─'.repeat(60)}`);
        console.log('输入 JSON:');
        console.log(JSON.stringify(testCase.input, null, 2));
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试完成！');
    console.log('='.repeat(60));
}

main().catch(console.error);
