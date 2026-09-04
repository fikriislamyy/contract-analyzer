from app.config import GEMINI_API_KEY
from google import genai

client = genai.Client(api_key=GEMINI_API_KEY)
for m in client.models.list():
    actions = getattr(m, "supported_actions", []) or []
    if "generateContent" in actions:
        print(m.name)