import os
import requests
import traceback
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import io
import base64
from contextlib import redirect_stdout, redirect_stderr
import tempfile
import shutil
import subprocess
import zipfile
from fastapi.responses import StreamingResponse

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Environment and API Key Loading ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
TEXLIVE_PATH = r"D:\texlive\2025\bin\windows\pdflatex.exe"

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
    parameters: Optional[Dict[str, Any]] = None

class ExecuteRequest(BaseModel):
    code: str

class ConnectionTestRequest(BaseModel):
    provider: str
    
class IterationData(BaseModel):
    iteration_number: int
    solution_attempt: Optional[str] = None
    theoretical_report: Optional[str] = None
    python_code: Optional[str] = None
    python_output: Optional[str] = None
    python_error: Optional[str] = None
    image_text: Optional[str] = None # New field for the image description

class LatexReportRequest(BaseModel):
    problem: str
    final_status: str
    iteration_history: List[IterationData]
    provider: str
    model: str

class CodeExecutionResult(BaseModel):
    success: bool
    output: str
    error: str
    image: str | None = None


# --- Prompt Loading ---
def load_prompt(filename: str, data: Dict[str, Any], base_folder: str = "prompts") -> str:
    try:
        with open(os.path.join(base_folder, filename), "r", encoding="utf-8") as f:
            prompt_template = f.read()
        return prompt_template.format(**data)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"Prompt file not found: {filename} in {base_folder}")
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing data for prompt placeholder: {e}")


# --- AI Call Handlers ---
async def call_ai_provider(provider: str, model: str, prompt: str) -> str:
    if provider == "google":
        return await call_gemini_api(model, prompt)
    elif provider == "openai":
        return await call_openai_api(model, prompt)
    elif provider == "deepseek":
        return await call_deepseek_api(model, prompt)
    else:
        raise HTTPException(status_code=400, detail="Invalid AI provider.")

async def call_gemini_api(model: str, prompt: str) -> str:
    try:
        model_instance = genai.GenerativeModel(model)
        response = await model_instance.generate_content_async(prompt)
        if response.parts:
            return "".join(part.text for part in response.parts)
        else:
            return "Error: The AI model did not provide a valid response."
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google GenAI Error: {str(e)}\n{traceback.format_exc()}")

async def call_openai_api(model: str, prompt: str) -> str:
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {OPENAI_API_KEY}"}
    json_payload = {"model": model, "messages": [{"role": "user", "content": prompt}]}
    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=json_payload, timeout=120)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API Error: {str(e)}\n{traceback.format_exc()}")

async def call_deepseek_api(model: str, prompt: str) -> str:
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {DEEPSEEK_API_KEY}"}
    json_payload = {"model": model, "messages": [{"role": "user", "content": prompt}]}
    try:
        response = requests.post("https://api.deepseek.com/v1/chat/completions", headers=headers, json=json_payload, timeout=120)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"DeepSeek API Error: {str(e)}\n{traceback.format_exc()}")


# --- API Endpoints ---
@app.post("/api/test-connection")
async def test_connection(request: ConnectionTestRequest):
    urls = {
        "google": "https://generativelanguage.googleapis.com",
        "openai": "https://api.openai.com",
        "deepseek": "https://api.deepseek.com"
    }
    url = urls.get(request.provider)
    if not url:
        raise HTTPException(status_code=400, detail="Invalid provider.")
    try:
        requests.get(url, timeout=10)
        return {"status": "success", "provider": request.provider, "message": f"Successfully connected to {request.provider}."}
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Connection to {request.provider} failed: {str(e)}")

