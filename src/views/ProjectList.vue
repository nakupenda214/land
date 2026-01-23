<template>
  <div class="archive-container">
    
    <div class="global-filter-card no-print">
      <div class="filter-row">
        <div class="filter-item">
          <span class="label">归档年份</span>
          <el-select v-model="filterYear" placeholder="年份" style="width: 120px" @change="handleYearChange">
            <el-option label="2026" value="2026" />
            <el-option label="2025" value="2025" />
            <el-option label="2024" value="2024" />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="label">选择项目</span>
          <el-select v-model="filterProject" placeholder="请选择要查询的项目" style="width: 280px" :disabled="!filterYear">
            <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </div>
        <el-button type="primary" icon="Search" @click="handleGlobalSearch" :disabled="!filterProject">查询档案</el-button>
      </div>
      <div class="project-meta" v-if="currentProjectName">
        当前查看：<el-tag effect="dark" size="large">{{ currentProjectName }}</el-tag>
        <span class="meta-info">项目编号: XM-{{ filterYear }}-088 | 状态: <span style="color: #67C23A; font-weight: bold;">已归档</span></span>
      </div>
    </div>

    <div class="content-tabs-wrapper">
      <el-tabs v-model="activeTab" type="border-card" class="archive-tabs no-print">
        
        <el-tab-pane name="summary">
          <template #label><span class="custom-tab-label"><el-icon><DataAnalysis /></el-icon> 房产实测汇总表</span></template>
          
          <div class="tab-content">
            <div class="tab-actions no-print">
              <el-alert title="提示：系统已根据您的选择自动核算汇总数据。" type="info" show-icon :closable="false" style="padding: 8px 16px;" />
              <div class="action-btns">
                <el-button icon="Printer" @click="handlePrint" style="margin-right: 15px;">打印报表</el-button>
                <el-button type="success" color="#CAFFBF" style="color: #555" icon="Download" @click="handleExportExcel">导出 Excel</el-button>
              </div>
            </div>

            <transition name="el-zoom-in-top">
              <div v-if="specialRules.length > 0" class="special-policy-card no-print">
                <div class="policy-header">
                  <el-icon color="#E6A23C" size="18"><WarningFilled /></el-icon>
                  <span class="policy-title">系统检测到 {{ specialRules.length }} 类特殊用途区域，请指定其归属类别：</span>
                </div>
                <div class="policy-items">
                  <div v-for="(rule, index) in specialRules" :key="index" class="policy-item">
                    <div class="policy-info">
                      <div class="policy-name">{{ rule.name }}</div>
                      <div class="policy-stats">涉及面积: <strong>{{ rule.totalArea }} ㎡</strong></div>
                    </div>
                    <div class="policy-control">
                      <span class="control-label">归入:</span>
                      <el-select v-model="rule.targetCategory" size="small" style="width: 220px" @change="recalculateTable">
                        <el-option-group label="计容建筑面积">
                          <el-option label="商业(办公)" value="calcCommercial" />
                          <el-option label="住宅" value="calcResidential" />
                          <el-option label="物管用房" value="calcPropMgmt" />
                          <el-option label="其他计容" value="calcOther" />
                        </el-option-group>
                        <el-option-group label="不计容建筑面积">
                          <el-option label="社区用房" value="nonCalcCommunity" />
                          <el-option label="其他公用" value="nonCalcOther" />
                        </el-option-group>
                      </el-select>
                    </div>
                  </div>
                </div>
                <div class="policy-footer">
                  <el-button type="primary" size="small" icon="Check" @click="savePolicy">确认规则并保存</el-button>
                </div>
              </div>
            </transition>

            

            <el-card class="table-card no-print" shadow="never">
              <template #header>
                <div class="card-header">
                  <span class="main-report-title">{{ currentProjectName || '项目' }}房产实测信息汇总表</span>
                </div>
              </template>
              
              <el-table 
                :data="displayTableData" 
                border 
                style="width: 100%" 
                :header-cell-style="{background:'#F5F7FA', color:'#333', fontWeight:'bold', textAlign:'center', fontSize: '12px', padding: '4px 0'}" 
                :cell-style="{fontSize: '12px', padding: '4px 0'}"
              >
                <el-table-column prop="id" label="编号" width="50" align="center" fixed />
                <el-table-column label="工程名称" width="160" fixed>
                  <template #default="{ row }">
                    <el-link type="primary" :underline="never" style="font-weight:bold" @click="viewDetail(row)">
                      {{ row.projectName }} <el-icon style="margin-left: 2px"><View /></el-icon>
                    </el-link>
                  </template>
                </el-table-column>
                <el-table-column prop="certNo" label="不动产权证编号" width="200" show-overflow-tooltip />
                <el-table-column prop="contractNo" label="合同/批文编号" width="180" show-overflow-tooltip />
                <el-table-column prop="phase" label="期数" width="100" align="center" />
                <el-table-column prop="totalArea" label="实测总面积" width="150" align="right" />
                
                <el-table-column label="计容建筑面积" align="center">
                  <el-table-column prop="calcCommercial" label="商业" width="130" align="right">
                    <template #default="{ row }"><span :class="{'highlight-val': isTarget(row, 'calcCommercial')}">{{ row.calcCommercial }}</span></template>
                  </el-table-column>
                  <el-table-column prop="calcResidential" label="住宅" width="130" align="right">
                    <template #default="{ row }"><span :class="{'highlight-val': isTarget(row, 'calcResidential')}">{{ row.calcResidential }}</span></template>
                  </el-table-column>
                  <el-table-column prop="calcPropMgmt" label="物管" width="130" align="right">
                    <template #default="{ row }"><span :class="{'highlight-val': isTarget(row, 'calcPropMgmt')}">{{ row.calcPropMgmt }}</span></template>
                  </el-table-column>
                  <el-table-column prop="calcOther" label="其他" width="130" align="right">
                    <template #default="{ row }"><span :class="{'highlight-val': isTarget(row, 'calcOther')}">{{ row.calcOther }}</span></template>
                  </el-table-column>
                </el-table-column>

                <el-table-column label="不计容建筑面积" align="center">
                  <el-table-column prop="nonCalcCommunity" label="社区" width="130" align="right">
                    <template #default="{ row }"><span :class="{'highlight-val': isTarget(row, 'nonCalcCommunity')}">{{ row.nonCalcCommunity }}</span></template>
                  </el-table-column>
                  <el-table-column prop="nonCalcOther" label="公用" width="130" align="right">
                    <template #default="{ row }"><span :class="{'highlight-val': isTarget(row, 'nonCalcOther')}">{{ row.nonCalcOther }}</span></template>
                  </el-table-column>
                </el-table-column>
                
                <el-table-column prop="reportNo" label="报告书编号" width="130" show-overflow-tooltip />
                <el-table-column prop="remarks" label="备注" min-width="80" />
              </el-table>
            </el-card>


           <el-card class="info-config-card no-print" shadow="never">
              <div class="card-title" style="text-align: center;">
                <span class="title-text">商住比及面积核算对比</span>
              </div>
              
              <!-- 关键修复1：给 el-table 绑定 :data，数据源合并商住比+面积数据 -->
              <el-table 
                :data="tableTotalData" 
                border 
                style="width: 630px; margin: 0 auto;" 
                :header-cell-style="{background:'#f0f2f5', color:'#333', fontWeight:'bold', textAlign: 'center'}"
                :cell-style="{textAlign: 'center'}"
              >
                <!-- 表头列（正常定义列，不再循环列） -->
                <el-table-column prop="label" label="核算指标" width="150" />
                <el-table-column prop="contract" label="合同约定值" width="180" />
                <el-table-column prop="measured" label="实测值" width="180" />
                <el-table-column prop="diff" label="差值 (A - B)" width="120">
                  <template #default="{ row }">
                    <!-- 只有面积类数据才显示颜色，商住比显示“-” -->
                    <span v-if="row.isArea" :class="Number(row.diff) >= 0 ? 'text-green' : 'text-red'" style="font-weight: bold;">
                      {{ row.diff }}
                    </span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>


          </div>
        </el-tab-pane>

        <el-tab-pane name="contracts" class="no-print">
          <template #label><span class="custom-tab-label"><el-icon><Document /></el-icon> 项目合同查询</span></template>
          <div class="tab-content">
            <el-table :data="contractList" style="width: 100%" stripe border :header-cell-style="{background:'#F5F7FA', color:'#333'}">
              <el-table-column prop="name" label="合同文件名称" min-width="250">
                 <template #default="{ row }"><div style="display:flex; align-items:center;"><el-icon style="margin-right:8px; font-size:16px; color:#409eff"><Document /></el-icon> <span style="font-weight:500">{{ row.name }}</span></div></template>
              </el-table-column>
              <el-table-column prop="type" label="合同类型" width="150" align="center"><template #default="{ row }"><el-tag :type="row.type === '土地出让' ? 'warning' : 'primary'" effect="plain">{{ row.type }}</el-tag></template></el-table-column>
              <el-table-column prop="no" label="合同编号" width="180" />
              <el-table-column prop="date" label="签订日期" width="150" align="center" />
              <el-table-column label="操作" width="200" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" icon="View" @click="handlePreview(row)">预览</el-button>
                  <el-button link type="primary" icon="Download" @click="handleDownload(row)">下载</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane name="reports" class="no-print">
          <template #label><span class="custom-tab-label"><el-icon><Collection /></el-icon> 项目实测报告查询</span></template>
          <div class="tab-content">
            <el-table :data="reportList" style="width: 100%" stripe border :header-cell-style="{background:'#F5F7FA', color:'#333'}">
              <el-table-column prop="name" label="报告文件名称" min-width="300">
                 <template #default="{ row }"><div style="display:flex; align-items:center;"><el-icon style="margin-right:8px; font-size:16px; color:#67C23A"><Collection /></el-icon> <span style="font-weight:500">{{ row.name }}</span></div></template>
              </el-table-column>
              <el-table-column prop="build" label="对应楼栋" width="150" align="center" />
              <el-table-column prop="version" label="版本号" width="100" align="center"><template #default="{ row }">v{{ row.version }}.0</template></el-table-column>
              <el-table-column prop="size" label="文件大小" width="120" align="center" />
              <el-table-column label="操作" width="200" align="center">
                <template #default="{ row }"><el-button link type="primary" icon="View" @click="handlePreview(row)">在线查看</el-button><el-button link type="primary" icon="Download" @click="handleDownload(row)">下载PDF</el-button></template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div id="print-area">
      <div class="print-info-section">
        <div class="print-title">{{ currentProjectName || '项目' }}房产实测信息汇总表</div>
        <div class="print-meta-row">
          <span>打印日期：2026-01-21</span>
          <span>单位：平方米</span>
        </div>
        
        
      </div>

      <table class="print-table data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>工程名称</th>
            <th>实测总面积</th>
            <th>计容-商业</th>
            <th>计容-住宅</th>
            <th>计容-物管</th>
            <th>计容-其他</th>
            <th>不计容-社区</th>
            <th>不计容-公用</th>
            <th>报告书编号</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in displayTableData" :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.projectName }}</td>
            <td>{{ row.totalArea }}</td>
            <td>{{ row.calcCommercial }}</td>
            <td>{{ row.calcResidential }}</td>
            <td>{{ row.calcPropMgmt }}</td>
            <td>{{ row.calcOther }}</td>
            <td>{{ row.nonCalcCommunity }}</td>
            <td>{{ row.nonCalcOther }}</td>
            <td>{{ row.reportNo }}</td>
          </tr>
        </tbody>
      </table>



      <table class="print-table info-table" style="width: 630px; margin: 0 auto; border-collapse: collapse;">
        <!-- 表头（模拟el-table的表头样式） -->
        <thead>
          <tr>
            <th style="width: 150px; background: #f0f2f5; color: #333; font-weight: bold; text-align: center; border: 1px solid #000; padding: 8px;">核算指标</th>
            <th style="width: 180px; background: #f0f2f5; color: #333; font-weight: bold; text-align: center; border: 1px solid #000; padding: 8px;">合同约定值</th>
            <th style="width: 180px; background: #f0f2f5; color: #333; font-weight: bold; text-align: center; border: 1px solid #000; padding: 8px;">实测值</th>
            <th style="width: 120px; background: #f0f2f5; color: #333; font-weight: bold; text-align: center; border: 1px solid #000; padding: 8px;">差值 (A - B)</th>
          </tr>
        </thead>
        <!-- 表格内容（用tableTotalData作为数据源，匹配页面逻辑） -->
        <tbody>
          <tr v-for="row in tableTotalData" :key="row.label">
            <td style="text-align: center; border: 1px solid #000; padding: 8px;">{{ row.label }}</td>
            <td style="text-align: center; border: 1px solid #000; padding: 8px;">{{ row.contract }}</td>
            <td style="text-align: center; border: 1px solid #000; padding: 8px;">{{ row.measured }}</td>
            <td style="text-align: center; border: 1px solid #000; padding: 8px; font-weight: bold;">
              <span v-if="row.isArea" :style="{ color: Number(row.diff) >= 0 ? '#67C23A' : '#F56C6C' }">
                {{ row.diff }}
              </span>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="print-footer">
        
        <div class="print-signatures">
          <div>制表人：__________</div>
          <div>审核人：__________</div>
          <div>日期：__________</div>
        </div>
      </div>
    </div>

    <el-dialog v-model="detailDialogVisible" title="楼栋实测明细 (只读)" width="800px" class="no-print">
       <el-table :data="mockDetailData1" border size="small">
          <el-table-column prop="room" label="房号" />
          <el-table-column prop="area" label="套内面积" />
          <el-table-column prop="total" label="建筑面积" />
       </el-table>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Download, DataAnalysis, Setting, View, List, Printer, Document, Collection, WarningFilled, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx' 

