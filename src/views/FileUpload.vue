
<template>
  <div class="macaron-container">
    
    <div class="action-header">
      <div class="project-info">
        <span class="sub-title">当前作业项目</span>
        <div class="project-selector-wrapper">
          <el-select 
              v-model="currentProject" 
              size="large" 
              class="macaron-select" 
              style="width: 260px;" 
              placeholder="请输入关键词搜索项目" 
              filterable 
              clearable
              no-match-text="未找到相关项目"
            >
              <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
                      
          <el-button 
            type="primary" 
            size="large" 
            style="margin-left: 15px; font-weight: bold;" 
            @click="showCreateProject = true"
          >
            <el-icon style="font-size: 16px; margin-right: 6px;"><Plus /></el-icon>
            新建项目
          </el-button>
        </div>
      </div>

      <div class="action-buttons">
         <el-button 
            color="#A0C4FF" 
            size="large" 
            :icon="Upload" 
            round 
            :disabled="!currentProject" 
            @click="openUploadDialog"
            class="upload-btn-main"
         >
            + 批量上传文件
         </el-button>
      </div>
    </div>

    <el-card class="task-card" shadow="never" v-loading="tableLoading">
      <el-empty v-if="!currentProject" description="请先在左上角选择或新建一个项目" />
      
      <div >
    
                    <div style="margin-bottom: 15px; display: flex; gap: 10px;justify-content: space-between;">
                      <div style="display: flex; gap: 10px;">
                        <el-button 
                        type="danger" 
                        icon="Delete" 
                        @click="batchDelete" 
                        :disabled="selectedRows.length === 0"
                        :loading="batchLoading"
                        >
                        批量删除
                        </el-button>
                        <el-button 
                          type="primary" 
                          icon="Search" 
                          @click="batchParse" 
                          :disabled="!canBatchParse"
                          :loading="batchLoading"
                        >
                          批量解析
                        </el-button>
                      </div>
                      <div style="display: flex; align-items: center; gap: 25px;">
                          <!-- 文件名模糊筛选 -->
                          <el-input
                            v-model="filterFileName"
                            placeholder="请输入文件名关键词"
                            style="width: 220px;"
                            @keyup.enter="refreshData" 
                            clearable 
                          >
                            <template #prefix><el-icon><Search /></el-icon></template>
                          </el-input>

                          <!-- 文件类型筛选 -->
                          <el-select 
                            v-model="filterFileType" 
                            placeholder="文件类型" 
                            clearable 
                            style="width: 150px"
                          >
                            <el-option label="合同文件" value="CONTRACT" />
                            <el-option label="实测报告" value="SURVEY_REPORT" />
                            <el-option label="其他文件" value="OTHER" />
                          </el-select>

                          <!-- 文件状态筛选（原有，移除@change） -->
                          <el-select 
                            v-model="filterStatus" 
                            placeholder="文件状态" 
                            clearable 
                            style="width: 150px"
                          >
                            <el-option label="解析失败" value="PARSE_FAIL" />
                            <el-option label="解析中" value="PARSING" />
                            <el-option label="待解析" value="WAITING_PARSE" />
                            <el-option label="解析完成" value="PARSE_COMPLETE" />
                            <el-option label="待审核" value="UNPARSEABLE" />
                          </el-select>

                          <!-- 查询按钮 -->
                          <el-button 
                            type="primary" 
                            icon="Search" 
                            @click="refreshData"
                            style="width: 90px"
                          >
                            查询
                          </el-button>

                          <!-- 重置按钮 -->
                          <el-button 
                            icon="Refresh" 
                            @click="resetFilter"
                            style="width: 80px"
                          >
                            重置
                          </el-button>
                          <el-button 
                            icon="Refresh" 
                            @click="handleRefresh"
                            style="width: 80px; margin-left: 10px;" 
                            :loading="tableLoading"
                          >
                            刷新
                          </el-button>
                        </div>
                    </div>
      
                    <el-table 
                    :data="fileTableData" 
                    style="width: 100%" 
                    class="custom-table"
                    :header-cell-style="{background:'#F5F7FA', color:'#606266', height: '50px'}"
                    :row-class-name="tableRowClassName"
                    @selection-change="handleSelectionChange"
                    highlight-current-row="false"
                    max-height="800px"
                  > 
                    <el-table-column type="selection" width="120" align="center" />
                    <el-table-column label="预览" width="120" align="center">
                      <template #default="{ row }">
                        <div @click.stop style="display: flex; justify-content: center;">
                          <el-image 
                            style="width: 200px; height: 60px; border-radius: 6px; border: 1px solid #e4e7ed;"
                            :src="row.thumbnailUrl" 
                            :preview-src-list="[row.thumbnailUrl]"
                            fit="cover"
                            :preview-teleported="true" 
                            :hide-on-click-modal="true"
                            preview-z-index="99999" 
                          >
                            <template #error>
                              <div class="image-slot" style="display:flex; justify-content:center; align-items:center; height:100%; color:#909399;">
                                <el-icon><Picture/></el-icon>
                              </div>
                            </template>
                          </el-image>
                        </div>
                      </template>
                    </el-table-column>

                    <el-table-column prop="name" label="文件名/编号" min-width="200">
                      <template #default="{ row }">
                        <div class="file-name-cell">
                          <span style="font-weight: 600; font-size: 15px; color: #303133;">{{ row.name }}</span>
                          <span v-if="row.phase" style="font-size: 12px; color: #999; margin-top: 4px;">第 {{ row.phase }} 期</span>
                        </div>
                      </template>
                    </el-table-column>

                    <el-table-column prop="uploadTime" label="上传时间" width="180" align="center">
                      <template #default="{ row }">
                        <span style="color: #606266; font-size: 13px;">{{ row.uploadTime }}</span>
                      </template>
                    </el-table-column>

                    
                    <el-table-column prop="type" label="文件类型" width="400">
                      <template #default="{ row }">
                        <el-tag :color="row.type === 'contract' ? '#FFF0F0' : '#F0F9EB'" 
                                :style="{ color: row.type === 'contract' ? '#F56C6C' : '#67C23A', border: '1px solid ' + (row.type === 'contract' ? '#FAB6B6' : '#b3e19d') }"
                                effect="light">
                          {{ row.type === 'contract' ? '合同文件' : '实测报告' }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    
                    <el-table-column prop="status" label="状态" width="400">
                      <template #default="{ row }">
                        <div class="status-badge">
                          <el-tooltip 
                            v-if="row.status === 'PARSE_FAIL'" 
                            :content="row.errorMessage || '解析发生未知错误'" 
                            placement="top"
                          >
                            <div style="display:flex; align-items:center; cursor:pointer;">
                              <span class="dot" :style="{ background: statusMap[row.status]?.color }"></span>
                              <span :style="{ color: statusMap[row.status]?.color, fontWeight: 'bold' }">{{ statusMap[row.status]?.text }}</span>
                              <el-icon style="margin-left:4px; color:#F56C6C"><Warning /></el-icon>
                            </div>
                          </el-tooltip>

                          <div v-else style="display:flex; align-items:center;">
                            <span class="dot" :style="{ background: statusMap[row.status]?.color || '#909399' }"></span>
                            <span :style="{ color: statusMap[row.status]?.color || '#606266' }">
                              {{ statusMap[row.status]?.text || '未知状态' }}
                            </span>
                          </div>
                        </div>
                      </template>
                    </el-table-column>

                  <el-table-column label="操作" width="400" align="right" header-align="center">
                    <template #default="{ row }">
                      <el-space :size="75">
                        <el-button 
                          v-if="['PENDING', 'PARSING'].includes(row.status)" 
                          link 
                          type="warning" 
                          @click="cancelProcessing(row)"
                        >
                          取消解析
                        </el-button>
                        <el-button 
                          v-if="['WAITING_PARSE', 'PARSE_FAIL'].includes(row.status)" 
                          link 
                          type="primary" 
                          @click="startProcessing(row)"
                        >
                          {{ row.status === 'PARSE_FAIL' ? '重试解析' : '开始解析' }}
                        </el-button>
                        <el-button 
                          v-if="row.status === 'PARSE_COMPLETE'" 
                          link 
                          type="primary" 
                          @click="startProcessing(row)"
                        >
                          重新解析
                        </el-button>
                        <el-button 
                          v-if="['PARSE_COMPLETE', 'UNPARSEABLE', 'AUDITING', 'AUDIT_FAIL'].includes(row.status)" 
                          color="#A0C4FF" 
                          size="small" 
                          round 
                          style="color:white" 
                          @click="openCalibration(row)"
                        >
                          <el-icon style="margin-right:4px"><EditPen /></el-icon> 
                          {{ row.status === 'UNPARSEABLE' ? '人工校对' : '审核' }}
                        </el-button>
                        <el-button 
                          v-if="row.status === 'AUDIT_PASS'" 
                          link 
                          type="success" 
                          @click="openCalibration(row)"
                        >
                          查看详情
                        </el-button>
                        <el-popconfirm title="确定删除该文件吗?" @confirm="deleteFile(row)" confirm-button-type="danger">
                          <template #reference><el-button link type="danger" icon="Delete"></el-button></template>
                        </el-popconfirm>
                      </el-space>
                    </template>
                  </el-table-column>
                </el-table>

                  <div style="margin-top: 20px; text-align: right;">
                    <el-pagination
                      @size-change="handleSizeChange"   
                      @current-change="handleCurrentChange" 
                      :current-page="currentPage"      
                      :page-sizes="[10, 20, 50, 100]"  
                      :page-size="pageSize"           
                      layout="total, sizes, prev, pager, next, jumper"
                      :total="total"                  
                      background                     
                    >
                    </el-pagination>
                  </div>

      </div>
    </el-card>

    <el-dialog v-model="showCreateProject" title="新建测绘归档项目" width="500px" style="border-radius: 12px;">
      <el-form :model="newProjectForm" label-position="top">
        <el-form-item label="项目名称"><el-input v-model="newProjectForm.projectName" placeholder="请输入工程名称" /></el-form-item>
        <el-form-item label="项目时间" prop="projectTime">
          <el-date-picker
            v-model="newProjectForm.projectTime"
            type="month"
            format="YYYY年MM月"
            value-format="YYYY年MM月"
            placeholder="请选择业务时间"
            style="width: 100%;"
            :locale="zhCn"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateProject = false" round>取消</el-button>
        <el-button type="primary" round @click="handleCreateProject">立即创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="uploadDialogVisible" title="批量文件上传" width="600px" style="border-radius: 12px;" @closed="handleUploadDialogClosed">
      <el-form label-position="top">
        <el-row :gutter="20">
          <el-col :span="14">
            <el-form-item label="请确认本次上传的文件类型：">
               <el-radio-group v-model="tempUploadType" fill="#A0C4FF">
                  <el-radio-button value="CONTRACT">合同文件</el-radio-button>
                  <el-radio-button value="SURVEY_REPORT">实测报告</el-radio-button>
               </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="所属期数：" v-if="tempUploadType === 'SURVEY_REPORT'">
               <el-input-number v-model="uploadPhase" :min="1" :max="99" style="width: 100%" />
            </el-form-item>
            <el-form-item label="所属期数：" v-else>
               <el-input disabled placeholder="无需填写" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-upload ref="uploadRef" class="upload-demo" drag action="#" :auto-upload="false" :on-change="handleFileChange" :on-remove="handleFileRemove" multiple :file-list="tempFiles">
          <div class="upload-content">
            <el-icon class="el-icon--upload" style="font-size: 48px; margin-bottom: 10px; color: #A0C4FF;"><upload-filled /></el-icon>
            <div class="el-upload__text">将文件拖拽到此处，或 <em style="color: #409EFF; font-style: normal;">点击选择</em></div>
          </div>
        </el-upload>
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
          <span style="color: #606266; font-size: 13px;">已选择 <strong>{{ tempFiles.length }}</strong> 个文件</span>
          <div>
             <el-button @click="uploadDialogVisible = false" round>取消</el-button>
             <el-button color="#A0C4FF" style="color:white" round class="upload-confirm-btn" @click="confirmUpload" :disabled="tempFiles.length === 0">确认上传</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="showCalibration" 
              fullscreen class="calibration-dialog" 
              :show-close="false" 
              style="overflow: hidden;"
              @closed="resetCalibrationState"
              >
              <!-- @closed="() => { if(calibrationPdfUrl.value) URL.revokeObjectURL(calibrationPdfUrl.value) }" -->
      <template #header="{ close }">
        <div class="cali-header">
           <div class="header-left">
             <el-button icon="Back" round @click="close" style="margin-right: 15px;">返回列表</el-button>
             <div class="file-title-block">
               <span class="title">智能审核模式</span>
               <span class="sub-name">{{ currentFile?.name }}</span>
             </div>
           </div>
           <div class="header-right">
            <!-- 新增：进入/退出编辑按钮 -->
              <el-button 
                v-if="!isEditing && currentFile?.status !== 'AUDIT_PASS'"
                type="warning" 
                plain 
                round 
                icon="EditPen" 
                @click="enterEditMode"
              >
                进入编辑
              </el-button>
              <el-button 
                v-if="isEditing"
                type="danger" 
                plain 
                round 
                icon="Close" 
                @click="exitEditMode"
              >
                退出编辑（不保存）
              </el-button>
             <!-- <el-tag v-if="currentFile?.status !== 'AUDIT_PASS'" type="warning" effect="dark" round size="large" style="margin-right: 15px;">AI 解析结果</el-tag>
             <el-tag v-else type="success" effect="dark" round size="large" style="margin-right: 15px;"><el-icon><CircleCheck /></el-icon> 已审核通过</el-tag> -->
             <el-button type="primary" plain round icon="DocumentChecked" @click="handleSaveData">保存修改</el-button>
             <!-- <el-button type="success" round icon="Stamp" @click="handleAuditPass" :disabled="currentFile?.status === 'AUDIT_PASS'">{{ currentFile?.status === 'AUDIT_PASS' ? '已审核' : '审核通过' }}</el-button> -->
           </div>
        </div>
      </template>

      <div class="split-view" v-loading="calibrationLoading" style="height: 100%;">
        <div class="left-panel" style="height: 100%;">
          <div class="pdf-toolbar" style="height: 48px; background: #fff; border-bottom: 1px solid #ccc; display: flex; align-items: center; justify-content: center; gap: 10px;">
            <el-button 
              :type="currentViewType === 'original' ? 'primary' : 'default'" 
              plain 
              @click="switchView('original')"
            >
              原始文件
            </el-button>
            
            <el-tooltip content="暂无预处理文件" placement="top" :disabled="isPreprocessAvailable">
              <el-button 
                :type="currentViewType === 'preprocess' ? 'primary' : 'default'" 
                plain 
                :disabled="!isPreprocessAvailable"
                @click="switchView('preprocess')"
              >
                预处理文件
              </el-button>
            </el-tooltip>
            <!-- 新增：识别文件（占位，禁用状态，待接口支持） -->
            <el-tooltip content="MD文件" placement="top">
              <el-button 
                :type="currentViewType === 'recognition' ? 'primary' : 'default'" 
                plain 
                @click="switchView('recognition')"
                title="识别文件（MD格式）"
              >
                识别文件（MD）
              </el-button>
            </el-tooltip>
          </div>
          <div class="pdf-canvas" style="height: calc(100% - 48px); overflow: hidden;">
            <!-- 原有 PDF 相关区域（不变） -->
            <div v-if="currentViewType !== 'recognition'" style="width: 100%; height: 100%;">
              <div v-if="pdfLoading" style="display: flex; justify-content: center; align-items: center; height: 100%; color: #fff;">
                <el-icon size="32" color="#fff"><Loading /></el-icon>
                <span style="margin-left: 10px;">正在加载PDF文件...</span>
              </div>
              <iframe 
                v-else-if="calibrationPdfUrl" 
                :src="calibrationPdfUrl" 
                style="width:100%; height:100%; border:none;"
                @load="pdfLoaded"
                @error="pdfLoadError"
              ></iframe>
              <div v-else style="display: flex; justify-content: center; align-items: center; height: 100%; color: #ccc;">
                <span>PDF文件加载失败</span>
              </div>
            </div>

            <!-- 新增 MD 内容展示区域（完整左面板区域） -->
            <div v-if="currentViewType === 'recognition'" style="width: 100%; height: 100%; overflow-y: auto; padding: 20px; box-sizing: border-box; background: #fff;">
              <!-- MD 加载提示 -->
              <div v-if="recognitionMdLoading" style="display: flex; justify-content: center; align-items: center; height: 100%;">
                <el-icon size="32" color="#409EFF"><Loading /></el-icon>
                <span style="margin-left: 10px; color: #606266;">正在加载识别文件（MD）...</span>
              </div>
              <!-- 解析后的 MD 内容（用 v-html 渲染） -->
              <div v-else class="md-content" style="width: 100%; min-height: 100%;" v-html="marked(recognitionMdContent)"></div>
            </div>
          </div>
        </div>
            <div class="right-panel" style = "height: 100%; overflow-y: auto;" >
              <div class="sum-info-section"  style="margin-bottom: 16px; padding: 12px; background: #fff; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                <!-- 原有面积汇总（补全其他面积字段） -->
                <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #e4e7ed;">
                    <div style="width: 45%; margin-bottom: 8px;">
                      <span style="font-weight: bold; color: #606266;">建筑面积总和：</span>
                      <span style="color: #409EFF;">{{ auditSummaryData.roomInfoBuildingAreaSum }}</span> ㎡
                    </div>
                    <div style="width: 45%; margin-bottom: 8px;">
                      <span style="font-weight: bold; color: #606266;">【机器识别（OCR）】建筑面积总和：</span>
                      <span style="color: #F56C6C;">{{ auditSummaryData.roomInfoBuildingAreaSumFromOcr }}</span> ㎡
                    </div>
                    <div style="width: 45%; margin-bottom: 8px;">
                      <span style="font-weight: bold; color: #606266;">套内面积总和：</span>
                      <span style="color: #409EFF;">{{ auditSummaryData.roomInfoInnerAreaSum }}</span> ㎡
                    </div>
                    <div style="width: 45%; margin-bottom: 8px;">
                      <span style="font-weight: bold; color: #606266;">【机器识别（OCR）】套内面积总和：</span>
                      <span style="color: #F56C6C;">{{ auditSummaryData.roomInfoInnerAreaSumFromOcr }}</span> ㎡
                    </div>
                    <div style="width: 45%; margin-bottom: 8px;">
                      <span style="font-weight: bold; color: #606266;">阳台面积总和：</span>
                      <span style="color: #409EFF;">{{ auditSummaryData.roomInfoBalconyAreaSum }}</span> ㎡
                    </div>
                    <div style="width: 45%; margin-bottom: 8px;">
                      <span style="font-weight: bold; color: #606266;">【机器识别（OCR）】阳台面积总和：</span>
                      <span style="color: #F56C6C;">{{ auditSummaryData.roomInfoBalconyAreaSumFromOcr }}</span> ㎡
                    </div>
                    <div style="width: 45%; margin-bottom: 8px;">
                      <span style="font-weight: bold; color: #606266;">分摊面积总和：</span>
                      <span style="color: #409EFF;">{{ auditSummaryData.roomInfoSharedAreaSum }}</span> ㎡
                    </div>
                    <div style="width: 45%; margin-bottom: 8px;">
                      <span style="font-weight: bold; color: #606266;">【机器识别（OCR）】分摊面积总和：</span>
                      <span style="color: #F56C6C;">{{ auditSummaryData.roomInfoSharedAreaSumFromOcr }}</span> ㎡
                    </div>
                </div>
                <!-- 新增：补全所有需求字段，使用友好展示文本 -->
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                  <div>
                    <span style="font-weight: bold; color: #606266;">待确认面积：</span>
                    <span style="color: #E6A23C;">{{ auditSummaryData.pendingConfirmArea }}</span> ㎡
                  </div>
                   <!-- 未知用途（正确写法） -->
                  <div>
                    <span style="font-weight: bold; color: #606266;">未知用途：</span>
                    <span 
                      :style="{ color: auditSummaryDisplay.hasUnknownUsageText === '有' ? '#F56C6C' : '#67C23A' }"
                    >{{ auditSummaryDisplay.hasUnknownUsageText }}</span>
                  </div>
                  <div>
                    <span style="font-weight: bold; color: #606266;">未知用途数量：</span>
                    <span style="color: #F56C6C;">{{ auditSummaryData.unknownUsageCount }}</span> 条
                  </div>
                  <div>
                    <span style="font-weight: bold; color: #606266;">验证状态：</span>
                    <span 
                      :style="{ color: auditSummaryDisplay.isVerifiedText === '已验证' ? '#67C23A' : '#909399' }"
                    >{{ auditSummaryDisplay.isVerifiedText }}</span>
                  </div>
                  <div>
                    <span style="font-weight: bold; color: #606266;">未知用途详情：</span>
                    <span style="color: #E6A23C;">{{ auditSummaryData.unknownUsages }}</span> ㎡
                  </div>
                  <div style="width: 100%; margin-top: 10px;">
                    <span style="font-weight: bold; color: #606266;">验证失败原因：</span>
                    <span style="color: #F56C6C;">{{ auditSummaryData.verificationErrorReason }}</span>
                  </div>
                </div>
              </div>

              <!-- 户室面积表格 -->
              <div style="flex: 1; overflow: auto; margin-top: 8px; padding-bottom: 70px;">
                  <el-table 
                    :data="roomInfoData" 
                    border 
                    size="small"
                    v-loading="roomInfoLoading"
                    element-loading-text="加载户室数据中..."
                    style="width: 100%; height: 100%;"
                  >
                    <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />
                    
                    <!-- 楼层：展示/编辑切换 -->
                    <el-table-column prop="roomLevel" label="楼层" width="80" align="center">
                      <template #default="{ row }">
                        <template v-if="!isEditing">
                          {{ row.roomLevel || '-' }}
                        </template>
                        <template v-else>
                          <el-input 
                            v-model="row.roomLevel" 
                            size="small" 
                            style="width: 70px;"
                            placeholder="请输入楼层"
                          />
                        </template>
                      </template>
                    </el-table-column>
                    
                    <!-- 房号：展示/编辑切换 -->
                    <el-table-column prop="roomNumber" label="房号" width="100" align="center">
                      <template #default="{ row }">
                        <template v-if="!isEditing">
                          {{ row.roomNumber || '-' }}
                        </template>
                        <template v-else>
                          <el-input 
                            v-model="row.roomNumber" 
                            size="small" 
                            style="width: 90px;"
                            placeholder="请输入房号"
                          />
                        </template>
                      </template>
                    </el-table-column>
                    
                    <!-- 建筑面积：展示/编辑切换（数字输入框，保留2位小数） -->
                    <el-table-column prop="buildingArea" label="建筑面积(㎡)" width="120" align="center">
                      <template #default="{ row }">
                        <template v-if="!isEditing">
                          {{ row.buildingArea || '0.00' }}
                        </template>
                        <template v-else>
                          <el-input 
                            v-model="row.buildingArea" 
                            size="small" 
                            style="width: 110px;"
                            type="number"
                            precision="2"
                            min="0"
                            placeholder="0.00"
                          />
                        </template>
                      </template>
                    </el-table-column>
                    
                    <!-- 套内面积：展示/编辑切换 -->
                    <el-table-column prop="innerArea" label="套内面积(㎡)" width="120" align="center">
                      <template #default="{ row }">
                        <template v-if="!isEditing">
                          {{ row.innerArea || '0.00' }}
                        </template>
                        <template v-else>
                          <el-input 
                            v-model="row.innerArea" 
                            size="small" 
                            style="width: 110px;"
                            type="number"
                            precision="2"
                            min="0"
                            placeholder="0.00"
                          />
                        </template>
                      </template>
                    </el-table-column>
                    
                    <!-- 阳台面积：展示/编辑切换 -->
                    <el-table-column prop="balconyArea" label="阳台面积(㎡)" width="120" align="center">
                      <template #default="{ row }">
                        <template v-if="!isEditing">
                          {{ row.balconyArea || '0.00' }}
                        </template>
                        <template v-else>
                          <el-input 
                            v-model="row.balconyArea" 
                            size="small" 
                            style="width: 110px;"
                            type="number"
                            precision="2"
                            min="0"
                            placeholder="0.00"
                          />
                        </template>
                      </template>
                    </el-table-column>
                    
                    <!-- 分摊面积：展示/编辑切换 -->
                    <el-table-column prop="sharedArea" label="分摊面积(㎡)" width="120" align="center">
                      <template #default="{ row }">
                        <template v-if="!isEditing">
                          {{ row.sharedArea || '0.00' }}
                        </template>
                        <template v-else>
                          <el-input 
                            v-model="row.sharedArea" 
                            size="small" 
                            style="width: 110px;"
                            type="number"
                            precision="2"
                            min="0"
                            placeholder="0.00"
                          />
                        </template>
                      </template>
                    </el-table-column>
                    
                    <!-- 是否计算：展示/编辑切换（下拉选择） -->
                    <el-table-column prop="isCalculate" label="是否计算" width="100" align="center">
                      <template #default="{ row }">
                        <template v-if="!isEditing">
                          {{ row.isCalculate === 1 ? '是' : '否' }}
                        </template>
                        <template v-else>
                          <el-select 
                            v-model="row.isCalculate" 
                            size="small" 
                            style="width: 90px;"
                            placeholder="请选择"
                          >
                            <el-option label="是" value="1" />
                            <el-option label="否" value="0" />
                          </el-select>
                        </template>
                      </template>
                    </el-table-column>
                    
                    <!-- 用途类别：展示/编辑切换（下拉选择） -->
                    <el-table-column prop="usageCategory" label="用途类别" width="120" align="center">
                      <template #default="{ row }">
                        <template v-if="!isEditing">
                          {{ row.usageCategory || '未知' }}
                        </template>
                        <template v-else>
                          <el-select 
                            v-model="row.usageCategory" 
                            size="small" 
                            style="width: 110px;"
                            placeholder="请选择"
                          >
                            <el-option label="住宅" value="RESIDENTIAL" />
                            <el-option label="商业" value="COMMERCIAL" />
                            <el-option label="管理用房" value="MANAGEMENT" />
                            <el-option label="其他可建设用房" value="OTHER_BUILDABLE" />
                            <el-option label="社区配套" value="COMMUNITY" />
                            <el-option label="其他公共配套" value="OTHER_PUBLIC" />
                            <el-option label="未知" value="UNKNOWN" />
                          </el-select>
                        </template>
                      </template>
                    </el-table-column>
                    
                    <!-- 用途：展示/编辑切换 -->
                    <el-table-column prop="roomUsage" label="用途" min-width="100" show-overflow-tooltip align="center">
                      <template #default="{ row }">
                        <template v-if="!isEditing">
                          {{ row.roomUsage || '-' }}
                        </template>
                        <template v-else>
                          <el-input 
                            v-model="row.roomUsage" 
                            size="small" 
                            style="width: 100%;"
                            placeholder="请输入用途"
                          />
                        </template>
                      </template>
                    </el-table-column>
                    
                    <!-- 面积类型：展示/编辑切换（下拉选择） -->
                    <el-table-column prop="floorAreaType" label="面积类型" width="80" align="center">
                      <template #default="{ row }">
                        <template v-if="!isEditing">
                          <el-tag :type="row.floorAreaType === '计容' ? 'success' : 'info'" size="small">
                            {{ row.floorAreaType }}
                          </el-tag>
                        </template>
                        <template v-else>
                          <el-select 
                            v-model="row.floorAreaType" 
                            size="small" 
                            style="width: 70px;"
                            placeholder="请选择"
                          >
                            <el-option label="计容" value="BUILDABLE" />
                            <el-option label="不计容" value="NON_BUILDABLE" />
                            <el-option label="未知" value="UNKNOWN" />
                          </el-select>
                        </template>
                      </template>
                    </el-table-column>
  </el-table>
                <el-empty v-if="!roomInfoLoading && roomInfoData.length === 0" description="暂无户室面积数据" />
              </div>
          </div>
        
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted ,watch,onUnmounted } from 'vue'
import { UploadFilled, Upload, Document, EditPen, Back, Check, Warning, Picture, Delete, 
         Plus, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, List, DocumentChecked, Stamp, CircleCheck, Loading, Search, // 新增
         Refresh} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
