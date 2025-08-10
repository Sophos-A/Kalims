@echo off
setlocal enabledelayedexpansion

:: ===================================================
::   KBTH Triage System - Local Development Setup
::   Version: 2.1.0
::   Last Updated: 2024-08-08
::   Description: Starts all required services for the KALIMS application
:: ===================================================

:: Set console window title
title KALIMS - Starting Services

:: Set color for better visibility
color 0A

:: Set error handling
if not "%ERRORLEVEL%" == "0" (
    call :log ERROR "Script initialization failed with error level %ERRORLEVEL%"
    exit /b %ERRORLEVEL%
)

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Initialize log file
set "LOG_FILE=logs\startup_%DATE:/=-%_%TIME::=-%.log"
set "LOG_FILE=%LOG_FILE: =0%"

echo Starting KALIMS Services at %DATE% %TIME% > "%LOG_FILE%"

:: Function to log messages with timestamp
:log
echo [%TIME%] %*
echo [%DATE% %TIME%] %* >> "%LOG_FILE%"
goto :eof

:: Function to check if a process is running
:is_process_running
setlocal
set "process_name=%~1"
tasklist /FI "IMAGENAME eq %process_name%" 2>nul | find /i "%process_name%" >nul
endlocal & if errorlevel 1 (exit /b 1) else (exit /b 0)

echo.
call :log INFO "[1/6] Initializing environment..."

:: Set script directory as working directory
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%" 2>nul || (
    call :log ERROR "Failed to change to script directory: %SCRIPT_DIR%"
    exit /b 1
)

:: Check if running as administrator
net session >nul 2>&1
if %errorlevel% == 0 (
    call :log INFO "Running with administrator privileges"
) else (
    call :log WARNING "Not running as administrator. Some operations may fail."
    call :log WARNING "Please run this script as administrator for best results."
    timeout /t 3 >nul
)

:: Set environment variables
set "PYTHON_ENV=development"
set "NODE_ENV=development"
set "PORT=5000"
set "FASTAPI_PORT=8000"
set "LOG_LEVEL=debug"
set "ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000,http://localhost:5000/admin,http://localhost:5000/staff,http://localhost:5000/patient,http://localhost:5000/entry"

call :log INFO "Environment variables set"

:: Function to check command availability
:check_command
setlocal
set "cmd=%~1"
set "name=%~2"
set "url=%~3"

%cmd% --version >nul 2>&1
if %errorlevel% neq 0 (
    call :log ERROR "%name% is not installed or not in PATH"
    if not "%url%"=="" (
        call :log INFO "Please install %name% from: %url%"
    )
    exit /b 1
)

:: Get version for verification
for /f "tokens=*" %%i in ('%cmd% --version 2^>^&1 ^| find /v ""') do set "version=%%i"
call :log INFO "Found %name%: %version%"

endlocal
goto :eof

:: Function to start a service
:start_service
setlocal
set "service_name=%~1"
set "start_cmd=%~2"
set "log_file=%~3"

call :log INFO "Starting %service_name%..."

:: Check if already running
for /f "tokens=2" %%i in ('tasklist /FI "WINDOWTITLE eq %service_name%*" 2^>nul ^| find /i "%service_name%"') do (
    call :log WARNING "%service_name% is already running (PID: %%i). Restarting..."
    taskkill /F /IM "%%i" >nul 2>&1
)

:: Start the service in a new window
start "%service_name%" %start_cmd% >> "%log_file%" 2>&1

:: Verify service started
if %errorlevel% neq 0 (
    call :log ERROR "Failed to start %service_name%"
    exit /b 1
)

call :log INFO "%service_name% started successfully"
endlocal
goto :eof

:: Main script execution
call :log INFO "[2/6] Checking system requirements..."

:: Check Python
call :check_command python "Python 3.8+" "https://www.python.org/downloads/"
if %errorlevel% neq 0 exit /b %errorlevel%

:: Check Node.js
call :check_command node "Node.js 16.x+" "https://nodejs.org/"
if %errorlevel% neq 0 exit /b %errorlevel%

:: Check npm
call :check_command npm "npm" "https://www.npmjs.com/get-npm"
if %errorlevel% neq 0 exit /b %errorlevel%

:: Check Python packages
call :log INFO "[3/6] Installing/verifying Python dependencies..."
cd app
python -m pip install --upgrade pip
if %errorlevel% neq 0 (
    call :log ERROR "Failed to upgrade pip"
    exit /b 1
)

call :log INFO "Installing Python dependencies from requirements.txt..."
pip install -r requirements.txt
if %errorlevel% neq 0 (
    call :log ERROR "Failed to install Python dependencies"
    exit /b 1
)
cd ..

