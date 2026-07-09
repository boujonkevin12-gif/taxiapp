@echo off
echo ========================================
echo   Taxi App - Concepcion del Uruguay
echo ========================================
echo.
echo Iniciando backend...
start "Backend" cmd /c "cd backend && npm run dev"
echo.
echo Iniciando frontend...
start "Frontend" cmd /c "cd frontend && npm run dev"
echo.
echo ========================================
echo   Backend: http://localhost:3001
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Presiona cualquier tecla para cerrar...
pause > nul
