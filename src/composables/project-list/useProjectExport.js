import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { ElMessage } from 'element-plus'

export function useProjectExport({ displayTableData, tableTotalData, currentProjectInfo }) {
  const handleExportExcel = async () => {
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

    const calcHeader = ['核算指标', '合同约定值', '实测值', '差值 (A - B)']
    const headerRow = worksheet.getRow(calcTableStartRow)
    headerRow.values = calcHeader
    headerRow.height = 25
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 }
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      }
    })

    tableTotalData.value.forEach((row, index) => {
      const dataRowNum = calcTableStartRow + index + 1
      const dataRow = worksheet.getRow(dataRowNum)
      dataRow.values = [row.label, row.contract, row.measured, row.isArea ? row.diff : '-']
      dataRow.eachCell((cell) => {
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        }
      })
    })

    const calcColumnWidths = [15, 18, 18, 12]
    for (let i = 0; i < calcColumnWidths.length; i++) {
      worksheet.columns[i].width = calcColumnWidths[i]
    }

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
