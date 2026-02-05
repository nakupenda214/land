<template>
  <div class="archive-container ">
    
    <div class="global-filter-card no-print">
      <div class="filter-row">
        <div class="filter-item">
          <span class="label">选择项目</span>
          <el-select 
            v-model="filterProject" 
            placeholder="请输入关键词搜索项目" 
            style="width: 300px" 
            filterable 
            clearable
            no-match-text="未找到相关项目"
          >
            <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </div>
          
        
        <el-button type="primary" icon="Search" @click="handleGlobalSearch" :disabled="!filterProject">查询档案</el-button>
      </div>
      <div class="project-meta" v-if="currentProjectInfo.id">
          当前查看：<el-tag effect="dark" size="large">{{ currentProjectInfo.name }}</el-tag>
          <span class="meta-info">
            <!-- 项目编号: {{ currentProjectInfo.code }} | -->
            <!--状态: <span style="color: #67C23A; font-weight: bold;">{{ currentProjectInfo.status }}</span> -->
          </span>
      </div>
    </div>

    <div class="content-tabs-wrapper no-print">
      <el-tabs v-model="activeTab" type="border-card" class="archive-tabs no-print">
        
        <el-tab-pane name="summary">
          <template #label><span class="custom-tab-label"><el-icon><DataAnalysis /></el-icon> 房产实测汇总表</span></template>
          
          <div class="tab-content">
            <div class="tab-actions no-print">
              
              <div class="action-btns">
                <el-button icon="Printer" @click="handlePrint" style="margin-right: 15px;">打印报表</el-button>
                <el-button type="success" color="#CAFFBF" style="color: #555" icon="Download" @click="handleExportExcel">导出 Excel</el-button>
              </div>
            </div>

            <!-- 模板修改：specialRules → unknownUsages，targetCategory → selectedTarget -->
              <transition name="el-zoom-in-top">
                <div v-if="unknownUsages.length > 0" class="special-policy-card no-print">
                  <div class="policy-header">
                    <el-icon color="#E6A23C" size="18"><WarningFilled /></el-icon>
                    <span class="policy-title">系统检测到 {{ unknownUsages.length }} 类未知用途区域，请指定其归属类别：</span>
                  </div>
                  <div class="policy-items">
                    <div v-for="(rule, index) in unknownUsages" :key="rule.id" class="policy-item">
                      <div class="policy-info">
                        <div class="policy-name">{{ rule.usageName }}</div>
                        <div class="policy-stats">出现次数: <strong>{{ rule.occurrenceCount }}</strong> | 状态: <span style="color:#F56C6C">待处理</span></div>
                      </div>
                      <div class="policy-control">
                        <span class="control-label">归入:</span>
                        <el-select v-model="rule.selectedTarget" size="small" style="width: 220px" placeholder="请选择归属分类">
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
                    <!-- 补充 loading 绑定 -->
                    <el-button type="primary" size="small" icon="Check" @click="savePolicy" :loading="isSavingPolicy">确认规则并保存</el-button>
                  </div>
                </div>
              </transition>

            

            <el-card class="table-card no-print" shadow="never">
              <template #header>
                <div class="card-header">
                  <!-- 左侧：标题 + 统计信息 -->
                  <div class="header-left">
                    <span class="main-report-title">{{ currentProjectInfo.name || '项目' }}房产实测信息汇总表</span>
                    <span style="font-weight: normal; color: #606266;">
                      (
                      已上传实测报告：<strong style="color: #409EFF">{{ surveyStats.total }}</strong> 份，
                      解析成功：<strong style="color: #67C23A">{{ surveyStats.success }}</strong> 份,
                      <el-divider direction="vertical" />
                      校验通过：<strong style="color: #67C23A">{{ surveyStats.verified }}</strong> 份，
                      校验不同：<strong style="color: #F56C6C">{{ surveyStats.unverified }}</strong> 份
                      )
                    </span>
                  </div>
                  
                  <!-- 右侧：刷新按钮（新增） -->
                  <el-button
                    type="primary"
                    size="default"
                    icon="Refresh"
                    :loading="refreshBtnLoading"
                    :disabled="isRefreshCd || !currentProjectInfo.id"
                    @click="handleRefreshSurveyData"
                    class="refresh-btn"
                  >
                    <span v-if="!isRefreshCd">刷新实测报告数据</span>
                    <span v-else>冷却中（{{ cdRemaining }}s）</span>
                  </el-button>
                </div>     

              </template>              
                <el-table 
                  :data="displayTableData" 
                  border 
                  style="width: 100%" 
                  max-height="500"
                  :header-cell-style="{background:'#F5F7FA', color:'#333', fontWeight:'bold', textAlign:'center', fontSize: '12px', padding: '4px 0'}" 
                  :cell-style="{fontSize: '12px', padding: '4px 0'}"
                  :virtual-scroll="false"
                >
                  <!-- 🔴 关键修改1：替换编号列为自增序号，隐藏内部ID -->
                  <el-table-column label="序号" type="index" width="50" align="center" fixed :index="index => index + 1" />
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

                  <el-table-column prop="pendingConfirmArea" label="待确认面积" width="120" align="center" />
                  <el-table-column prop="hasUnknownUsage" label="是否有未知用途" width="120" align="center">
                    <template #default="{ row }">
                      <el-tag :type="row.hasUnknownUsage === 1 ? 'warning' : 'success'" size="small">
                        {{ row.hasUnknownUsage === 1 ? '是' : '否' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="unknownUsageCount" label="未知用途数量" width="120" align="center" />
                  <el-table-column prop="isVerified" label="验证状态" width="100" align="center">
                    <template #default="{ row }">
                      <el-tag :type="row.isVerified === 1 ? 'success' : 'danger'" size="small">
                        {{ row.isVerified === 1 ? '验证通过' : '验证不通' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="unknownUsages" label="未知用途详情" min-width="150" show-overflow-tooltip />
                  <el-table-column prop="verificationErrorReason" label="验证失败原因" min-width="200" show-overflow-tooltip />


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
              <!-- 🔴 关键修改2：合同列表添加自增序号，隐藏ID -->
              <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />
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
              <!-- 🔴 关键修改3：报告列表添加自增序号，隐藏ID -->
              <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />
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

        <!-- 第四个tab：项目信息更新（文档信息栏） -->
        <el-tab-pane name="projectEdit" class="no-print">
          <template #label>
            <span class="custom-tab-label">
              <el-icon><Document /></el-icon> 项目信息更新
            </span>
          </template>
          <div class="tab-content">
            <!-- 项目更新表单（包裹栅格，优化布局） -->
            <el-form
              ref="projectEditRef"
              :model="projectUpdateForm"
              :rules="projectEditRules"
              label-width="120px"
              class="project-edit-form"
            >
              <!-- 隐藏ID（已修改） -->
              <el-form-item prop="id" hidden>
                <span v-text="projectUpdateForm.id" style="display: none;"></span>
              </el-form-item>

              <!-- 用栅格布局包裹表单项，2列布局，统一宽度 -->
              <el-row :gutter="20" class="form-row">
                <!-- 第一列：项目名称 -->
                <el-col :span="12">
                  <el-form-item label="项目名称" prop="projectName">
                    <el-input v-model="projectUpdateForm.projectName" placeholder="请输入项目名称（如：XX住宅小区项目）" style="width: 100%;" />
                  </el-form-item>
                </el-col>
                <!-- 第二列：项目编号 -->
                <el-col :span="12">
                  <el-form-item label="项目编号" prop="projectCode">
                    <el-input v-model="projectUpdateForm.projectCode" placeholder="请输入项目编号（如：PRJ2025001）" style="width: 100%;" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20" class="form-row">
                <!-- 第一列：项目位置（跨2列，因为长度较长） -->
                <el-col :span="24">
                  <el-form-item label="项目位置" prop="location">
                    <el-input v-model="projectUpdateForm.location" placeholder="请输入行政区+详细地址" style="width: 100%;" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20" class="form-row">
                <!-- 第一列：占地面积 -->
                <el-col :span="12">
                  <el-form-item label="占地面积（㎡）" prop="landArea">
                    <el-input-number v-model="projectUpdateForm.landArea" placeholder="请输入占地面积" style="width: 100%;" :precision="2" :min="0" />
                  </el-form-item>
                </el-col>
                <!-- 第二列：规划用途 -->
                <el-col :span="12">
                  <el-form-item label="规划用途" prop="plannedUse">
                    <el-select v-model="projectUpdateForm.plannedUse" placeholder="请选择规划用途" style="width: 100%;" clearable>
                      <el-option label="住宅" value="住宅" />
                      <el-option label="商业" value="商业" />
                      <el-option label="办公" value="办公" />
                      <el-option label="商住混合" value="商住混合" />
                      <el-option label="其他" value="其他" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20" class="form-row">
                <!-- 第一列：项目时间 -->
                <el-col :span="12">
                  <el-form-item label="项目时间" prop="projectTime">
                    <el-date-picker
                      v-model="projectUpdateForm.projectTime"
                      type="month"
                      placeholder="请选择项目时间"
                      format="YYYY年MM月"
                      value-format="YYYY年MM月"
                      style="width: 100%;"
                      clearable
                    />
                  </el-form-item>
                </el-col>
                <!-- 第二列：留空（保持布局对称，可选） -->
                <el-col :span="12"></el-col>
              </el-row>

              <el-row :gutter="20" class="form-row">
                <!-- 备注（跨2列） -->
                <el-col :span="24">
                  <el-form-item label="备注" prop="remark">
                    <el-input v-model="projectUpdateForm.remark" type="textarea" rows="3" placeholder="请输入备注信息" style="width: 100%;" />
                  </el-form-item>
                </el-col>
              </el-row>

              <!-- 提交/重置按钮 -->
              <el-form-item label="" class="form-btn-group">
                <el-button type="primary" icon="Check" @click="submitProjectUpdate" :loading="projectEditLoading">提交更新</el-button>
                <el-button icon="Refresh" @click="resetProjectForm" style="margin-left: 10px;">重置表单</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>



    <!-- <div id="print-area"> -->
    <Teleport to="#print-target" v-if="isPrinting">
        <div class="print-info-section">
          <div class="print-title">{{ currentProjectInfo.name || '项目' }}房产实测信息汇总表</div>
          <div class="print-meta-row">
            <span>打印日期：{{ currentPrintDate }}</span>
            <span>单位：平方米</span>
          </div>
        </div>

        <!-- 关键修改：class 改为 native-print-table -->
        <table class="native-print-table data-table">
          <thead>
            <tr>
              <th rowspan="2">序号</th>
              <th rowspan="2">工程名称</th>
              <th rowspan="2">不动产权证编号</th> 
              <th rowspan="2">合同/批文编号</th>   
              <th rowspan="2">期数</th>          
              <th rowspan="2">实测总面积</th>
              <th colspan="4">计容建筑面积</th>
              <th colspan="2">不计容建筑面积</th>
              <th rowspan="2">报告书编号</th>
            </tr>
            <tr>
              <th>商业</th>
              <th>住宅</th>
              <th>物管</th>
              <th>其他</th>
              <th>社区</th>
              <th>公用</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in displayTableData" :key="row.id">
              <td>{{ index + 1 }}</td>
              <td>{{ row.projectName }}</td>
              <td>{{ row.certNo }}</td>    <!-- 绑定“不动产权证编号” -->
              <td>{{ row.contractNo }}</td> <!-- 绑定“合同/批文编号” -->
              <td>{{ row.phase }}</td>     <!-- 绑定“期数” -->
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

        <!-- 关键修改：class 改为 native-print-table -->
        <table class="native-print-table info-table" style="margin-top: 20px;">
          <thead>
            <tr>
              <th style="width: 150px;">核算指标</th>
              <th style="width: 180px;">合同约定值</th>
              <th style="width: 180px;">实测值</th>
              <th style="width: 120px;">差值 (A - B)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tableTotalData" :key="row.label">
              <td>{{ row.label }}</td>
              <td>{{ row.contract }}</td>
              <td>{{ row.measured }}</td>
              <td style="font-weight: bold;">
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
    </Teleport>




      <el-dialog 
        v-model="detailDialogVisible" 
        title="楼栋实测明细 (只读)" 
        :width="auto"  
        min-width="1000px"  
        class="no-print"
        style="max-width: 90vw;"  
      >

              <!-- 新增：面积总和展示区域（优先用汇总接口的sum，简单高效） -->
        <div class="sum-info-section" style="margin-bottom: 16px; padding: 12px; background: #f5f7fa; border-radius: 6px;">
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">
            <div>
              <span style="font-weight: bold; color: #606266;">建筑面积总和：</span>
              <span style="color: #409EFF;">{{ roomSumInfo.buildingAreaSum }}</span> ㎡
            </div>
            <div>
              <span style="font-weight: bold; color: #606266;">套内面积总和：</span>
              <span style="color: #409EFF;">{{ roomSumInfo.innerAreaSum }}</span> ㎡
            </div>
            <div>
              <span style="font-weight: bold; color: #606266;">阳台面积总和：</span>
              <span style="color: #409EFF;">{{ roomSumInfo.balconyAreaSum }}</span> ㎡
            </div>
            <div>
              <span style="font-weight: bold; color: #606266;">公摊面积总和：</span>
              <span style="color: #409EFF;">{{ roomSumInfo.sharedAreaSum }}</span> ㎡
            </div>
          </div>
        </div>


        <!-- <div class="detail-table-container" style="width: 100%;">
       
        <el-table 
          :data="roomInfoData" 
          border 
          size="small"
          v-loading="detailLoading"
          element-loading-text="加载户室数据中..."
          max-height="500"
        > -->
        <div class="resizable-table-container" ref="resizableContainer">
          <!-- 表格容器：可拉伸的核心容器 -->
          <div class="detail-table-container" ref="tableContainer" style="width: 100%; height: 500px;">
              <el-table 
                :data="roomInfoData" 
                border 
                size="small"
                v-loading="detailLoading"
                element-loading-text="加载户室数据中..."
                :style="{ height: '100%' }"
                max-height="none"
              >

                <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />
                <el-table-column prop="roomLevel" label="楼层" width="80" align="center" />
                <el-table-column prop="roomNumber" label="房号" width="100" align="center" />
                <el-table-column prop="buildingArea" label="建筑面积(㎡)" width="120" align="center" />
                <el-table-column prop="innerArea" label="套内面积(㎡)" width="120" align="center" />
                <el-table-column prop="balconyArea" label="阳台面积(㎡)" width="120" align="center" />
                <el-table-column prop="sharedArea" label="公摊面积(㎡)" width="120" align="center" />
                <el-table-column prop="isCalculate" label="是否计算" width="100" align="center">
                  <template #default="{ row }">
                    <span :class="row.isCalculate === 1 ? 'red-text' : ''">
                      {{ row.isCalculate === 1 ? '是' : '否' }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="usageCategory" label="用途类别" width="120" align="center" />
                <el-table-column prop="roomUsage" label="用途" min-width="100" show-overflow-tooltip align="center"  />
                <el-table-column prop="floorAreaType" label="面积类型" width="80" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.floorAreaType === '计容' ? 'success' : 'info'" size="small">
                      {{ row.floorAreaType }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
          </div>
          
          <!-- 底部拉伸手柄 -->
          <div class="resize-handle resize-handle-bottom" @mousedown="(e) => startResize('height', e)"></div>
        </div>
        
      </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch , onUnmounted} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Download, DataAnalysis, Setting, View, List, Printer, Document, Collection, WarningFilled, Check } from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'

import axios from 'axios'
import { usePrint } from '@/hooks/usePrint.ts'

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ElForm } from 'element-plus';



// const handlePrint = () => window.print()
const { isPrinting, triggerPrint } = usePrint()
const handlePrint = () => {
  triggerPrint() // 调用 Teleport 打印逻辑
}


const route = useRoute()
const router = useRouter()

const resizableContainer = ref(null) // 拉伸外层容器ref
const tableContainer = ref(null) // 表格容器ref
const isResizing = ref(false) // 是否正在拉伸
const resizeType = ref('') // 拉伸类型：width/height/both

// 开始拉伸
const startResize = (type, e) => {
  isResizing.value = true
  resizeType.value = type
  e.preventDefault()
  
  const container = tableContainer.value
  const startY = e.clientY
  const startHeight = container.offsetHeight
  
  const handleMouseMove = (e) => {
    if (!isResizing.value) return
    // 高度调整：最小300px，最大为视口高度的90%
    if (resizeType.value === 'height') {
      const newHeight = Math.max(300, startHeight + (e.clientY - startY))
      // 限制最大高度为视口的90%
      container.style.height = `${Math.min(newHeight, window.innerHeight * 0.9)}px`
    }
  }
  
  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}
// 组件卸载时清理事件（避免内存泄漏）
onUnmounted(() => {
  if (cdTimer) {
    clearInterval(cdTimer);
  }

  document.removeEventListener('mousemove', () => {})
  document.removeEventListener('mouseup', () => {})
})

// --- 页面状态 ---
const activeTab = ref('summary')
const filterProject = ref('') // 核心：选中的项目ID
const projectOptions = ref([]) 
const filterYear = ref(new Date().getFullYear().toString()) 

// --- 项目详情 ---
const currentProjectInfo = reactive({
  id: '',
  name: '请选择项目', 
  code: '-',        
  status: '-'    
})

const surveyStats = computed(() => {
  // 无项目选中时，直接返回 0
  if (!filterProject.value) {
    return { total: 0, success: 0, verified: 0, unverified: 0 }
  }
  const verifiedCount = rawTableData.value.filter(item => item.isVerified === 1).length;
  const unverifiedCount = rawTableData.value.filter(item => item.isVerified === 0).length;
  // 有项目时：
  // total = tab3 实测报告列表长度（所有已上传的）
  // success = tab1 汇总表长度（解析成功的，因为汇总表只返回解析成功的数据）
  return {
    total: reportList.value.length,
    success: rawTableData.value.length,
    verified: verifiedCount, // 新增：校验通过数
    unverified: unverifiedCount 
  }
})


// --- 对比表数据 ---
const businessResidentialRatio = reactive({ contractRatio: "≥2:8", measuredRatio: "-" })
const comparisonData = reactive([
  { label: '合同约定建筑面积', contract: '-', measured: '-', diff: '-', isArea: true },
  { label: '合同约定商业面积', contract: '-', measured: '-', diff: '-', isArea: true },
  { label: '合同约定住宅面积', contract: '-', measured: '-', diff: '-', isArea: true }
])
const tableTotalData = computed(() => {
  const ratioRow = { label: '商住比', contract: businessResidentialRatio.contractRatio, measured: businessResidentialRatio.measuredRatio, diff: '-', isArea: false }
  return [ratioRow, ...comparisonData]
})

// --- 列表数据源 ---
const rawTableData = ref([])
const reportList = ref([])
const contractList = ref([])
const unknownUsages = ref([]) // 【新增】未知用途列表
const isSavingPolicy = ref(false)



const categoryMap = {
  'calcCommercial':   { usageCategory: 'COMMERCIAL', floorAreaType: 'BUILDABLE' },
  'calcResidential':  { usageCategory: 'RESIDENTIAL', floorAreaType: 'BUILDABLE' },
  'calcPropMgmt':     { usageCategory: 'MANAGEMENT', floorAreaType: 'BUILDABLE' },
  'calcOther':        { usageCategory: 'OTHER_BUILDABLE', floorAreaType: 'BUILDABLE' },
  'nonCalcCommunity': { usageCategory: 'COMMUNITY', floorAreaType: 'NON_BUILDABLE' },
  'nonCalcOther':     { usageCategory: 'OTHER_PUBLIC', floorAreaType: 'NON_BUILDABLE' }
}

const usageCategoryMap = {
  'RESIDENTIAL': '住宅',
  'COMMERCIAL': '商业/办公',
  'MANAGEMENT': '物管用房',
  'COMMUNITY': '社区用房',
  'OTHER_BUILDABLE': '其他计容',
  'OTHER_PUBLIC': '其他公用',
  'UNKNOWN': '未知'
}

// --- 新增：面积总和存储（响应式） ---
const roomSumInfo = reactive({
  buildingAreaSum: '0.00',
  innerAreaSum: '0.00',
  balconyAreaSum: '0.00',
  sharedAreaSum: '0.00'
})


// --- 核心 API 逻辑 ---

// 1. 获取项目列表
const fetchProjectList = async () => {
  try {
    const res = await axios.get('/api/project/list')
    if (res.data.code === 200) {
      projectOptions.value = res.data.data.map(item => ({
        id: String(item.id),
        name: item.projectName
      }))
    }
  } catch (error) { console.error(error) }
}

const currentPrintDate = computed(() => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，补前导0
  const day = String(date.getDate()).padStart(2, '0'); // 日期补前导0
  return `${year}-${month}-${day}`;
});

// 2. 获取详情 & 触发数据拉取
const fetchProjectDetail = async (projectId) => {
  if (!projectId) return;
  
  // 1. 先更新项目基本信息
  const projectItem = projectOptions.value.find(p => p.id === projectId);
  if (projectItem) {
    currentProjectInfo.id = projectId;
    currentProjectInfo.name = projectItem.name;
    currentProjectInfo.code = `XM-${String(projectId).padStart(3, '0')}`;
    currentProjectInfo.status = '已归档';
  }

  // 2. 并行拉取：tab2/tab3 数据 + tab1 汇总表数据
  try {
    await Promise.all([
      fetchProjectData(projectId), // tab2（合同）、tab3（报告文件）
      fetchSurveyReports(projectId) // tab1（汇总表）
    ]);
    ElMessage.success('所有数据加载完成');
  } catch (error) {
    console.error('数据加载异常：', error);
    ElMessage.warning('部分数据加载失败，请检查');
  }
};
// 补全文件大小格式化函数
const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// 3. 拉取业务数据 (合同+报告)
const fetchProjectData = async (projectId) => {
  if (!projectId) return;
  
  const loading = ElLoading.service({ 
    lock: true, 
    text: '加载文件数据中...', 
    background: 'rgba(0, 0, 0, 0.1)' 
  })
  console.log('拉取文件数据，项目ID：', projectId);
  try {
    const res = await axios.get(`/api/file/project/${projectId}`)
    if (res.data.code === 200 && Array.isArray(res.data.data)) {
      const fileList = res.data.data;
      console.log('获取到文件列表：', fileList);
      
      // ① 赋值项目基本信息
      currentProjectInfo.id = projectId;
      currentProjectInfo.name = projectOptions.value.find(p => p.id === projectId)?.name || `未知项目(${projectId})`;
      currentProjectInfo.code = `XM-${String(projectId).padStart(3, '0')}`;
      
      // ② 拆分合同列表
      contractList.value = fileList
      .filter(file => file.fileContextType === 'CONTRACT' || (file.originalName && file.originalName.includes('合同')))
      .map(file => ({
        // 🔴 隐藏内部ID，仅保留业务字段
        name: file.originalName || '未命名合同.pdf',
        type: '土地出让',
        no: '-',
        date: file.uploadTime ? file.uploadTime.split('T')[0] : '-',
        fileId: file.gridfsId
      }));

      // ③ 拆分报告列表
      reportList.value = fileList
      
      .filter(file => file.fileContextType === 'SURVEY_REPORT' || (file.originalName && (file.originalName.includes('报告') || file.originalName.includes('实测'))))
      .map(file => ({
        // 🔴 隐藏内部ID，仅保留业务字段
        name: file.originalName || '未命名实测报告.pdf',
        build: '-',
        version: 1,
        size: formatFileSize(file.fileSize),
        fileId: file.gridfsId
      }));

      ElMessage.success(`加载成功：合同${contractList.value.length}份，实测报告${reportList.value.length}份`);
    }
  } catch (error) {
    console.error('拉取文件数据失败：', error);
    ElMessage.error('拉取文件数据失败，请重试');
  } finally {
    loading.close();
  }
}
const fetchSurveyReports = async (projectId) => {
  if (!projectId) return;
  
  try {
    const res = await axios.get(`/api/project/${projectId}/survey-reports/parsed`); // 注意接口前缀是否需要 /api，根据你的后端调整
    if (res.data.code === 200 && Array.isArray(res.data.data)) {
      const surveyData = res.data.data;
      
      // 映射接口返回字段到 tab1 汇总表的列（按你的接口返回字段调整）
      rawTableData.value = surveyData.map(item => ({
        // 🔴 保留内部ID但不展示，仅用于key绑定
        id: item.id || '-', 
        projectName: item.buildingName || '未知楼栋', // 工程名称（楼栋名）
        certNo: item.propertyCertificateNumber || '-', // 不动产权证编号
        contractNo: item.propertyAreaConfirmationNoticeNumber || '-', // 合同/批文编号
        phase: item.phase || '-', // 期数
        totalArea: (item.actualTotalBuildingArea || 0).toFixed(2), // 实测总面积
        // 计容建筑面积
        calcCommercial: (item.actualCommercialArea || 0).toFixed(2), // 商业
        calcResidential: (item.actualResidentialArea || 0).toFixed(2), // 住宅
        calcPropMgmt: (item.actualManagementRoomArea || 0).toFixed(2), // 物管
        calcOther: (item.actualOtherBuildableArea || 0).toFixed(2), // 其他计容
        // 不计容建筑面积
        nonCalcCommunity: (item.actualCommunityArea || 0).toFixed(2), // 社区
        nonCalcOther: (item.actualOtherPublicArea || 0).toFixed(2), // 公用
        reportNo: item.realEstateSurveyReportNumber || '-', // 报告书编号
        remarks: item.remark || '-', // 备注
        

        pendingConfirmArea: item.pendingConfirmArea || 0, // 待确认面积
        unknownUsages: item.unknownUsages || '[]', // 未知用途JSON
        unknownUsageCount: item.unknownUsageCount || 0, // 未知用途数量
        isVerified: item.isVerified || 0, // 验证状态
        hasUnknownUsage: item.hasUnknownUsage || 0, // 标记是否有未知用途
        verificationErrorReason: item.verificationErrorReason || '-' ,// 验证失败原因

        roomInfoBuildingAreaSum: item.roomInfoBuildingAreaSum || 0,
        roomInfoInnerAreaSum: item.roomInfoInnerAreaSum || 0,
        roomInfoBalconyAreaSum: item.roomInfoBalconyAreaSum || 0,
        roomInfoSharedAreaSum: item.roomInfoSharedAreaSum || 0


      }));

      // 计算商住比对比表数据（可选，根据需要调整）
      const totalContractArea = 0; // 可从合同接口获取，或暂时设为0
      const totalMeasuredArea = surveyData.reduce((sum, item) => sum + Number(item.actualTotalBuildingArea || 0), 0);
      const totalCommercial = surveyData.reduce((sum, item) => sum + Number(item.actualCommercialArea || 0), 0);
      const totalResidential = surveyData.reduce((sum, item) => sum + Number(item.actualResidentialArea || 0), 0);
      
      // 更新对比表数据
      comparisonData[0].contract = totalContractArea.toFixed(2);
      comparisonData[0].measured = totalMeasuredArea.toFixed(2);
      comparisonData[0].diff = (totalMeasuredArea - totalContractArea).toFixed(2);
      comparisonData[1].contract = '0.00'; // 合同商业面积，可从合同接口补充
      comparisonData[1].measured = totalCommercial.toFixed(2);
      comparisonData[1].diff = totalCommercial.toFixed(2);
      comparisonData[2].contract = '0.00'; // 合同住宅面积，可从合同接口补充
      comparisonData[2].measured = totalResidential.toFixed(2);
      comparisonData[2].diff = totalResidential.toFixed(2);

      // 检查是否有未知用途，拉取接口2
      const hasUnknown = surveyData.some(item => item.hasUnknownUsage === 1);
      if (hasUnknown) {
        await fetchUnknownUsages(projectId);
      } else {
        unknownUsages.value = [];
      }

      console.log('tab1 汇总表数据加载完成：', rawTableData.value);
    }
  } catch (error) {
    console.error('拉取 tab1 实测报告数据失败：', error);
    ElMessage.error('汇总表数据加载失败，请重试');
  }
};

const fetchUnknownUsages = async (projectId) => {
  try {
    const res = await axios.get(`/api/usage-config/unknown/project/${projectId}`)
    if (res.data.code === 200 && res.data.data) {
      // 增加 selectedTarget 字段用于双向绑定
      unknownUsages.value = res.data.data.map(item => ({ ...item, selectedTarget: '' }))
    }
  } catch (e) { console.error('未知用途加载失败', e) }
}

const savePolicy = async () => {
  // 筛选出已选择的规则
  const validRules = unknownUsages.value.filter(u => u.selectedTarget);
  if (validRules.length === 0) return ElMessage.warning('请至少指定一项归属规则');

  isSavingPolicy.value = true;
  try {
    // 并行提交所有规则 (接口4)
    const promises = validRules.map(rule => {
      const mapping = categoryMap[rule.selectedTarget]; // 获取 6选1 对应的后端参数
      return axios.post('/api/usage-config/create-from-unknown', null, {
        params: {
          unknownUsageId: rule.id,
          usageCategory: mapping.usageCategory,
          floorAreaType: mapping.floorAreaType,
          isRegex: 1, // 默认
          priority: 1000 // 默认
        }
      });
    });

    await Promise.all(promises);
    ElMessage.success(`成功保存 ${validRules.length} 条规则，正在刷新数据...`);

    // 调用刷新接口 (接口3)
    await axios.post(`/api/project/${currentProjectInfo.id}/refresh-survey-reports`);

    // 重新拉取 tab1 汇总表数据（关键修改：只刷新tab1，无需刷新文件数据）
    await fetchSurveyReports(currentProjectInfo.id);

  } catch (e) {
    console.error(e);
    ElMessage.error('保存规则失败');
  } finally {
    isSavingPolicy.value = false;
  }
};

const displayTableData = computed(() => {
  return rawTableData.value; // 直接返回，无需解构baseMap
});

// --- 新增：刷新按钮相关状态（冷却时间建议设60秒，可修改）---
const REFRESH_CD_SECONDS = 15; // 刷新冷却时间，单位：秒
const refreshBtnLoading = ref(false); // 刷新按钮加载状态
const isRefreshCd = ref(false); // 是否处于冷却中
const cdRemaining = ref(REFRESH_CD_SECONDS); // 剩余冷却时间
let cdTimer = null; // 冷却倒计时定时器（非响应式，仅用于存储定时器ID）

// --- 新增：核心刷新函数 ---
// --- 核心刷新函数（修改：点击即冷却）---
const handleRefreshSurveyData = async () => {
  // 1. 校验：是否选中项目
  if (!currentProjectInfo.id) {
    ElMessage.warning('请先选择项目再进行刷新');
    return;
  }

  // 2. 校验：是否已在冷却中（防止重复点击）
  if (isRefreshCd.value) {
    ElMessage.warning(`请等待 ${cdRemaining.value} 秒后再刷新`);
    return;
  }

  // 3. 【关键修改：点击即冷却，提前启动倒计时】
  startRefreshCd();

  try {
    // 4. 开始刷新：设置按钮加载状态
    refreshBtnLoading.value = true;
    ElMessage.info('正在刷新项目实测报告数据，请稍候...');

    // 5. 调用刷新接口（POST 请求，对应你提供的接口地址）
    await axios.post(`/api/project/${currentProjectInfo.id}/refresh-survey-reports`);

    // 6. 刷新成功：重新拉取汇总表数据（核心：刷新后更新页面展示）
    await fetchSurveyReports(currentProjectInfo.id);

    // 7. 提示用户刷新成功
    ElMessage.success('项目实测报告数据刷新完成，已重新加载汇总表');

  } catch (error) {
    // 8. 异常处理：提示错误信息
    console.error('刷新实测报告数据失败：', error);
    ElMessage.error('刷新失败，请检查网络或稍后重试');

  } finally {
    // 9. 无论成功失败：仅结束加载状态（冷却已提前启动，无需再处理）
    refreshBtnLoading.value = false;
  }
};


// --- 交互事件 ---
const handleGlobalSearch = () => { 
  if (filterProject.value) fetchProjectDetail(filterProject.value)
  else ElMessage.warning('请先选择项目')
}

// 在线预览（用 GridFS ID 接口）
const handlePreview = (row) => { 
  if (row.fileId) {
    // ✅ 关键修改：添加 gridfs 路径层级
    const url = `/api/file/download/gridfs/${row.fileId}`
    window.open(url, '_blank')
  } else {
    ElMessage.warning('文件ID丢失，无法预览')
  }
}

// 文件下载（用 GridFS ID 接口）
const handleDownload = (row) => {
  if (row.fileId) {
    // ✅ 关键修改：添加 gridfs 路径层级
    const url = `/api/file/download/gridfs/${row.fileId}`
    const link = document.createElement('a')
    link.href = url
    link.download = row.name // 指定下载文件名
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } else {
    ElMessage.warning('文件ID丢失，无法下载')
  }
}

const handleExportExcel = async () => {
  // 1. 创建一个新的 Excel 工作簿
  const workbook = new ExcelJS.Workbook();
  // 2. 添加一个工作表，命名为「房产实测汇总表」
  const worksheet = workbook.addWorksheet('房产实测汇总表');

  // 3. 构建表头数据（多级表头，和你之前的结构一致）
  const headerData = [
    [
      '序号', '工程名称', '不动产权证编号', '合同/批文编号', '期数',
      '实测总面积', '计容建筑面积', '计容建筑面积', '计容建筑面积', '计容建筑面积',
      '不计容建筑面积', '不计容建筑面积', '报告书编号', '备注'
    ],
    [
      '', '', '', '', '',
      '', '商业', '住宅', '物管', '其他',
      '社区', '公用', '', ''
    ]
  ];

  // 4. 构建表格数据（和你之前的结构一致）
  const dataRows = displayTableData.value.map((item, index) => [
    index + 1,
    item.projectName,
    item.certNo,
    item.contractNo,
    item.phase,
    Number(item.totalArea).toFixed(2),
    Number(item.calcCommercial).toFixed(2),
    Number(item.calcResidential).toFixed(2),
    Number(item.calcPropMgmt).toFixed(2),
    Number(item.calcOther).toFixed(2),
    Number(item.nonCalcCommunity).toFixed(2),
    Number(item.nonCalcOther).toFixed(2),
    item.reportNo,
    item.remarks
  ]);

  // 5. 写入表头到工作表（前 2 行是表头）
  headerData.forEach((row, rowIndex) => {
    worksheet.addRow(row);
    // 表头加粗 + 居中（水平+垂直）
    row.forEach((_, colIndex) => {
      const cell = worksheet.getCell(rowIndex + 1, colIndex + 1); // exceljs 行/列从 1 开始
      cell.font = { bold: true };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true // 自动换行（防止表头内容溢出）
      };
    });
  });

  // 6. 写入表格数据到工作表
  dataRows.forEach((row) => {
    const addedRow = worksheet.addRow(row);
    // 数据单元格居中（水平+垂直）
    addedRow.eachCell((cell) => {
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
    });
  });

  // 7. 设置合并单元格（和你之前的规则一致）
  worksheet.mergeCells('G1:J1'); // 合并「计容建筑面积」（第 7 列到第 10 列，第 1 行）
  worksheet.mergeCells('K1:L1'); // 合并「不计容建筑面积」（第 11 列到第 12 列，第 1 行）

  // 8. 设置列宽（和你之前的需求一致，合理分配列宽）
  const columnWidths = [
    6, 20, 20, 18, 8, 12,
    10, 10, 10, 10, 10, 10,
    16, 12
  ];
  worksheet.columns.forEach((col, index) => {
    col.width = columnWidths[index] || 10; // 给每一列设置对应宽度
  });

  // 9. 设置行高（表头行高略高，更美观）
  worksheet.getRow(1).height = 30; // 第 1 行（合并表头）行高
  worksheet.getRow(2).height = 25; // 第 2 行（子表头）行高

  // 10. 导出 Excel 文件并下载
  const buffer = await workbook.xlsx.writeBuffer(); // 生成二进制缓冲区
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `${currentProjectInfo.name || '项目'}房产实测汇总表.xlsx`);

  // 11. 提示导出成功
  ElMessage.success('Excel 导出成功！');
};

