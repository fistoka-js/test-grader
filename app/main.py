import streamlit as st
from PIL import Image
import pandas as pd
from database import get_connection, init_db
from ocr import extract_answers
from grader import grade_submission

# Initialize database on startup
init_db()

st.set_page_config(page_title="Test Grader", layout="wide")
st.markdown("""
    <style>
    input {
        autocomplete: off;
    }
    [data-testid="stHeaderActionElements"] {
        display: none;
    }
    </style>
""", unsafe_allow_html=True)
st.title("📝 Automated Test Grader")

# Sidebar navigation
mode = st.sidebar.radio("Mode", ["Create Test", "Grade Submission", "View Results"])

# ─────────────────────────────────────────────
# MODE 1: CREATE TEST
# ─────────────────────────────────────────────
if mode == "Create Test":
    st.header("Create a New Test")

    test_name = st.text_input("Test Name")
    num_questions = st.number_input("Number of Questions", min_value=1, max_value=50, value=5)

    st.subheader("Upload Answer Key Image")
    uploaded_key = st.file_uploader("Upload a photo of the answer key", type=["png", "jpg", "jpeg"])

    if uploaded_key:
        image = Image.open(uploaded_key)
        st.image(image, caption="Uploaded Answer Key", width=400)

        answers, raw_text = extract_answers(image)

        st.subheader("OCR Extracted Answers")
        st.text(raw_text)

        # Merge OCR results with full question list
        full_answers = {}
        for i in range(1, int(num_questions) + 1):
            full_answers[i] = answers.get(i, "")

        if answers:
            st.success(f"Detected {len(answers)} answers — review and correct any mistakes below")
        else:
            st.warning("OCR couldn't detect answers automatically. Enter them manually below.")

        # Always show all questions
        st.subheader("Review & Set Question Types")
        question_data = []

        for q_num in sorted(full_answers.keys()):
            col1, col2, col3 = st.columns([1, 2, 2])
            with col1:
                st.write(f"Q{q_num}")
            with col2:
                q_type = st.selectbox(
                    "Type",
                    ["multiple_choice", "true_false", "short_answer"],
                    key=f"type_{q_num}"
                )
            with col3:
                correct_answer = st.text_input(
                    "Correct Answer",
                    value=full_answers[q_num],
                    key=f"answer_{q_num}"
                )
            question_data.append((q_num, q_type, correct_answer))

        if st.button("Save Test"):
            if not test_name:
                st.error("Please enter a test name")
            else:
                conn = get_connection()
                cur = conn.cursor()

                cur.execute(
                    "INSERT INTO tests (name) VALUES (%s) RETURNING id",
                    (test_name,)
                )
                test_id = cur.fetchone()[0]

                for q_num, q_type, correct_answer in question_data:
                    cur.execute(
                        """INSERT INTO questions 
                        (test_id, question_number, question_type, correct_answer)
                        VALUES (%s, %s, %s, %s)""",
                        (test_id, q_num, q_type, correct_answer)
                    )

                conn.commit()
                cur.close()
                conn.close()
                st.success(f"Test '{test_name}' saved with {len(question_data)} questions!")

# ─────────────────────────────────────────────
# MODE 2: GRADE SUBMISSION
# ─────────────────────────────────────────────
elif mode == "Grade Submission":
    st.header("Grade a Student Submission")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM tests ORDER BY created_at DESC")
    tests = cur.fetchall()
    cur.close()
    conn.close()

    if not tests:
        st.warning("No tests found. Please create a test first.")
    else:
        test_options = {name: tid for tid, name in tests}
        selected_test = st.selectbox("Select Test", list(test_options.keys()))
        test_id = test_options[selected_test]

        student_name = st.text_input("Student Name")

        st.subheader("Upload Student Answer Sheet")
        uploaded_sheet = st.file_uploader("Upload a photo of the student's answers", type=["png", "jpg", "jpeg"])

        if uploaded_sheet:
            image = Image.open(uploaded_sheet)
            st.image(image, caption="Student Answer Sheet", width=400)

            answers, raw_text = extract_answers(image)

            st.subheader("OCR Extracted Answers")
            st.text(raw_text)

            # Load questions for this test
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
            questions = [
                {"id": r[0], "question_number": r[1], "question_type": r[2], "correct_answer": r[3]}
                for r in rows
            ]

            # Merge OCR results with full question list
            full_answers = {}
            for q in questions:
                q_num = q["question_number"]
                full_answers[q_num] = answers.get(q_num, "")

            if answers:
                st.success(f"Detected {len(answers)} answers — review and correct any mistakes below")
            else:
                st.warning("OCR couldn't detect answers automatically. Enter them manually below.")

            # Always show editable fields so teacher can fix OCR mistakes
            st.subheader("Review & Edit Answers")
            for q in questions:
                q_num = q["question_number"]
                full_answers[q_num] = st.text_input(
                    f"Q{q_num} answer",
                    value=full_answers[q_num],
                    key=f"student_answer_{q_num}"
                )

            if st.button("Grade Submission"):
                if not student_name:
                    st.error("Please enter the student's name")
                else:
                    with st.spinner("Grading..."):
                        results, total_score = grade_submission(full_answers, questions)

                    conn = get_connection()
                    cur = conn.cursor()
                    cur.execute(
                        """INSERT INTO submissions (test_id, student_name, score, total)
                        VALUES (%s, %s, %s, %s) RETURNING id""",
                        (test_id, student_name, total_score, len(questions))
                    )
                    submission_id = cur.fetchone()[0]

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

                    st.subheader(f"Results for {student_name}")
                    percentage = (total_score / len(questions)) * 100
                    col1, col2 = st.columns(2)
                    col1.metric("Score", f"{total_score}/{len(questions)}")
                    col2.metric("Percentage", f"{percentage:.1f}%")

                    results_df = pd.DataFrame([{
                        "Question": f"Q{questions[i]['question_number']}",
                        "Student Answer": r["student_answer"],
                        "Correct": "✅" if r["is_correct"] else "❌",
                        "Points": r["points"],
                        "Feedback": r["feedback"]
                    } for i, r in enumerate(results)])
                    st.dataframe(results_df)

