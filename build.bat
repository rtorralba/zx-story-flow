@echo off
echo Building ZX Story Flow...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo Build FAILED!
    pause
    exit /b %errorlevel%
)
echo.
echo Build successful!
pause
