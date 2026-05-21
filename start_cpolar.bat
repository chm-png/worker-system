@echo off
chcp 65001 >nul
title cpolar - Worker System

echo ==========================================
echo   cpolar Auto Configuration
echo ==========================================
echo.

set CPOLAR_TOKEN=NWIxYTY4ZjUtZTE5Mi00ZDU5LWE0YjMtNDFjNDA2ZjMwMDA0

echo Step 1: Setting authtoken...
cpolar authtoken %CPOLAR_TOKEN%

echo.
echo Step 2: Starting HTTP tunnel on port 8080...
echo.
cpolar http 8080