# ─────────────────────────────────────────────
# MODE 3: VIEW RESULTS
# ─────────────────────────────────────────────
elif mode == "View Results":
    st.header("Class Results")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM tests ORDER BY created_at DESC")
    tests = cur.fetchall()
    cur.close()
    conn.close()

    if not tests:
        st.warning("No tests found.")
    else:
        test_options = {name: tid for tid, name in tests}
        selected_test = st.selectbox("Select Test", list(test_options.keys()))
        test_id = test_options[selected_test]

        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """SELECT student_name, score, total, submitted_at 
            FROM submissions WHERE test_id = %s ORDER BY submitted_at DESC""",
            (test_id,)
        )
        submissions = cur.fetchall()
        cur.close()
        conn.close()

        if not submissions:
            st.info("No submissions yet for this test.")
        else:
            df = pd.DataFrame(submissions, columns=["Student", "Score", "Total", "Submitted At"])
            df["Percentage"] = (df["Score"] / df["Total"] * 100).round(1)

            col1, col2, col3 = st.columns(3)
            col1.metric("Students Graded", len(df))
            col2.metric("Class Average", f"{df['Percentage'].mean():.1f}%")
            col3.metric("Highest Score", f"{df['Percentage'].max():.1f}%")

            st.subheader("All Submissions")
            
            col_edit, _ = st.columns([1, 4])
            edit_mode = col_edit.toggle("✏️ Edit Mode")

            for _, row in df.iterrows():
                with st.container():
                    col1, col2, col3, col4, col5 = st.columns([2, 1, 1, 1, 1])
                    col1.write(row["Student"])
                    col2.write(f"{row['Score']}/{row['Total']}")
                    col3.write(f"{row['Percentage']}%")
                    col4.write(str(row["Submitted At"])[:10])

                    if edit_mode:
                        if col5.button("🗑️", key=f"delete_{row['Student']}_{row['Submitted At']}"):
                            conn = get_connection()
                            cur = conn.cursor()
                            cur.execute("""
                                DELETE FROM student_answers 
                                WHERE submission_id = (
                                    SELECT id FROM submissions 
                                    WHERE student_name = %s AND submitted_at = %s
                                )
                            """, (row["Student"], row["Submitted At"]))
                            cur.execute("""
                                DELETE FROM submissions 
                                WHERE student_name = %s AND submitted_at = %s
                            """, (row["Student"], row["Submitted At"]))
                            conn.commit()
                            cur.close()
                            conn.close()
                            st.success(f"Deleted {row['Student']}'s submission")
                            st.rerun()

                        # Expandable edit section
                        with st.expander(f"Edit {row['Student']}'s answers"):
                            conn = get_connection()
                            cur = conn.cursor()
                            cur.execute("""
                                SELECT sa.id, q.question_number, q.question_type, 
                                       q.correct_answer, sa.student_answer, sa.is_correct, sa.points
                                FROM student_answers sa
                                JOIN questions q ON sa.question_id = q.id
                                JOIN submissions s ON sa.submission_id = s.id
                                WHERE s.student_name = %s AND s.submitted_at = %s
                                ORDER BY q.question_number
                            """, (row["Student"], row["Submitted At"]))
                            answer_rows = cur.fetchall()
                            cur.close()
                            conn.close()

                            edited_answers = {}
                            for ar in answer_rows:
                                sa_id, q_num, q_type, correct, student_ans, is_correct, points = ar
                                new_ans = st.text_input(
                                    f"Q{q_num} ({q_type}) — correct: {correct}",
                                    value=student_ans,
                                    key=f"edit_{row['Student']}_{row['Submitted At']}_{sa_id}"
                                )
                                edited_answers[sa_id] = (new_ans, q_type, correct)

                            if st.button("💾 Save Changes", key=f"save_{row['Student']}_{row['Submitted At']}"):
                                conn = get_connection()
                                cur = conn.cursor()
                                total_score = 0

                                for sa_id, (new_ans, q_type, correct) in edited_answers.items():
                                    if q_type == "multiple_choice":
                                        is_correct = new_ans.strip().upper() == correct.strip().upper()
                                        points = 1.0 if is_correct else 0.0
                                    elif q_type == "true_false":
                                        normalize = lambda a: a.strip().lower().replace("true", "t").replace("false", "f")
                                        is_correct = normalize(new_ans) == normalize(correct)
                                        points = 1.0 if is_correct else 0.0
                                    else:
                                        keywords = correct.lower().split()
                                        matches = sum(1 for w in keywords if w in new_ans.lower())
                                        score = matches / len(keywords) if keywords else 0
                                        is_correct = score >= 0.5
                                        points = 0.0 if score < 0.25 else 0.5 if score < 0.75 else 1.0

                                    total_score += points
                                    cur.execute("""
                                        UPDATE student_answers 
                                        SET student_answer = %s, is_correct = %s, points = %s
                                        WHERE id = %s
                                    """, (new_ans, is_correct, points, sa_id))

                                cur.execute("""
                                    UPDATE submissions SET score = %s
                                    WHERE student_name = %s AND submitted_at = %s
                                """, (total_score, row["Student"], row["Submitted At"]))

                                conn.commit()
                                cur.close()
                                conn.close()
                                st.success("Changes saved!")
                                st.rerun()