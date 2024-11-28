@echo off
:: Set a higher file descriptor limit for Python
set PYTHONPATH=%PYTHONPATH%;%cd%
set UVICORN_FD_LIMIT=4096
cd langchain1/dev
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