const detailDialogVisible = ref(false)

const roomInfoData = ref([]) // 存储户室面积数据
const detailLoading = ref(false) // 详情加载状态

const viewDetail = async (row) => {
  if (!currentProjectInfo.id || !row.id) { // row.id 是实测报告ID
    ElMessage.warning('缺少项目/报告ID，无法查看详情')
    return
  }
  
  detailLoading.value = true
  detailDialogVisible.value = true // 先打开弹窗，避免用户等待
  
  try {
    const summaryRow = rawTableData.value.find(item => item.id === row.id)
    console.log(rawTableData.value)
    if (summaryRow) {
      roomSumInfo.buildingAreaSum = summaryRow.roomInfoBuildingAreaSum?.toFixed(2) || '0.00'
      roomSumInfo.innerAreaSum = summaryRow.roomInfoInnerAreaSum?.toFixed(2) || '0.00'
      roomSumInfo.balconyAreaSum = summaryRow.roomInfoBalconyAreaSum?.toFixed(2) || '0.00'
      roomSumInfo.sharedAreaSum = summaryRow.roomInfoSharedAreaSum?.toFixed(2) || '0.00'
    } else {
      // 兜底：初始化为0
      roomSumInfo.buildingAreaSum = '0.00'
      roomSumInfo.innerAreaSum = '0.00'
      roomSumInfo.balconyAreaSum = '0.00'
      roomSumInfo.sharedAreaSum = '0.00'
    }

    // 调用户室面积接口
    const res = await axios.get(`/api/project/${currentProjectInfo.id}/survey-reports/${row.id}/room-info`)
    console.log(currentProjectInfo.id, row.id, '户室面积接口响应：')
    if (res.data.code === 200 && Array.isArray(res.data.data)) {
      // 格式化数据（保留重要字段，处理小数位数）
      roomInfoData.value = res.data.data.map(item => ({
        id: item.id,
        roomLevel: item.roomLevel || '-', // 楼层
        roomNumber: item.roomNumber || '-', // 房号
        buildingArea: (item.buildingArea || 0).toFixed(2), // 建筑面积
        innerArea: (item.innerArea || 0).toFixed(2), // 套内面积
        balconyArea: (item.balconyArea || 0).toFixed(2), // 阳台面积
        sharedArea: (item.sharedArea || 0).toFixed(2), // 公摊面积
        isCalculate: item.isCalculate || 0,
        usageCategory: usageCategoryMap[item.usageCategory] || '未知', // 新增：用途类别（转中文）
        roomUsage: item.roomUsage || '-', // 用途
        floorAreaType: item.floorAreaType === 'BUILDABLE' ? '计容' : '不计容' // 面积类型
      }));
      
    } else {
      roomInfoData.value = []
      ElMessage.warning('暂无户室面积数据')
    }
  } catch (error) {
    console.error('获取户室面积失败：', error)
    ElMessage.error('获取户室面积数据失败，请重试')
    roomInfoData.value = []
  } finally {
    detailLoading.value = false
  }
}
const isTarget = () => false

