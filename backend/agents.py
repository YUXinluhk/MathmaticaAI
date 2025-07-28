import base64
import io
import os
import subprocess
import tempfile
from abc import ABC, abstractmethod
from contextlib import redirect_stdout, redirect_stderr
from typing import Dict, Any

import matplotlib.pyplot as plt
import numpy as np
import scipy
import sympy as sp


class ExecutionResult:
    def __init__(self, success: bool, output: str, error: str, image: str = None):
        self.success = success
        self.output = output
        self.error = error
        self.image = image


class SolverAgent(ABC):
    @abstractmethod
    def run(self, code: str, params: Dict[str, Any]) -> ExecutionResult:
        pass


class PythonAgent(SolverAgent):
    def run(self, code: str, params: Dict[str, Any], data_filepath: str = None) -> ExecutionResult:
        # This is a simple injection, a more robust solution would be to
        # pass parameters in a more secure way.
        code_with_params = f"params = {params}\n{code}"
        return self._execute_code(code_with_params, data_filepath)

    def _execute_code(self, code: str, data_filepath: str = None) -> ExecutionResult:
        with tempfile.TemporaryDirectory() as temp_dir:
            code_path = os.path.join(temp_dir, "script.py")
            output_path = os.path.join(temp_dir, "output.txt")
            error_path = os.path.join(temp_dir, "error.txt")
            image_path = os.path.join(temp_dir, "plot.png")

            with open(code_path, "w") as f:
                f.write(code)

            docker_command = [
                "docker", "run", "--rm",
                "--network=none",  # Disable networking
                "-v", f"{temp_dir}:/usr/src/app",
            ]
            if data_filepath:
                docker_command.extend(["-v", f"{data_filepath}:/usr/src/app/data.csv"])

            docker_command.extend([
                "python:3.9-slim",
                "python", "script.py"
            ])

            try:
                subprocess.run(docker_command, check=True, capture_output=True, text=True)

                with open(output_path, "r") as f:
                    output = f.read()
                with open(error_path, "r") as f:
                    error = f.read()

                image_b64 = None
                if os.path.exists(image_path):
                    with open(image_path, "rb") as f:
                        image_b64 = base64.b64encode(f.read()).decode('utf-8')

                return ExecutionResult(success=not error, output=output, error=error, image=image_b64)
            except subprocess.CalledProcessError as e:
                return ExecutionResult(success=False, output=e.stdout, error=e.stderr)
            except FileNotFoundError:
                # This error occurs if Docker is not installed or not in the system's PATH.
                return ExecutionResult(success=False, output="", error="Docker not found. Please ensure Docker is installed and running.")
