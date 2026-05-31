import google.generativeai as genai
import os
import json
import re
from PIL import Image

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def extract_answers(image):
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = """
        Look at this answer sheet image and extract all answers.
        
        Return ONLY a JSON object where keys are question numbers (as integers) 
        and values are the answers (as strings). For example:
        {"1": "A", "2": "True", "3": "The mitochondria is the powerhouse of the cell"}
        
        Rules:
        - Only include questions that have a visible answer
        - For multiple choice, return just the letter (A, B, C, D)
        - For true/false, return True or False
        - For short answer, return the full answer text
        - Return ONLY the JSON, no other text
        """
        
        response = model.generate_content([prompt, image])
        text = response.text.strip()
        text = re.sub(r'^```json|^```|```$', '', text, flags=re.MULTILINE).strip()
        data = json.loads(text)
        answers = {int(k): v for k, v in data.items()}
        return answers, response.text

    except Exception as e:
        # Fallback — return empty answers so the user can fill them in manually
        return {}, f"OCR unavailable ({str(e)[:80]}). Please enter answers manually."