// ===== 新增：导入 MD 解析相关依赖 =====
import { marked } from 'marked';
import hljs from 'highlight.js';
// 导入 highlight.js 默认样式（可选，也可以选其他主题，比如 github-dark）
import 'highlight.js/styles/default.css';
import { useBatchPoller } from './useBatchPoller';



const statusMap = {
  'UPLOADING': { text: '上传中', color: '#909399' },
  'WAITING_PARSE': { text: '等待解析', color: '#909399' },
  'PENDING': { text: '排队中', color: '#409EFF' },
  'PARSING': { text: '正在解析', color: '#409EFF' }, // 蓝色
  'PARSE_FAIL': { text: '解析失败', color: '#F56C6C' }, // 红色
  'PARSE_COMPLETE': { text: '解析完成', color: '#67C23A' }, // 绿色
  'UNPARSEABLE': { text: '不可解析', color: '#E6A23C' }, // 橙色
  'AUDITING': { text: '审核中', color: '#E6A23C' },
  'AUDIT_PASS': { text: '已入库', color: '#67C23A' },
  'AUDIT_FAIL': { text: '审核驳回', color: '#F56C6C' }
}
const tableRowClassName = () => 'no-hover-highlight';

// --- 1. 项目数据 ---
const projectOptions = ref([])
const currentProject = ref('')
const showCreateProject = ref(false)

