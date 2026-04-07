import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { ElMessage } from 'element-plus'

const comparisonGroupMeta = [
  { key: 'systemCalculated', title: '系统计算口径' },
  { key: 'projectPartyDeclared', title: '项目方声明口径' },
  { key: 'planningCalculated', title: '规划复核口径' }
]

const formatArea = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(2)
}

const buildComparisonRows = (tripleLine) => [
  ['建筑面积', formatArea(tripleLine?.totalBuilding?.contractAgreedArea), formatArea(tripleLine?.totalBuilding?.buildableArea), formatArea(tripleLine?.totalBuilding?.difference)],
  ['商业面积', formatArea(tripleLine?.commercial?.contractAgreedArea), formatArea(tripleLine?.commercial?.buildableArea), formatArea(tripleLine?.commercial?.difference)],
  ['住宅面积', formatArea(tripleLine?.residential?.contractAgreedArea), formatArea(tripleLine?.residential?.buildableArea), formatArea(tripleLine?.residential?.difference)]
]

export function useProjectExport({ displayTableData, currentProjectInfo, areaComparison, selectedComparisonGroups }) {
  const handleExportExcel = async () => {
    if (!selectedComparisonGroups.value.length) {
      ElMessage.warning('请至少选择一组面积核算对比数据后再导出')
      return
    }
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('房产实测汇总表')

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
    ]

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
    ])

    headerData.forEach((row, rowIndex) => {
      worksheet.addRow(row)
      row.forEach((_, colIndex) => {
        const cell = worksheet.getCell(rowIndex + 1, colIndex + 1)
        cell.font = { bold: true }
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        }
      })
    })

    dataRows.forEach((row) => {
      const addedRow = worksheet.addRow(row)
      addedRow.eachCell((cell) => {
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        }
      })
    })

    worksheet.mergeCells('G1:J1')
    worksheet.mergeCells('K1:L1')

    const singleHeaderCols = [1, 2, 3, 4, 5, 13, 14]
    singleHeaderCols.forEach((col) => {
      worksheet.mergeCells(`${worksheet.getColumn(col).letter}1:${worksheet.getColumn(col).letter}2`)
    })

    const columnWidths = [6, 20, 20, 18, 8, 12, 10, 10, 10, 10, 10, 10, 16, 12]
    worksheet.columns.forEach((col, index) => {
      col.width = columnWidths[index] || 10
    })

    worksheet.getRow(1).height = 30
    worksheet.getRow(2).height = 25

    const summaryLastRow = 2 + dataRows.length
    const gapRows = 2
    const calcTableStartRow = summaryLastRow + gapRows + 1

    let cursorRow = calcTableStartRow
    const selectedGroups = comparisonGroupMeta.filter((group) => selectedComparisonGroups.value.includes(group.key))
    selectedGroups.forEach((group) => {
      worksheet.getCell(cursorRow, 1).value = `${group.title}（面积核算对比）`
      worksheet.getCell(cursorRow, 1).font = { bold: true }
      worksheet.mergeCells(`A${cursorRow}:D${cursorRow}`)
      cursorRow += 1

      const headerRow = worksheet.getRow(cursorRow)
      headerRow.values = ['维度', '合同约定面积', '计容面积', '差值']
      headerRow.eachCell((cell) => {
        cell.font = { bold: true }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      })
      cursorRow += 1

      buildComparisonRows(areaComparison.value?.[group.key]).forEach((row) => {
        const dataRow = worksheet.getRow(cursorRow)
        dataRow.values = row
        dataRow.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: colNumber === 1 ? 'left' : 'right',
            vertical: 'middle'
          }
        })
        cursorRow += 1
      })

      cursorRow += 1
    })

    worksheet.getColumn(1).width = 22
    worksheet.getColumn(2).width = 14
    worksheet.getColumn(3).width = 14
    worksheet.getColumn(4).width = 14

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, `${currentProjectInfo.name || '项目'}房产实测汇总表.xlsx`)
    ElMessage.success('Excel 导出成功')
  }

  return {
    handleExportExcel
  }
}
