import json
from typing import Dict, Any

from fastapi import HTTPException

from main import call_ai_provider, execute_python


async def run_engineering_workflow(
    provider: str,
    model: str,
    problem: str,
    parameters: Dict[str, Any]
):
    """
    Runs the full engineering modeling and simulation workflow.
    """
    # Step 1: Modeling
    modeling_result = await call_ai_provider(
        provider,
        model,
        f"Problem: {problem}\nParameters: {json.dumps(parameters)}"
    )

    # Step 2: Model Review
    model_review_result = await call_ai_provider(
        provider,
        model,
        f"Modeling Result:\n{modeling_result}"
    )

    # Step 3: Simulation Script
    simulation_script = await call_ai_provider(
        provider,
        model,
        f"Modeling Result:\n{modeling_result}\nParameters: {json.dumps(parameters)}"
    )

    # Step 4: Execute Simulation
    execution_result = await execute_python(simulation_script)

    if not execution_result.success:
        raise HTTPException(status_code=400, detail=f"Python execution failed: {execution_result.error}")

    # Step 5: Plot Analysis
    plot_analysis = await call_ai_provider(
        provider,
        model,
        f"Plot Description: {execution_result.output}"
    )

    return {
        "modeling_result": modeling_result,
        "model_review_result": model_review_result,
        "simulation_script": simulation_script,
        "execution_result": {
            "output": execution_result.output,
            "image": execution_result.image
        },
        "plot_analysis": plot_analysis,
    }