// 批量操作核心变量（必须加）
const selectedRows = ref([]) // 存储选中行
const batchLoading = ref(false) // 批量操作加载状态
const canBatchParse = computed(() => {
  return selectedRows.value.some(row => ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row.status))
})

// 批量操作 - 监听表格选中行变化
const handleSelectionChange = (val) => {
  selectedRows.value = val // 同步选中行到变量
}

// 批量删除
const batchDelete = () => {
  if (selectedRows.value.length === 0) return
  ElMessageBox.confirm(
    `确认删除选中的 ${selectedRows.value.length} 个文件？删除后无法恢复！`,
    '批量删除',
    { type: 'warning', confirmButtonText: '确认删除' }
  ).then(async () => {
    batchLoading.value = true
    try {
      // 循环调用现有删除接口（如需批量接口，可替换为一次请求）
      await Promise.all(selectedRows.value.map(row => 
        axios.delete(`/api/file/${row.rawId}`)
      ))
      ElMessage.success(`成功删除 ${selectedRows.value.length} 个文件`)
      refreshData() // 刷新列表
      selectedRows.value = [] // 清空选中
    } catch (err) {
      console.error('批量删除失败：', err)
      ElMessage.error('部分文件删除失败，请重试')
    } finally {
      batchLoading.value = false
    }
  })
}

// 批量解析
const batchParse = () => {
  if (!canBatchParse.value) return
  ElMessageBox.confirm(
    `确认解析选中的可解析文件（${selectedRows.value.filter(row => ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row.status)).length} 个）？`,
    '批量解析',
    { type: 'primary', confirmButtonText: '立即开始' }
  ).then(async () => {
    batchLoading.value = true
    try {
      // 仅处理可解析的行，同步更新前端状态
      const parseRows = selectedRows.value.filter(row => ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row.status))
      await Promise.all(parseRows.map(row => {
        row.status = 'PENDING' // 前端先置为排队中
        return axios.post(`/api/file/parse/${row.rawId}`)
      }))
      ElMessage.success('批量解析任务已提交，后台处理中')
      startPolling(); 
      selectedRows.value = [] // 清空选中
    } catch (err) {
      console.error('批量解析失败：', err)
      ElMessage.error('部分文件解析请求失败，请重试')
    } finally {
      batchLoading.value = false
    }
  })
}




const fetchProjectList = async () => {
  try {
    const res = await axios.get('/api/project/list')
    if (res.data.code === 200) {
      projectOptions.value = res.data.data.map(item => ({
        id: String(item.id),
        name: item.projectName 
      }))
    }
  } catch (error) {
    console.error('获取项目列表失败', error)
  }
}



// --- 2. 文件数据 ---
const fileTableData = ref([])
const tableLoading = ref(false)
// 替换原来的 let pollingTimer = null
// const pollingTimer = ref(null); // 用ref管理定时器，避免作用域问题


const filterStatus = ref('')
const filterFileName = ref('')        // 新增：文件名称（模糊）
const filterFileType = ref('')  
const resetFilter = () => {
  filterFileName.value = ''
  filterFileType.value = ''
  filterStatus.value = ''
  refreshData() // 清空后刷新
}


const currentPage = ref(1) // 当前页码（默认第1页）
const pageSize = ref(20)    // 每页条数（默认10条）
const total = ref(0)
// --- 分页事件：切换每页条数/页码 ---
const handleSizeChange = (val) => {
  pageSize.value = val       // 更新每页条数
  currentPage.value = 1      // 切换条数后重置到第1页
  refreshData()              // 重新请求数据
}

const handleCurrentChange = (val) => {
  currentPage.value = val    // 更新当前页码
  refreshData()              // 重新请求数据
}

