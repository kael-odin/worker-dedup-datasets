/**
 * 综合测试脚本 - 测试所有场景
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 设置环境变量
process.env.LOCAL_DEV = '1';

const testCases = [
    {
        name: '场景1: 先加载后去重模式 (默认)',
        inputFile: 'test-input.json',
        expected: '去重后输出唯一项'
    },
    {
        name: '场景2: 查找重复项模式',
        inputFile: 'test-duplicate-mode.json',
        expected: '输出所有重复项'
    },
    {
        name: '场景3: 边加载边去重模式',
        inputFile: 'test-streaming-mode.json',
        expected: '低内存模式去重'
    }
];

async function runTest(testCase) {
    return new Promise((resolve) => {
        console.log('\n========================================');
        console.log(`测试: ${testCase.name}`);
        console.log('========================================');
        console.log(`预期: ${testCase.expected}`);
        console.log('');
        
        process.env.INPUT_FILE = path.join(__dirname, testCase.inputFile);
        
        const mainPath = path.join(__dirname, '../src/main.js');
        const child = exec(`node ${mainPath}`, {
            env: process.env,
            cwd: __dirname
        });
        
        let output = '';
        child.stdout.on('data', (data) => {
            output += data;
            process.stdout.write(data);
        });
        
        child.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
        
        child.on('close', (code) => {
            const success = code === 0 && output.includes('处理完成');
            console.log('');
            console.log(success ? '✅ 通过' : '❌ 失败');
            resolve(success);
        });
    });
}

async function runAllTests() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Dedup Datasets Worker - 综合测试    ║');
    console.log('╚════════════════════════════════════════╝');
    
    const results = [];
    for (const testCase of testCases) {
        const success = await runTest(testCase);
        results.push({ name: testCase.name, success });
    }
    
    console.log('\n========================================');
    console.log('测试汇总');
    console.log('========================================');
    results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.name}: ${r.success ? '✅ 通过' : '❌ 失败'}`);
    });
    
    const passed = results.filter(r => r.success).length;
    console.log('');
    console.log(`总计: ${passed}/${results.length} 通过`);
    console.log('========================================');
    
    process.exit(passed === results.length ? 0 : 1);
}

runAllTests();