// --- 新增：重置冷却状态函数 ---
const resetRefreshCdStatus = () => {
  isRefreshCd.value = false;
  cdRemaining.value = REFRESH_CD_SECONDS;
  // 清除定时器
  if (cdTimer) {
    clearInterval(cdTimer);
    cdTimer = null;
  }
  // 清除当前项目的冷却缓存
  const cdStorageKey = currentProjectInfo.id ? `refresh_cd_${currentProjectInfo.id}` : null;
  if (cdStorageKey) localStorage.removeItem(cdStorageKey);
};

// --- 新增：获取当前项目的冷却缓存Key（和项目ID绑定）---
const getRefreshCdStorageKey = () => {
  return currentProjectInfo.id ? `refresh_cd_${currentProjectInfo.id}` : null;
};

// --- 新增：启动冷却倒计时函数 ---
const startRefreshCd = () => {
  const cdStorageKey = getRefreshCdStorageKey();
  if (!cdStorageKey) return; // 没有项目ID则不启动

  isRefreshCd.value = true;
  cdRemaining.value = REFRESH_CD_SECONDS;

  // 记录冷却开始时间到本地缓存（和项目绑定）
  const cdStartAt = Date.now();
  localStorage.setItem(cdStorageKey, JSON.stringify({
    startAt: cdStartAt,
    remaining: REFRESH_CD_SECONDS
  }));

  // 清除旧定时器
  if (cdTimer) {
    clearInterval(cdTimer);
  }

  // 新定时器：每秒更新剩余时间 + 缓存
  cdTimer = setInterval(() => {
    cdRemaining.value--;

    // 更新本地缓存的剩余时间
    const storedCd = JSON.parse(localStorage.getItem(cdStorageKey) || '{}');
    if (storedCd.startAt) {
      storedCd.remaining = cdRemaining.value;
      localStorage.setItem(cdStorageKey, JSON.stringify(storedCd));
    }

    // 冷却结束：重置状态 + 清除缓存
    if (cdRemaining.value <= 0) {
      clearInterval(cdTimer);
      cdTimer = null;
      isRefreshCd.value = false;
      localStorage.removeItem(cdStorageKey);
    }
  }, 1000);
};



