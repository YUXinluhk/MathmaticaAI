import os
import requests
import traceback
import configparser
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import io
import base64
import json
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

# --- Error Handling ---
class AppError(Exception):
    def __init__(self, error_code: str, message: str, suggestion: str = "No suggestion provided."):
        self.error_code = error_code
        self.message = message
        self.suggestion = suggestion
        super().__init__(self.message)

# Define specific error codes
class ErrorCodes:
    AI_API_TIMEOUT = "AI_API_TIMEOUT"
    AI_API_ERROR = "AI_API_ERROR"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    PYTHON_EXECUTION_ERROR = "PYTHON_EXECUTION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"

# --- Config Parser Setup ---
config = configparser.ConfigParser()
config.read('backend/config.ini')

# --- FastAPI and CORS Setup ---
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

@app.exception_handler(AppError)
async def app_exception_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=400, # Using 400 for client errors, can be adjusted
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "suggestion": exc.suggestion,
        },
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error_code": ErrorCodes.UNKNOWN_ERROR,
            "message": "An unexpected server error occurred.",
            "suggestion": "Please contact support or try again later.",
            "detail": str(exc) # Optional: for debugging
        },
    )

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



# --- Prompt Loading ---
def load_prompt(filename: str, data: Dict[str, Any], base_folder: str = "prompts") -> str:
    try:
        filepath = os.path.join(base_folder, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            prompt_template = f.read()
        return prompt_template.format(**data)
    except FileNotFoundError:
        raise AppError(
            error_code=ErrorCodes.FILE_NOT_FOUND,
            message=f"Prompt file not found: {filename}",
            suggestion="Please check that the prompt files exist in the correct directory."
        )
    except KeyError as e:
        raise AppError(
            error_code=ErrorCodes.INVALID_INPUT,
            message=f"Missing data for prompt placeholder: {e}",
            suggestion="Ensure all required data fields are provided for the prompt."
        )


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
            raise AppError(
                error_code=ErrorCodes.AI_API_ERROR,
                message="The AI model did not provide a valid response.",
                suggestion="The model's response was empty. This might be a temporary issue. Please try again."
            )
    except requests.exceptions.Timeout:
        raise AppError(
            error_code=ErrorCodes.AI_API_TIMEOUT,
            message="Google GenAI API request timed out.",
            suggestion="The request took too long to complete. Check your network connection or try again later."
        )
    except Exception as e:
        raise AppError(
            error_code=ErrorCodes.AI_API_ERROR,
            message=f"Google GenAI Error: {str(e)}",
            suggestion="An unexpected error occurred with the Google GenAI API. Check API keys and service status."
        )

async def call_openai_api(model: str, prompt: str) -> str:
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {OPENAI_API_KEY}"}
    json_payload = {"model": model, "messages": [{"role": "user", "content": prompt}]}
    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=json_payload, timeout=120)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.exceptions.Timeout:
        raise AppError(
            error_code=ErrorCodes.AI_API_TIMEOUT,
            message="OpenAI API request timed out.",
            suggestion="The request took too long to complete. Check your network connection or try again later."
        )
    except requests.exceptions.RequestException as e:
        raise AppError(
            error_code=ErrorCodes.AI_API_ERROR,
            message=f"OpenAI API Error: {str(e)}",
            suggestion="An error occurred with the OpenAI API. Check your API key, model name, and network status."
        )

async def call_deepseek_api(model: str, prompt: str) -> str:
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {DEEPSEEK_API_KEY}"}
    json_payload = {"model": model, "messages": [{"role": "user", "content": prompt}]}
    try:
        response = requests.post("https://api.deepseek.com/v1/chat/completions", headers=headers, json=json_payload, timeout=120)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.exceptions.Timeout:
        raise AppError(
            error_code=ErrorCodes.AI_API_TIMEOUT,
            message="DeepSeek API request timed out.",
            suggestion="The request took too long to complete. Check your network connection or try again later."
        )
    except requests.exceptions.RequestException as e:
        raise AppError(
            error_code=ErrorCodes.AI_API_ERROR,
            message=f"DeepSeek API Error: {str(e)}",
            suggestion="An error occurred with the DeepSeek API. Check your API key, model name, and network status."
        )


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
        raise AppError(error_code=ErrorCodes.INVALID_INPUT, message="Invalid provider.")
    try:
        requests.get(url, timeout=10)
        return {"status": "success", "provider": request.provider, "message": f"Successfully connected to {request.provider}."}
    except requests.exceptions.RequestException as e:
        raise AppError(
            error_code=ErrorCodes.AI_API_ERROR,
            message=f"Connection to {request.provider} failed: {str(e)}",
            suggestion="Could not connect to the AI provider. Check your network or the provider's status page."
        )

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
        "generate_matlab_script": ("prompts", "generate_matlab_script.txt"),
        "generate_abaqus_script": ("prompts", "generate_abaqus_script.txt"),
        "parse_solver_output": ("prompts", "parse_solver_output.txt"),
        "optimize_parameters": ("prompts", "optimize_parameters_prompt.txt"),
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


from fastapi import UploadFile, File
from .workflow import run_engineering_workflow
from .optimization_workflow import run_optimization_workflow

class WorkflowRequest(BaseModel):
    provider: str
    model: str
    problem: str
    parameters: Dict[str, Any]
    solver_preference: str