// 新增：刷新按钮事件（保留所有筛选状态，仅刷新数据）
const handleRefresh = () => {
  // 直接复用 refreshData()，无需额外处理筛选条件
  // refreshData() 会自动读取当前的 filterFileName、filterFileType、filterStatus 等筛选条件
  refreshData();
  // 可选：添加轻量提示，提升用户体验
  ElMessage.info('正在刷新数据...');
};

// 格式化上传时间：2026-01-26T00:34:35.046 → 2026-01-26 00:34:35
const formatUploadTime = (timeStr) => {
  if (!timeStr) return '未知时间'
  // 替换T为空格，截取掉毫秒部分
  return timeStr.replace('T', ' ').split('.')[0]
}

const refreshData = async () => {
  if (!currentProject.value) { fileTableData.value = []; return }
  tableLoading.value = true
  const pid = currentProject.value
  try {
    // 构造请求体 FileQueryDTO
    const queryParams = {

      projectId: pid,
      // 新增：文件名模糊查询（有值才传）
      originalName: filterFileName.value || null,
      // 新增：文件类型筛选（有值才传）
      fileContextType: filterFileType.value || null,
      // 原有：文件状态筛选（有值才传）
      // 如果有筛选状态就传，没有就不传(或传null)
      fileState: filterStatus.value || null, 
      pageNum: currentPage.value, // 动态当前页
      pageSize: pageSize.value  // 动态每页条数
      // 拉取全部匹配项
    }
    const res = await axios.post('/api/file/query', queryParams)

    //const res = await axios.get(`/api/file/project/${pid}`)
   
    // 👉👉👉 【调试重点】在这里打印！ 👈👈👈
    console.log('🔥 1. 接口完整响应:', res)
    console.log('🔥 2. 后端返回的数据主体 (res.data):', res.data)
    console.log('🔥 3. 真正的数据内容 (res.data.data):', res.data.data)

    const list = []
    let pageTotal = 0 
    
    // 【修复3】智能判断是“数组”还是“分页对象”
    // 如果 res.data.data 本身是数组，就用它；
    // 如果是对象且有 rows (MyBatis-Plus常见)，就用 rows；
    // 如果是对象且有 list，就用 list。
    let rawList = []
    // 优先判断 data 本身是不是数组
    if (Array.isArray(res.data.data)) {
        rawList = res.data.data
    } 
    // 【关键修复】这里加上对 records 的判断
    else if (res.data.data && Array.isArray(res.data.data.records)) {
      console.log('✅ 发现分页对象，提取 records 数组')
        rawList = res.data.data.records
        pageTotal = res.data.data.total || 0
    }
    // 兼容其他情况
    else if (res.data.data && Array.isArray(res.data.data.rows)) {
        rawList = res.data.data.rows 
        pageTotal = res.data.data.total || 0 
    } else if (res.data.data && Array.isArray(res.data.data.list)) {
        rawList = res.data.data.list 
        pageTotal = res.data.data.total || 0 
    }
    total.value = pageTotal
    console.log('✅ 最终提取到的列表数组:', rawList)
    console.log('✅ 总记录数:', total.value)

    console.log('✅ 最终提取到的列表数组:', rawList)
    if (res.data.code === 200 ) {
      rawList.forEach(item => {
        // 映射文件类型：CONTRACT→contract（合同），SURVEY_REPORT→survey（实测报告）
        let fileType = 'survey' // 默认实测报告
        if (item.fileContextType === 'CONTRACT') {
          fileType = 'contract'
        } else if (item.fileContextType === 'SURVEY_REPORT') {
          fileType = 'survey'
        }

        // 组装前端表格需要的字段
        list.push({
          id: item.id, // 前端表格行ID
          rawId: item.id, // 后端文件主键ID（用于删除、解析等接口调用）
          fileId: item.gridfsId, // 文件存储的gridfsId（用于下载、预览）
          preprocessGridfsId: item.preprocessGridfsId || '',
          name: item.originalName || '未命名文件', // 文件名
          uploadTime: item.uploadTime ? formatUploadTime(item.uploadTime) : '未知时间',
          type: fileType, // 区分合同/实测报告
          phase: null, // 新接口返回中无phase字段，暂时设为null（如需展示可后续补充）
          status: item.fileState || 'WAITING_PARSE', // 文件状态（匹配statusMap的key）
          errorMessage: item.parseMessage, // 解析错误信息
          thumbnailUrl: item.thumbGridfsId 
            ? `/api/file/download/gridfs/${item.thumbGridfsId}` 
            : 'https://placehold.co/150/e0e0e0/808080?text=NoThumb' // 缩略图
        })
      })
    }
    fileTableData.value = list
    
    // 开启轮询：如果有文件处于 PENDING 或 PARSING 状态
    // checkPolling(list)

  } catch (error) { console.error(error) } finally { tableLoading.value = false }
}


onMounted(async () => {
  await fetchProjectList() // 等待项目列表加载完成
  const savedProjectId = localStorage.getItem('savedCurrentProject')
  if (savedProjectId) {
    currentProject.value = savedProjectId
    refreshData()
  }
})

// 2. 当选择项目变化时，把项目ID存到 localStorage
watch(currentProject, (newProjectId) => {
  if (newProjectId) {
    localStorage.setItem('savedCurrentProject', newProjectId)
    resetFilter()
    // refreshData()
  } else {
    localStorage.removeItem('savedCurrentProject')
    fileTableData.value = []
  }
})

// 销毁组件时清除轮询
onUnmounted(() => {
  // 1. 移除：旧轮询逻辑（已删除旧轮询变量，这行删除）
  // if (pollingTimer) clearInterval(pollingTimer)
  
  // 2. 新增：清理新轮询器
  stopPolling();
  
  // 3. 修正：calibrationPdfUrl 是 ref 变量，需要加 .value
  if (calibrationPdfUrl.value) {
    URL.revokeObjectURL(calibrationPdfUrl.value);
  }
  
  // 4. 保留：清理临时文件列表
  tempFiles.value = [];
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
});

// --- 3. 核心逻辑 ---

const newProjectForm = reactive({
  projectName: '', 
  projectTime: ''  
})

const handleCreateProject = () => {
  if (!newProjectForm.projectName) return ElMessage.warning('请输入项目名称')
  if (!newProjectForm.projectTime) return ElMessage.warning('请输入项目时间（例：2025年11月）')
  
  const loadingInstance = ElMessage({
    message: '正在创建项目...',
    type: 'info',
    icon: Loading,
    duration: 0,
  })

  axios.post('/api/project/create', null, {
    params: {
      projectName: newProjectForm.projectName, 
      projectTime: newProjectForm.projectTime   
    },
  })
  .then(res => {
    loadingInstance.close()
    if (res.data.code === 200) {
      ElMessage.success('项目创建成功！')
      const newId = String(res.data.data ? res.data.data.id : Date.now());
      projectOptions.value.push({ 
        id: newId, 
        name: newProjectForm.projectName 
      })
      currentProject.value = newId
      showCreateProject.value = false
      newProjectForm.projectName = ''
      newProjectForm.projectTime = ''
    } else {
      ElMessage.error(res.data.msg || '创建失败，请重试')
    }
  })
  .catch(err => {
    loadingInstance.close()
    console.error(err)
    ElMessage.error('网络错误或服务器异常')
  })
}

const reParse = (row) => { row.status = 0; startProcessing(row) }

// 【功能：删除文件】
const deleteFile = (row) => {
  // 接口：DELETE /file/{fileId}
  // row.rawId 是我们在 refreshData 映射时存储的真实后端 ID
  axios.delete(`/api/file/${row.rawId}`)
    .then(res => {
      if (res.data.code === 200) {
        ElMessage.success('文件及相关数据已完全删除')
        
        // 删除成功后，立即刷新列表
        refreshData()
      } else {
        ElMessage.error(res.data.msg || '删除失败')
      }
    })
    .catch(err => {
      console.error('删除出错:', err)
      ElMessage.error('网络错误或服务器异常')
    })
}

// --- 上传逻辑 ---
const uploadDialogVisible = ref(false)
const tempUploadType = ref('SURVEY_REPORT')
const uploadPhase = ref(1) 
const tempFiles = ref([])
const uploadRef = ref(null) // 【新增】引用 upload 组件实例

const openUploadDialog = () => { 
  // 【优化点 1】清空之前的文件列表
  tempFiles.value = []
  if(uploadRef.value) {
    uploadRef.value.clearFiles() // 调用 Element Plus 方法清空内部状态
  }
  uploadPhase.value = 1 
  uploadDialogVisible.value = true 
  console.log('打开弹窗，清空后文件数：', tempFiles.value.length); // 新增日志
}

const handleFileChange = (file, fileList) => { 
  // 同步 fileList 到 tempFiles
  tempFiles.value = fileList
  console.log('当前选中文件数：', tempFiles.value.length);
}

const handleFileRemove = (file, fileList) => {
  tempFiles.value = fileList
}

// 弹窗关闭后的清理 (双保险)
const handleUploadDialogClosed = () => {
  tempFiles.value = []
  if(uploadRef.value) uploadRef.value.clearFiles()
}

// 确认上传
const confirmUpload = () => {
  if(tempFiles.value.length === 0) return ElMessage.warning('请先选择文件')
  
  
  const typeName = tempUploadType.value === 'CONTRACT' ? '合同文件' : '实测报告'
  
  const msg = `
    <div style="text-align: left; font-size: 14px;">
      <p style="margin-bottom: 8px;">请核对本次上传任务信息：</p>
      <ul style="list-style: none; padding-left: 10px; background: #f5f7fa; padding: 10px; border-radius: 4px;">
        <li><strong>文件数量：</strong> <span style="color: #409EFF; font-weight: bold; font-size: 16px;">${tempFiles.value.length}</span> 份</li>
        <li><strong>归属项目：</strong> ${projectOptions.value.find(p => p.id === currentProject.value)?.name || '未知项目'}</li>
        ${ tempUploadType.value ===  'SURVEY_REPORT'  ? `<li><strong>所属期数：</strong> <span style="color: #E6A23C; font-weight: bold;">第 ${uploadPhase.value} 期</span></li>` : '' }
        <li><strong>文件类型：</strong> <span style="color: #F56C6C; font-weight: bold;">${typeName}</span></li>
      </ul>
      <p style="margin-top: 10px; color: #909399; font-size: 12px;">确认无误后系统将自动开始解析数据。</p>
    </div>
  `

  ElMessageBox.confirm(msg, '确认开始上传？', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '确认并上传',
    cancelButtonText: '检查一下',
    type: 'info',
    center: true
  }).then(() => {
    handleRealUpload()
  }).catch(() => {})
}

// 定义“检查状态”的接口（无 batchId，查当前项目全量文件，适配后端返回格式）
const checkBatchStatus = async (options) => {
  return await axios.post('/api/file/query', {
    projectId: currentProject.value,
    originalName: null, // 去掉筛选，查全量文件
    fileContextType: null,
    fileState: null,
    pageNum: 1,
    pageSize: 9999 // 查全量，避免分页遗漏未完成文件
  }, { signal: options.signal });
};


