import subprocess
import os
from backend.agents import SolverAgent, ExecutionResult
import configparser

class AbaqusAgent(SolverAgent):
    def __init__(self):
        self.config = configparser.ConfigParser()
        self.config.read('backend/config.ini')
        self.abaqus_path = self.config['ABAQUS']['executable_path']
        self.license_server = self.config['ABAQUS']['license_server']

    def run(self, script_path: str, params: dict) -> ExecutionResult:
        """
        Runs an Abaqus analysis using a Python script.
        The script_path should be the path to the Abaqus Python script.
        """
        if not self.self_check()[0]:
            return ExecutionResult(success=False, output="", error="Abaqus environment check failed.")

        try:
            # Construct the command to run Abaqus
            command = [self.abaqus_path, "cae", "noGUI=" + script_path]

            # Add parameters to the command if needed, Abaqus scripts can take arguments
            # For simplicity, we assume the script reads a parameter file or uses environment variables

            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = process.communicate()

            if process.returncode != 0:
                return ExecutionResult(success=False, output=stdout, error=stderr)

            # After the analysis, we need to parse the results.
            # This is a placeholder for the result parsing logic.
            odb_path = os.path.splitext(script_path)[0] + ".odb"
            if os.path.exists(odb_path):
                results = self.parse_odb(odb_path)
                return ExecutionResult(success=True, output=results, error="")
            else:
                return ExecutionResult(success=True, output="Analysis completed, but no ODB file found.", error="")

        except Exception as e:
            return ExecutionResult(success=False, output="", error=str(e))

    def self_check(self):
        """Checks if the Abaqus executable path is valid."""
        if not self.abaqus_path or not os.path.exists(self.abaqus_path):
            return False, "Abaqus executable path not configured or not found in config.ini"

        # A simple check to see if the executable can be called
        try:
            process = subprocess.Popen([self.abaqus_path, "information=version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = process.communicate(timeout=30)
            if "ABAQUS version" in stdout:
                 return True, f"Abaqus connection successful. Version info:\n{stdout}"
            else:
                return False, f"Abaqus command did not return version info. Error:\n{stderr}"
        except FileNotFoundError:
            return False, f"Abaqus executable not found at: {self.abaqus_path}"
        except subprocess.TimeoutExpired:
            return False, "Abaqus command timed out."
        except Exception as e:
            return False, f"An error occurred while checking Abaqus: {e}"


    def parse_odb(self, odb_path: str) -> str:
        """
        Parses the .odb file to extract results.
        This requires a separate Python script that uses the Abaqus Python API.
        """
        # This is a placeholder. In a real implementation, this would
        # call a separate script to parse the .odb file.
        return f"Results from {odb_path}"
