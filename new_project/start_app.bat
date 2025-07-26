@echo off
REM ============================================================================
REM  Mathmatica AI - Unified Application Launcher
REM ============================================================================
REM This script starts both the Python backend and the frontend server.
REM It will open two new terminal windows for the services.
REM Closing this main window will attempt to terminate both services.
REM ============================================================================

echo Starting Mathmatica AI services...
echo.

REM --- Start Backend Server ---
echo [1/2] Launching Backend (FastAPI on port 8000)...
cd backend
start "Mathmatica AI - Backend" cmd /c "call venv\Scripts\activate && uvicorn main:app --reload --port 8000"
cd ..
echo.

REM --- Start Frontend Server ---
echo [2/2] Launching Frontend (HTTP Server on port 8080)...
cd frontend
start "Mathmatica AI - Frontend" cmd /c "python -m http.server 8080"
cd ..
echo.

echo ============================================================================
echo All services are launching in separate windows.
echo You can now open http://localhost:8080 in your browser.
echo.
echo IMPORTANT: Close THIS window to stop all services.
echo ============================================================================

REM --- Wait for user to close this window ---
pause >nul

REM --- Cleanup: Terminate all Python processes started by this script ---
echo.
echo Shutting down all Python services...
taskkill /F /IM python.exe /T > nul
taskkill /F /IM uvicorn.exe /T > nul
echo Services terminated.
exit
