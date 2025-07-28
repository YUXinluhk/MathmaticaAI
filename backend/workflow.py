import json
from typing import Dict, Any

from fastapi import HTTPException

from agents import PythonAgent
from MATLABAgent import MATLABAgent
from AbaqusAgent import AbaqusAgent
from main import call_ai_provider


async def run_engineering_workflow(
    provider: str,
    model: str,
    problem: str,
    parameters: Dict[str, Any],
    solver_preference: str,
    data_filepath: str = None,
):
    """
    Runs the full engineering modeling and simulation workflow.
    """
    # Step 1: Modeling (remains the same)
    modeling_result = await call_ai_provider(
        provider,
        model,
        f"Problem: {problem}\nParameters: {json.dumps(parameters)}"
    )

    # Step 2: Model Review (remains the same)
    model_review_result = await call_ai_provider(
        provider,
        model,
        f"Modeling Result:\n{modeling_result}"
    )

    # Step 3: Simulation Script Generation
    script_generation_prompt_map = {
        "python": "generate_python_solution",
        "matlab": "generate_matlab_script",
        "abaqus": "generate_abaqus_script",
    }
    script_generation_task = script_generation_prompt_map.get(solver_preference)
    if not script_generation_task:
        raise HTTPException(status_code=400, detail=f"Invalid solver preference: {solver_preference}")

    simulation_script = await call_ai_provider(
        provider,
        model,
        f"Modeling Result:\n{modeling_result}\nParameters: {json.dumps(parameters)}",
    )

    # Step 4: Execute Simulation
    # Force python solver for now
    agent = PythonAgent()
    execution_result = agent.run(simulation_script, parameters, data_filepath)
    # if solver_preference == "python":
    #     agent = PythonAgent()
    #     execution_result = agent.run(simulation_script, parameters, data_filepath)
    # elif solver_preference == "matlab":
    #     agent = MATLABAgent()
    #     execution_result = agent.run(simulation_script, parameters)
    # elif solver_preference == "abaqus":
    #     agent = AbaqusAgent()
    #     # Abaqus script execution might need a file path
    #     with open("abaqus_script.py", "w") as f:
    #         f.write(simulation_script)
    #     execution_result = agent.run("abaqus_script.py", parameters)
    # else:
    #     raise HTTPException(status_code=400, detail="Invalid solver preference.")

    if not execution_result.success:
        raise HTTPException(status_code=400, detail=f"{solver_preference} execution failed: {execution_result.error}")

    # Step 5: Parse and Analyze Results
    parsing_prompt = f"Solver: {solver_preference}\nOutput:\n{execution_result.output}"
    analysis_result = await call_ai_provider(
        provider,
        model,
        parsing_prompt,
    )

    return {
        "modeling_result": modeling_result,
        "model_review_result": model_review_result,
        "simulation_script": simulation_script,
        "execution_result": {
            "output": execution_result.output,
            "error": execution_result.error,
            "image": execution_result.image,
        },
        "analysis_result": analysis_result,
    }