const route = useRoute()
const filterYear = ref('2026')
const filterProject = ref('1')
const activeTab = ref('summary')
const currentProjectName = ref('锦园雅境府（2023新）')
const projectOptions = ref([{ id: '1', name: '锦园雅境府（2023新）' }])

// --- 核心业务数据 ---
// 已废弃旧的 projectConfig / contractConfig 简单对象
// 1. 新增：商住比数据（静态，不参与计算）
const businessResidentialRatio = reactive({
  contractRatio: "≥2:8", // 合同约定商住比
  measuredRatio: "2:8"   // 实测商住比
})

// 2. 调整：面积类对比数据（适配你给的数值）
const comparisonData = reactive([
  { label: '合同约定建筑面积', contract: '242481.94', measured: '245055.4', diff: '-2573.46', isArea: true },
  { label: '合同约定商业面积', contract: '48496.39', measured: '59741.54', diff: '-11245.15', isArea: true },
  { label: '合同约定住宅面积', contract: '193985.55', measured: '185313.86', diff: '8671.69', isArea: true }
])

// 新增：合并商住比+面积数据，作为表格的数据源（关键！）
const tableTotalData = computed(() => {
  // 先放商住比数据（isArea: false 标记为非面积类）
  const ratioRow = {
    label: '商住比',
    contract: businessResidentialRatio.contractRatio,
    measured: businessResidentialRatio.measuredRatio,
    diff: '-',
    isArea: false
  }
  // 合并：商住比行 + 面积类行
  return [ratioRow, ...comparisonData]
})

