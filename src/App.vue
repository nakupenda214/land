<script setup></script>

<template>
  <router-view />
</template>

<style>
/* 简单的全局重置，去掉浏览器的默认边距 */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
#print-target {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: white;
}

/* 打印媒体查询：核心重置 */
@media print {
  /* 1. 彻底隐藏整个应用，从根源避免侧边栏/筛选栏重叠 */
  #app {
    display: none !important;
  }

  /* 2. 显示打印容器，解除所有布局限制 */
  #print-target {
    display: block !important;
    height: auto !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* 3. 重置 html/body，允许内容无限高度（解决分页截断） */
  html, body {
    height: auto !important;
    overflow: visible !important;
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* 4. 打印页面设置：A4横向、合理边距 */
  @page {
    size: landscape; /* 横向适配表格 */
    margin: 1cm;     /* 去除浏览器默认页眉页脚的边距 */
  }

  /* 5. 原生打印表格样式：保证跨页表头重复、行不截断 */
  .native-print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11pt;
  }
  .native-print-table th,
  .native-print-table td {
    border: 1px solid #000;
    padding: 6px 4px;
    text-align: center;
    word-wrap: break-word;
  }
  .native-print-table thead {
    display: table-header-group; /* 强制表头重复 */
  }
  .native-print-table tr {
    break-inside: avoid;      /* 现代浏览器：行不跨页 */
    page-break-inside: avoid; /* 兼容旧浏览器 */
  }

  /* 打印标题/页脚样式 */
  .print-title {
    font-size: 20pt;
    font-weight: bold;
    text-align: center;
    margin: 10px 0 20px 0 !important;
    break-after: avoid; /* 标题不单独留在页尾 */
  }
  .print-meta-row {
    display: flex !important;
    justify-content: space-between !important;
    margin: 0 20px 15px !important;
    font-size: 12pt !important;
  }
  .print-footer {
    margin: 30px 20px 0 !important;
  }
  .print-signatures {
    display: flex !important;
    gap: 60px !important;
    font-size: 14pt !important;
    margin-left: 20px !important;
  }
}
</style>
