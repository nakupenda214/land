<template>
  <div class="field-mgmt-container">
    
    <div class="page-header">
      <div class="header-left">
        <h2><el-icon><CollectionTag /></el-icon> 用地属性字段管理</h2>
        <p>配置用地性质的标准映射规则及特殊争议项的归属策略</p>
      </div>
      <div class="header-right">
        <el-button type="primary" plain icon="Refresh" @click="handleRefresh">同步后端最新定义</el-button>
        <el-button type="primary" icon="Plus">新增自定义映射</el-button>
      </div>
    </div>

    <el-card class="section-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="title-group">
            <el-icon color="#409EFF"><Discount /></el-icon>
            <span class="title">标准用地属性映射 (明确属性)</span>
          </div>
          <span class="desc">系统核心字段。测绘报告中的“常见别名”将自动映射为对应的“标准名称”并执行默认计容规则。</span>
        </div>
      </template>

      <el-table 
        :data="standardFields" 
        style="width: 100%" 
        :header-cell-style="{background:'#F5F7FA', color:'#606266', fontWeight:'600'}"
      >
        <el-table-column prop="code" label="字段编码" width="120" />
        
        <el-table-column prop="name" label="标准名称 (系统内核)" width="180">
          <template #default="{ row }">
            <span style="font-weight: bold; font-size: 14px; color: #333">{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="实际名称" min-width="300">
          <template #default="{ row }">
            <div class="alias-tags">
              <el-tag 
                v-for="(tag, index) in row.aliases" 
                :key="index" 
                type="info" 
                effect="plain" 
                size="small" 
                class="alias-tag"
              >
                {{ tag }}
              </el-tag>
              
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="category" label="默认归属" width="160">
          <template #default="{ row }">
            <el-tag v-if="row.isCalculated" type="success" effect="dark">计容建筑面积</el-tag>
            <el-tag v-else type="info" effect="dark">不计容建筑面积</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />

        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-popconfirm title="确定要删除该映射规则吗?" @confirm="handleDelete(row)" confirm-button-type="danger">
              <template #reference>
                <el-button type="danger" link icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section-card special-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="title-group">
            <el-icon color="#E6A23C"><WarningFilled /></el-icon>
            <span class="title">特殊用途字段 (需指定具体归类)</span>
            <el-tag type="warning" effect="plain" round>人工干预项</el-tag>
          </div>
          <span class="desc">此类用地属性存在争议。请在此指定其在“汇总表”中具体归属到哪一列（例如归入“计容-其他”或“不计容-公用”）。</span>
        </div>
      </template>

      <el-table 
        :data="specialFields" 
        style="width: 100%" 
        stripe
        :header-cell-style="{background:'#FEF0F0', color:'#606266', fontWeight:'600'}"
      >
        <el-table-column prop="code" label="字段编码" width="120" />
        <el-table-column prop="name" label="特殊用地名称" width="200">
          <template #default="{ row }">
            <span style="font-weight: bold; color: #333">{{ row.name }}</span>
            
          </template>
        </el-table-column>

        <el-table-column label="归属类别设定 (默认策略)" min-width="300">
          <template #default="{ row }">
            <el-select 
              v-model="row.targetCategory" 
              placeholder="请选择归属列" 
              style="width: 100%; max-width: 300px;"
              @change="(val) => handleSettingChange(row, val)"
            >
              <el-option-group label="计容建筑面积">
                <el-option label="计容 - 商业(办公)" value="calcCommercial" />
                <el-option label="计容 - 住宅" value="calcResidential" />
                <el-option label="计容 - 物管用房" value="calcPropMgmt" />
                <el-option label="计容 - 其他" value="calcOther" />
              </el-option-group>
              <el-option-group label="不计容建筑面积">
                <el-option label="不计容 - 社区用房" value="nonCalcCommunity" />
                <el-option label="不计容 - 其他公用" value="nonCalcOther" />
              </el-option-group>
            </el-select>
          </template>
        </el-table-column>

        <el-table-column prop="updateTime" label="最后更新时间" width="180" align="center" />

        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" icon="Check" @click="saveSpecialConfig(row)" plain>保存</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { CollectionTag, Discount, WarningFilled, Refresh, Delete, Check, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// --- 1. 标准字段数据 (增加 aliases 数组) ---
const standardFields = ref([
  { id: 1, code: 'RES_001', name: '住宅用地', aliases: ['普通住宅'], isCalculated: true, description: '居住类建筑面积。' },
  { id: 2, code: 'COM_001', name: '商业用地', aliases: ['商铺'], isCalculated: true, description: '经营性建筑面积。' },
  { id: 3, code: 'EDU_001', name: '物管用房', aliases: ['物业'], isCalculated: true, description: '教育设施配套。' },
  { id: 4, code: 'PUB_001', name: '其它计容', aliases: ['幼儿园'], isCalculated: true, description: '必须配套的物业办公用房。' },
  { id: 5, code: 'GAR_001', name: '社区用房', aliases: ['警卫室'], isCalculated: false, description: '地下室停车区域。' },
  { id: 6, code: 'STL_001', name: '其它公用', aliases: ['公共架空'], isCalculated: false, description: '公共开放空间。' }
])

// --- 2. 特殊字段数据 (targetCategory 对应汇总表的字段名) ---
const specialFields = ref([
  { id: 101, code: 'MED_001', name: '社区医疗卫生站', targetCategory: 'calcOther', updateTime: '2025-12-20 14:00' }, // 默认计容-其他
  { id: 102, code: 'CIV_001', name: '人防工程(平战结合)', targetCategory: 'nonCalcOther', updateTime: '2025-11-10 09:30' }, // 默认不计容-公用
  { id: 103, code: 'CUL_001', name: '文化活动中心', targetCategory: 'nonCalcCommunity', updateTime: '2026-01-05 16:20' }, // 默认不计容-社区
  { id: 104, code: 'REF_001', name: '避难层(间)', targetCategory: 'nonCalcOther', updateTime: '2025-10-01 10:00' } // 默认不计容-公用
])

// --- 交互逻辑 ---
const handleRefresh = () => { ElMessage.success('已同步最新字段定义') }
const handleDelete = (row) => { 
  standardFields.value = standardFields.value.filter(item => item.id !== row.id)
  ElMessage.success(`已删除字段：${row.name}`) 
}
const handleSettingChange = (row, val) => { console.log(`${row.name} 归属变更为: ${val}`) }
const saveSpecialConfig = (row) => {
  ElMessage.success(`[${row.name}] 的归属规则已保存！`)
  row.updateTime = new Date().toLocaleString()
}
</script>

<style scoped>
.field-mgmt-container { padding: 20px 30px; background-color: #f5f7fa; min-height: 90vh; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
.header-left h2 { margin: 0 0 8px 0; font-size: 24px; color: #303133; display: flex; align-items: center; gap: 10px; }
.header-left p { margin: 0; color: #909399; font-size: 14px; }

.section-card { margin-bottom: 30px; border-radius: 8px; border: 1px solid #ebeef5; }
.card-header { display: flex; flex-direction: column; gap: 8px; }
.title-group { display: flex; align-items: center; gap: 8px; }
.title-group .title { font-size: 16px; font-weight: bold; color: #303133; }
.desc { font-size: 13px; color: #909399; margin-left: 26px; }

/* 别名标签样式 */
.alias-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.alias-tag { border-color: #e4e7ed; background-color: #f4f4f5; color: #606266; }

/* 特殊字段卡片微调 */
.special-card :deep(.el-card__header) { border-bottom: 1px solid #faecd8; background-color: #fdf6ec; }
</style>