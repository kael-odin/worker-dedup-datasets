#!/usr/bin/env node

/**
 * Performance Benchmark Script
 * Tests worker performance with different dataset sizes and configurations
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

process.env.LOCAL_DEV = '1';

const testCases = [
    {
        name: 'Small Dataset (100 items)',
        inputFile: 'small.jsonl',
        config: {
            inputFiles: [{ url: 'file:///test/generated/small.jsonl' }],
            fields: ['id'],
            mode: 'dedup-after-load',
            output: 'unique-items'
        }
    },
    {
        name: 'Medium Dataset (1K items) - dedup-after-load',
        inputFile: 'medium.jsonl',
        config: {
            inputFiles: [{ url: 'file:///test/generated/medium.jsonl' }],
            fields: ['id'],
            mode: 'dedup-after-load',
            output: 'unique-items'
        }
    },
    {
        name: 'Medium Dataset (1K items) - dedup-as-loading',
        inputFile: 'medium.jsonl',
        config: {
            inputFiles: [{ url: 'file:///test/generated/medium.jsonl' }],
            fields: ['id'],
            mode: 'dedup-as-loading',
            output: 'unique-items'
        }
    },
    {
        name: 'Large Dataset (10K items) - dedup-as-loading',
        inputFile: 'large.jsonl',
        config: {
            inputFiles: [{ url: 'file:///test/generated/large.jsonl' }],
            fields: ['id'],
            mode: 'dedup-as-loading',
            batchSize: 1000,
            output: 'unique-items'
        }
    },
    {
        name: 'Large Dataset (10K items) - with fieldsToLoad',
        inputFile: 'large.jsonl',
        config: {
            inputFiles: [{ url: 'file:///test/generated/large.jsonl' }],
            fields: ['id'],
            mode: 'dedup-as-loading',
            batchSize: 1000,
            fieldsToLoad: ['id', 'name', 'price'],
            output: 'unique-items'
        }
    },
];

async function runBenchmark(testCase) {
    return new Promise((resolve) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 ${testCase.name}`);
        console.log('='.repeat(60));
        
        // Write config to temp file
        const configPath = path.join(__dirname, 'temp-config.json');
        const absolutePath = path.join(__dirname, 'generated', testCase.inputFile);
        testCase.config.inputFiles[0].url = `file:///${absolutePath.replace(/\\/g, '/')}`;
        
        fs.writeFileSync(configPath, JSON.stringify(testCase.config, null, 2));
        process.env.INPUT_FILE = configPath;
        
        const startTime = Date.now();
        const mainPath = path.join(__dirname, '../src/main.js');
        
        const child = exec(`node ${mainPath}`, {
            env: process.env,
            cwd: __dirname
        });
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
            output += data;
        });
        
        child.stderr.on('data', (data) => {
            errorOutput += data;
        });
        
        child.on('close', (code) => {
            const duration = Date.now() - startTime;
            
            // Parse statistics from output
            const stats = {
                duration: duration,
                success: code === 0,
                totalLoaded: 0,
                unique: 0,
                duplicates: 0
            };
            
            const totalMatch = output.match(/总计加载: (\d+) 条/);
            const uniqueMatch = output.match(/唯一项: (\d+) 条/);
            const dupMatch = output.match(/重复项: (\d+) 条/);
            
            if (totalMatch) stats.totalLoaded = parseInt(totalMatch[1]);
            if (uniqueMatch) stats.unique = parseInt(uniqueMatch[1]);
            if (dupMatch) stats.duplicates = parseInt(dupMatch[1]);
            
            console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
            console.log(`📦 Total Loaded: ${stats.totalLoaded} items`);
            console.log(`✅ Unique Items: ${stats.unique}`);
            console.log(`❌ Duplicates: ${stats.duplicates}`);
            console.log(`${code === 0 ? '✅ PASSED' : '❌ FAILED'}`);
            
            // Cleanup
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
            
            resolve({
                name: testCase.name,
                ...stats
            });
        });
    });
}

async function runAllBenchmarks() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Performance Benchmark Suite         ║');
    console.log('╚════════════════════════════════════════╝');
    
    const results = [];
    
    for (const testCase of testCases) {
        const result = await runBenchmark(testCase);
        results.push(result);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 BENCHMARK SUMMARY');
    console.log('='.repeat(60));
    
    results.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.name}`);
        console.log(`   Duration: ${(r.duration / 1000).toFixed(2)}s`);
        console.log(`   Processed: ${r.totalLoaded} items`);
        console.log(`   Throughput: ${(r.totalLoaded / (r.duration / 1000)).toFixed(0)} items/sec`);
        console.log(`   Status: ${r.success ? '✅' : '❌'}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    const totalProcessed = results.reduce((sum, r) => sum + r.totalLoaded, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const allPassed = results.every(r => r.success);
    
    console.log(`Total Processed: ${totalProcessed} items`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`Average Throughput: ${(totalProcessed / (totalDuration / 1000)).toFixed(0)} items/sec`);
    console.log(`Overall Status: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
    
    process.exit(allPassed ? 0 : 1);
}

runAllBenchmarks().catch(console.error);