:: Check Node.js packages
call :log INFO "[4/6] Installing/verifying Node.js dependencies..."
cd src
call :log INFO "Running npm install..."
npm install
if %errorlevel% neq 0 (
    call :log ERROR "Failed to install Node.js dependencies"
    exit /b 1
)
cd ..

:: Start backend services
call :log INFO "[5/6] Starting backend services..."

:: Start FastAPI service (Python)
set "FASTAPI_CMD=uvicorn main:app --host 0.0.0.0 --port %FASTAPI_PORT% --reload"
call :start_service "KALIMS FastAPI" "cd /d "%SCRIPT_DIR%\app" && python -m %FASTAPI_CMD%" "logs\fastapi_%DATE:/=-%.log"
    echo.
    echo 4. Press any key to continue (you can set up the database later)...
    echo ===================================================
    pause >nul
) else (
    echo Checking if PostgreSQL is running...
    sc query postgresql* | findstr "RUNNING" >nul
    if %errorlevel% neq 0 (
        echo WARNING: PostgreSQL service is not running. Attempting to start...
        net start postgresql-x64-13 >nul 2>&1 || (
            echo ERROR: Failed to start PostgreSQL service.
            echo Please start it manually from Services (services.msc)
            pause
            exit /b 1
        )
    )
    echo PostgreSQL is running.
)

echo.
echo [3/5] Cleaning up existing processes...
echo.

:: Function to kill process by port
:killByPort
setlocal
set "port=%~1"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%port%"') do (
    echo Killing process %%a using port %port%...
    taskkill /F /PID %%a >nul 2>&1
)
endlocal
goto :eof

:: Clean up any existing processes on ports 5000 and 8000
call :killByPort 5000
call :killByPort 8000
echo Port cleanup completed.

echo.
echo [4/5] Installing dependencies...
echo.

:: Install Python dependencies
echo Installing Python dependencies...
cd "%SCRIPT_DIR%\backend"
pip install -r requirements.txt >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    echo Please run 'pip install -r requirements.txt' manually
    pause
    exit /b 1
) else (
    echo Python dependencies installed successfully
)
cd "%SCRIPT_DIR%"

:: Install Node.js dependencies
echo Installing Node.js dependencies...
call npm install >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    echo Please run 'npm install' manually
    pause
    exit /b 1
) else (
    echo Node.js dependencies installed successfully
)

echo.
echo [5/5] Starting services...
echo.

:: Function to check if a service is running
:checkService
setlocal enabledelayedexpansion
set "url=%~1"
set "service=%~2"
set "max_attempts=10"
set "attempt=1"

:check_loop
timeout /t 1 >nul
curl -s -o nul -w "%%{http_code}" %url% >nul 2>&1
if !errorlevel! equ 0 (
    echo %service% is running at %url%
    endlocal
    exit /b 0
) else (
    echo Waiting for %service% to start... (Attempt !attempt!/!max_attempts!)
    set /a attempt+=1
if %errorlevel% neq 0 (
    call :log WARNING "Failed to start frontend development server"
    call :log INFO "You may need to start the frontend manually with 'npm start' in the project root"
)

:: Final status
call :log INFO "========================================"
call :log INFO "KALIMS Services Started Successfully!"
call :log INFO "- FastAPI: http://localhost:%FASTAPI_PORT%/docs"
call :log INFO "- Express: http://localhost:%PORT%"
call :log INFO "- Frontend: http://localhost:3000"
call :log INFO "========================================"
call :log INFO "Logs are being saved to: %LOG_FILE%"
call :log INFO "Press any key to stop all services..."

echo.
echo ===================================================
echo   KBTH TRIAGE SYSTEM - READY
echo ===================================================
echo.
echo FRONTEND:
echo   1. Open in browser: http://localhost:5000
echo.
echo BACKEND SERVICES:
echo   2. Express API:     http://localhost:5000/api
echo   3. FastAPI Service: http://localhost:8000
echo   4. API Docs:        http://localhost:5000/api-docs
echo.
echo DATABASE:
echo   - Host:     localhost:5432
echo   - Database: kalims
echo   - Username: postgres
echo   - Password: (set during PostgreSQL installation)
echo.
echo TROUBLESHOOTING:
echo   - If services fail to start, check the command windows that opened
echo   - Make sure PostgreSQL is running and accessible
echo   - Check .env file for correct database credentials
echo.
echo Press any key to open the frontend in your browser...
pause >nul

start "" "http://localhost:5000"

echo.
echo Services are running. Close the terminal windows to stop the services.
echo To stop all services, close the command windows that opened.
pause
