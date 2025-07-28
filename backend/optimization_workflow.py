import json
from typing import Dict, Any
from fastapi import HTTPException
from .main import call_ai_provider, load_prompt
from .workflow import run_engineering_workflow

async def run_optimization_workflow(
    provider: str,
    model: str,
    problem: str,
    initial_parameters: Dict[str, Any],
    solver_preference: str,
    optimization_goal: str,
    max_iterations: int = 5,
    data_filepath: str = None,
):
    """
    Runs an optimization loop to find the best parameters for a given problem.
    """
    current_parameters = initial_parameters.copy()
    iteration_history = []

    for i in range(max_iterations):
        # Run the simulation with the current parameters
        simulation_result = await run_engineering_workflow(
            provider,
            model,
            problem,
            current_parameters,
            solver_preference,
            data_filepath,
        )

        iteration_history.append(
            {
                "iteration": i + 1,
                "parameters": current_parameters,
                "results": simulation_result,
            }
        )

        # Check if the optimization goal is met.
        # This is a simplified check. A more robust solution would involve
        # a more sophisticated analysis of the results.
        if optimization_goal in simulation_result.get("analysis_result", ""):
            return {
                "status": "success",
                "message": "Optimization goal met.",
                "history": iteration_history,
            }

        # If the goal is not met, ask the AI to suggest new parameters.
        prompt_data = {
            "optimization_goal": optimization_goal,
            "simulation_results": json.dumps(simulation_result),
            "current_parameters": json.dumps(current_parameters),
        }
        prompt = load_prompt("optimize_parameters_prompt.txt", prompt_data)

        new_parameters_str = await call_ai_provider(provider, model, prompt)

        try:
            new_parameters = json.loads(new_parameters_str)
            current_parameters.update(new_parameters)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500,
                detail="Failed to decode the new parameters from the AI.",
            )

    return {
        "status": "failed",
        "message": f"Optimization goal not met after {max_iterations} iterations.",
        "history": iteration_history,
    }