// 项目更新表单引用
const projectEditRef = ref(null);
// 项目更新表单加载/提交状态
const projectEditLoading = ref(false);
// 项目更新表单数据（对应 ProjectUpdateDTO）
const projectUpdateForm = reactive({
  id: '', // 必填，项目ID
  projectName: '',
  projectCode: '',
  location: '',
  landArea: null,
  plannedUse: '',
  projectTime: '',
  remark: ''
});
// 项目更新表单校验规则
const projectEditRules = reactive({
  id: [{ required: true, message: '项目ID不能为空', trigger: 'blur' }],
   projectTime: [{ required: false, message: '项目时间格式错误', trigger: 'change' }]
});
// 1. 拉取项目原始数据（填充表单）：调用 POST /project/projects/query

// 1. 拉取项目原始数据（填充表单）：调用 POST /project/projects/query
const fetchProjectOriginalData = async (projectId) => {
  if (!projectId) return;
  try {
    const res = await axios.post('/api/project/projects/query', {
      projectId: Number(projectId)
    });
    if (res.data.code === 200 && res.data.data.records.length > 0) {
      const projectOriginal = res.data.data.records[0];
      // 🔥 核心修改：删除 Object.defineProperty，直接赋值 ID（无需冻结，前端无修改入口）
      projectUpdateForm.id = projectOriginal.id;
      
      // 其他字段赋值不变
      projectUpdateForm.projectName = projectOriginal.projectName || '';
      projectUpdateForm.projectCode = projectOriginal.projectCode || '';
      projectUpdateForm.location = projectOriginal.location || '';
      projectUpdateForm.landArea = projectOriginal.landArea || null;
      projectUpdateForm.plannedUse = projectOriginal.plannedUse || '';
      projectUpdateForm.projectTime = projectOriginal.projectTime || '';
      projectUpdateForm.remark = projectOriginal.remark || '';
    }
  } catch (error) {
    console.error('拉取项目原始数据失败：', error);
    ElMessage.error('拉取项目原始数据失败，无法编辑');
  }
};

