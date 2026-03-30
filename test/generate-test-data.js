#!/usr/bin/env node

/**
 * Test Data Generator
 * Generates test datasets of various sizes for performance testing
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'generated');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function generateItem(id, duplicateChance = 0.1) {
    const isDuplicate = Math.random() < duplicateChance;
    const actualId = isDuplicate ? Math.floor(Math.random() * id) : id;
    
    return {
        id: actualId,
        name: `Product ${id}`,
        price: Math.floor(Math.random() * 1000) + 100,
        category: ['Electronics', 'Books', 'Clothing', 'Home', 'Sports'][Math.floor(Math.random() * 5)],
        stock: Math.floor(Math.random() * 100),
        rating: (Math.random() * 5).toFixed(1),
        createdAt: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
    };
}

function generateJSON(count, filename, duplicateChance = 0.1) {
    console.log(`Generating ${filename} with ${count} items...`);
    
    const items = [];
    for (let i = 1; i <= count; i++) {
        items.push(generateItem(i, duplicateChance));
    }
    
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));
    
    const stats = fs.statSync(outputPath);
    console.log(`✅ Generated: ${filename}`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Items: ${count}`);
    
    return stats.size;
}

function generateJSONL(count, filename, duplicateChance = 0.1) {
    console.log(`Generating ${filename} with ${count} items...`);
    
    const outputPath = path.join(outputDir, filename);
    const stream = fs.createWriteStream(outputPath);
    
    for (let i = 1; i <= count; i++) {
        const item = generateItem(i, duplicateChance);
        stream.write(JSON.stringify(item) + '\n');
    }
    
    stream.end();
    
    // Wait for stream to finish
    return new Promise((resolve) => {
        stream.on('finish', () => {
            const stats = fs.statSync(outputPath);
            console.log(`✅ Generated: ${filename}`);
            console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   Items: ${count}`);
            resolve(stats.size);
        });
    });
}

async function main() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   Test Data Generator                 ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');

    // Generate various test datasets
    const datasets = [
        // Small datasets
        { count: 100, filename: 'small.json', format: 'json', duplicateChance: 0.2 },
        { count: 100, filename: 'small.jsonl', format: 'jsonl', duplicateChance: 0.2 },
        
        // Medium datasets
        { count: 1000, filename: 'medium.json', format: 'json', duplicateChance: 0.15 },
        { count: 1000, filename: 'medium.jsonl', format: 'jsonl', duplicateChance: 0.15 },
        
        // Large datasets
        { count: 10000, filename: 'large.json', format: 'json', duplicateChance: 0.1 },
        { count: 10000, filename: 'large.jsonl', format: 'jsonl', duplicateChance: 0.1 },
        
        // Extra large datasets (for stress testing)
        { count: 100000, filename: 'xlarge.jsonl', format: 'jsonl', duplicateChance: 0.1 },
    ];

    let totalSize = 0;

    for (const { count, filename, format, duplicateChance } of datasets) {
        if (format === 'json') {
            totalSize += generateJSON(count, filename, duplicateChance);
        } else {
            totalSize += await generateJSONL(count, filename, duplicateChance);
        }
        console.log('');
    }

    console.log('========================================');
    console.log(`Total generated: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Output directory: ${outputDir}`);
    console.log('========================================');
}

main().catch(console.error);
