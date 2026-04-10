# 页面设计说明：项目信息 / 归档目录 Tab（左侧目录树改造）

## 1) 设计目标
- 去除冗余信息密度：移除工具栏“归档夹数量：0/…”展示。
- 左侧 section/归档目录树面板更现代、简洁：更清晰的层级、更稳定的对齐、更明确的状态反馈、更少的视觉噪音。
- 不改变原有业务能力：节点选择、默认展开、删除归档夹二次确认、拖拽调整左右宽度等能力保持。

## 2) Layout（桌面优先）
- 页面主体使用左右分栏布局：`Tree Panel（左） + Splitter（中） + Table Panel（右）`。
- 实现方式：Flexbox（横向），左侧 `flex-basis` 可通过拖拽改变；右侧 `flex: 1` 自适应。
- 间距：整体外层 padding 16；组件区块间距 12；树节点行内 padding 8~10。

## 3) Meta Information
- Title: 项目信息 - 归档目录
- Description: 归档目录树与文件列表管理页面
- Open Graph: 与站点默认一致（本次不做专项优化）

## 4) Global Styles（与现有 Element Plus 风格对齐）
- 基础背景：#F5F7FA（页面），面板背景：#FFFFFF（卡片）
- 分割线：#E4E7ED
- 文字：主文字 #303133；次级 #606266；弱化 #909399
- 强调色：沿用 Element Plus Primary（用于选中态与主要按钮）
- 圆角：8（面板卡片/节点 hover 背景）
- 阴影：轻阴影（仅用于左侧树面板卡片或 hover 局部，避免厚重）
- 交互反馈：hover 150ms ease；selected 150ms ease

## 5) Page Structure
### A. 顶部工具栏（archive-toolbar）
- 左侧：
  - 项目标签（保留）：`el-tag` 显示“项目：xxx”。
  - 移除：`<span class="folder-count">归档夹数量：…</span>`（不再占位）。
  - 操作按钮组（保留）：新建文件夹、文件上传。
- 右侧：
  - Socket 状态（保留）：状态色与文案不变。

### B. 主体分栏（explorer-split）
- 左侧 Tree Panel：现代轻卡片样式 + 内部滚动。
- 中间 Splitter：更易发现、更好拖拽。
- 右侧 Table Panel：查询区 + 表格区（现状保持）。

## 6) Sections & Components（重点：左侧目录树）

### 6.1 Tree Panel 容器（tree-panel）
- 视觉：白底卡片 + 轻边框（1px #E4E7ED）+ 8 圆角；与右侧表格区形成清晰分区。
- 内边距：容器 padding 12（避免树节点贴边）。
- 滚动：仅树区域滚动（避免整个页面滚动造成拖拽误触）。
- 空状态：使用现有 `el-empty`，文案不变，但建议居中并留出更舒适间距。

### 6.2 Tree 组件（el-tree / archive-tree）
#### 节点行（tree-node-row）
- 行高：32~36（更现代、密度适中）。
- 点击区域：整行可点（包括空白区），降低误点图标/文字。
- 文字：
  - `node-name` 单行省略，最大宽度随面板自适应。
  - 层级缩进清晰，避免“歪斜”感。
- 图标：
  - 项目节点用打开文件夹（FolderOpened），归档夹节点用 Folder（保留现有语义）。
  - 图标与文字 baseline 对齐，间距 8。

#### 状态规范
- Default：透明背景。
- Hover：浅底色（如 #F2F6FC），同时显示右侧操作区（删除）。
- Selected：
  - 使用更明确的选中背景（如 rgba(primary, 0.10)）+ 左侧 3px 强调条（primary）。
  - 文字颜色保持主文字，仅强调条/背景提示选中，避免“过度蓝”。
- Disabled/Loading：遵循 `v-loading` 覆层与 Element Plus 默认样式。

#### 节点操作区（node-actions）
- 显隐规则：仅在 hover 或 selected 时显示，默认隐藏（降低噪音）。
- 删除按钮：保留现有 `el-popconfirm` 二次确认；按钮样式建议使用 text/link 风格，hover 时才强调危险色。
- 对齐：操作区固定宽度（如 36~44），避免节点名称抖动。

### 6.3 Splitter（splitter-handle）
- 命中：宽度建议 ≥ 8px，hover 时展示浅色高亮条。
- 光标：`col-resize`。
- 拖拽态：按下时保持高亮，拖拽过程中避免选中文本（user-select: none）。

## 7) 响应式行为（以桌面为主）
- ≥1200px：左树默认 280~320px。
- 768~1199px：左树默认 240~280px，右侧表格优先保证可读。
- <768px：不作为主要目标；若需要可降级为上下布局（本次不强制实现）。

## 8) 交互验收要点
- 工具栏不再出现“归档夹数量：0/…”字样，布局不塌陷。
- 目录树：hover/selected 状态清晰；删除按钮仅在 hover/selected 出现；点击整行可稳定选中。
- Splitter：更容易被发现并可稳定拖拽，拖拽时无文字选中与抖动。