// 2. 提交项目更新数据：调用 PUT /project/update
// 2. 提交项目更新数据：调用 PUT /project/update
const submitProjectUpdate = async () => {
  if (!projectEditRef.value) return;
  
  // 🔥 打印1：提交函数入口，先看 projectUpdateForm 完整数据（最关键）
  console.log('===== 提交函数入口 - projectUpdateForm 完整数据 =====');
  console.log('projectUpdateForm：', projectUpdateForm);
  console.log('ID是否存在：', projectUpdateForm.id, '（类型：', typeof projectUpdateForm.id, '）');
  console.log('是否有非空字段：', JSON.stringify(projectUpdateForm) !== '{"id":"","projectName":"","projectCode":"","location":"","landArea":null,"plannedUse":"","projectTime":"","remark":""}');
  
  // 前置校验：确保 ID 存在
  if (!projectUpdateForm.id) {
    ElMessage.warning('项目ID异常，请切换其他tab再切回重试');
    return;
  }
  
  // 第一步：表单校验
  try {
    await projectEditRef.value.validate();
    
    // 🔥 打印2：表单校验通过后，再次确认数据（排除校验修改数据的可能）
    console.log('===== 表单校验通过 - 待构造请求体的数据 =====');
    console.log('projectUpdateForm 此时的数据：', projectUpdateForm);
    
  } catch (error) {
    ElMessage.warning('表单校验失败，请检查填写内容');
    return;
  }

  // 第二步：提交更新
  projectEditLoading.value = true;
  try {
    // 构造请求体
    const requestData = {
    id: projectUpdateForm.id,
    projectName: projectUpdateForm.projectName,
    projectCode: projectUpdateForm.projectCode,
    location: projectUpdateForm.location,
    landArea: projectUpdateForm.landArea,
    plannedUse: projectUpdateForm.plannedUse,
    projectTime: projectUpdateForm.projectTime,
    remark: projectUpdateForm.remark
  };

    const res = await axios.put('/api/project/update', requestData);
    
    // 判断业务成功
    if (res.data.code === 0 || res.data.code === 200 || res.data.code === 201) { // 兼容 201（后端返回的 code）
      ElMessage.success('项目信息更新成功！');
      await refreshProjectRelatedData();
    } else {
      ElMessage.error('项目信息更新失败：' + (res.data.msg || '后端业务处理异常'));
    }
  } catch (error) {
    console.error('===== 提交请求捕获异常 =====');
    console.error('异常信息：', error);
    ElMessage.error('提交项目更新失败，请检查接口或网络');
  } finally {
    projectEditLoading.value = false;
  }
};
// 补充：重置项目更新表单（之前缺失，导致点击无作用）
const resetProjectForm = () => {
  if (!projectEditRef.value) return;
  
  // 步骤1：清除表单校验状态
  projectEditRef.value.clearValidate();
  
  // 步骤2：重置表单数据（保留只读的ID，其余字段置空/还原原始值）
  const originalProjectId = projectUpdateForm.id; // 保留ID
  Object.assign(projectUpdateForm, {
    // projectName: '',
    projectCode: '',
    location: '',
    landArea: null,
    plannedUse: '',
    projectTime: '',
    remark: ''
  });
 
  // 可选：重置后重新拉取原始数据，恢复到初始状态（更友好）
  if (filterProject.value) {
    fetchProjectOriginalData(filterProject.value);
  }
  
  ElMessage.info('表单已重置');
};
// 补全：刷新项目相关数据（更新成功后调用，形成闭环）
const refreshProjectRelatedData = async () => {
  if (!filterProject.value) return;
  
  try {
    // 1. 刷新项目下拉列表（防止项目名称修改后，下拉框显示旧数据）
    await fetchProjectList();
    
    // 2. 刷新当前项目的基础信息（tab1的项目名称、编号等）
    await fetchProjectDetail(filterProject.value);
    
    // 3. 刷新项目更新表单的原始数据（让表单显示最新更新后的结果）
    await fetchProjectOriginalData(filterProject.value);
    
  } catch (error) {
    console.error('刷新项目关联数据失败：', error);
    ElMessage.warning('项目信息更新成功，但关联数据刷新失败，可手动刷新页面');
  }
};
// 监听 tab 切换，切换到项目更新tab时，自动拉取原始数据
watch(activeTab, (newVal) => {
  if (newVal === 'projectEdit' && filterProject.value) {
    fetchProjectOriginalData(filterProject.value);
  }
});
// --- 新增：启动冷却倒计时函数 ---
// const startRefreshCd = () => {
//   // 1. 初始化冷却状态
//   isRefreshCd.value = true;
//   cdRemaining.value = REFRESH_CD_SECONDS;