// 初始化轮询器：传入 refreshData 作为轮询终止后的回调
const { startPolling, stopPolling, isPolling } = useBatchPoller(checkBatchStatus, refreshData);

const handleRealUpload = () => {
  if (!currentProject.value) return ElMessage.warning('请先选择作业项目')
  if (tempFiles.value.length === 0) return ElMessage.warning('请至少选择一个文件')

  // 1. 【核心】先缓存要上传的文件（复制一份，避免后续清空导致引用失效）
  const uploadFiles = [...tempFiles.value]; // 浅拷贝，保存文件引用

  // 2. 提交即走提示（流畅体验）
  ElMessage.success(`上传任务已提交！${uploadFiles.length} 个文件正在后台处理，可继续上传其他文件~`);

  // 3. 立即关闭弹窗、清空文件列表（释放用户操作）
  uploadDialogVisible.value = false;
  tempFiles.value = [];
  if (uploadRef.value) uploadRef.value.clearFiles();

  // 4. 构造 FormData（使用缓存的 uploadFiles，而非已清空的 tempFiles）
  const formData = new FormData();
  uploadFiles.forEach(file => {
    // 验证：确保 file.raw 存在（Element Plus Upload 组件的原始文件对象）
    if (file.raw) {
      formData.append('files', file.raw); // 字段名 'files' 严格匹配后端要求
      console.log(`已添加文件：${file.raw.name}，大小：${file.raw.size} bytes`);
    } else {
      console.error('无效文件，缺少 raw 属性：', file);
    }
  });

  // 验证：打印 FormData 中的文件数量（确认构造成功）
  console.log('构造完成的 FormData 中的文件数量：', formData.getAll('files').length);

  // 5. 发送请求（不手动设置 Content-Type，让 Axios 自动处理）
  axios.post('/api/file/batch-upload', formData, {
    params: {
      projectId: currentProject.value,
      fileContextType: tempUploadType.value, 
      phase: tempUploadType.value === 'SURVEY_REPORT' ? uploadPhase.value : undefined
    }
  })
  .then(res => {
    if (res.data && res.data.code === 200) {
      ElMessage.success('✅ 文件上传成功！');
      startPolling(); // 单例启动，不会重复
    } else {
      const errorMsg = res.data?.msg || '服务器返回异常，上传失败';
      ElMessage.error(`⚠️ 上传失败：${errorMsg}，可在文件列表重试~`);
    }
  })
  .catch(err => {
    console.error('上传出错详情:', err);
    let errorMsg = '未知错误，上传失败';
    if (err.response && err.response.data && err.response.data.msg) {
      errorMsg = err.response.data.msg;
    } else if (err.message) {
      errorMsg = err.message;
    }
    ElMessage.error(`⚠️ 上传失败：${errorMsg}，请核对参数后重试~`);
  });
};


const startProcessing = (row) => {
  ElMessageBox.confirm(`确认对文件 "${row.name}" 开始智能解析吗？`, '启动解析', {
    confirmButtonText: '立即开始',
    cancelButtonText: '取消',
    type: 'primary'
  }).then(() => {
    // 接口：/file/parse/{id}
    // 注意：row.rawId 是我们在 refreshData 里存的后端真实 ID
    axios.post(`/api/file/parse/${row.rawId}`)
      .then(res => {
        if (res.data.code === 200) {
          ElMessage.success('任务提交成功，系统正在后台解析...')
          
          // 1. 立即更新前端状态为 "排队中"
          // 这样 UI 会立刻变蓝，并且触发下面的轮询检查
          row.status = 'PENDING' 
           startPolling();
        } else {
          ElMessage.error(res.data.msg || '解析请求被拒绝')
        }
      })
      .catch(err => {
        console.error('启动解析失败:', err)
        ElMessage.error('无法连接到解析服务')
      })
  }).catch(() => {})
}

// 取消解析（仅针对排队中/正在解析的文件）
const cancelProcessing = (row) => {
  // 1. 打印文件编号（满足你的需求，打印rawId（后端主键）和name（文件名））
  console.log('===== 开始取消解析 =====', {
    文件ID: row.rawId,
    文件名: row.name,
    取消前状态: row.status,
    时间: new Date().toLocaleTimeString()
  })
  // 2. 确认弹窗
  ElMessageBox.confirm(
    `确认取消文件 "${row.name}" 的解析任务吗？取消后可重新发起解析。`,
    '取消解析',
    {
      confirmButtonText: '确认取消',
      cancelButtonText: '再等等',
      type: 'warning'
    }
  ).then(async () => {
    try {

      console.log(`[${new Date().toLocaleTimeString()}] 调用取消接口: /api/file/cancel/${row.rawId}`)
      // 3. 调用取消解析接口
      // 接口：POST /api/file/cancel/{fileId}
      // query参数：reason（可选，传入"用户主动取消"）
      const cancelRes = await axios.post(`/api/file/cancel/${row.rawId}`, null, {
        params: {
          reason: '用户主动取消' // 可选参数，符合接口要求
        }
      })

      console.log('===== 取消接口响应 =====', {
        文件ID: row.rawId,
        后端响应码: cancelRes.data.code,
        后端响应信息: cancelRes.data.msg,
        后端返回的文件状态: cancelRes.data?.data?.fileState || '无',
        时间: new Date().toLocaleTimeString()
      })


      // 4. 成功提示，更新前端状态，停止对应轮询（如果没有其他解析任务）
      ElMessage.success(`已取消文件 "${row.name}" 的解析任务`)
      row.status = 'WAITING_PARSE' // 取消后重置为「待解析」状态

      console.log(`[${new Date().toLocaleTimeString()}] 前端修改状态完成：`, {
        文件ID: row.rawId,
        修改后状态: row.status,
        注意: '如果后续变回解析失败，就是轮询从后端拿到了新状态'
      })

      // checkPolling(fileTableData.value) // 检查轮询是否需要继续

    } catch (err) {
      console.error('取消解析失败：', err)
      ElMessage.error(err.response?.data?.msg || '取消解析任务失败，请重试')
    }
  }).catch(() => {
    // 取消弹窗的回调（无需处理）
  })
}

// --- 4. 校对与审核 ---

// ========== 新增：用途类别映射（放在statusMap下方） ==========
const usageCategoryMap = {
  'RESIDENTIAL': '住宅',
  'COMMERCIAL': '商业',
  'INDUSTRIAL': '工业',
  'PUBLIC': '公共配套',
  'OTHER': '其他'
}
// ===== 新增：编辑功能核心变量 =====
const editRowId = ref(''); // 当前正在编辑的行ID（用于控制单行/单单元格编辑状态）
const editField = ref(''); // 当前正在编辑的字段名（用于控制单单元格编辑）
const updateLoading = ref(false); // 单个字段更新的加载状态
// ===== 修正：存储户室面积对照表ID（整份报告ID，用于查询/刷新数据） =====


// ===== 新增：整体编辑状态开关（核心，控制表格展示/编辑切换） =====
const isEditing = ref(false); // 是否处于编辑状态（false：展示，true：可编辑）
const batchUpdateLoading = ref(false); // 批量保存的加载状态

// ===== 新增：完整的字段映射（对应接口枚举值，用于下拉选择） =====
// 1. 是否参与计算 映射（接口要求 0/1）
const isCalculateMap = [
  { label: '是', value: 1 },
  { label: '否', value: 0 }
];

// 2. 用途类别 完整映射（对应接口的枚举值，用于编辑下拉）
const usageCategoryOptions = [
  { label: '住宅', value: 'RESIDENTIAL' },
  { label: '商业', value: 'COMMERCIAL' },
  { label: '管理用房', value: 'MANAGEMENT' },
  { label: '其他可建设用房', value: 'OTHER_BUILDABLE' },
  { label: '社区配套', value: 'COMMUNITY' },
  { label: '其他公共配套', value: 'OTHER_PUBLIC' },
  { label: '未知', value: 'UNKNOWN' }
];
const usageCategoryReverseMap = {
  '住宅': 'RESIDENTIAL',
  '商业': 'COMMERCIAL',
  '管理用房': 'MANAGEMENT',
  '其他可建设用房': 'OTHER_BUILDABLE',
  '社区配套': 'COMMUNITY',
  '其他公共配套': 'OTHER_PUBLIC',
  '未知': 'UNKNOWN'
};
// 3. 面积类型 映射（对应接口的枚举值，用于编辑下拉）
const floorAreaTypeOptions = [
  { label: '计容', value: 'BUILDABLE' },
  { label: '不计容', value: 'NON_BUILDABLE' },
  { label: '未知', value: 'UNKNOWN' }
];

// ===== 新增：数据格式化工具（避免编辑时传递字符串给接口） =====
// 格式化数字（面积字段，保留2位小数，非数字转为0）
const formatNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
};



// ========== 新增：户室面积相关变量（放在calibrationPdfUrl下方） ==========
const roomInfoLoading = ref(false) // 户室数据加载状态
const roomInfoData = ref([])       // 户室面积表格数据
const roomSumInfo = reactive({     // 面积汇总信息
  buildingAreaSum: '0.00',
  innerAreaSum: '0.00',
  balconyAreaSum: '0.00',
  sharedAreaSum: '0.00'
})



const showCalibration = ref(false)
const calibrationLoading = ref(false)
const currentFile = ref(null)
const calibrationPdfUrl = ref('')

// 新增：审核合计信息（对应需求的所有字段）
const auditSummaryData = reactive({
  pendingConfirmArea: '0.00',
  unknownUsages: '[]',
  unknownUsageCount: 0,
  isVerified: 0,
  hasUnknownUsage: 0,
  verificationErrorReason: '-',
  roomInfoBuildingAreaSum: '0.00',
  roomInfoInnerAreaSum: '0.00',
  roomInfoBalconyAreaSum: '0.00',
  roomInfoSharedAreaSum: '0.00',
  // 新增OCR机器识别字段，初始化默认值
  roomInfoBuildingAreaSumFromOcr: '0.00',
  roomInfoInnerAreaSumFromOcr: '0.00',
  roomInfoBalconyAreaSumFromOcr: '0.00',
  roomInfoSharedAreaSumFromOcr: '0.00'
})
const auditSummaryDisplay = computed(() => {
  return {
    // 0→未验证，1→已验证
    isVerifiedText: auditSummaryData.isVerified === 1 ? '已验证' : '未验证',
    // 0→无，1→有
    hasUnknownUsageText: auditSummaryData.hasUnknownUsage === 1 ? '有' : '无',
  };
});

const currentViewType = ref('original'); // currentViewType：original（原始）/ preprocess（预处理）
const preprocessGridfsId = ref(''); // 预处理文件gridfsId
const isPreprocessAvailable = computed(() => !!preprocessGridfsId.value); // 判断是否有预处理文件

// ===== MD 功能：响应式变量 =====
const recognitionMdContent = ref(''); // 存储接口返回的 MD 原始内容
const recognitionMdLoading = ref(false); // MD 加载状态（独立，不影响其他功能）

