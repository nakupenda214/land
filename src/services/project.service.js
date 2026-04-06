import axios from 'axios'

export const getProjectList = () => axios.get('/api/project/list')

export const queryProjects = (payload) =>
  axios.post('/api/project/projects/query', payload)

export const createProject = (projectName, projectTime) =>
  axios.post('/api/project/create', null, {
    params: { projectName, projectTime }
  })

export const getParsedSurveyReportsByProject = (projectId) =>
  axios.get(`/api/project/${projectId}/survey-reports/parsed`)

export const refreshSurveyReportsByProject = (projectId) =>
  axios.post(`/api/project/${projectId}/refresh-survey-reports`)

export const getSurveyRoomInfo = (projectId, reportId) =>
  axios.get(`/api/project/${projectId}/survey-reports/${reportId}/room-info`)

export const querySurveyReports = (payload) =>
  axios.post('/api/project/survey-reports/query', payload)

export const updateSurveyReportInfo = (payload) =>
  axios.put('/api/project/survey-report-info/update', payload)

export const queryOperationAuditLogs = (payload) =>
  axios.post('/api/operation-audit/query', payload)

export const queryProjectDetails = (payload) =>
  axios.post('/api/project/projects/query/detail', payload)

export const deleteProjectById = (projectId) =>
  axios.delete(`/api/project/${projectId}`)

export const queryPlanningReviewForms = (payload) =>
  axios.post('/api/project/planning-review-forms/query', payload)

export const queryPlanningReviewRows = (payload) =>
  axios.post('/api/project/planning-review-rows/query', payload)

export const updatePlanningReviewRow = (payload) =>
  axios.put('/api/project/planning-review-row/update', payload)

export const createPlanningReviewRow = (payload) =>
  axios.post('/api/project/planning-review-row/create', payload)

export const deletePlanningReviewRow = (rowId) =>
  axios.delete(`/api/project/planning-review-row/${rowId}`)

export const queryProjectPartySummaryRows = (payload) =>
  axios.post('/api/project/project-party-summary-rows/query', payload)

export const queryProjectPartySummaryForms = (payload) =>
  axios.post('/api/project/project-party-summary-forms/query', payload)

export const updateProjectPartySummaryForm = (payload) =>
  axios.put('/api/project/project-party-summary-form/update', payload)

export const updateProjectPartySummaryRow = (payload) =>
  axios.put('/api/project/project-party-summary-row/update', payload)

export const createProjectPartySummaryRow = (payload) =>
  axios.post('/api/project/project-party-summary-row/create', payload)

export const deleteProjectPartySummaryRow = (rowId) =>
  axios.delete(`/api/project/project-party-summary-row/${rowId}`)