//   // 2. 清除旧定时器（防止重复创建）
//   if (cdTimer) {
//     clearInterval(cdTimer);
//   }

//   // 3. 创建新定时器，每秒更新剩余时间
//   cdTimer = setInterval(() => {
//     cdRemaining.value--;

//     // 4. 冷却结束：清除定时器，恢复按钮状态
//     if (cdRemaining.value <= 0) {
//       clearInterval(cdTimer);
//       cdTimer = null;
//       isRefreshCd.value = false;
//     }
//   }, 1000);
// };


// --- 生命周期 & 核心修改：保存/恢复项目ID ---
// watch(filterProject, (newVal) => {
//   if (newVal) {
//     localStorage.setItem('projectFilterStatus', newVal)
//   } else {
//     localStorage.removeItem('projectFilterStatus')
//     reportList.value = []
//     rawTableData.value = []
//   }
// })
// --- 生命周期 & 核心修改：保存/恢复项目ID ---
watch(filterProject, (newVal, oldVal) => {
  if (newVal) {
    localStorage.setItem('projectFilterStatus', newVal)
    // 切换项目时，清除旧项目的冷却缓存
    if (oldVal) {
      const oldCdKey = `refresh_cd_${oldVal}`;
      localStorage.removeItem(oldCdKey);
    }
  } else {
    // 1. 清空本地缓存
    localStorage.removeItem('projectFilterStatus');
    // 2. 清空所有项目相关数据
    reportList.value = [];
    rawTableData.value = [];
    unknownUsages.value = [];
    // 3. 重置项目基本信息（关键：清空ID让刷新按钮禁用）
    Object.assign(currentProjectInfo, {
      id: '',
      name: '请选择项目',
      code: '-',
      status: '-'
    });
    // 4. 重置冷却状态（项目都清了，冷却没用了）
    resetRefreshCdStatus();
    // 重置商住比
    Object.assign(businessResidentialRatio, {
      contractRatio: "≥2:8", // 恢复默认值
      measuredRatio: "-"
    });
    // 重置面积核算数组（恢复初始默认值）
    comparisonData.forEach(item => {
      item.contract = '0.00';
      item.measured = '0.00';
      item.diff = '0.00';
    });
  }
})