// ===== MD 功能：配置 marked（结合 highlight.js 实现代码高亮） =====
// ===== MD 功能：配置 marked（支持图片渲染 + 安全过滤） =====
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {
        console.error('代码高亮失败：', err);
      }
    }
    return hljs.highlightAuto(code).value;
  },
  gfm: true,
  breaks: true,
  sanitize: false, // 关闭默认过滤，改用自定义安全规则
  // 自定义安全过滤（允许图片+常用标签，同时补全图片路径）
  sanitizer: (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // 允许的标签（只保留业务需要的标签）
    const allowedTags = ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'pre', 'code', 'div', 'img'];
    // 允许的标签属性
    const allowedAttrs = {
      img: ['src', 'alt', 'width', 'style'],
      div: ['style'],
      pre: ['style'],
    };

    // 遍历所有元素，过滤危险内容
    doc.body.querySelectorAll('*').forEach(el => {
      const tag = el.tagName.toLowerCase();
      // 移除不允许的标签
      if (!allowedTags.includes(tag)) {
        el.remove();
        return;
      }
      // 移除不允许的属性
      Array.from(el.attributes).forEach(attr => {
        if (!allowedAttrs[tag]?.includes(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });

      // 关键：补全图片路径（替换为后端图片接口地址）
      if (tag === 'img') {
        let src = el.getAttribute('src');
        if (src) {
          // 假设后端图片接口是 /api/file/download/imgs/[图片名]
          // 把 "imgs/xxx.jpg" 替换为 "/api/file/download/imgs/xxx.jpg"
          const imgName = src.split('/').pop(); // 提取图片文件名
          el.setAttribute('src', `/api/file/download/imgs/${imgName}`);
        }
      }
    });

    return doc.body.innerHTML;
  }
});
// ===== MD 功能：加载 MD 内容（调用你的 ocr-execution-results/query 接口） =====
const loadRecognitionMd = async (fileRecordId) => {
  if (!fileRecordId) {
    recognitionMdContent.value = '# 缺少文件记录ID，无法加载识别内容';
    return;
  }

  recognitionMdLoading.value = true;
  try {
    const res = await axios.post(
      '/api/data-tables/ocr-execution-results/query',
      {
        fileRecordId: fileRecordId,
        pageNum: 1,
        pageSize: 20,
        sortField: 'createTime',
        sortDirection: 'desc'
      }
    );

    if (res.data.code === 200 && Array.isArray(res.data.data.records) && res.data.data.records.length > 0) {
      const ocrResult = res.data.data.records[0];
      recognitionMdContent.value = ocrResult.markdownContent || '# 暂无识别内容（MD格式）';
      
      // ===== 仅打印：原始MD中的所有img标签语句 =====
      const mdContent = ocrResult.markdownContent || '';
      // 正则匹配所有 <img ...> 标签（包括带换行的情况）
      const imgTagReg = /<img[^>]*>/gi;
      const imgTags = mdContent.match(imgTagReg) || [];
      
      console.log('📷 原始MD中提取到的所有img标签：');
      if (imgTags.length > 0) {
        imgTags.forEach((imgTag, index) => {
          console.log(`  第${index+1}个img：`, imgTag);
          // 额外提取每个img的src地址，方便快速查看
          const srcReg = /src=["']([^"']+)["']/i;
          const srcMatch = imgTag.match(srcReg);
          const imgSrc = srcMatch ? srcMatch[1] : '无src地址';
          console.log(`  对应src地址：`, imgSrc);
        });
      } else {
        console.log('  未提取到任何img标签');
      }
    } else {
      recognitionMdContent.value = '# 未查询到OCR识别结果';
    }
  } catch (error) {
    console.error('MD 内容加载失败：', error);
    recognitionMdContent.value = `# 加载失败：${error.message || '网络异常'}`;
  } finally {
    recognitionMdLoading.value = false;
  }
};



const getPdfBlobUrl = async (gridfsId) => {
  if (!gridfsId) return '';
  try {
    const pdfRes = await axios.get(`/api/file/download/gridfs/${gridfsId}`, {
      responseType: 'blob'
    });
    const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
    // 清理旧的Blob URL，避免内存泄漏
    if (calibrationPdfUrl.value) URL.revokeObjectURL(calibrationPdfUrl.value);
    return URL.createObjectURL(blob);
  } catch (error) {
    ElMessage.warning('PDF预览失败');
    return '';
  }
};
const switchView = async (viewType) => {
  if (currentViewType.value === viewType) return; // 避免重复切换
  calibrationLoading.value = true;
  try {
     // 👉 切换到 MD 视图：加载 MD 内容
    if (viewType === 'recognition') {
      await loadRecognitionMd(currentFile.value?.rawId); // 传入 row.rawId
      currentViewType.value = viewType;

      // ===== 仅打印：解析后HTML中的所有img标签 =====
      const parsedHtml = marked(recognitionMdContent.value);
      const imgTagReg = /<img[^>]*>/gi;
      const parsedImgTags = parsedHtml.match(imgTagReg) || [];
      
      console.log('📷 marked解析后HTML中的所有img标签：');
      if (parsedImgTags.length > 0) {
        parsedImgTags.forEach((imgTag, index) => {
          console.log(`  第${index+1}个img：`, imgTag);
          const srcReg = /src=["']([^"']+)["']/i;
          const srcMatch = imgTag.match(srcReg);
          const imgSrc = srcMatch ? srcMatch[1] : '无src地址';
          console.log(`  对应src地址：`, imgSrc);
        });
      } else {
        console.log('  解析后未保留任何img标签');
      }

      calibrationLoading.value = false;
      return;
    }

    let targetGridfsId = '';
    if (viewType === 'original') {
      targetGridfsId = currentFile.value?.fileId || '';
    } else if (viewType === 'preprocess') {
      targetGridfsId = preprocessGridfsId.value || '';
    }
    // 获取新的PDF Blob URL
    const newPdfUrl = await getPdfBlobUrl(targetGridfsId);
    if (newPdfUrl) {
      calibrationPdfUrl.value = newPdfUrl;
      currentViewType.value = viewType; // 更新当前预览类型
    }
  } finally {
    calibrationLoading.value = false;
  }
};
// 新增：重置审核弹窗状态（避免残留）
const resetCalibrationState = () => {
  currentViewType.value = 'original';
  preprocessGridfsId.value = '';
  calibrationPdfUrl.value = '';
  // 新增：重置 MD 内容
  recognitionMdContent.value = '';
  // 重置合计数据为默认值
  Object.assign(auditSummaryData, {
    pendingConfirmArea: '0.00',
    unknownUsages: '[]',
    unknownUsageCount: 0,
    isVerified: 0,
    hasUnknownUsage: 0,
    verificationErrorReason: '-',
    roomInfoBuildingAreaSum: '0.00',
    roomInfoInnerAreaSum: '0.00',
    roomInfoBalconyAreaSum: '0.00',
    roomInfoSharedAreaSum: '0.00',
    roomInfoBuildingAreaSumFromOcr: '0.00',
    roomInfoInnerAreaSumFromOcr: '0.00',
    roomInfoBalconyAreaSumFromOcr: '0.00',
    roomInfoSharedAreaSumFromOcr: '0.00'
  });
  // 重置户室数据
  roomInfoData.value = [];
};

// 新增：PDF单独加载状态（用于左边PDF区域，不影响右边表格）
const pdfLoading = ref(false);
const realSurveyReportId = ref(null); // 关键：存储 currentSummary.id（如447）

// 替换原有openCalibration函数
const openCalibration = async (row) => {
  currentFile.value = row
  showCalibration.value = true
  calibrationLoading.value = true // 整体loading（短暂，用于初始化）
  pdfLoading.value = true // PDF单独loading
  calibrationPdfUrl.value = ''
  preprocessGridfsId.value = row.preprocessGridfsId || '';
  currentViewType.value = 'original';

  try {
    // 核心优化：并行执行两个任务，互不阻塞
    // 任务1：加载PDF（异步，不阻塞后续接口请求）
    const loadPdfTask = async () => {
      try {
        const initialPdfUrl = await getPdfBlobUrl(row.fileId);
        if (initialPdfUrl) {
          calibrationPdfUrl.value = initialPdfUrl;
        } else {
          ElMessage.warning('原始文件预览失败');
        }
      } catch (error) {
        ElMessage.warning('原始文件预览失败');
      } finally {
        pdfLoading.value = false; // PDF加载完成（无论成败），关闭PDF loading
      }
    };

    // 任务2：加载户室数据 + 合计数据（核心业务数据，优先执行）
    const loadBusinessDataTask = async () => {
      if (!currentProject.value || !row.rawId) { // 校验基础参数
        ElMessage.warning('缺少项目/报告ID，无法加载数据')
        calibrationLoading.value = false;
        pdfLoading.value = false;
        return
      }
      // 初始化汇总数据
      roomSumInfo.buildingAreaSum = '0.00'
      roomSumInfo.innerAreaSum = '0.00'
      roomSumInfo.balconyAreaSum = '0.00'
      roomSumInfo.sharedAreaSum = '0.00'

      

      // 步骤1：先调用 POST /query 接口，获取真实报告ID + 汇总数据（核心：先拿 ID）
      try {
        const summaryRes = await axios.post(
          `/api/project/survey-reports/query`, // 新接口地址
          { fileRecordId: row.rawId } // POST 请求参数：fileRecordId = row.rawId
        );
        console.log(row.rawId, 'query 接口响应（获取真实ID + 汇总数据）：', summaryRes.data)
        
        if (summaryRes.data.code === 200 && Array.isArray(summaryRes.data.data.records) && summaryRes.data.data.records.length > 0) {
          // 提取真实报告ID（如 447），后续用于请求户室数据
          const currentSummary = summaryRes.data.data.records[0];
          realSurveyReportId.value = currentSummary.id; // 关键：拿到真实 ID 447
          console.log('已存储户室面积对照表ID：', realSurveyReportId.value);

          // 直接赋值汇总数据（从 query 接口的 records[0] 提取，无需遍历）
          auditSummaryData.pendingConfirmArea = (currentSummary.pendingConfirmArea || 0).toFixed(2);
          auditSummaryData.unknownUsages = currentSummary.unknownUsages || '[]';
          auditSummaryData.unknownUsageCount = currentSummary.unknownUsageCount || 0;
          auditSummaryData.isVerified = currentSummary.isVerified || 0;
          auditSummaryData.hasUnknownUsage = currentSummary.hasUnknownUsage || 0;
          auditSummaryData.verificationErrorReason = currentSummary.verificationErrorReason || '-';
          auditSummaryData.roomInfoBuildingAreaSum = (currentSummary.roomInfoBuildingAreaSum || 0).toFixed(2);
          auditSummaryData.roomInfoInnerAreaSum = (currentSummary.roomInfoInnerAreaSum || 0).toFixed(2);
          auditSummaryData.roomInfoBalconyAreaSum = (currentSummary.roomInfoBalconyAreaSum || 0).toFixed(2);
          auditSummaryData.roomInfoSharedAreaSum = (currentSummary.roomInfoSharedAreaSum || 0).toFixed(2);
          // OCR 字段赋值
          auditSummaryData.roomInfoBuildingAreaSumFromOcr = (currentSummary.roomInfoBuildingAreaSumFromOcr || 0).toFixed(2);
          auditSummaryData.roomInfoInnerAreaSumFromOcr = (currentSummary.roomInfoInnerAreaSumFromOcr || 0).toFixed(2);
          auditSummaryData.roomInfoBalconyAreaSumFromOcr = (currentSummary.roomInfoBalconyAreaSumFromOcr || 0).toFixed(2);
          auditSummaryData.roomInfoSharedAreaSumFromOcr = (currentSummary.roomInfoSharedAreaSumFromOcr || 0).toFixed(2);
          
        } else {
          ElMessage.warning('query 接口返回格式异常，未获取到有效数据');
          // 汇总数据兜底
          Object.assign(auditSummaryData, {
            pendingConfirmArea: '0.00',
            unknownUsageCount: 0,
            verificationErrorReason: '-',
            roomInfoBuildingAreaSum: '0.00'
          });
          return; // 没拿到有效数据，直接终止后续请求
        }
      } catch (error) {
        ElMessage.warning('query 接口请求失败，无法获取汇总数据和真实报告ID');
        console.error('query 接口异常：', error);
        // 汇总数据兜底
        Object.assign(auditSummaryData, {
          pendingConfirmArea: '0.00',
          unknownUsageCount: 0,
          verificationErrorReason: '-',
          roomInfoBuildingAreaSum: '0.00'
        });
        return; // 请求失败，终止后续请求
      }

      // 步骤2：用真实报告ID（如 447）请求户室数据接口（核心：替换原有 row.rawId）
      if (!realSurveyReportId.value) {
        ElMessage.warning('未获取到真实报告ID，无法加载户室数据');
        return;
      }

      roomInfoLoading.value = true;
      try {
        // 关键修改：户室接口传参改为 realSurveyReportId（447），而非 row.rawId
        const roomRes = await axios.get(`/api/project/${currentProject.value}/survey-reports/${realSurveyReportId.value}/room-info`)
        console.log(realSurveyReportId, '户室面积接口响应：', roomRes.data)
        
        if (roomRes.data.code === 200 && Array.isArray(roomRes.data.data)) {
          
          roomInfoData.value = roomRes.data.data.map(item => ({
            id: item.id,
            roomLevel: item.roomLevel || '-',
            roomNumber: item.roomNumber || '-',
            buildingArea: (item.buildingArea || 0).toFixed(2),
            innerArea: (item.innerArea || 0).toFixed(2),
            balconyArea: (item.balconyArea || 0).toFixed(2),
            sharedArea: (item.sharedArea || 0).toFixed(2),
            isCalculate: item.isCalculate || 0,
            usageCategory: usageCategoryMap[item.usageCategory] || '未知',
            roomUsage: item.roomUsage || '-',
            floorAreaType: item.floorAreaType === 'BUILDABLE' ? '计容' : '不计容'
          }));
         

          // 兜底逻辑：如果 query 接口汇总面积为空，用户室数据计算总和
          if (!auditSummaryData.roomInfoBuildingAreaSum && roomInfoData.value.length > 0) {
            const buildingAreaTotal = roomInfoData.value.reduce((sum, item) => sum + Number(item.buildingArea), 0);
            auditSummaryData.roomInfoBuildingAreaSum = buildingAreaTotal.toFixed(2);
          }
        } else {
          roomInfoData.value = []
          ElMessage.warning('暂无户室面积数据')
        }
      } catch (error) {
        roomInfoData.value = []
        ElMessage.warning('户室数据加载失败')
        console.error('户室数据接口异常：', error)
      } finally {
        roomInfoLoading.value = false;
      }
    };

    // 并行执行两个任务，互不阻塞
    await Promise.all([loadPdfTask(), loadBusinessDataTask()]);

  } catch (error) {
    ElMessage.error('文件详情加载失败')
    pdfLoading.value = false;
    roomInfoLoading.value = false;
  } finally {
    calibrationLoading.value = false; // 所有任务完成，关闭整体loading
  }
}


