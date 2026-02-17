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
echo Creating zip archive: zx-story-flow.zip...
if exist zx-story-flow.zip del zx-story-flow.zip
powershell -Command "Compress-Archive -Path dist\* -DestinationPath zx-story-flow.zip -Force"

if %errorlevel% neq 0 (
    echo.
    echo Error creating zip archive!
    pause
    exit /b %errorlevel%
)

echo.
echo Build and zip successful!
pause
