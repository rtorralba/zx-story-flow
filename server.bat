@echo off
REM Lanza un servidor estático en el puerto 8080 usando http-server (requiere Node.js instalado)

where node >nul 2>nul || (
    echo Node.js no está instalado. Por favor, instálalo desde https://nodejs.org/
    pause
    exit /b 1
)

where npx >nul 2>nul || (
    echo npx no está disponible. Por favor, asegúrate de tener Node.js actualizado.
    pause
    exit /b 1
)

echo Iniciando servidor en http://localhost:8080 ...
npx http-server . -p 8080
