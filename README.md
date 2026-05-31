# 📝 Automated Test Grader

A full-stack web application that uses AI-powered OCR to automatically grade student answer sheets. Built with React/TypeScript, FastAPI, PostgreSQL, and Docker.

## Features

- **OCR Answer Extraction** — Upload a photo of a student's answer sheet and Gemini Vision automatically extracts their answers
- **Multi-format Grading** — Supports multiple choice, true/false, and short answer questions
- **AI-Powered Short Answer Grading** — Uses the Gemini API to semantically evaluate short answer responses with partial credit (0, 0.5, or 1)
- **3-Step Grading Flow** — Extract → Review & Edit → Grade, so teachers can correct OCR mistakes before submitting
- **PostgreSQL Database** — All tests, submissions, and scores are stored persistently in a relational database
- **Class Dashboard** — View all submissions for a test with class average, highest score, and per-student results
- **Edit & Delete Submissions** — Teachers can correct or remove any submission from the results view
- **Fully Dockerized** — Entire 4-container stack spins up with a single command

## Tech Stack

- **React + TypeScript** — Frontend UI with client-side routing and Tailwind CSS styling
- **FastAPI** — REST API backend with auto-generated Swagger documentation
- **PostgreSQL** — Relational database for storing tests, questions, submissions, and scores
- **Docker + Docker Compose** — Containerization and orchestration of all 4 services
- **Gemini API (Google)** — Vision-based OCR for answer extraction and AI grading of short answer questions
- **Python** — Backend logic, grading services, and OCR processing

## Architecture

```
React/TypeScript (port 3000)
        ↓ HTTP requests
FastAPI Backend (port 8000)
        ↓
PostgreSQL Database (port 5432)
```

All services run as Docker containers orchestrated with Docker Compose.

## Database Schema

```
tests
├── id, name, created_at

questions
├── id, test_id, question_number, question_type, correct_answer

submissions
├── id, test_id, student_name, score, total, submitted_at

student_answers
├── id, submission_id, question_id, student_answer, is_correct, points
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tests` | Get all tests |
| POST | `/tests` | Create a new test |
| GET | `/tests/{id}/questions` | Get questions for a test |
| POST | `/tests/{id}/extract` | Extract answers from image via OCR |
| POST | `/tests/{id}/submissions` | Grade and save a submission |
| GET | `/tests/{id}/results` | Get all submissions for a test |
| GET | `/submissions/{id}/answers` | Get per-question answers for a submission |
| PUT | `/submissions/{id}` | Edit a submission |
| DELETE | `/submissions/{id}` | Delete a submission |

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

```
GEMINI_API_KEY=your_api_key_here
```

3. Start the application

```bash
docker compose up --build
```

4. Open your browser:
   - **React Frontend** → `http://localhost:3000`
   - **API Documentation** → `http://localhost:8000/docs`

## Usage

### Create a Test
1. Go to **Create Test** in the sidebar
2. Enter a test name and number of questions
3. Set the question type and correct answer for each question
4. Click **Save Test**

### Grade a Submission
1. Go to **Grade Submission** in the sidebar
2. Select a test and enter the student's name
3. Upload a photo of the student's answer sheet
4. Review and correct any OCR mistakes in the extracted answers
5. Click **Confirm & Grade**

### View Results
1. Go to **View Results** in the sidebar
2. Select a test to see class stats and all submissions
3. Click any row to expand per-question answers
4. Toggle **Edit Mode** to delete or edit any submission