@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ==================================================================
REM  Murder Party - Start Frontend (LIVE CONSOLE)
REM  Shows live Next.js logs, keeps window open on exit.
REM  Usage: start_frontend_live.bat [PORT]
REM ==================================================================

cd /d "%~dp0"

set PORT=%1
if "%PORT%"=="" set PORT=3000

echo [INFO] Working directory: %CD%
echo [INFO] Port: %PORT%
echo.

REM Attempt to use nvm if .nvmrc present
if exist ".nvmrc" (
  for /f "usebackq delims=" %%v in (".nvmrc") do set NVM_VERSION=%%v
  where nvm >nul 2>nul
  if %ERRORLEVEL%==0 (
    echo [INFO] Using Node via nvm: %NVM_VERSION%
    call nvm use %NVM_VERSION%
  ) else (
    echo [WARN] .nvmrc detected but nvm not found. Continuing with current Node.
  )
)

where node >nul 2>nul || (echo [ERROR] node not found in PATH & pause & exit /b 1)
where npm  >nul 2>nul || (echo [ERROR] npm not found in PATH  & pause & exit /b 1)

if not exist ".env.local" (
  if exist ".env.example" (
    echo [INFO] Creating .env.local from .env.example
    copy /Y ".env.example" ".env.local" >nul
  ) else (
    echo [WARN] No .env.local / .env.example found.
  )
)

if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  npm install || (echo [ERROR] npm install failed & pause & exit /b 1)
)

echo.
echo [INFO] Running unit tests (npm test) ...
echo.
npm test
if errorlevel 1 (
  echo [ERROR] npm test failed.
  pause
  exit /b 1
)

echo.
echo [INFO] Running Playwright e2e tests (npm run test:e2e) ...
echo.
npm run test:e2e
if errorlevel 1 (
  echo [ERROR] npm run test:e2e failed.
  pause
  exit /b 1
)

echo.
echo [INFO] Process ended. Press any key to close.
pause >nul
endlocal