@app.post("/api/call-ai")
async def call_ai_endpoint(request: AIRequest):
    prompt_file_map = {
        "initial_solution": ("prompts", "step1_initial_solution_prompt.txt"),
        "self_improve_solution": ("prompts", "step2_self_improvement_prompt.txt"),
        "verify": ("prompts", "step3_verification_prompt.txt"),
        "correct_solution": ("prompts", "step_correct_solution_prompt.txt"),
        "generate_python_solution": ("prompts", "generate_python_solution_prompt.txt"),
        "analyze_python_result": ("prompts", "analyze_python_result_prompt.txt"),
        "fix_python_code": ("prompts", "fix_python_code_prompt.txt"),
        "fix_latex_code": ("prompts", "fix_latex_code_prompt.txt"),
        "review_and_synthesis": ("prompts", "step5_review_and_synthesis_prompt.txt"),
        "generate_latex_report": ("prompts", "generate_latex_report_prompt.txt"),
        "modeling": ("prompts_applied", "step1_modeling_prompt.txt"),
        "model_review": ("prompts_applied", "step2_model_review_prompt.txt"),
        "simulation_script": ("prompts_applied", "step3_simulation_script_prompt.txt"),
        "synthesis": ("prompts_applied", "step4_synthesis_prompt.txt"),
        "plot_analysis": ("prompts_applied", "step5_plot_analysis_prompt.txt"),
    }
    
    prompt_info = prompt_file_map.get(request.task)
    if not prompt_info:
        raise HTTPException(status_code=400, detail=f"Invalid task type: {request.task}")

    base_folder, prompt_filename = prompt_info
    prompt_data = {k: v for k, v in request.data.items() if v is not None}
    if request.parameters:
        prompt_data['parameters'] = str(request.parameters)
    prompt = load_prompt(prompt_filename, prompt_data, base_folder=base_folder)
    
    response_text = await call_ai_provider(request.provider, request.model, prompt)
    return {"response": response_text}


@app.post("/api/execute-python", response_model=CodeExecutionResult)
async def execute_python(request: ExecuteRequest):
    output_io = io.StringIO()
    error_io = io.StringIO()
    image_b64 = None
    
    safe_globals = {
        "np": np, "sp": sp, "sympy": sp, "scipy": scipy, "plt": plt,
        "__builtins__": __builtins__
    }
    
    try:
        with redirect_stdout(output_io), redirect_stderr(error_io):
            exec(request.code, safe_globals)

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

@app.post("/api/generate-latex-report")
async def generate_latex_report(request: LatexReportRequest):
    """
    This is a dedicated endpoint for the complex task of generating a LaTeX report.
    It correctly serializes the structured iteration history into a string for the AI prompt.
    """
    try:
        history_str = ""
        for item in request.iteration_history:
            history_str += f"### Iteration {item.iteration_number}\n\n"
            if item.solution_attempt:
                history_str += f"**Solution Attempt:**\n```\n{item.solution_attempt}\n```\n\n"
            if item.theoretical_report:
                history_str += f"**Theoretical Verification Report:**\n```\n{item.theoretical_report}\n```\n\n"
            if item.python_code:
                history_str += f"**Python Verification Code:**\n```python\n{item.python_code}\n```\n\n"
            if item.python_output:
                history_str += f"**Python Execution Output:**\n```\n{item.python_output}\n```\n\n"
            if item.python_error:
                history_str += f"**Python Execution Error:**\n```\n{item.python_error}\n```\n\n"
            if item.image_text:
                history_str += f"**Image Generated:** {item.image_text}\n\n"
            history_str += "---\n\n"

        prompt_data = {
            "problem": request.problem,
            "final_status": request.final_status,
            "iteration_history": history_str
        }
        
        prompt = load_prompt("generate_latex_report_prompt.txt", prompt_data)
        latex_content = await call_ai_provider(request.provider, request.model, prompt)

        if "```latex" in latex_content:
            latex_content = latex_content.split("```latex")[1].split("```")[0].strip()
        
        return Response(content=latex_content, media_type="application/x-latex")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate LaTeX report: {str(e)}\n{traceback.format_exc()}")


from workflow import run_engineering_workflow

class WorkflowRequest(BaseModel):
    provider: str
    model: str
    problem: str
    parameters: Dict[str, Any]

@app.post("/api/run-workflow")
async def run_workflow_endpoint(request: WorkflowRequest):
    return await run_engineering_workflow(
        request.provider,
        request.model,
        request.problem,
        request.parameters,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