class OptimizationRequest(BaseModel):
    provider: str
    model: str
    problem: str
    initial_parameters: Dict[str, Any]
    solver_preference: str
    optimization_goal: str
    max_iterations: int = 5

@app.post("/api/upload-data")
async def upload_data(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
        temp_file.write(await file.read())
        return {"filepath": temp_file.name}

@app.post("/api/knowledge/upload")
async def upload_knowledge(file: UploadFile = File(...)):
    # For simplicity, we'll save it to a temp file.
    # In a real application, you'd want to manage this more robustly,
    # perhaps associating it with a user session.
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as temp_file:
        temp_file.write(await file.read())
        return {"filepath": temp_file.name, "filename": file.filename}

class StepModelRequest(BaseModel):
    provider: str
    model: str
    problem: str
    parameters: Dict[str, Any]
    knowledge_base: Optional[str] = None
    # No revision needed here as the 'problem' field is the editable content

class StepGenerateScriptRequest(BaseModel):
    provider: str
    model: str
    modeling_result: str
    parameters: Dict[str, Any]
    knowledge_base: Optional[str] = None
    revised_content: Optional[str] = None

class StepExecuteRequest(BaseModel):
    script: str
    parameters: Dict[str, Any]
    data_filepath: Optional[str] = None

class StepSynthesizeRequest(BaseModel):
    provider: str
    model: str
    history: Dict[str, Any]
    knowledge_base: Optional[str] = None


@app.post("/api/step/model")
async def step_model(request: StepModelRequest):
    """
    Handles the modeling step. The 'problem' field can be the original
    or user-revised problem description.
    """
    knowledge_section = f"**Background Knowledge:**\n---\n{request.knowledge_base}\n---\n" if request.knowledge_base else ""
    modeling_prompt = f"{knowledge_section}**Your Task:**\nProblem: {request.problem}\nParameters: {json.dumps(request.parameters)}"

    # AI generates the model based on the (potentially revised) problem
    modeling_result = await call_ai_provider(request.provider, request.model, modeling_prompt)

    # AI reviews its own generated model
    review_prompt = f"{knowledge_section}**Your Task:**\nReview the following modeling result:\n{modeling_result}"
    ai_review = await call_ai_provider(request.provider, request.model, review_prompt)

    return {"computational_result": modeling_result, "ai_review": ai_review}

@app.post("/api/step/generate-script")
async def step_generate_script(request: StepGenerateScriptRequest):
    """
    Handles the script generation step. It can either generate a new script
    or use a user-revised script.
    """
    knowledge_section = f"**Background Knowledge:**\n---\n{request.knowledge_base}\n---\n" if request.knowledge_base else ""

    # If user provides revised content, use it. Otherwise, generate from AI.
    if request.revised_content:
        simulation_script = request.revised_content
    else:
        script_prompt = f"{knowledge_section}**Your Task:**\nBased on the modeling result, generate a simulation script.\nModeling Result:\n{request.modeling_result}\nParameters: {json.dumps(request.parameters)}"
        simulation_script = await call_ai_provider(request.provider, request.model, script_prompt)

    # AI always reviews the script that is being passed to the next step
    review_prompt = f"{knowledge_section}**Your Task:**\nReview the following generated script:\n```python\n{simulation_script}\n```"
    ai_review = await call_ai_provider(request.provider, request.model, review_prompt)

    return {"computational_result": simulation_script, "ai_review": ai_review}

@app.post("/api/step/execute")
async def step_execute(request: StepExecuteRequest):
    from agents import PythonAgent
    agent = PythonAgent()
    execution_result = agent.run(request.script, request.parameters, request.data_filepath)

    if not execution_result.success:
        raise AppError(
            error_code=ErrorCodes.PYTHON_EXECUTION_ERROR,
            message=f"Python execution failed: {execution_result.error}",
            suggestion="The Python script failed to execute. Check the script for errors and try again."
        )

    # This is a placeholder for AI review of the execution
    ai_review = "AI analysis of the execution result would go here."

    return {
        "computational_result": {
            "output": execution_result.output,
            "image": execution_result.image,
        },
        "ai_review": ai_review,
    }

@app.post("/api/step/synthesize")
async def step_synthesize(request: StepSynthesizeRequest):
    knowledge_section = f"**Background Knowledge:**\n---\n{request.knowledge_base}\n---\n" if request.knowledge_base else ""
    synthesis_prompt = f"{knowledge_section}**Your Task:**\nSynthesize a final report based on the following history:\n{json.dumps(request.history, indent=2)}"
    synthesis_report = await call_ai_provider(request.provider, request.model, synthesis_prompt)
    return {"synthesis_report": synthesis_report}


@app.post("/api/run-workflow", deprecated=True)
async def run_workflow_endpoint(request: WorkflowRequest, data_filepath: str = None):
    return await run_engineering_workflow(
        request.provider,
        request.model,
        request.problem,
        request.parameters,
        request.solver_preference,
        data_filepath,
    )

@app.post("/api/run-optimization")
async def run_optimization_endpoint(request: OptimizationRequest, data_filepath: str = None):
    return await run_optimization_workflow(
        request.provider,
        request.model,
        request.problem,
        request.initial_parameters,
        request.solver_preference,
        request.optimization_goal,
        request.max_iterations,
        data_filepath,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
