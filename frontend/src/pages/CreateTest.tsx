import React, { useState } from 'react'
import { createTest } from '../api/client'

interface QuestionInput {
  question_number: number
  question_type: string
  correct_answer: string
}

function CreateTest() {
  const [testName, setTestName] = useState('')
  const [numQuestions, setNumQuestions] = useState(5)
  const [questions, setQuestions] = useState<QuestionInput[]>(
    Array.from({ length: 5 }, (_, i) => ({
      question_number: i + 1,
      question_type: 'multiple_choice',
      correct_answer: ''
    }))
  )
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleNumQuestionsChange = (n: number) => {
    setNumQuestions(n)
    setQuestions(
      Array.from({ length: n }, (_, i) => ({
        question_number: i + 1,
        question_type: questions[i]?.question_type || 'multiple_choice',
        correct_answer: questions[i]?.correct_answer || ''
      }))
    )
  }

  const handleQuestionChange = (index: number, field: string, value: string) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  const handleSubmit = async () => {
    if (!testName) return setError('Please enter a test name')
    if (questions.some(q => !q.correct_answer)) return setError('Please fill in all answers')

    setSaving(true)
    setError('')
    try {
      await createTest(testName, questions)
      setSuccess(`Test "${testName}" saved successfully!`)
      setTestName('')
      setQuestions(Array.from({ length: numQuestions }, (_, i) => ({
        question_number: i + 1,
        question_type: 'multiple_choice',
        correct_answer: ''
      })))
    } catch (e) {
      setError('Failed to save test. Please try again.')
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create a New Test</h2>

      {/* Test name */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
        <input
          type="text"
          value={testName}
          onChange={e => setTestName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Biology Quiz"
        />
      </div>

      {/* Number of questions */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
        <input
          type="number"
          min={1}
          max={50}
          value={numQuestions}
          onChange={e => handleNumQuestionsChange(parseInt(e.target.value))}
          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Questions */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Answer Key</h3>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-8">Q{q.question_number}</span>
              <select
                value={q.question_type}
                onChange={e => handleQuestionChange(i, 'question_type', e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
              </select>
              <input
                type="text"
                value={q.correct_answer}
                onChange={e => handleQuestionChange(i, 'correct_answer', e.target.value)}
                placeholder="Correct answer"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {success && <p className="text-green-500 text-sm mb-3">{success}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Test'}
      </button>
    </div>
  )
}

export default CreateTest