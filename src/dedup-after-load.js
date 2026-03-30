const BigSet = require('big-set');
const bluebird = require('bluebird');
const { loadFromFile, dedup, sleep, saveState, loadState } = require('./utils');
const { UPLOAD_SLEEP_MS } = require('./consts');

/**
 * 先加载后去重模式
 */
module.exports = async ({
    inputFiles,
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
    const dedupSet = new BigSet();

    // 初始化推送状态
    if (!pushState.pushedItemsCount) {
        pushState.pushedItemsCount = 0;
    }

    // 加载所有文件
    if (verboseLog) {
        await cafesdk.log.info('开始并行加载文件...');
    }

    const loadStart = Date.now();
    let allItems = [];

    // 并行加载所有文件
    await bluebird.map(inputFiles, async (fileObj) => {
        const filePath = fileObj.url || fileObj;
        
        if (verboseLog) {
            await cafesdk.log.debug(`正在加载文件: ${filePath}`);
        }

        let items = await loadFromFile(filePath, inputFormat, fieldsToLoad);

        // 附加文件来源
        if (appendFileSource) {
            items = items.map(item => ({
                ...item,
                __fileSource__: filePath,
            }));
        }

        allItems = allItems.concat(items);

        if (verboseLog) {
            await cafesdk.log.info(`已加载 ${items.length} 条记录,当前总计: ${allItems.length}`);
        }
    }, { concurrency: parallelLoads });

    const loadTime = Math.round((Date.now() - loadStart) / 1000);
    await cafesdk.log.info(`文件加载完成,共 ${allItems.length} 条记录,耗时 ${loadTime} 秒`);

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
        await cafesdk.log.info(`开始推送 ${outputItems.length - pushState.pushedItemsCount} 条待处理数据...`);

        // 分批推送
        for (let i = pushState.pushedItemsCount; i < outputItems.length; i += batchSize) {
            const batch = outputItems.slice(i, i + batchSize);
            
            // 并行推送批次
            const pushPromises = [];
            const parallelizedBatchSize = Math.ceil(batch.length / parallelPushes);
            
            for (let j = 0; j < parallelPushes; j++) {
                const start = j * parallelizedBatchSize;
                const end = (j + 1) * parallelizedBatchSize;
                const chunk = batch.slice(start, end);
                
                if (chunk.length > 0) {
                    pushPromises.push(
                        (async () => {
                            for (const item of chunk) {
                                await cafesdk.result.pushData(item);
                            }
                        })()
                    );
                }
            }

            await Promise.all(pushPromises);
            
            // 更新状态
            pushState.pushedItemsCount = i + batch.length;
            await saveState('PUSHED', pushState);

            if (verboseLog) {
                await cafesdk.log.info(`已推送 ${pushState.pushedItemsCount}/${outputItems.length} 条`);
            }

            await sleep(UPLOAD_SLEEP_MS);
        }

        await cafesdk.log.info(`推送完成,共 ${pushState.pushedItemsCount} 条`);
    } else {
        await cafesdk.log.info('仅统计模式,不输出数据');
    }
};