// 1. 原始基础数据 (含特殊用地) - 恢复12行
const rawTableData = [
  { id: 1, projectName: '锦园雅境府1栋', certNo: '湘(2023)...325号', contractNo: '湘新2023019号', phase: 1, totalArea: 16528.66, 
    baseMap: { calcCommercial: 0, calcResidential: 16022.43, calcPropMgmt: 0, calcOther: 200.00, nonCalcCommunity: 0, nonCalcOther: 0 },
    specialDetails: { medical: 306.23 }, reportNo: '湘新2023019号' },
  { id: 2, projectName: '锦园雅境府2栋', certNo: '湘(2023)...325号', contractNo: '湘新2023019号', phase: 1, totalArea: 16565.83, 
    baseMap: { calcCommercial: 0, calcResidential: 16017.06, calcPropMgmt: 0, calcOther: 0, nonCalcCommunity: 0, nonCalcOther: 0 },
    specialDetails: { defense: 548.77 }, reportNo: '湘新2023019号' },
  // ...为了代码简洁，这里略去重复的3-12行，请务必保留您原有的完整数据结构...
  // 建议您在本地保留完整的12行数据
]

// 2. 特殊用地规则
const specialRules = ref([
  { key: 'medical', name: '社区医疗服务设施', totalArea: 306.23, targetCategory: 'calcOther' }, 
  { key: 'defense', name: '地下人防工程', totalArea: 548.77, targetCategory: 'nonCalcOther' }   
])

