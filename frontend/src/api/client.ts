import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// ─────────────────────────────────────────────
// Types — define the shape of your data
// ─────────────────────────────────────────────

export interface Test {
  id: number
  name: string
  created_at: string
}

export interface Question {
  id: number
  question_number: number
  question_type: string
  correct_answer: string
}

export interface Submission {
  id: number
  student_name: string
  score: number
  total: number
  submitted_at: string
}

export interface AnswerResult {
  question_id: number
  student_answer: string
  is_correct: boolean
  points: number
  feedback: string
}

export interface GradeResponse {
  submission_id: number
  student_name: string
  score: number
  total: number
  results: AnswerResult[]
  ocr_raw: string
}

export interface StudentAnswer {
  id: number
  question_number: number
  question_type: string
  correct_answer: string
  student_answer: string
  is_correct: boolean
  points: number
}

// ─────────────────────────────────────────────
// API functions
// ─────────────────────────────────────────────

export const getTests = async (): Promise<Test[]> => {
  const response = await api.get('/tests')
  return response.data
}

export const getQuestions = async (testId: number): Promise<Question[]> => {
  const response = await api.get(`/tests/${testId}/questions`)
  return response.data
}

export const createTest = async (name: string, questions: Omit<Question, 'id'>[]) => {
  const response = await api.post('/tests', { name, questions })
  return response.data
}

export const getResults = async (testId: number): Promise<Submission[]> => {
  const response = await api.get(`/tests/${testId}/results`)
  return response.data
}

export interface ExtractResponse {
  questions: Question[]
  extracted_answers: Record<number, string>
  raw_text: string
}

export const extractAnswers = async (
  testId: number,
  file: File
): Promise<ExtractResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post(`/tests/${testId}/extract`, formData)
  return response.data
}

export const gradeSubmission = async (
  testId: number,
  studentName: string,
  answers: Array<{ question_id: number, student_answer: string }>
): Promise<GradeResponse> => {
  const response = await api.post(`/tests/${testId}/submissions`, {
    student_name: studentName,
    answers
  })
  return response.data
}

export const deleteSubmission = async (submissionId: number) => {
  const response = await api.delete(`/submissions/${submissionId}`)
  return response.data
}

export const getSubmissionAnswers = async (submissionId: number): Promise<StudentAnswer[]> => {
  const response = await api.get(`/submissions/${submissionId}/answers`)
  return response.data
}

export const updateSubmission = async (submissionId: number, answers: Record<string, {
  student_answer: string
  question_type: string
  correct_answer: string
}>) => {
  const response = await api.put(`/submissions/${submissionId}`, { answers })
  return response.data
}