import React from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import CreateTest from './pages/CreateTest'
import GradeSubmission from './pages/GradeSubmission'
import ViewResults from './pages/ViewResults'

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md flex flex-col">
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-gray-800">📝 Test Grader</h1>
          </div>
          <nav className="flex flex-col p-4 gap-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              Create Test
            </NavLink>
            <NavLink
              to="/grade"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              Grade Submission
            </NavLink>
            <NavLink
              to="/results"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              View Results
            </NavLink>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="/" element={<CreateTest />} />
            <Route path="/grade" element={<GradeSubmission />} />
            <Route path="/results" element={<ViewResults />} />
          </Routes>
        </div>

      </div>
    </Router>
  )
}

export default App