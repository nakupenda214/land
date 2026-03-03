import { reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

export function useContractLandManagement({ filterProject, currentProjectInfo }) {
  const contractLandList = ref([])
  const selectedContract = reactive({ id: '', contractNumber: '' })
  const currentLandParcelList = ref([])

  const contractDialogVisible = ref(false)
  const contractFormRef = ref(null)
  const contractFormLoading = ref(false)
  const setContractFormRef = (formRef) => {
    contractFormRef.value = formRef
  }

  const contractForm = reactive({
    id: '',
    contractNumber: '',
    contractType: '',
    transferor: '',
    transferee: '',
    totalArea: null,
    plannedUse: '',
    remark: ''
  })

  const contractFormRules = reactive({
    contractNumber: [{ required: true, message: '请输入合同编号', trigger: 'blur' }]
  })

  const landParcelDialogVisible = ref(false)
  const landParcelFormRef = ref(null)
  const landParcelFormLoading = ref(false)
  const setLandParcelFormRef = (formRef) => {
    landParcelFormRef.value = formRef
  }

  const landParcelForm = reactive({
    id: '',
    contractId: '',
    parcelCode: '',
    parcelName: '',
    plannedUse: '',
    totalArea: null,
    residentialArea: null,
    commercialArea: null,
    floorAreaRatio: null,
    commercialResidentialRatio: null,
    remark: ''
  })

  const landParcelFormRules = reactive({
    parcelCode: [{ required: true, message: '请输入地块编号', trigger: 'blur' }],
    parcelName: [{ required: true, message: '请输入地块名称', trigger: 'blur' }]
  })

  const fetchContractListByProjectId = async (projectId) => {
    if (!projectId) return

    try {
      const queryParams = {
        projectId: Number(projectId),
        current: 1,
        size: 100
      }

      const res = await axios.post('/api/project/contracts/query', queryParams)
      if (res.data.code === 200) {
        contractLandList.value = (res.data.data.records || []).map((contract) => ({
          id: contract.id || '',
          contractNumber: contract.contractNumber || '',
          contractType: contract.contractType || '',
          transferor: contract.transferor || '',
          transferee: contract.transferee || '',
          totalArea: contract.totalArea || null,
          plannedUse: contract.plannedUse || '',
          remark: contract.remark || ''
        }))

        Object.assign(selectedContract, { id: '', contractNumber: '' })
        currentLandParcelList.value = []
      }
    } catch (error) {
      console.error('查询项目合同列表失败:', error)
      ElMessage.error('获取合同列表失败，请重试')
      contractLandList.value = []
    }
  }

  const fetchLandParcelByContractId = async (contractId) => {
    if (!contractId) return

    try {
      const res = await axios.get(`/api/project/contract/${contractId}/with-parcels`)
      if (res.data.code === 200) {
        currentLandParcelList.value = res.data.data.parcels || []
      } else {
        currentLandParcelList.value = []
        ElMessage.warning('该合同暂无关联地块信息')
      }
    } catch (error) {
      console.error('查询合同地块信息失败:', error)
      ElMessage.error('获取地块信息失败，请重试')
      currentLandParcelList.value = []
    }
  }

  const handleContractRowClick = async (row) => {
    if (row.id === selectedContract.id) return

    Object.assign(selectedContract, {
      id: row.id,
      contractNumber: row.contractNumber || ''
    })

    await fetchLandParcelByContractId(row.id)
  }

  const addContract = () => {
    Object.assign(contractForm, {
      id: '',
      contractNumber: '',
      contractType: '',
      transferor: '',
      transferee: '',
      totalArea: null,
      plannedUse: '',
      remark: ''
    })
    contractFormRef.value?.clearValidate()
    contractDialogVisible.value = true
  }

  const editContract = (row) => {
    Object.assign(contractForm, {
      id: row.id,
      contractNumber: row.contractNumber || '',
      contractType: row.contractType || '',
      transferor: row.transferor || '',
      transferee: row.transferee || '',
      totalArea: row.totalArea || null,
      plannedUse: row.plannedUse || '',
      remark: row.remark || ''
    })
    contractFormRef.value?.clearValidate()
    contractDialogVisible.value = true
  }

  const submitContractForm = async () => {
    if (!contractFormRef.value) return

    try {
      await contractFormRef.value.validate()
    } catch {
      ElMessage.warning('请完善必填项后提交')
      return
    }

    contractFormLoading.value = true
    try {
      const requestData = {
        id: contractForm.id,
        contractNumber: contractForm.contractNumber,
        contractType: contractForm.contractType,
        transferor: contractForm.transferor,
        transferee: contractForm.transferee,
        totalArea: contractForm.totalArea,
        plannedUse: contractForm.plannedUse,
        remark: contractForm.remark
      }

      const res = await axios.put('/api/project/contract-info/update', {
        contractInfoUpdateDTO: requestData
      })

      if (res.data.code === 200) {
        contractDialogVisible.value = false
        await fetchContractListByProjectId(currentProjectInfo.id)
      } else {
        ElMessage.error('保存失败：' + (res.data.msg || '系统异常'))
      }
    } catch (error) {
      console.error('保存合同信息失败:', error)
      ElMessage.error('保存合同信息失败，请重试')
    } finally {
      contractFormLoading.value = false
    }
  }

  const addLandParcel = () => {
    if (!selectedContract.id) {
      ElMessage.warning('请先选中一个合同')
      return
    }

    Object.assign(landParcelForm, {
      id: '',
      contractId: selectedContract.id,
      parcelCode: '',
      parcelName: '',
      plannedUse: '',
      totalArea: null,
      residentialArea: null,
      commercialArea: null,
      floorAreaRatio: null,
      commercialResidentialRatio: null,
      remark: ''
    })
    landParcelFormRef.value?.clearValidate()
    landParcelDialogVisible.value = true
  }

  const editLandParcel = (row) => {
    Object.assign(landParcelForm, {
      id: row.id,
      contractId: selectedContract.id,
      parcelCode: row.parcelCode || '',
      parcelName: row.parcelName || '',
      plannedUse: row.plannedUse || '',
      totalArea: row.totalArea || null,
      residentialArea: row.residentialArea || null,
      commercialArea: row.commercialArea || null,
      floorAreaRatio: row.floorAreaRatio || null,
      commercialResidentialRatio: row.commercialResidentialRatio || null,
      remark: row.remark || ''
    })
    landParcelFormRef.value?.clearValidate()
    landParcelDialogVisible.value = true
  }

  const submitLandParcelForm = async () => {
    if (!landParcelFormRef.value) return

    try {
      await landParcelFormRef.value.validate()
    } catch {
      ElMessage.warning('请完善必填项后提交')
      return
    }

    landParcelFormLoading.value = true
    try {
      let res
      if (!landParcelForm.id) {
        const createData = {
          contractId: landParcelForm.contractId,
          parcelCode: landParcelForm.parcelCode,
          parcelName: landParcelForm.parcelName,
          plannedUse: landParcelForm.plannedUse,
          totalArea: landParcelForm.totalArea,
          residentialArea: landParcelForm.residentialArea,
          commercialArea: landParcelForm.commercialArea,
          floorAreaRatio: landParcelForm.floorAreaRatio,
          commercialResidentialRatio: landParcelForm.commercialResidentialRatio,
          remark: landParcelForm.remark
        }
        res = await axios.post('/api/project/land-parcel/create', createData, {
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        const updateData = {
          id: landParcelForm.id,
          parcelCode: landParcelForm.parcelCode,
          parcelName: landParcelForm.parcelName,
          plannedUse: landParcelForm.plannedUse,
          totalArea: landParcelForm.totalArea,
          residentialArea: landParcelForm.residentialArea,
          commercialArea: landParcelForm.commercialArea,
          floorAreaRatio: landParcelForm.floorAreaRatio,
          commercialResidentialRatio: landParcelForm.commercialResidentialRatio,
          remark: landParcelForm.remark
        }
        res = await axios.put('/api/project/land-parcel/update', updateData)
      }

      if (res.data.code === 200) {
        landParcelDialogVisible.value = false
        await fetchLandParcelByContractId(selectedContract.id)
      } else {
        ElMessage.error('操作失败：' + (res.data.msg || '系统异常'))
      }
    } catch (error) {
      console.error('地块操作失败:', error)
      ElMessage.error('操作地块信息失败，请重试')
    } finally {
      landParcelFormLoading.value = false
    }
  }

  const deleteContract = async (row) => {
    try {
      await ElMessageBox.confirm(
        '确定要删除该合同信息吗？此操作会同时删除关联的地块信息，且不可撤销。',
        '删除合同确认',
        {
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          type: 'warning',
          dangerMode: true
        }
      )

      const res = await axios.delete(`/project/contract-info/${row.id}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      if (res.data.code === 200) {
        await fetchContractListByProjectId(currentProjectInfo.id)
        Object.assign(selectedContract, { id: '', contractNumber: '' })
        currentLandParcelList.value = []
      } else {
        ElMessage.error('删除失败：' + (res.data.msg || '系统异常'))
      }
    } catch (error) {
      if (error.name !== 'ElMessageBoxCloseError') {
        console.error('删除合同失败:', error)
      } else {
        ElMessage.info('已取消删除操作')
      }
    }
  }

  const deleteLandParcel = async (row) => {
    try {
      await ElMessageBox.confirm(
        '确定要删除该地块信息吗？此操作不可撤销。',
        '删除确认',
        {
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          type: 'warning',
          dangerMode: true
        }
      )

      const res = await axios.delete(`/api/project/land-parcel/${row.id}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      if (res.data.code === 200) {
        await fetchLandParcelByContractId(selectedContract.id)
      } else {
        ElMessage.error('删除失败：' + (res.data.msg || '系统异常'))
      }
    } catch (error) {
      if (error.name !== 'ElMessageBoxCloseError') {
        console.error('删除地块失败:', error)
      } else {
        ElMessage.info('已取消删除操作')
      }
    }
  }

  watch(filterProject, (newVal) => {
    if (!newVal) {
      contractLandList.value = []
      Object.assign(selectedContract, { id: '', contractNumber: '' })
      currentLandParcelList.value = []
    }
  })

  return {
    contractLandList,
    selectedContract,
    currentLandParcelList,
    contractDialogVisible,
    contractForm,
    contractFormRules,
    contractFormLoading,
    setContractFormRef,
    submitContractForm,
    landParcelDialogVisible,
    landParcelForm,
    landParcelFormRules,
    landParcelFormLoading,
    setLandParcelFormRef,
    submitLandParcelForm,
    fetchContractListByProjectId,
    handleContractRowClick,
    addContract,
    editContract,
    deleteContract,
    addLandParcel,
    editLandParcel,
    deleteLandParcel
  }
}