// 3. 计算后的展示数据 (实时分发)
const displayTableData = computed(() => {
  return rawTableData.map(row => {
    let rowData = { ...row, ...row.baseMap } 
    let hasSpecial = false
    if (row.specialDetails) {
      for (const [key, area] of Object.entries(row.specialDetails)) {
        const rule = specialRules.value.find(r => r.key === key)
        if (rule && rule.targetCategory) {
          hasSpecial = true
          rowData[rule.targetCategory] = (Number(rowData[rule.targetCategory]) + area).toFixed(2)
        }
      }
    }
    return { ...row, ...rowData, hasSpecialArea: hasSpecial }
  })
})

const totalCalculatedArea = computed(() => {
  let sum = 0
  displayTableData.value.forEach(row => {
    sum += Number(row.calcCommercial) + Number(row.calcResidential) + Number(row.calcPropMgmt) + Number(row.calcOther)
  })
  return sum.toFixed(2)
})

// --- 实时更新 comparisonData 的计算逻辑 ---
// 监听 displayTableData 的变化，实时更新对比表中的“实测计容”和“差值”
// 注意：这里为了演示，简单相加。真实逻辑可能更复杂。
import { watchEffect } from 'vue'

watchEffect(() => {
  let measuredTotal = 0
  let measuredComm = 0
  let measuredRes = 0
  
  displayTableData.value.forEach(row => {
    measuredComm += Number(row.calcCommercial)
    measuredRes += Number(row.calcResidential)
    measuredTotal += (Number(row.calcCommercial) + Number(row.calcResidential) + Number(row.calcPropMgmt) + Number(row.calcOther))
  })

  // 更新 Comparison Table
  // 1. 总建面
  comparisonData[0].measured = measuredTotal.toFixed(2)
  comparisonData[0].diff = (measuredTotal - Number(comparisonData[0].contract)).toFixed(2)
  
  // 2. 商业
  comparisonData[1].measured = measuredComm.toFixed(2)
  comparisonData[1].diff = (measuredComm - Number(comparisonData[1].contract)).toFixed(2)

  // 3. 住宅
  comparisonData[2].measured = measuredRes.toFixed(2)
  comparisonData[2].diff = (measuredRes - Number(comparisonData[2].contract)).toFixed(2)
})

