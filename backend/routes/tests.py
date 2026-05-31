from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from db.connection import get_connection

router = APIRouter()

# ─────────────────────────────────────────────
# Data models — define what the API expects
# ─────────────────────────────────────────────

class Question(BaseModel):
    question_number: int
    question_type: str
    correct_answer: str

class CreateTestRequest(BaseModel):
    name: str
    questions: List[Question]

# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.get("/tests")
def get_tests():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, created_at FROM tests ORDER BY created_at DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": r[0], "name": r[1], "created_at": str(r[2])} for r in rows]


@router.get("/tests/{test_id}/questions")
def get_questions(test_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """SELECT id, question_number, question_type, correct_answer 
        FROM questions WHERE test_id = %s ORDER BY question_number""",
        (test_id,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {"id": r[0], "question_number": r[1], "question_type": r[2], "correct_answer": r[3]}
        for r in rows
    ]


@router.post("/tests")
def create_test(request: CreateTestRequest):
    if not request.name:
        raise HTTPException(status_code=400, detail="Test name is required")
    if not request.questions:
        raise HTTPException(status_code=400, detail="At least one question is required")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "INSERT INTO tests (name) VALUES (%s) RETURNING id",
        (request.name,)
    )
    test_id = cur.fetchone()[0]

    for q in request.questions:
        cur.execute(
            """INSERT INTO questions 
            (test_id, question_number, question_type, correct_answer)
            VALUES (%s, %s, %s, %s)""",
            (test_id, q.question_number, q.question_type, q.correct_answer)
        )

    conn.commit()
    cur.close()
    conn.close()
    return {"id": test_id, "name": request.name, "question_count": len(request.questions)}