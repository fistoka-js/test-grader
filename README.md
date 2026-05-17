# 📝 Automated Test Grader

A Dockerized web application that uses OCR and AI to automatically grade student answer sheets. Built with Python, PostgreSQL, and Streamlit.

## Features

- **OCR Answer Extraction** — Upload a photo of a student's answer sheet and Gemini Vision automatically extracts their answers
- **Multi-format Grading** — Supports multiple choice, true/false, and short answer questions
- **AI-Powered Short Answer Grading** — Uses the Gemini API to semantically evaluate short answer responses with partial credit (0, 0.5, or 1)
- **PostgreSQL Database** — All tests, submissions, and scores are stored persistently in a relational database
- **Class Dashboard** — View all submissions for a test with class average, highest score, and per-student results
- **Edit & Delete Submissions** — Teachers can correct or remove any submission from the results view
- **Fully Dockerized** — Entire stack (app + database) spins up with a single command

## Tech Stack

- **Python** — Core application logic
- **Streamlit** — Web UI
- **PostgreSQL** — Relational database for storing tests, questions, and submissions
- **Docker + Docker Compose** — Containerization and orchestration
- **Gemini API (Google)** — Vision-based OCR for answer extraction and AI grading of short answer questions
- **Pandas** — Data manipulation and results display

## Database Schema
tests
├── id, name, created_at
questions
├── id, test_id, question_number, question_type, correct_answer
submissions
├── id, test_id, student_name, score, total, submitted_at
student_answers
├── id, submission_id, question_id, student_answer, is_correct, points

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier)

### Setup

1. Clone the repository
```bash
git clone https://github.com/fistoka-js/test-grader.git
cd test-grader
```

2. Create a `.env` file in the root directory
GEMINI_API_KEY=your_api_key_here

3. Start the application
```bash
docker compose up --build
```

4. Open your browser and go to `http://localhost:8501`

## Usage

### Create a Test
1. Go to **Create Test** in the sidebar
2. Enter a test name and number of questions
3. Set the question type and correct answer for each question
4. Click **Save Test**

### Grade a Submission
1. Go to **Grade Submission** in the sidebar
2. Select the test and enter the student's name
3. Upload a photo of the student's answer sheet
4. Review and correct any OCR mistakes
5. Click **Grade Submission**

### View Results
1. Go to **View Results** in the sidebar
2. Select a test to see all submissions
3. Toggle **Edit Mode** to delete or edit any submission