// 2. 页面初始化
// onMounted(async () => {
//   // A. 先拉取项目列表 (填充下拉框)
//   await fetchProjectList()

//   // B. 决定选中哪个项目
//   const queryProjectId = route.query.projectId
//   const savedProjectId = localStorage.getItem('projectFilterStatus')

//   if (queryProjectId) {
//     // 优先级 1: 路由参数 (从首页跳转过来)
//     filterProject.value = String(queryProjectId)
//     handleGlobalSearch() // 立即查询
//   } else if (savedProjectId) {
//     // 优先级 2: 本地缓存 (刷新页面保持状态)
//     // 检查缓存的 ID 是否依然有效 (防止项目被删了缓存还在)
//     const exists = projectOptions.value.some(p => p.id === savedProjectId)
//     if (exists) {
//       filterProject.value = savedProjectId
//       handleGlobalSearch() // 立即查询
//     } else {
//       localStorage.removeItem('projectFilterStatus') // 清除无效缓存
//     }
//   }
// })
onMounted(async () => {
  // A. 先拉取项目列表 (填充下拉框)
  await fetchProjectList()

  // B. 决定选中哪个项目
  const queryProjectId = route.query.projectId;
  const savedProjectId = localStorage.getItem('projectFilterStatus');
  let targetProjectId = '';

  if (queryProjectId) {
    targetProjectId = String(queryProjectId);
    filterProject.value = targetProjectId;
    handleGlobalSearch(); // 立即查询
  } else if (savedProjectId) {
    const exists = projectOptions.value.some(p => p.id === savedProjectId);
    if (exists) {
      targetProjectId = savedProjectId;
      filterProject.value = targetProjectId;
      handleGlobalSearch(); // 立即查询
    } else {
      localStorage.removeItem('projectFilterStatus');
    }
  }

  // C. 恢复当前项目的冷却状态（从本地缓存读取）
  if (targetProjectId) {
    const cdStorageKey = `refresh_cd_${targetProjectId}`;
    const storedCd = localStorage.getItem(cdStorageKey);
    
    if (storedCd) {
      const { startAt, remaining } = JSON.parse(storedCd);
      // 计算已过去的时间
      const elapsedSeconds = Math.floor((Date.now() - startAt) / 1000);
      const currentRemaining = remaining - elapsedSeconds;

      if (currentRemaining > 0) {
        // 恢复冷却状态
        isRefreshCd.value = true;
        cdRemaining.value = currentRemaining;

        // 重启定时器
        if (cdTimer) clearInterval(cdTimer);
        cdTimer = setInterval(() => {
          cdRemaining.value--;

          // 更新本地缓存
          const updatedStored = JSON.parse(localStorage.getItem(cdStorageKey) || '{}');
          if (updatedStored.startAt) {
            updatedStored.remaining = cdRemaining.value;
            localStorage.setItem(cdStorageKey, JSON.stringify(updatedStored));
          }

          // 冷却结束
          if (cdRemaining.value <= 0) {
            clearInterval(cdTimer);
            cdTimer = null;
            isRefreshCd.value = false;
            localStorage.removeItem(cdStorageKey);
          }
        }, 1000);
      } else {
        // 冷却已结束，清除无效缓存
        localStorage.removeItem(cdStorageKey);
      }
    }
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
/* 汇总表容器：固定高度 + 滚动条 */
.summary-table-container {
  max-height: 600px; /* 可根据需要调整高度，比如500px/700px */
  overflow-y: auto;
  overflow-x: hidden; /* 横向禁止滚动（表格已有fixed列） */
}

/* 汇总表容器：固定高度 + 滚动条（修复版） */
.summary-table-container {
  max-height: 600px; /* 可调整高度 */
  overflow-y: auto;
  overflow-x: auto; /* 恢复横向滚动，避免列被截断 */
  min-height: 300px;
}

/* 移除对表格body-wrapper的高度限制（核心：让表格渲染所有数据） */
:deep(.summary-table-container .el-table__body-wrapper) {
  max-height: none !important; 
}

/* 滚动条美化保留 */
:deep(.summary-table-container::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}
:deep(.summary-table-container::-webkit-scrollbar-thumb) {
  background-color: #dcdfe6;
  border-radius: 3px;
}
/* 详情弹窗表格容器：固定高度 + 滚动条 */
.detail-table-container {
  max-height: 70vh; /* 占视口70%高度，适配不同屏幕 */
  overflow-y: auto;
  overflow-x: hidden;
}

/* 弹窗内表格滚动条美化 */
:deep(.detail-table-container .el-table__body-wrapper) {
  max-height: none !important;
}
:deep(.detail-table-container::-webkit-scrollbar) {
  width: 6px;
}
:deep(.detail-table-container::-webkit-scrollbar-thumb) {
  background-color: #dcdfe6;
  border-radius: 3px;
}

/* 单个字段标红（默认） */
.red-text {
  color: #F56C6C !important;
  font-weight: bold !important;
}

/* 可选：整行标红（如果用户需要） */
.red-row {
  background-color: #fff2f2 !important;
}
.red-row td {
  color: #F56C6C !important;
  font-weight: bold !important;
}

.resizable-table-container {
  position: relative;  /* 给手柄定位 */
  width: 100%;
  height: 100%;
  min-width: 600px;    /* 表格最小宽度 */
  min-height: 300px;   /* 表格最小高度 */
}

/* ========== 修改：原表格容器样式（解除固定高度限制） ========== */
.detail-table-container {
  width: 100%;
  height: 500px;       /* 初始高度 */
  overflow-y: auto;
  overflow-x: hidden;
  transition: all 0.1s ease; /* 拉伸平滑过渡 */
}

/* ========== 新增：拉伸手柄样式 ========== */
.resize-handle {
  position: absolute;
  background-color: #e5e9dd;
  opacity: 0.5;
  cursor: pointer;
  transition: opacity 0.2s;
  z-index: 10;
}
/* 鼠标悬浮高亮 */
.resize-handle:hover {
  opacity: 1;
}

/* 底部手柄（上下拉伸） */
.resize-handle-bottom {
  left: 0;
  bottom: 0;
  width: 100%;
  height: 6px;
  cursor: ns-resize; /* 上下拉伸光标 */
}

/* ========== 新增：弹窗内容样式（解除溢出限制） ========== */
:deep(.el-dialog__body) {
  padding: 20px !important;
  overflow: visible !important; /* 让弹窗随表格拉伸 */
}

/* 新增：card-header 弹性布局，实现左右分栏 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 左侧标题+统计信息容器 */
.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 右侧刷新按钮样式（贴合页面风格） */
.refresh-btn {
  margin-left: 20px;
  /* 可选：调整按钮颜色，和页面其他按钮保持一致 */
  background-color: #25dd72;
  border-color: #23ce1d;
}

/* 冷却中按钮样式（禁用状态加深，提示用户） */
:deep(.refresh-btn.is-disabled) {
  background-color: #cf3131 !important;
  border-color: #9b070f !important;
  cursor: not-allowed !important;
}

/* 项目更新表单样式适配 */
.project-edit-form {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.form-btn-group {
  margin-top: 20px;
  padding-left: 40%; /* 对齐表单标签宽度 */
  
}
/* 补充：表单栅格布局样式，让表单更整齐 */
.form-row {
  margin-bottom: 16px; /* 每行表单项间距 */
}
/* 统一表单输入框/选择器的高度，保持视觉一致 */
:deep(.project-edit-form .el-input),
:deep(.project-edit-form .el-input-number),
:deep(.project-edit-form .el-select),
:deep(.project-edit-form .el-date-picker) {
  height: 40px; /* 统一高度 */
}
:deep(.project-edit-form .el-input__inner),
:deep(.project-edit-form .el-select__wrapper),
:deep(.project-edit-form .el-date-picker__input-wrapper input) {
  height: 40px; /* 统一输入框内部高度 */
  line-height: 40px; /* 垂直居中 */
}
:deep(.project-edit-form .el-textarea__inner) {
  min-height: 100px; /* 备注输入框最小高度 */
}



</style>