@echo off
echo Running tests before push...
npm test --silent
if %errorlevel% neq 0 (
  echo Tests failed. Aborting push.
  exit /b %errorlevel%
)
exit /b 0
