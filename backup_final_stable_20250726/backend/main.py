import os
import requests
import traceback
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import io
import base64
from contextlib import redirect_stdout, redirect_stderr

# Third-party libraries
import numpy as np
import sympy as sp
import scipy
import matplotlib.pyplot as plt
import google.generativeai as genai

# --- FastAPI and CORS Setup ---
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Environment and API Key Loading ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Configure the Google Generative AI client
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"Warning: Failed to configure Google GenAI client: {e}")


# --- Pydantic Models ---
class AIRequest(BaseModel):
    provider: str
    model: str
    task: str
    data: Dict[str, Any]

class ExecuteRequest(BaseModel):
    code: str

class CodeExecutionResult(BaseModel):
    success: bool
    output: str
    error: str
    image: str | None = None


# --- Prompt Loading ---
def load_prompt(filename: str, data: Dict[str, Any]) -> str:
    try:
        with open(os.path.join("prompts", filename), "r", encoding="utf-8") as f:
            prompt_template = f.read()
        return prompt_template.format(**data)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"Prompt file not found: {filename}")
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing data for prompt placeholder: {e}")


# --- AI Call Handlers ---
async def call_gemini_api(model: str, prompt: str) -> str:
    """Handles the request to the Gemini API using the official Python client."""
    try:
        model_instance = genai.GenerativeModel(model)
        response = await model_instance.generate_content_async(prompt)
        return response.text
    except Exception as e:
        # This will catch authentication errors, configuration errors, etc.
        raise HTTPException(status_code=500, detail=f"Google GenAI Error: {str(e)}\n{traceback.format_exc()}")

async def call_openai_api(model: str, prompt: str) -> str:
    """Handles the request to the OpenAI API."""
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {OPENAI_API_KEY}"}
    json_payload = {"model": model, "messages": [{"role": "user", "content": prompt}]}
    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=json_payload)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API Error: {str(e)}\n{traceback.format_exc()}")


# --- API Endpoints ---
@app.post("/api/call-ai")
async def call_ai_endpoint(request: AIRequest):
    prompt_file_map = {
        "initial_solution": "step1_initial_solution_prompt.txt",
        "self_improve": "step2_self_improvement_prompt.txt",
        "verify": "step3_verification_prompt.txt",
        "generate_python": "python_code_prompt.txt",
        "review_and_synthesis": "step5_review_and_synthesis_prompt.txt",
        "correct": "step6_correction_prompt.txt",
        "fix_python_code": "fix_python_code_prompt.txt"
    }
    
    prompt_filename = prompt_file_map.get(request.task)
    if not prompt_filename:
        raise HTTPException(status_code=400, detail=f"Invalid task type: {request.task}")

    prompt = load_prompt(prompt_filename, request.data)

    if request.provider == "google":
        return {"response": await call_gemini_api(request.model, prompt)}
    elif request.provider == "openai":
        return {"response": await call_openai_api(request.model, prompt)}
    else:
        raise HTTPException(status_code=400, detail="Invalid AI provider.")


@app.post("/api/execute-python", response_model=CodeExecutionResult)
async def execute_python(request: ExecuteRequest):
    output_io = io.StringIO()
    error_io = io.StringIO()
    image_b64 = None
    
    restricted_globals = {
        "np": np, "sp": sp, "sympy": sp, "scipy": scipy, "plt": plt,
        "__builtins__": {"print": print, "range": range, "len": len, "abs": abs, "min": min, "max": max, "sum": sum, "round": round}
    }
    
    try:
        with redirect_stdout(output_io), redirect_stderr(error_io):
            exec(request.code, restricted_globals)

        if plt.get_fignums():
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            image_b64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close('all')

        output = output_io.getvalue()
        error = error_io.getvalue()
        
        return CodeExecutionResult(success=not error, output=output, error=error, image=image_b64)
    except Exception as e:
        error = error_io.getvalue() + str(e) + "\n" + traceback.format_exc()
        return CodeExecutionResult(success=False, output=output_io.getvalue(), error=error, image=None)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