const areaDiff = computed(() => comparisonData[0].diff)

const isTarget = (row, colKey) => {
  if (!row.specialDetails) return false
  return specialRules.value.some(rule => 
    Object.keys(row.specialDetails).includes(rule.key) && rule.targetCategory === colKey
  )
}

const recalculateTable = () => { console.log('规则变更，自动重算') }
const savePolicy = () => { ElMessage.success('规则已保存，报表更新完毕') }

// --- 业务数据 (Tab 2 & 3) 略，保持不变 ---
// ... (contractList, reportList)

// --- 【修改点 3】导出 Excel 逻辑升级：包含对比表 ---
// --- 【修复点 1】Excel 导出逻辑升级：列对齐 + 追加对比表 ---
const handleExportExcel = () => { 
  // 1. 准备主表数据 (严格对齐您现在的表格列)
  const mainData = displayTableData.value.map(item => ({
    '编号': item.id, 
    '工程名称': item.projectName, 
    '不动产权证编号': item.certNo,
    '实测总面积': item.totalArea, 
    '计容-商业': item.calcCommercial, 
    '计容-住宅': item.calcResidential,
    '计容-物管': item.calcPropMgmt, // 之前漏了这个
    '计容-其他': item.calcOther, 
    '不计容-社区': item.nonCalcCommunity, 
    '不计容-公用': item.nonCalcOther, 
    '报告书编号': item.reportNo
  }))

  const worksheet = XLSX.utils.json_to_sheet(mainData)

  // 2. 准备对比表数据 (转为 Array of Arrays)
  const comparisonRows = [
    [""], // 空行
    ["合同约定与实测数据核算对比"], // 标题
    ["核算指标", "合同约定面积", "实测计容面积", "差值 (A-B)"] // 表头
  ]
  comparisonData.forEach(row => {
    comparisonRows.push([row.label, row.contract, row.measured, row.diff])
  })

  // 3. 将对比表追加到 Worksheet 底部
  XLSX.utils.sheet_add_aoa(worksheet, comparisonRows, { origin: -1 }) // origin: -1 表示追加到末尾

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "实测汇总")
  XLSX.writeFile(workbook, "锦园雅境府_房产实测汇总表.xlsx")
  ElMessage.success('Excel 报表导出成功！') 
}

