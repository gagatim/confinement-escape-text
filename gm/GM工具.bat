@echo off
chcp 65001 >nul
python "%~dp0gm.py" %*
pause
