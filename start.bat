@echo off
chcp 65001 >nul
title Worker System - Start Script

echo ==========================================
echo   Worker System - Start Script
echo ==========================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo [1/3] Killing existing Node processes...
taskkill /f /im node.exe 2>NUL || echo No existing Node processes to kill

echo [2/3] Starting backend service...
cd server
start "Backend" cmd /k "node app.js"
cd ..

echo [3/3] Waiting 3 seconds, then starting frontend...
timeout /t 3 /nobreak >nul

cd src
start "Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ==========================================
echo   Services started!
echo ==========================================
echo.
echo Wait for frontend to compile, then run:
echo   cpolar http 8080
echo.
echo Press any key to open local preview...
pause >nul
start http://localhost:8080