const pdfLoaded = () => {
  console.log('PDF加载成功')
}
const pdfLoadError = () => {
  ElMessage.warning('PDF预览失败，可通过下载接口查看文件')
  calibrationPdfUrl.value = '' // 清空无效地址
}




const handleAuditPass = () => {
  ElMessage.success('审核通过');
  showCalibration.value = false;
  // ===== 新增：重置所有状态 =====
  resetCalibrationState();
  refreshData();
};

const originalRoomInfoData = ref([]);
// ===== 新增：进入编辑模式 =====
const enterEditMode = () => {
  if (roomInfoData.value.length === 0) {
    ElMessage.warning('暂无户室数据可编辑');
    return;
  }
  originalRoomInfoData.value = JSON.parse(JSON.stringify(roomInfoData.value));
  // 切换编辑状态，表格变为可编辑
  isEditing.value = true;
  ElMessage.info('已进入编辑模式，修改完成后请点击「保存修改」');
};
// 新增：对比原始数据和当前数据，返回修改过的户室列表
const getModifiedRoomList = () => {
  const modifiedList = [];
  // 遍历当前数据，和原始数据对比
  roomInfoData.value.forEach((currentRow, index) => {
    const originalRow = originalRoomInfoData.value[index];
    if (!originalRow) return;

    // 对比核心字段（有任意一个字段不同，就是修改过的）
    const isModified = 
      currentRow.roomLevel !== originalRow.roomLevel ||
      currentRow.roomNumber !== originalRow.roomNumber ||
      currentRow.buildingArea !== originalRow.buildingArea ||
      currentRow.innerArea !== originalRow.innerArea ||
      currentRow.balconyArea !== originalRow.balconyArea ||
      currentRow.sharedArea !== originalRow.sharedArea ||
      currentRow.isCalculate !== originalRow.isCalculate ||
      currentRow.usageCategory !== originalRow.usageCategory ||
      currentRow.roomUsage !== originalRow.roomUsage ||
      currentRow.floorAreaType !== originalRow.floorAreaType;

    // 如果修改过，加入待保存列表
    if (isModified) {
      modifiedList.push(currentRow);
    }
  });
  return modifiedList;
};

// ===== 新增：退出编辑模式（不保存） =====
const exitEditMode = () => {
  ElMessageBox.confirm(
    '确定退出编辑模式吗？未保存的修改将全部丢失。',
    '提示',
    {
      confirmButtonText: '确定退出',
      cancelButtonText: '继续编辑',
      type: 'warning'
    }
  ).then(async () => {
    // 切换回展示状态
    isEditing.value = false;
    // 重新加载户室数据，恢复原始数据（避免未保存修改残留）
    if (currentProject.value && realSurveyReportId.value) {
      roomInfoLoading.value = true;
      try {
        const roomRes = await axios.get(`/api/project/${currentProject.value}/survey-reports/${realSurveyReportId.value}/room-info`);
        if (roomRes.data.code === 200 && Array.isArray(roomRes.data.data)) {
          roomInfoData.value = roomRes.data.data.map(item => ({
            id: item.id,
            roomLevel: item.roomLevel || '-',
            roomNumber: item.roomNumber || '-',
            buildingArea: (item.buildingArea || 0).toFixed(2),
            innerArea: (item.innerArea || 0).toFixed(2),
            balconyArea: (item.balconyArea || 0).toFixed(2),
            sharedArea: (item.sharedArea || 0).toFixed(2),
            isCalculate: item.isCalculate || 0,
            usageCategory: usageCategoryMap[item.usageCategory] || '未知',
            roomUsage: item.roomUsage || '-',
            floorAreaType: item.floorAreaType === 'BUILDABLE' ? '计容' : '不计容'
          }));
        }
        ElMessage.success('已退出编辑模式，恢复原始数据');
      } catch (error) {
        console.error('重新加载户室数据失败：', error);
        ElMessage.warning('退出编辑模式成功，但原始数据加载失败');
      } finally {
        roomInfoLoading.value = false;
      }
    }
  }).catch(() => {
    // 取消退出，继续编辑
  });
};

// ===== 完善：批量保存修改（核心，调用 PUT /project/room-info/update 接口） =====
const handleSaveData = async () => {
  if (roomInfoData.value.length === 0) {
    ElMessage.warning('暂无户室数据可保存');
    return;
  }
  if (!realSurveyReportId.value) {
    ElMessage.warning('缺少户室面积对照表ID，无法保存');
    return;
  }

  // 第一步：获取修改过的户室列表（核心优化：只处理修改过的）
  const modifiedRoomList = getModifiedRoomList();
  if (modifiedRoomList.length === 0) {
    ElMessage.info('暂无数据修改，无需保存');
    isEditing.value = false;
    return;
  }

  // 确认保存
  ElMessageBox.confirm(
    `确定保存 ${modifiedRoomList.length} 条修改后的户室数据吗？保存后将无法撤销。`,
    '提示',
    {
      confirmButtonText: '确定保存',
      cancelButtonText: '取消',
      type: 'primary'
    }
  ).then(async () => {
    batchUpdateLoading.value = true;
    let successCount = 0; // 保存成功数量
    let failCount = 0; // 保存失败数量

    // 第二步：只遍历修改过的户室，发请求（不再遍历所有）
    for (const row of modifiedRoomList) {
      if (!row.id) {
        failCount++;
        continue;
      }

      // 数据预处理（适配接口要求：格式转换、空值兜底）
      const roomInfoUpdateDTO = {
        id: row.id, // 接口必填：户室唯一ID（row.id）
        roomLevel: row.roomLevel || '',
        roomNumber: row.roomNumber || '',
        buildingArea: isNaN(Number(row.buildingArea)) ? 0 : Number(row.buildingArea),
        innerArea: isNaN(Number(row.innerArea)) ? 0 : Number(row.innerArea),
        balconyArea: isNaN(Number(row.balconyArea)) ? 0 : Number(row.balconyArea),
        sharedArea: isNaN(Number(row.sharedArea)) ? 0 : Number(row.sharedArea),
        roomUsage: row.roomUsage || '',
        isCalculate: isNaN(Number(row.isCalculate)) ? 0 : Number(row.isCalculate),
         usageCategory: usageCategoryReverseMap[row.usageCategory] || 'UNKNOWN',
        floorAreaType: row.floorAreaType === '计容' ? 'BUILDABLE' : (row.floorAreaType === '不计容' ? 'NON_BUILDABLE' : 'UNKNOWN')
      };
      console.log(`保存户室ID ${row.id} 数据：`, roomInfoUpdateDTO);

      try {
        // 修正后的接口地址（带 /api 前缀）
        const res = await axios.put(
          '/api/project/room-info/update', // 已补充 /api 前缀
          roomInfoUpdateDTO 
        );

        if (res.data.code === 200) {
          successCount++;
        } else {
          failCount++;
          console.error(`户室ID ${row.id} 保存失败：`, res.data.msg);
        }
      } catch (error) {
        failCount++;
        console.error(`户室ID ${row.id} 保存异常：`, error);
      }
    }

    // 保存完成后处理
    batchUpdateLoading.value = false;
    isEditing.value = false; // 切换回展示状态

    // 提示保存结果
    if (failCount === 0) {
      ElMessage.success(`全部 ${successCount} 条修改数据保存成功！`);
    } else {
      ElMessage.warning(`保存完成：成功 ${successCount} 条，失败 ${failCount} 条，请查看控制台日志`);
    }

    // 重新加载户室数据和汇总数据，保证数据一致性
    await reloadRoomAndSummaryData();

  }).catch(() => {
    // 取消保存
  });
};

