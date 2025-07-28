# SolverAgent Architecture Design

## 1. Class Diagram

```
+------------------+         +-----------------+
|  SolverAgent     |<>-------|  ExecutionResult|
| (Abstract)       |         +-----------------+
+------------------+         | + success: bool |
| + run()          |         | + output: str   |
+------------------+         | + error: str    |
        ^                    | + image: str    |
        |                    +-----------------+
        |
+------------------+
|   PythonAgent    |
+------------------+
| - _execute_code()|
| + run()          |
+------------------+
```

## 2. `SolverAgent` Abstract Base Class

**Description:**
The `SolverAgent` is an abstract base class that defines the interface for all solver agents. It ensures that all solver agents have a consistent way of executing code and returning results.

**Methods:**
*   `run(code: str, params: Dict[str, Any]) -> ExecutionResult`:
    *   This is an abstract method that must be implemented by all subclasses.
    *   It takes a string of code and a dictionary of parameters as input.
    *   It returns an `ExecutionResult` object.

## 3. `PythonAgent` Subclass

**Description:**
The `PythonAgent` is a concrete implementation of the `SolverAgent` that executes Python code. It encapsulates the logic for running Python code in a safe environment and capturing the output, errors, and any generated plots.

**Methods:**
*   `run(code: str, params: Dict[str, Any]) -> ExecutionResult`:
    *   This method implements the `run` method from the `SolverAgent` base class.
    *   It takes a string of Python code and a dictionary of parameters as input.
    *   It will inject the parameters into the code before execution.
    *   It executes the code and returns an `ExecutionResult` object.
*   `_execute_code(code: str) -> ExecutionResult`:
    *   This is a private helper method that contains the actual logic for executing the Python code.
    *   It uses a sandboxed environment to execute the code safely.
    *   It captures the standard output, standard error, and any generated `matplotlib` plots.
    *   It returns an `ExecutionResult` object.

## 4. `ExecutionResult` Data Class

**Description:**
The `ExecutionResult` is a simple data class that encapsulates the results of a code execution.

**Attributes:**
*   `success: bool`: `True` if the code executed without errors, `False` otherwise.
*   `output: str`: The standard output of the executed code.
*   `error: str`: The standard error of the executed code.
*   `image: str`: A Base64 encoded string of any generated `matplotlib` plot.
