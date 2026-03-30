const { loadFromFile, loadFromUrl, loadFromDataset, dedup, sleep, saveState, loadState, mapWithConcurrency } = require('./utils-minimal');
const { UPLOAD_SLEEP_MS } = require('./consts');

/**
 * 边加载边去重模式（最小化版本 - 不使用big-set和bluebird）
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

    // 初始化数据源级推送状态
    if (!pushState.sources) {
        pushState.sources = {};
    }

    let totalLoaded = 0;
    let totalUnique = 0;
    let totalDuplicates = 0;
    let totalPushed = 0;

    const loadStart = Date.now();

    // 准备数据源列表
    let dataSources = [];
    
    if (dataSourceType === 'direct-input') {
        // 直接输入数据作为一个数据源
        if (inputData && inputData.length > 0) {
            dataSources.push({
                id: 'direct-input',
                type: 'direct',
                data: inputData,
            });
        }
    } else if (dataSourceType === 'network-url') {
        // 网络URL列表
        dataSources = inputUrls.map((urlObj, index) => ({
            id: urlObj.url || urlObj,
            type: 'url',
            url: urlObj.url || urlObj,
        }));
    } else if (dataSourceType === 'cafe-dataset') {
        // Dataset ID列表
        dataSources = datasetIds.map((datasetId, index) => ({
            id: datasetId,
            type: 'dataset',
            datasetId: datasetId,
        }));
    }

    // 并行处理所有数据源（使用mapWithConcurrency替代bluebird.map）
    await mapWithConcurrency(dataSources, async (source) => {
        const sourceKey = source.id.replace(/[^a-zA-Z0-9]/g, '_');

        // 初始化该数据源的状态
        if (!pushState.sources[sourceKey]) {
            pushState.sources[sourceKey] = { processed: false, pushedCount: 0 };
        }

        // 如果该数据源已处理过,跳过
        if (pushState.sources[sourceKey].processed) {
            if (verboseLog) {
                await cafesdk.log.debug(`数据源已处理过,跳过: ${source.id}`);
            }
            return;
        }

        if (verboseLog) {
            await cafesdk.log.debug(`正在加载数据源: ${source.id}`);
        }

        let items;
        
        // 根据数据源类型加载
        if (source.type === 'direct') {
            items = source.data;
        } else if (source.type === 'url') {
            items = await loadFromUrl(source.url, inputFormat, fieldsToLoad);
        } else if (source.type === 'dataset') {
            items = await loadFromDataset(source.datasetId, cafesdk, fieldsToLoad);
        }

        // 附加数据来源
        if (appendFileSource) {
            items = items.map(item => ({
                ...item,
                __fileSource__: source.id,
            }));
        }

        totalLoaded += items.length;

        // 去重前转换
        items = await preDedupTransformFn(items, { customInputData, fileSource: source.id });

        // 去重
        const outputItems = dedup({ items, output, fields, dedupSet, nullAsUnique });

        // 去重后转换
        const finalItems = await postDedupTransformFn(outputItems, { customInputData, fileSource: source.id });

        totalUnique += dedupSet.size;
        totalDuplicates += (items.length - outputItems.length);

        // 推送数据
        if (output !== 'nothing' && finalItems.length > 0) {
            // 从上次推送的位置继续
            const startIdx = pushState.sources[sourceKey].pushedCount;
            
            for (let i = startIdx; i < finalItems.length; i += batchSize) {
                const batch = finalItems.slice(i, i + batchSize);

                for (const item of batch) {
                    await cafesdk.result.pushData(item);
                }

                pushState.sources[sourceKey].pushedCount = i + batch.length;
                totalPushed += batch.length;

                // 保存状态
                await saveState('PUSHED', pushState);

                if (verboseLog) {
                    await cafesdk.log.debug(`[数据源 ${source.id}] 已推送 ${i + batch.length}/${finalItems.length} 条`);
                }

                await sleep(UPLOAD_SLEEP_MS);
            }
        }

        // 标记该数据源已处理完成
        pushState.sources[sourceKey].processed = true;
        await saveState('PUSHED', pushState);

        if (verboseLog) {
            await cafesdk.log.info(`数据源处理完成: ${source.id} - 加载 ${items.length} 条,输出 ${finalItems.length} 条`);
        }

    }, parallelLoads);

    const loadTime = Math.round((Date.now() - loadStart) / 1000);

    // 统计结果
    await cafesdk.log.info(`处理完成,耗时 ${loadTime} 秒`);
    await cafesdk.log.info(`统计结果:`);
    await cafesdk.log.info(`  - 总计加载: ${totalLoaded} 条`);
    await cafesdk.log.info(`  - 唯一项: ${totalUnique} 条`);
    await cafesdk.log.info(`  - 重复项: ${totalDuplicates} 条`);
    await cafesdk.log.info(`  - 已推送: ${totalPushed} 条`);
};
