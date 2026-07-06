#!/usr/bin/env python3
"""Ponto de entrada único: python3 app.py

Usa o venv do projeto automaticamente (se existir) e sobe o servidor Flask.
"""
import os
import runpy
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, "backend")

# ponytail: re-exec no python do venv pra "python3 app.py" funcionar sem activate
# (compara sys.prefix porque venv/bin/python é symlink pro python do sistema)
venv_dir = os.path.join(ROOT, "venv")
venv_python = os.path.join(venv_dir, "bin", "python")
if os.path.exists(venv_python) and os.path.realpath(sys.prefix) != os.path.realpath(venv_dir):
    os.execv(venv_python, [venv_python] + sys.argv)

sys.path.insert(0, BACKEND)

try:
    import flask  # noqa: F401
except ModuleNotFoundError:
    sys.exit(
        "Dependências não instaladas. Rode:\n"
        "  python3 -m venv venv\n"
        "  venv/bin/pip install -r backend/requirements.txt\n"
        "e depois: python3 app.py"
    )

runpy.run_path(os.path.join(BACKEND, "app.py"), run_name="__main__")
