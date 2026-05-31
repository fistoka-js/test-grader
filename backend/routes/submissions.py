from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image
import io
from db.connection import get_connection
from services.grading import grade_submission
from services.ocr import extract_answers

router = APIRouter()

@router.post("/tests/{test_id}/extract")
async def extract_answers_only(
    test_id: int,
    file: UploadFile = File(...)
):
    # Read and open the uploaded image
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    # Extract answers via Gemini Vision OCR only — don't grade or save
    answers, raw_text = extract_answers(image)

    # Load questions for this test
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """SELECT id, question_number, question_type, correct_answer 
        FROM questions WHERE test_id = %s ORDER BY question_number""",
        (test_id,)
    )
    rows = cur.fetchall()
    questions = [
        {"id": r[0], "question_number": r[1], "question_type": r[2], "correct_answer": r[3]}
        for r in rows
    ]
    cur.close()
    conn.close()

    # Merge OCR results with full question list
    merged = {}
    for q in questions:
        merged[q["question_number"]] = answers.get(q["question_number"], "")

    return {
        "questions": questions,
        "extracted_answers": merged,
        "raw_text": raw_text
    }

# ─────────────────────────────────────────────
# Data models
# ─────────────────────────────────────────────

class EditAnswer(BaseModel):
    student_answer: str
    question_type: str
    correct_answer: str

class EditSubmissionRequest(BaseModel):
    answers: dict

# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.get("/tests/{test_id}/results")
def get_results(test_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """SELECT id, student_name, score, total, submitted_at 
        FROM submissions WHERE test_id = %s ORDER BY submitted_at DESC""",
        (test_id,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r[0],
            "student_name": r[1],
            "score": r[2],
            "total": r[3],
            "submitted_at": str(r[4])
        }
        for r in rows
    ]


@router.get("/submissions/{submission_id}/answers")
def get_submission_answers(submission_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """SELECT sa.id, q.question_number, q.question_type, 
                  q.correct_answer, sa.student_answer, sa.is_correct, sa.points
        FROM student_answers sa
        JOIN questions q ON sa.question_id = q.id
        WHERE sa.submission_id = %s
        ORDER BY q.question_number""",
        (submission_id,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r[0],
            "question_number": r[1],
            "question_type": r[2],
            "correct_answer": r[3],
            "student_answer": r[4],
            "is_correct": r[5],
            "points": r[6]
        }
        for r in rows
    ]


class ConfirmedAnswer(BaseModel):
    question_id: int
    student_answer: str

class GradeRequest(BaseModel):
    student_name: str
    answers: List[ConfirmedAnswer]

@router.post("/tests/{test_id}/submissions")
async def create_submission(test_id: int, request: GradeRequest):
    # Load questions for this test
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """SELECT id, question_number, question_type, correct_answer 
        FROM questions WHERE test_id = %s ORDER BY question_number""",
        (test_id,)
    )
    rows = cur.fetchall()
    questions = [
        {"id": r[0], "question_number": r[1], "question_type": r[2], "correct_answer": r[3]}
        for r in rows
    ]

    # Build answers dict from confirmed answers
    student_answers = {}
    for a in request.answers:
        for q in questions:
            if q["id"] == a.question_id:
                student_answers[q["question_number"]] = a.student_answer

    # Grade the confirmed answers
    results, total_score = grade_submission(student_answers, questions)

    # Save submission to DB
    cur.execute(
        """INSERT INTO submissions (test_id, student_name, score, total)
        VALUES (%s, %s, %s, %s) RETURNING id""",
        (test_id, request.student_name, total_score, len(questions))
    )
    submission_id = cur.fetchone()[0]

    # Save individual answers
    for r in results:
        cur.execute(
            """INSERT INTO student_answers 
            (submission_id, question_id, student_answer, is_correct, points)
            VALUES (%s, %s, %s, %s, %s)""",
            (submission_id, r["question_id"], r["student_answer"], r["is_correct"], r["points"])
        )

    conn.commit()
    cur.close()
    conn.close()

    return {
        "submission_id": submission_id,
        "student_name": request.student_name,
        "score": total_score,
        "total": len(questions),
        "results": results
    }

@router.delete("/submissions/{submission_id}")
def delete_submission(submission_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM student_answers WHERE submission_id = %s", (submission_id,))
    cur.execute("DELETE FROM submissions WHERE id = %s", (submission_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Submission deleted"}


@router.put("/submissions/{submission_id}")
def update_submission(submission_id: int, request: EditSubmissionRequest):
    conn = get_connection()
    cur = conn.cursor()
    total_score = 0

    for sa_id, data in request.answers.items():
        student_answer = data["student_answer"]
        q_type = data["question_type"]
        correct = data["correct_answer"]

        if q_type == "multiple_choice":
            is_correct = student_answer.strip().upper() == correct.strip().upper()
            points = 1.0 if is_correct else 0.0
        elif q_type == "true_false":
            normalize = lambda a: a.strip().lower().replace("true", "t").replace("false", "f")
            is_correct = normalize(student_answer) == normalize(correct)
            points = 1.0 if is_correct else 0.0
        else:
            keywords = correct.lower().split()
            matches = sum(1 for w in keywords if w in student_answer.lower())
            score = matches / len(keywords) if keywords else 0
            is_correct = score >= 0.5
            points = 0.0 if score < 0.25 else 0.5 if score < 0.75 else 1.0

        total_score += points
        cur.execute(
            """UPDATE student_answers 
            SET student_answer = %s, is_correct = %s, points = %s
            WHERE id = %s""",
            (student_answer, is_correct, points, int(sa_id))
        )

    cur.execute(
        "UPDATE submissions SET score = %s WHERE id = %s",
        (total_score, submission_id)
    )

    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Submission updated", "new_score": total_score}