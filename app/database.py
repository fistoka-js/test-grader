import psycopg2
import os

def get_connection():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        user=os.environ.get("DB_USER", "jacob"),
        password=os.environ.get("DB_PASSWORD", "password123"),
        dbname=os.environ.get("DB_NAME", "testgrader")
    )

def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS tests (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id SERIAL PRIMARY KEY,
            test_id INTEGER REFERENCES tests(id),
            question_number INTEGER NOT NULL,
            question_type TEXT NOT NULL,
            correct_answer TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id SERIAL PRIMARY KEY,
            test_id INTEGER REFERENCES tests(id),
            student_name TEXT NOT NULL,
            score FLOAT NOT NULL,
            total INTEGER NOT NULL,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS student_answers (
            id SERIAL PRIMARY KEY,
            submission_id INTEGER REFERENCES submissions(id),
            question_id INTEGER REFERENCES questions(id),
            student_answer TEXT NOT NULL,
            is_correct BOOLEAN NOT NULL,
            points FLOAT NOT NULL
        )
    """)

    conn.commit()
    cur.close()
    conn.close()