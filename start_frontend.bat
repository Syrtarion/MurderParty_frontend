@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ==================================================================
REM  Murder Party - Start Frontend
REM  Usage: start_frontend.bat [PORT]
REM ==================================================================

cd /d "%~dp0"

set PORT=%1
if "%PORT%"=="" set PORT=3000

REM Detect IP LAN (facultatif : on tente ipconfig pour afficher un exemple)
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /R /C:"IPv4.*" ^| findstr /V "127.0.0.1"') do (
  set IP_LAN=%%i
)
set IP_LAN=!IP_LAN: =!

REM nvm / node / npm checks identiques
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
echo [INFO] Starting Next.js dev server on 0.0.0.0:%PORT% ...
echo [TIP] Local:    http://localhost:%PORT%
if defined IP_LAN (
  echo [TIP] LAN:      http://!IP_LAN!:%PORT%
) else (
  echo [TIP] LAN:      http://<IP_LAN>:%PORT%  (ipconfig pour connaître l'IP)
)
echo [TIP] Public:   http://88.180.90.78:%PORT% (si port redirigé)
echo.

npm run dev -- --hostname 0.0.0.0 --port %PORT%

echo.
echo [INFO] Process ended. Press any key to close.
pause >nul
endlocal