const pdfUrl = "/pdfs/3栋实测报告.pdf"

const contractList = ref([
  { name: '国有建设用地使用权出让合同.pdf', type: '土地出让', no: 'CR-2023-001', date: '2023-05-12', url: pdfUrl },
  { name: '建设工程规划许可证附件.pdf', type: '规划许可', no: 'GH-2023-112', date: '2023-06-20', url: pdfUrl },
  { name: '房产预测绘合同书.pdf', type: '测绘合同', no: 'CH-2023-099', date: '2023-08-01', url: pdfUrl }
])

const reportList = ref([
  { name: '锦园雅境府1栋_房屋实测报告.pdf', build: '1栋', version: 2, size: '4.5MB', url: pdfUrl },
  { name: '锦园雅境府2栋_房屋实测报告.pdf', build: '2栋', version: 1, size: '4.2MB', url: pdfUrl },
  { name: '锦园雅境府地下室_实测报告.pdf', build: '地下室', version: 3, size: '8.1MB', url: pdfUrl }
])

const handlePrint = () => { window.print() }
const handlePreview = (row) => { 
  console.log('预览行数据：', row); // 调试用，可保留
  if (row && row.url) {
    // 直接打开静态资源路径，无需 file:// 协议
    window.open(row.url, '_blank')
    ElMessage.success(`正在预览：${row.name}`)
  } else {
    ElMessage.warning('暂无预览文件')
  }
}
// 补回下载函数（和预览用同一个字段名 url）
const handleDownload = (row) => {
  if (row && row.url) {
    const a = document.createElement('a');
    a.href = row.url; // 直接用静态资源路径，无需 file://
    a.download = row.name; // 下载文件名
    a.click();
    ElMessage.success('文件下载中...');
  } else {
    ElMessage.warning('暂无可用的下载文件');
  }
}
// 在 handleDownload 下方补上这两个空函数
const handleGlobalSearch = () => { 
  // 可后续补充查询逻辑，先留空避免报错
  console.log('查询档案，当前筛选：', filterYear.value, filterProject.value);
}
const handleYearChange = () => { 
  // 年份变化逻辑，先留空
  console.log('年份变更为：', filterYear.value);
}

