import google.generativeai as genai
import os
import json
import re

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def grade_multiple_choice(student_answer, correct_answer):
    return student_answer.strip().upper() == correct_answer.strip().upper()

def grade_true_false(student_answer, correct_answer):
    normalize = lambda a: a.strip().lower().replace("true", "t").replace("false", "f")
    return normalize(student_answer) == normalize(correct_answer)

def grade_short_answer(student_answer, correct_answer):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
        You are a teacher grading a short answer question.
        
        Correct answer: {correct_answer}
        Student answer: {student_answer}
        
        Does the student's answer convey the same meaning as the correct answer?
        Respond with ONLY a JSON object in this exact format:
        {{"is_correct": true or false, "score": 0.0 to 1.0, "feedback": "brief explanation"}}
        """
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r'^```json|^```|```$', '', text, flags=re.MULTILINE).strip()
        result = json.loads(text)
        raw_score = result["score"]

        if raw_score < 0.25:
            score = 0.0
        elif raw_score < 0.75:
            score = 0.5
        else:
            score = 1.0

        is_correct = score >= 0.5
        return is_correct, score, result["feedback"]
    
    except Exception as e:
        keywords = correct_answer.lower().split()
        matches = sum(1 for word in keywords if word in student_answer.lower())
        raw_score = matches / len(keywords) if keywords else 0
        if raw_score < 0.25:
            score = 0.0
        elif raw_score < 0.75:
            score = 0.5
        else:
            score = 1.0
        is_correct = score >= 0.5
        return is_correct, score, "Auto-graded by keyword matching (AI unavailable)"

def grade_submission(student_answers, questions):
    results = []
    total_score = 0
    
    for question in questions:
        q_num = question["question_number"]
        q_type = question["question_type"]
        correct = question["correct_answer"]
        student = student_answers.get(q_num, "")
        
        if not student:
            results.append({
                "question_id": question["id"],
                "student_answer": "No answer",
                "is_correct": False,
                "points": 0.0,
                "feedback": "No answer provided"
            })
            continue
        
        if q_type == "multiple_choice":
            is_correct = grade_multiple_choice(student, correct)
            points = 1.0 if is_correct else 0.0
            feedback = "Correct!" if is_correct else f"Correct answer: {correct}"
            
        elif q_type == "true_false":
            is_correct = grade_true_false(student, correct)
            points = 1.0 if is_correct else 0.0
            feedback = "Correct!" if is_correct else f"Correct answer: {correct}"
            
        elif q_type == "short_answer":
            is_correct, points, feedback = grade_short_answer(student, correct)
            
        else:
            is_correct, points, feedback = False, 0.0, "Unknown question type"
        
        total_score += points
        results.append({
            "question_id": question["id"],
            "student_answer": student,
            "is_correct": is_correct,
            "points": points,
            "feedback": feedback
        })
    
    return results, total_score