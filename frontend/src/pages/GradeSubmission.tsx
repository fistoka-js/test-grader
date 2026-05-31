import React, { useState, useEffect } from 'react'
import { getTests, extractAnswers, gradeSubmission } from '../api/client'
import { Test, Question, GradeResponse, ExtractResponse } from '../api/client'

type Step = 'upload' | 'review' | 'results'

function GradeSubmission() {
  const [tests, setTests] = useState<Test[]>([])
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null)
  const [studentName, setStudentName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('upload')
  const [extractedData, setExtractedData] = useState<ExtractResponse | null>(null)
  const [manualAnswers, setManualAnswers] = useState<Record<number, string>>({})
  const [extracting, setExtracting] = useState(false)
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<GradeResponse | null>(null)
  const [error, setError] = useState('')
  const [ocrWarning, setOcrWarning] = useState('')

  useEffect(() => {
    getTests().then(setTests)
  }, [])

  const handleTestChange = (testId: number) => {
    setSelectedTestId(testId)
    setStep('upload')
    setResult(null)
    setExtractedData(null)
    setManualAnswers({})
    setFile(null)
    setFilePreview(null)
    setStudentName('')
    setError('')
    setOcrWarning('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setFilePreview(URL.createObjectURL(selected))
      setError('')
    }
  }

  // Step 1 → Step 2: Extract answers via OCR
    const handleExtract = async () => {
        if (!selectedTestId) return setError('Please select a test')
        if (!studentName) return setError('Please enter student name')
        if (!file) return setError('Please upload an answer sheet')

        setExtracting(true)
        setError('')
        setOcrWarning('')
        try {
        const data = await extractAnswers(selectedTestId, file)
        setExtractedData(data)

        const initial: Record<number, string> = {}
        data.questions.forEach(q => {
            initial[q.question_number] = data.extracted_answers[q.question_number] || ''
        })
        setManualAnswers(initial)

       // Check raw_text for OCR failure message
        if (data.raw_text.includes('OCR unavailable')) {
            setOcrWarning('⚠️ OCR is currently unavailable (API limit reached). Please enter answers manually.')
        }

        setStep('review')
        } catch (e) {
        setError('Failed to extract answers. Please try again.')
        }
        setExtracting(false)
    }

  // Step 2 → Step 3: Grade confirmed answers
  const handleGrade = async () => {
    if (!selectedTestId || !extractedData) return
    if (!studentName) return setError('Please enter student name')

    setGrading(true)
    setError('')
    try {
      const answers = extractedData.questions.map(q => ({
        question_id: q.id,
        student_answer: manualAnswers[q.question_number] || ''
      }))
      console.log('sending answers:', answers)
      console.log('student name:', studentName)
      const response = await gradeSubmission(selectedTestId, studentName, answers)
      setResult(response)
      setStep('results')
    } catch (e) {
      setError('Failed to grade submission. Please try again.')
    }
    setGrading(false)
  }

  const handleNewSubmission = () => {
    setStep('upload')
    setResult(null)
    setExtractedData(null)
    setManualAnswers({})
    setFile(null)
    setFilePreview(null)
    setStudentName('')
    setError('')
    setOcrWarning('')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Grade Submission</h2>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(['upload', 'review', 'results'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1.5 text-sm font-medium ${step === s ? 'text-blue-500' : 'text-gray-300'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === s ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i + 1}
              </span>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
            {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
          </React.Fragment>
        ))}
      </div>

      {/* Select test — always visible */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Test</label>
        <select
          value={selectedTestId ?? ''}
          onChange={e => handleTestChange(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select a test --</option>
          {tests.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* STEP 1: Upload */}
      {step === 'upload' && selectedTestId && (
        <>
          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
            <input
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. John Smith"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Answer Sheet</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {filePreview && (
              <img src={filePreview} alt="Preview" className="mt-3 rounded-lg max-h-48 object-contain" />
            )}
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <button
            onClick={handleExtract}
            disabled={extracting || !file}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {extracting ? 'Extracting answers...' : 'Extract Answers'}
          </button>
        </>
      )}

      {/* STEP 2: Review */}
      {step === 'review' && extractedData && (
        <>
          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Student</h3>
            <p className="text-gray-800 font-medium">{studentName}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Review & Edit Extracted Answers</h3>
            {ocrWarning && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                {ocrWarning}
            </div>
            )}
            <div className="space-y-3">
              {extractedData.questions.map(q => (
                <div key={q.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 w-8">Q{q.question_number}</span>
                  <span className="text-xs text-gray-400 w-24">{q.question_type.replace('_', ' ')}</span>
                  <input
                    type="text"
                    value={manualAnswers[q.question_number] || ''}
                    onChange={e => setManualAnswers({
                      ...manualAnswers,
                      [q.question_number]: e.target.value
                    })}
                    placeholder="Answer"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('upload')}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2.5 rounded-lg transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleGrade}
              disabled={grading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {grading ? 'Grading...' : 'Confirm & Grade'}
            </button>
          </div>
        </>
      )}

      {/* STEP 3: Results */}
      {step === 'results' && result && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Results for {result.student_name}</h3>
            <button
              onClick={handleNewSubmission}
              className="text-sm text-blue-500 hover:text-blue-700 font-medium"
            >
              + New Submission
            </button>
          </div>

          <div className="flex gap-6 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{result.score}/{result.total}</p>
              <p className="text-sm text-gray-500">Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">
                {((result.score / result.total) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">Percentage</p>
            </div>
          </div>

          <div className="space-y-2">
            {result.results.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${r.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
                <span className="text-lg">{r.is_correct ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Q{i + 1}: {r.student_answer}</p>
                  <p className="text-xs text-gray-500">{r.feedback}</p>
                </div>
                <span className="text-sm font-medium text-gray-600">{r.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GradeSubmission