import os
import requests
import traceback
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import sympy as sp
import scipy
import matplotlib.pyplot as plt
import io
import base64
from contextlib import redirect_stdout, redirect_stderr
from fastapi.middleware.cors import CORSMiddleware

# ... (Pydantic Models and API Config remain the same)

# --- Prompt Loading ---
def load_prompt(filename, data):
    # ... (implementation)
    pass

# --- API Endpoints ---
@app.post("/api/call-ai")
async def call_ai_endpoint(request: AIRequest):
    if request.provider not in api_configs:
        raise HTTPException(status_code=400, detail="Invalid AI provider.")

    config = api_configs[request.provider]
    
    prompt_file_map = {
        "initial_solution": "step1_initial_solution_prompt.txt",
        "self_improve": "step2_self_improvement_prompt.txt",
        "verify": "step3_verification_prompt.txt",
        "generate_python": "python_code_prompt.txt",
        "review_and_synthesize": "step5_review_and_synthesis_prompt.txt",
        "correct": "step6_correction_prompt.txt",
        "fix_python_code": "fix_python_code_prompt.txt" // Add the new task
    }
    
    prompt_filename = prompt_file_map.get(request.task)
    if not prompt_filename:
        raise HTTPException(status_code=400, detail=f"Invalid task type: {request.task}")

    prompt = load_prompt(prompt_filename, request.data)
    messages = [{"role": "user", "content": prompt}]

    try:
        response = requests.post(
            config["url"],
            headers=config["get_headers"](),
            json=config["format_request"](request.model, messages)
        )
        response.raise_for_status()
        ai_response = config["extract_response"](response.json())
        return {"response": ai_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ... (Other endpoints and CORS middleware remain the same)
