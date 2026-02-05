import { ref, onUnmounted } from 'vue';

// 移除 batchId 相关，仅保留 apiCheckFunction 和 onPollingEnd
export function useBatchPoller(apiCheckFunction, onPollingEnd) {
  const isPolling = ref(false);
  const pollTimer = ref(null);
  const abortController = ref(null);

  const stopPolling = () => {
    if (pollTimer.value) {
      clearTimeout(pollTimer.value);
      pollTimer.value = null;
    }
    if (abortController.value) {
      abortController.value.abort();
      abortController.value = null;
    }
    isPolling.value = false;
  };

  // 移除 batchId 参数，无需再传递批次标识
  const startPolling = () => {
    if (isPolling.value) return; // 防止重复启动
    stopPolling();
    isPolling.value = true;

    const executePoll = async () => {
      if (!isPolling.value) return;

      try {
        abortController.value = new AbortController();
        // 调用查询接口，无需传递 batchId，仅传递 abort 信号
        const res = await apiCheckFunction({ signal: abortController.value.signal });
        
        // 兼容你后端的分页返回格式（records 数组），和 refreshData 逻辑一致
        let rawList = [];
        if (Array.isArray(res.data.data)) {
          rawList = res.data.data;
        } else if (res.data.data && Array.isArray(res.data.data.records)) {
          rawList = res.data.data.records; // 适配你后端返回的 records 数组
        } else if (res.data.data && Array.isArray(res.data.data.rows)) {
          rawList = res.data.data.rows;
        } else if (res.data.data && Array.isArray(res.data.data.list)) {
          rawList = res.data.data.list;
        }

        // 关键修改：统一判断 item.fileState（你后端返回的字段），而非 item.status
        const hasPending = rawList.some(item => 
          ['UPLOADING','PENDING','PARSING'].includes(item.fileState)
        );
        
        if (!hasPending) {
          stopPolling(); // 无未完成文件，终止轮询
          // 调用回调，刷新表格展示最终状态
          if (typeof onPollingEnd === 'function') {
            onPollingEnd();
          }
          return;
        }
        pollTimer.value = setTimeout(executePoll, 30000); // 30秒轮询一次，可调整
      } catch (error) {
        // 仅忽略主动终止的错误，其他错误终止轮询并打印日志
        if (error.name !== 'AbortError') {
          console.error('轮询查询失败：', error);
          stopPolling();
        }
      }
    };

    executePoll();
  };

  onUnmounted(() => stopPolling());

  return { isPolling, startPolling, stopPolling };
}