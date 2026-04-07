/** Element Plus 表头 + 行高经验值，用于 max-height 与容器高度取小，少行时不撑满空白、多行时在容器内滚动 */
export const EL_TABLE_HEADER_H = 42
export const EL_TABLE_ROW_H = 44
export const EL_TABLE_EMPTY_MIN = 120

/**
 * 合同列表、规划复核主表、项目方汇总主表等「主表」统一默认可视数据行数（多出行表内滚动）
 */
export const MAIN_LIST_TABLE_VISIBLE_ROWS = 5

/**
 * 主表 el-table 的 max-height 上限（px），与 {@link MAIN_LIST_TABLE_VISIBLE_ROWS} 一致
 */
export function mainListTableMaxHeightPx(visibleRows = MAIN_LIST_TABLE_VISIBLE_ROWS) {
  return EL_TABLE_HEADER_H + visibleRows * EL_TABLE_ROW_H + 4
}

/** 主表「自然高度」额外余量（px），抵消 EP 表格边框/实际行高与经验值 44 的偏差，避免仅 1～2 行仍出现表内滚动 */
export const MAIN_LIST_TABLE_NATURAL_SLACK_PX = 16

/**
 * 合同/规划/项目方主表专用：在 {@link mainListTableMaxHeightPx} 上限内按行数取高，并带 {@link MAIN_LIST_TABLE_NATURAL_SLACK_PX}。
 */
export function clampMainListTableHeight(rowCount) {
  const cap = mainListTableMaxHeightPx()
  if (!cap || cap < 40) return 200
  if (rowCount <= 0) return Math.min(cap, EL_TABLE_EMPTY_MIN)
  const natural = EL_TABLE_HEADER_H + rowCount * EL_TABLE_ROW_H + 4 + MAIN_LIST_TABLE_NATURAL_SLACK_PX
  return Math.min(cap, natural)
}

/**
 * @param {number} capPx 表格外层可用高度（像素）
 * @param {number} rowCount 数据行数
 */
export function clampTableBodyHeight(capPx, rowCount) {
  if (!capPx || capPx < 40) return 200
  if (rowCount <= 0) return Math.min(capPx, EL_TABLE_EMPTY_MIN)
  const natural = EL_TABLE_HEADER_H + rowCount * EL_TABLE_ROW_H + 4
  return Math.min(capPx, natural)
}

/**
 * 在 clamp 基础上为表体设下限（约为容器的 58%，封顶 280px）。合同/规划/项目方主表已统一用 {@link mainListTableMaxHeightPx}，本函数保留给其它需「少行撑高」的表。
 * 多行时仍不超过 cap，在表内滚动。
 */
export function clampTableBodyHeightWithFloor(capPx, rowCount) {
  if (!capPx || capPx < 40) return 200
  if (rowCount <= 0) return Math.min(capPx, EL_TABLE_EMPTY_MIN)
  const natural = EL_TABLE_HEADER_H + rowCount * EL_TABLE_ROW_H + 4
  const minVisual = Math.min(280, Math.floor(capPx * 0.58))
  const target = Math.max(natural, minVisual)
  return Math.min(capPx, target)
}
