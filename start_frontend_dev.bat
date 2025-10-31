@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ==================================================================
REM  Murder Party - Start Frontend (DEV)
REM  Usage: start_frontend_dev.bat [PORT]
REM ==================================================================

cd /d "%~dp0"

set PORT=%1
if "%PORT%"=="" set PORT=3000

where npm >nul 2>nul || (echo [ERROR] npm not found in PATH & pause & exit /b 1)

echo.
echo [INFO] Running Next.js dev server on http://0.0.0.0:%PORT%
echo [TIP] Depuis la machine locale :    http://localhost:%PORT%
echo [TIP] Depuis un autre appareil LAN : http://[IP_LAN]:%PORT%
echo.

npm run test -- --hostname 0.0.0.0 --port %PORT%

echo.
echo [INFO] Process ended. Press any key to close.
pause >nul
endlocal