const detailDialogVisible = ref(false)
const currentDetailRow = ref(null)
const mockDetailData1 = ref([{ room: '101', area: '120.55', share: '12.33', total: '132.88' }])
const viewDetail = (row) => { currentDetailRow.value = row; detailDialogVisible.value = true }

onMounted(() => {
  if (route.query.year && route.query.projectId) {
    filterYear.value = route.query.year
    filterProject.value = route.query.projectId
    handleGlobalSearch()
  }
})
</script>

<style scoped>
/* 样式调整：适配表格而非描述列表 */
.info-config-card { margin-bottom: 24px; border: 1px solid #ebeef5; padding: 16px; }
.card-title { font-weight: bold; color: #333; margin-bottom: 10px; font-size: 15px; }

/* 文本颜色 */
.text-red { color: #F56C6C; }
.text-green { color: #67C23A; }

/* 其他样式保持不变 */
.archive-container { padding: 24px; background-color: #f5f7fa; min-height: 90vh; display: flex; flex-direction: column; }
.global-filter-card { background: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.filter-row { display: flex; align-items: center; gap: 24px; margin-bottom: 18px; }
.filter-item .label { font-size: 14px; color: #606266; margin-right: 8px; }
.project-meta { font-size: 14px; color: #666; border-top: 1px dashed #eee; padding-top: 15px; display: flex; align-items: center; gap: 15px; }
.content-tabs-wrapper { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.04); flex: 1; }
.tab-content { padding: 20px; }
.tab-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 20px; }
.action-btns { display: flex; gap: 15px; }
.special-policy-card { background: #fdf6ec; border: 1px solid #faecd8; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
.policy-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.policy-title { font-size: 14px; font-weight: bold; color: #E6A23C; }
.policy-items { display: flex; flex-direction: column; gap: 12px; margin-left: 30px; }
.policy-item { display: flex; align-items: center; justify-content: space-between; background: white; padding: 12px 18px; border-radius: 6px; border: 1px solid #eee; max-width: 900px; }
.policy-info { display: flex; align-items: center; gap: 20px; }
.policy-name { font-weight: bold; color: #333; width: 220px; }
.policy-stats { color: #666; font-size: 14px; width: 180px; }
.policy-control { display: flex; align-items: center; gap: 12px; }
.control-label { font-size: 13px; color: #999; }
.policy-footer { margin-top: 18px; margin-left: 30px; }
.highlight-val { color: #409EFF; font-weight: bold; }
.footer-analysis { background-color: #fcfcfc; padding: 25px; border-top: 1px solid #ebeef5; margin-top: 20px; }
.analysis-row { margin-bottom: 12px; font-size: 14px; }
.comp-line { display: flex; justify-content: flex-end; align-items: center; margin-bottom: 8px; font-size: 14px; color: #606266; }

/* 打印样式 */
#print-area { display: none; }
@media print {
   /* 1. 彻底隐藏所有非打印元素（包括左侧菜单、顶部导航） */
  .no-print, .sidebar, .header, .global-filter-card, .content-tabs-wrapper {
    display: none !important;
  }

  /* 2. 强制隐藏所有层级的滚动条 */
  html, body, #print-area {
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* 3. 让 #print-area 固定定位，完全覆盖打印页面 */
  #print-area {
    display: block !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: white !important;
    z-index: 999999 !important;
  }

  .print-title { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 15px; margin-top: 20px; }
  .print-meta-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; color: #666; }
  .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  .print-table th, .print-table td { border: 1px solid #000; padding: 8px 5px; text-align: center; }
  .print-table th { background-color: #f0f0f0; font-weight: bold; }
  .info-table td { text-align: left; padding: 10px; }
  .print-footer { margin-top: 30px; display: block; justify-content: space-between; align-items: flex-end; }
  .print-summary { font-size: 14px; }
  .print-signatures { display: flex; gap: 40px; font-size: 14px; }
  @page { size: landscape; margin: 15mm; }
}
</style>