@echo off
setlocal
cd /d "%~dp0"
echo ===================================================
echo Starting PLC-mWCS Handshake Analysis Engine...
echo ===================================================
set ANALYSIS_PORT=8095
python handshake_analyzer_server.py
pause
