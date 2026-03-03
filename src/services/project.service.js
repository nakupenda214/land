import axios from 'axios'

export const getProjectList = () => axios.get('/api/project/list')

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

