import matlab.engine
from backend.agents import SolverAgent, ExecutionResult
import configparser

class MATLABAgent(SolverAgent):
    def __init__(self):
        self.config = configparser.ConfigParser()
        self.config.read('backend/config.ini')
        self.matlab_path = self.config['MATLAB']['executable_path']
        self.license_server = self.config['MATLAB']['license_server']
        self.eng = None

    def start_engine(self):
        try:
            self.eng = matlab.engine.start_matlab()
            return True, ""
        except Exception as e:
            return False, str(e)

    def stop_engine(self):
        if self.eng:
            self.eng.quit()

    def run(self, code: str, params: dict) -> ExecutionResult:
        if not self.eng:
            success, error = self.start_engine()
            if not success:
                return ExecutionResult(success=False, output="", error=f"Failed to start MATLAB engine: {error}")

        try:
            # Pass parameters to MATLAB workspace
            for key, value in params.items():
                self.eng.workspace[key] = value

            # Run the MATLAB code
            output = self.eng.eval(code, nargout=1)

            return ExecutionResult(success=True, output=str(output), error="")
        except Exception as e:
            return ExecutionResult(success=False, output="", error=str(e))
        finally:
            self.stop_engine()

    def self_check(self):
        """Checks if the MATLAB executable path and license are valid."""
        if not self.matlab_path:
            return False, "MATLAB executable path not configured in config.ini"

        # This is a simplified check. A more robust check would involve
        # trying to start the engine or checking the license status.
        success, error = self.start_engine()
        if not success:
            return False, f"MATLAB license check failed: {error}"

        self.stop_engine()
        return True, "MATLAB connection successful"
