@echo off
chcp 65001 >nul
title Worker System - All Services

echo ==========================================
echo   Worker System - Start All Services
echo ==========================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo [1/4] Killing existing Node processes...
taskkill /f /im node.exe 2>NUL || echo No existing Node processes to kill

echo [2/4] Starting Redis Cache Service...
start "Redis" cmd /k "redis-server --port 6380 --requirepass test123"

echo [3/4] Starting backend service...
cd server
start "Backend" cmd /k "node app.js"
cd ..

echo [4/4] Waiting 3 seconds, then starting frontend...
timeout /t 3 /nobreak >nul

cd src
start "Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ==========================================
echo   All Services Started!
echo ==========================================
echo.
echo Windows opened:
echo   - Redis: Cache service on port 6380
echo   - Backend: API service on port 3000
echo   - Frontend: Dev server on port 8080
echo.
echo Wait for frontend to compile, then run:
echo   cpolar http 8080
echo.
echo Press any key to open local preview...
pause >nul
start http://localhost:8080