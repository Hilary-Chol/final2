@echo off
REM Civira Validation Script
echo ======================================
echo CIVIRA SYSTEM CHECK
echo ======================================

echo.
echo 1. Checking Backend Server...
powershell -Command "Test-NetConnection -ComputerName localhost -Port 5000 -WarningAction SilentlyContinue | Select-Object -Property TcpTestSucceeded"

echo.
echo 2. Checking Frontend Dev Server...
powershell -Command "Test-NetConnection -ComputerName localhost -Port 5173 -WarningAction SilentlyContinue | Select-Object -Property TcpTestSucceeded"

echo.
echo 3. Checking Database Connection...
mysql -u root -p"machikam" civira_db -e "SELECT 'Database Connected' as status;" 2>nul || echo FAILED: Database not accessible

echo.
echo 4. Checking Node Process...
tasklist | findstr "node.exe"

echo.
echo ======================================
echo To restart services:
echo.
echo Backend:
echo   cd c:\Users\hp\Desktop\recess semester\final2\civira\server
echo   npm start
echo.
echo Frontend:
echo   cd c:\Users\hp\Desktop\recess semester\final2\civira\client
echo   npm run dev
echo ======================================
