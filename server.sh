# Lanza un servidor en el puerto 8000 usando el modulo python http.server
# Automaticamente abre la aplicacion en el navegador predeterminado.

if command -v python3 >/dev/null 2>&1; then
    PYTHON=python3
elif command -v python >/dev/null 2>&1; then
    PYTHON=python
else
    echo "Python not found"
    exit 1
fi
echo $PYTHON

$PYTHON -m http.server 8000 & xdg-open http://localhost:8000
