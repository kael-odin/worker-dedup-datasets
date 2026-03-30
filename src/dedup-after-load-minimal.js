const { loadFromFile, loadFromUrl, loadFromDataset, dedup, sleep, saveState, loadState, mapWithConcurrency } = require('./utils-minimal');
const { UPLOAD_SLEEP_MS } = require('./consts');

/**
 * 先加载后去重模式（最小化版本 - 不使用big-set和bluebird）
 */
module.exports = async ({
    dataSourceType,
    inputData,
    inputUrls,
    datasetIds,
    inputFormat,
    output,
    fields,
    parallelLoads,
    parallelPushes,
    batchSize,
    fieldsToLoad,
    preDedupTransformFn,
    postDedupTransformFn,
    pushState,
    verboseLog,
    customInputData,
    nullAsUnique,
    appendFileSource,
    cafesdk,
}) => {
    // 使用原生 Set（限制数据集大小）
    const dedupSet = new Set();

    // 初始化推送状态
    if (!pushState.pushedItemsCount) {
        pushState.pushedItemsCount = 0;
    }

    // 加载所有数据
    if (verboseLog) {
        await cafesdk.log.info('开始加载数据...');
    }

    const loadStart = Date.now();
    let allItems = [];

    // 根据数据源类型加载
    if (dataSourceType === 'direct-input') {
        // 直接输入数据
        allItems = inputData || [];
        if (verboseLog) {
            await cafesdk.log.info(`直接输入数据: ${allItems.length} 条记录`);
        }
    } else if (dataSourceType === 'network-url') {
        // 从网络URL加载（使用mapWithConcurrency替代bluebird.map）
        await mapWithConcurrency(inputUrls, async (urlObj) => {
            const url = urlObj.url || urlObj;
            
            if (verboseLog) {
                await cafesdk.log.debug(`正在加载URL: ${url}`);
            }

            let items = await loadFromUrl(url, inputFormat, fieldsToLoad);

            // 附加数据来源
            if (appendFileSource) {
                items = items.map(item => ({
                    ...item,
                    __fileSource__: url,
                }));
            }

            allItems = allItems.concat(items);

            if (verboseLog) {
                await cafesdk.log.info(`已加载 ${items.length} 条记录,当前总计: ${allItems.length}`);
            }
        }, parallelLoads);
    } else if (dataSourceType === 'cafe-dataset') {
        // 从Cafe Dataset加载（使用mapWithConcurrency替代bluebird.map）
        await mapWithConcurrency(datasetIds, async (datasetId) => {
            if (verboseLog) {
                await cafesdk.log.debug(`正在加载Dataset: ${datasetId}`);
            }

            let items = await loadFromDataset(datasetId, cafesdk, fieldsToLoad);

            // 附加数据来源
            if (appendFileSource) {
                items = items.map(item => ({
                    ...item,
                    __fileSource__: datasetId,
                }));
            }

            allItems = allItems.concat(items);

            if (verboseLog) {
                await cafesdk.log.info(`已加载 ${items.length} 条记录,当前总计: ${allItems.length}`);
            }
        }, parallelLoads);
    }

    const loadTime = Math.round((Date.now() - loadStart) / 1000);
    await cafesdk.log.info(`数据加载完成,共 ${allItems.length} 条记录,耗时 ${loadTime} 秒`);

    // 检查数据集大小（使用原生Set的限制）
    if (allItems.length > 1000000) {
        await cafesdk.log.warning(`警告: 数据集较大 (${allItems.length} 条),使用原生Set可能有内存问题`);
    }

    // 去重前转换
    if (verboseLog) {
        await cafesdk.log.info('执行去重前转换...');
    }
    allItems = await preDedupTransformFn(allItems, { customInputData });

    // 去重
    if (verboseLog) {
        await cafesdk.log.info(`开始去重,去重字段: ${fields.join(', ') || '(无)'}`);
    }
    let outputItems = dedup({ items: allItems, output, fields, dedupSet, nullAsUnique });

    // 去重后转换
    if (verboseLog) {
        await cafesdk.log.info('执行去重后转换...');
    }
    outputItems = await postDedupTransformFn(outputItems, { customInputData });

    // 统计
    const totalLoaded = allItems.length;
    const totalUnique = dedupSet.size;
    const totalDuplicates = totalLoaded - totalUnique;

    await cafesdk.log.info(`统计结果:`);
    await cafesdk.log.info(`  - 总计加载: ${totalLoaded} 条`);
    await cafesdk.log.info(`  - 唯一项: ${totalUnique} 条`);
    await cafesdk.log.info(`  - 重复项: ${totalDuplicates} 条`);
    await cafesdk.log.info(`  - 输出项: ${outputItems.length} 条`);

    // 推送数据
    if (output !== 'nothing') {
        if (verboseLog) {
            await cafesdk.log.info('开始推送数据...');
        }

        // 批次推送
        for (let i = 0; i < outputItems.length; i += batchSize) {
            const batch = outputItems.slice(i, i + batchSize);

            for (const item of batch) {
                await cafesdk.result.pushData(item);
            }

            pushState.pushedItemsCount += batch.length;
            await saveState('PUSHED', pushState);

            if (verboseLog) {
                await cafesdk.log.info(`已推送 ${pushState.pushedItemsCount}/${outputItems.length} 条`);
            }

            await sleep(UPLOAD_SLEEP_MS);
        }

        await cafesdk.log.info(`推送完成: ${pushState.pushedItemsCount} 条`);
    } else {
        await cafesdk.log.info('输出模式为"仅统计",不推送数据');
    }
};