// ===== 新增：重新加载户室数据和汇总数据（保存后刷新） =====
const reloadRoomAndSummaryData = async () => {
  if (!currentProject.value || !realSurveyReportId.value || !currentFile.value) {
    return;
  }

  // 1. 重新加载汇总数据
  try {
    const summaryRes = await axios.post(
      `/api/project/survey-reports/query`,
      { fileRecordId: currentFile.value.rawId }
    );
    if (summaryRes.data.code === 200 && Array.isArray(summaryRes.data.data.records) && summaryRes.data.data.records.length > 0) {
      const currentSummary = summaryRes.data.data.records[0];
      auditSummaryData.pendingConfirmArea = (currentSummary.pendingConfirmArea || 0).toFixed(2);
      auditSummaryData.unknownUsages = currentSummary.unknownUsages || '[]';
      auditSummaryData.unknownUsageCount = currentSummary.unknownUsageCount || 0;
      auditSummaryData.isVerified = currentSummary.isVerified || 0;
      auditSummaryData.hasUnknownUsage = currentSummary.hasUnknownUsage || 0;
      auditSummaryData.verificationErrorReason = currentSummary.verificationErrorReason || '-';
      auditSummaryData.roomInfoBuildingAreaSum = (currentSummary.roomInfoBuildingAreaSum || 0).toFixed(2);
      auditSummaryData.roomInfoInnerAreaSum = (currentSummary.roomInfoInnerAreaSum || 0).toFixed(2);
      auditSummaryData.roomInfoBalconyAreaSum = (currentSummary.roomInfoBalconyAreaSum || 0).toFixed(2);
      auditSummaryData.roomInfoSharedAreaSum = (currentSummary.roomInfoSharedAreaSum || 0).toFixed(2);
      auditSummaryData.roomInfoBuildingAreaSumFromOcr = (currentSummary.roomInfoBuildingAreaSumFromOcr || 0).toFixed(2);
      auditSummaryData.roomInfoInnerAreaSumFromOcr = (currentSummary.roomInfoInnerAreaSumFromOcr || 0).toFixed(2);
      auditSummaryData.roomInfoBalconyAreaSumFromOcr = (currentSummary.roomInfoBalconyAreaSumFromOcr || 0).toFixed(2);
      auditSummaryData.roomInfoSharedAreaSumFromOcr = (currentSummary.roomInfoSharedAreaSumFromOcr || 0).toFixed(2);
    }
  } catch (error) {
    console.error('重新加载汇总数据失败：', error);
  }

  // 2. 重新加载户室数据
  roomInfoLoading.value = true;
  try {
    const roomRes = await axios.get(`/api/project/${currentProject.value}/survey-reports/${realSurveyReportId.value}/room-info`);
    if (roomRes.data.code === 200 && Array.isArray(roomRes.data.data)) {
      roomInfoData.value = roomRes.data.data.map(item => ({
        id: item.id,
        roomLevel: item.roomLevel || '-',
        roomNumber: item.roomNumber || '-',
        buildingArea: (item.buildingArea || 0).toFixed(2),
        innerArea: (item.innerArea || 0).toFixed(2),
        balconyArea: (item.balconyArea || 0).toFixed(2),
        sharedArea: (item.sharedArea || 0).toFixed(2),
        isCalculate: item.isCalculate || 0,
        usageCategory: usageCategoryMap[item.usageCategory] || '未知',
        roomUsage: item.roomUsage || '-',
        floorAreaType: item.floorAreaType === 'BUILDABLE' ? '计容' : '不计容'
      }));
    }
  } catch (error) {
    console.error('重新加载户室数据失败：', error);
  } finally {
    roomInfoLoading.value = false;
  }
};




</script>

<style scoped>

.macaron-container { padding: 20px; min-height: 80vh; background-color: #f5f7fa; }

.action-header {  display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; background: white; padding: 30px 25px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.project-info { display: flex; align-items: center; gap: 16px; }
.sub-title { font-size: 14px; color: #606266; white-space: nowrap; }
.project-selector-wrapper { display: flex; align-items: center; gap: 15px; }
.task-card { border-radius: 12px; border: 1px solid #ebeef5; min-height: 500px; padding: 24px; box-sizing: border-box; }
.status-badge { display: flex; align-items: center; font-size: 13px; }
.dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; display: inline-block; }
.dot.gray { background: #c0c4cc; } .dot.green { background: #67c23a; } .dot.blue { background: #409eff; animation: pulse 1.5s infinite; } .dot.purple { background: #9d8cff; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { transform: scale(0.95); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.7; } }
:deep(.custom-table .el-table__row) { height: 90px; }
:deep(.custom-table .el-table__cell) { padding: 12px 10px; box-sizing: border-box; }
:deep(.custom-table .el-table__header .el-table__cell) { padding: 12px 10px; height: 50px; box-sizing: border-box; }
:deep(.el-table-column[label="预览"]) { width: 120px !important; }
:deep(.el-table-column[label="预览"] .el-table__cell) { white-space: normal; overflow: visible; }
.file-name-cell { display: flex; flex-direction: column; justify-content: center; height: 100%; padding-left: 4px; }
.upload-btn-main { padding: 12px 24px; }
.upload-content { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0; }
.upload-tip { margin-top: 10px; font-size: 12px; color: #909399; }
.cali-header { display: flex; justify-content: space-between; padding: 16px 24px; height: 100%; align-items: center; background: white; border-bottom: 1px solid #f0f2f5; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.header-left { display: flex; align-items: center; gap: 20px; }
.file-title-block { margin-left: 0; display: flex; flex-direction: column; }
.file-title-block .title { font-weight: 700; font-size: 18px; color: #1f2329; }
.file-title-block .sub-name { font-size: 14px; color: #86909c; margin-top: 2px; }
.header-right { display: flex; align-items: center; gap: 16px; }
:deep(.header-right .el-tag--warning) { padding: 6px 12px; font-size: 14px; }
:deep(.header-right .el-button--success) { padding: 8px 20px; font-size: 14px; }
.split-view { display: flex; height: calc(100vh - 80px); background: #f0f2f5; }
.left-panel { width: 50%; display: flex; flex-direction: column; background: #525659; border-right: 1px solid #dcdfe6; }
.pdf-toolbar { height: 48px; background: #fff; border-bottom: 1px solid #ccc; display: flex; align-items: center; justify-content: center; }
.divider { width: 1px; height: 20px; background: #ddd; margin: 0 15px; }
.pdf-canvas { flex: 1; display: flex; justify-content: center; align-items: center; flex-direction: column; color: #ccc; }
/* 找到你现有样式中的 .right-panel，修改/补充如下样式 */
.right-panel {
  width: 50%;
  /* 核心修改：启用 flex 垂直布局 */
  display: flex;
  flex-direction: column;
  /* 原有样式保留 */
  overflow: hidden !important; /* 取消原有 overflow-y: auto，交给子元素处理 */
  background: #f2f4f7;
  padding: 16px; /* 加一点内边距，避免内容贴边 */
  box-sizing: border-box;
}
.excel-sheet-card { background: white; margin: 20px; border: 1px solid #dcdfe6; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); overflow: hidden; }
.excel-header { background: #e8f4ff; padding: 10px 15px; border-bottom: 1px solid #dcdfe6; }
.sheet-title { font-weight: bold; color: #409eff; font-size: 14px; display: flex; align-items: center; }
.error-highlight :deep(.el-input__wrapper) { box-shadow: 0 0 0 1px #F56C6C inset !important; background-color: #fef0f0; }
:deep(.project-selector-wrapper .el-button--primary) { display: flex; align-items: center; justify-content: center; padding: 12px 28px !important; gap: 6px; }
:deep(.project-selector-wrapper .el-select--large .el-input__wrapper) { padding: 8px 15px !important; box-sizing: border-box; }
:deep(.project-selector-wrapper .el-button--primary .el-button__content) { display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px; }
:deep(.upload-demo .el-upload__file-list) {
  margin-top: 20px; /* 增加列表与上传区域的间距 */
}
:deep(.upload-confirm-btn:not(:disabled)) {
  background-color: #A0C4FF !important;
  border-color: #A0C4FF !important;
  color: white !important;
  cursor: pointer;
}

/* 无文件（禁用）的样式：灰色（暗着） */
:deep(.upload-confirm-btn:disabled) {
  background-color: #e0e0e0 !important;
  border-color: #e0e0e0 !important;
  color: #999 !important;
  cursor: not-allowed;
}
/* 强制取消表格行 hover/选中时的背景（覆盖 Element 默认样式） */
:deep(.custom-table .el-table__body .el-table__row.no-hover-highlight:hover > td) {
  background-color: transparent !important;
  box-shadow: none !important; /* 移除hover时的阴影 */
  color: inherit !important;
}

/* 强制提升预览弹窗的层级到最高（覆盖所有元素） */
:deep(.el-image-viewer) {
  z-index: 999999 !important; /* 比之前更高，确保覆盖任何弹窗/遮罩 */
}

/* 预览图片本身的层级也要确保高于表格 */
:deep(.el-image) {
  position: relative;
  z-index: 1000 !important;
}
/* 新增：确保多选列的复选框可点击，不受行样式影响 */
:deep(.custom-table .el-table__column--selection .el-checkbox) {
  z-index: 999; /* 提升复选框层级 */
  cursor: pointer;
}
/* 确保多选列的单元格padding正常 */
:deep(.custom-table .el-table__column--selection .el-table__cell) {
  padding: 0 !important;
  text-align: center;
}
:deep(.calibration-dialog .el-dialog__body) {
  padding: 0 !important; /* 去掉对话框默认内边距，避免高度溢出 */
  height: 100% !important;
  overflow: hidden !important;
}

.split-view {
  display: flex;
  height: 100% !important; /* 强制占满父容器 */
  background: #f0f2f5;
}

.left-panel, .right-panel {
  height: 100% !important; /* 左右面板占满split-view高度 */
  overflow: hidden !important; /* 左面板（PDF）不需要滚动，右面板单独控制 */
}

.right-panel {
  overflow-y: auto !important; /* 右面板内容多了才会出现滚动条，不影响整体 */
}

/* MD 内容样式优化 */
:deep(.md-content) {
  line-height: 1.8;
  font-size: 14px;
  color: #303133;
}
:deep(.md-content h1) {
  font-size: 24px;
  font-weight: 700;
  margin: 20px 0 16px;
  color: #1f2329;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}
:deep(.md-content h2) {
  font-size: 20px;
  font-weight: 600;
  margin: 18px 0 14px;
  color: #1f2329;
}
:deep(.md-content ul) {
  margin: 10px 0 10px 24px;
  list-style: disc;
}
:deep(.md-content pre) {
  margin: 16px 0;
  padding: 16px;
  border-radius: 8px;
  background: #f5f7fa;
  overflow-x: auto;
}
:deep(.md-content code) {
  padding: 2px 4px;
  border-radius: 4px;
  background: #f5f7fa;
  font-size: 13px;
  color: #f56c6c;
}
:deep(.md-content pre code) {
  padding: 0;
  background: transparent;
  color: #303133;
}


</style>
