import React, { useState, useEffect } from 'react'
import { getTests, getResults, getSubmissionAnswers, deleteSubmission, updateSubmission } from '../api/client'
import { Test, Submission, StudentAnswer } from '../api/client'

function ViewResults() {
  const [tests, setTests] = useState<Test[]>([])
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [editMode, setEditMode] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, StudentAnswer[]>>({})
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({})
  const [error, _setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getTests().then(setTests)
  }, [])

  useEffect(() => {
    if (selectedTestId) {
      getResults(selectedTestId).then(setSubmissions)
    }
  }, [selectedTestId])

  const handleExpand = async (submissionId: number) => {
    if (expandedId === submissionId) {
      setExpandedId(null)
      return
    }
    setExpandedId(submissionId)
    if (!answers[submissionId]) {
      const data = await getSubmissionAnswers(submissionId)
      setAnswers(prev => ({ ...prev, [submissionId]: data }))
      const initial: Record<string, string> = {}
      data.forEach(a => { initial[`${submissionId}_${a.id}`] = a.student_answer })
      setEditedAnswers(prev => ({ ...prev, ...initial }))
    }
  }

  const handleDelete = async (submissionId: number) => {
    await deleteSubmission(submissionId)
    setSubmissions(prev => prev.filter(s => s.id !== submissionId))
    setSuccess('Submission deleted')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSave = async (submissionId: number) => {
    const submissionAnswers = answers[submissionId]
    const payload: Record<string, { student_answer: string, question_type: string, correct_answer: string }> = {}
    submissionAnswers.forEach(a => {
      payload[a.id] = {
        student_answer: editedAnswers[`${submissionId}_${a.id}`] || a.student_answer,
        question_type: a.question_type,
        correct_answer: a.correct_answer
      }
    })
    await updateSubmission(submissionId, payload)
    getResults(selectedTestId!).then(setSubmissions)
    setSuccess('Changes saved!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const average = submissions.length
    ? (submissions.reduce((sum, s) => sum + (s.score / s.total) * 100, 0) / submissions.length).toFixed(1)
    : '0'

  const highest = submissions.length
    ? Math.max(...submissions.map(s => (s.score / s.total) * 100)).toFixed(1)
    : '0'

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Class Results</h2>

      {/* Select test */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Test</label>
        <select
          value={selectedTestId ?? ''}
          onChange={e => setSelectedTestId(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select a test --</option>
          {tests.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {submissions.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Students Graded', value: submissions.length },
              { label: 'Class Average', value: `${average}%` },
              { label: 'Highest Score', value: `${highest}%` }
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-blue-500">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Edit mode toggle + success */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                editMode ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {editMode ? '✏️ Editing' : '✏️ Edit Mode'}
            </button>
            {success && <p className="text-green-500 text-sm">{success}</p>}
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          {/* Submissions list */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Student</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Score</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Percentage</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                  {editMode && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <React.Fragment key={s.id}>
                    <tr
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleExpand(s.id)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{s.student_name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.score}/{s.total}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {((s.score / s.total) * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {s.submitted_at.slice(0, 10)}
                      </td>
                      {editMode && (
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                            className="text-red-400 hover:text-red-600 text-xs font-medium"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* Expanded answers */}
                    {expandedId === s.id && answers[s.id] && (
                      <tr>
                        <td colSpan={editMode ? 5 : 4} className="px-4 py-3 bg-gray-50">
                          <div className="space-y-2">
                            {answers[s.id].map(a => (
                              <div key={a.id} className={`flex items-center gap-3 p-2 rounded-lg ${a.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
                                <span>{a.is_correct ? '✅' : '❌'}</span>
                                <span className="text-xs font-medium text-gray-600 w-6">Q{a.question_number}</span>
                                {editMode ? (
                                  <input
                                    type="text"
                                    value={editedAnswers[`${s.id}_${a.id}`] || ''}
                                    onChange={e => setEditedAnswers(prev => ({
                                      ...prev,
                                      [`${s.id}_${a.id}`]: e.target.value
                                    }))}
                                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                                    onClick={e => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className="text-xs text-gray-700 flex-1">{a.student_answer}</span>
                                )}
                                <span className="text-xs text-gray-400">{a.points} pts</span>
                              </div>
                            ))}
                            {editMode && (
                              <button
                                onClick={e => { e.stopPropagation(); handleSave(s.id) }}
                                className="mt-2 px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600"
                              >
                                💾 Save Changes
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedTestId && submissions.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
          No submissions yet for this test.
        </div>
      )}
    </div>
  )
}

export default ViewResults